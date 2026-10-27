import { NextResponse } from 'next/server';
import { commissionPercent, serviceClient, siteOrigin, userFromRequest } from '@/lib/serverAuth';
import { stripeConfigured, stripeRequest } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Kind = 'track' | 'offer' | 'auction' | 'proposal';

type Item = {
  title: string;
  amount: number;
  sellerId: string;
  source: 'purchase' | 'auction' | 'commission';
  trackId?: string;
  genre?: string;
  commissionId?: string;
  auctionId?: string;
  offerId?: string;
  proposalId?: string;
  exclusive?: boolean;
};

class UserError extends Error {}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    if (!stripeConfigured()) return fail('Los pagos todavía no están activados.', 503);
    const db = serviceClient();
    if (!db) return fail('Los pagos todavía no están activados.', 503);

    const user = await userFromRequest(req);
    if (!user) return fail('Entra con tu cuenta para comprar.', 401);

    const body = (await req.json().catch(() => null)) as { kind?: Kind; id?: string } | null;
    if (!body?.kind || !body.id) return fail('Solicitud no válida.');
    const id = body.id;

    // Siempre se calcula el precio en el servidor, a partir de la base de datos.
    let item: Item;

    const alreadyPaid = async (column: string, value: string) => {
      const { data } = await db.from('orders').select('id').eq(column, value).eq('status', 'paid').limit(1);
      return Boolean(data && data.length > 0);
    };

    if (body.kind === 'track') {
      const { data: t } = await db
        .from('tracks')
        .select('id,title,genre,price_cents,license,producer_id,status')
        .eq('id', id)
        .maybeSingle();
      if (!t || t.status !== 'published') throw new UserError('La pista no está disponible.');
      if (t.producer_id === user.id) throw new UserError('No puedes comprar tu propia pista.');
      if (t.license === 'exclusiva' && (await alreadyPaid('track_id', t.id))) {
        throw new UserError('Esta pista exclusiva ya se vendió.');
      }
      item = {
        title: t.title, amount: t.price_cents, sellerId: t.producer_id, source: 'purchase',
        trackId: t.id, genre: t.genre, exclusive: t.license === 'exclusiva',
      };
    } else if (body.kind === 'offer') {
      const { data: m } = await db
        .from('messages')
        .select('id,kind,offer_cents,offer_status,conversation_id')
        .eq('id', id)
        .maybeSingle();
      if (!m || m.kind !== 'offer' || m.offer_status !== 'accepted') throw new UserError('Esa oferta no está aceptada.');
      const { data: c } = await db
        .from('conversations')
        .select('buyer_id,seller_id,track_id')
        .eq('id', m.conversation_id)
        .maybeSingle();
      if (!c || c.buyer_id !== user.id || !c.track_id) throw new UserError('No puedes pagar esta oferta.');
      if (await alreadyPaid('offer_message_id', m.id)) throw new UserError('Esta oferta ya está pagada.');
      const { data: t } = await db.from('tracks').select('id,title,genre,license').eq('id', c.track_id).maybeSingle();
      if (!t) throw new UserError('La pista ya no existe.');
      if (t.license === 'exclusiva' && (await alreadyPaid('track_id', t.id))) {
        throw new UserError('Esta pista exclusiva ya se vendió.');
      }
      item = {
        title: t.title, amount: m.offer_cents, sellerId: c.seller_id, source: 'purchase',
        trackId: t.id, genre: t.genre, offerId: m.id, exclusive: t.license === 'exclusiva',
      };
    } else if (body.kind === 'auction') {
      const { data: a } = await db
        .from('auctions')
        .select('id,result,winner_id,final_cents,track_id,seller_id')
        .eq('id', id)
        .maybeSingle();
      if (!a || a.result !== 'won' || a.winner_id !== user.id) throw new UserError('No has ganado esta subasta.');
      if (await alreadyPaid('auction_id', a.id)) throw new UserError('Esta subasta ya está pagada.');
      const { data: t } = await db.from('tracks').select('id,title,genre,license').eq('id', a.track_id).maybeSingle();
      item = {
        title: t?.title ?? 'Pista de subasta', amount: a.final_cents, sellerId: a.seller_id, source: 'auction',
        trackId: t?.id, genre: t?.genre, auctionId: a.id, exclusive: t?.license === 'exclusiva',
      };
    } else if (body.kind === 'proposal') {
      const { data: p } = await db
        .from('commission_proposals')
        .select('id,status,producer_id,price_cents,commission_id')
        .eq('id', id)
        .maybeSingle();
      if (!p || p.status !== 'accepted') throw new UserError('Esa propuesta no está aceptada.');
      const { data: c } = await db
        .from('commissions')
        .select('id,title,genre,buyer_id')
        .eq('id', p.commission_id)
        .maybeSingle();
      if (!c || c.buyer_id !== user.id) throw new UserError('No puedes pagar este encargo.');
      if (await alreadyPaid('proposal_id', p.id)) throw new UserError('Este encargo ya está pagado.');
      item = {
        title: `Encargo: ${c.title}`, amount: p.price_cents, sellerId: p.producer_id, source: 'commission',
        genre: c.genre, commissionId: c.id, proposalId: p.id,
      };
    } else {
      return fail('Solicitud no válida.');
    }

    if (!Number.isInteger(item.amount) || item.amount < 50) {
      throw new UserError('El importe mínimo para pagar es 0,50 €.');
    }
    if (item.sellerId === user.id) throw new UserError('No puedes comprarte a ti mismo.');

    const { data: payout } = await db
      .from('payout_accounts')
      .select('stripe_account_id,charges_enabled')
      .eq('user_id', item.sellerId)
      .maybeSingle();
    if (!payout || !payout.charges_enabled) {
      throw new UserError('El productor todavía no ha activado los cobros. Prueba más tarde o escríbele por el chat.');
    }

    // Si el vendedor está suspendido (fase de sanciones), no se le puede comprar.
    const { data: suspended } = await db.rpc('is_suspended', { p_user: item.sellerId });
    if (suspended === true) throw new UserError('Este productor tiene la cuenta suspendida y no puede vender ahora.');

    const fee = Math.round((item.amount * commissionPercent()) / 100);
    const origin = siteOrigin(req);

    const metadata: Record<string, string> = {
      source: item.source,
      buyer_id: user.id,
      seller_id: item.sellerId,
      title: item.title.slice(0, 200),
      amount_cents: String(item.amount),
      commission_cents: String(fee),
      exclusive: item.exclusive ? '1' : '0',
    };
    if (item.trackId) metadata.track_id = item.trackId;
    if (item.genre) metadata.genre = item.genre;
    if (item.commissionId) metadata.commission_id = item.commissionId;
    if (item.auctionId) metadata.auction_id = item.auctionId;
    if (item.offerId) metadata.offer_message_id = item.offerId;
    if (item.proposalId) metadata.proposal_id = item.proposalId;

    const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
      mode: 'payment',
      success_url: `${origin}/compra/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/panel`,
      customer_email: user.email,
      custom_text: {
        submit: {
          message:
            'Al pagar aceptas los términos de uso y pides la entrega inmediata del contenido digital: una vez iniciada la descarga pierdes el derecho de desistimiento.',
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: { currency: 'eur', unit_amount: item.amount, product_data: { name: item.title.slice(0, 120) } },
        },
      ],
      payment_intent_data: {
        ...(fee > 0 ? { application_fee_amount: fee } : {}),
        transfer_data: { destination: payout.stripe_account_id },
        metadata,
      },
      metadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof UserError) return fail(err.message);
    console.error('checkout error', err);
    return fail(err instanceof Error ? err.message : 'No se pudo iniciar el pago.', 500);
  }
}
