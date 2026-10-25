import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/serverAuth';
import { verifyStripeSignature } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = serviceClient();
  if (!secret || !db) return NextResponse.json({ error: 'No configurado' }, { status: 503 });

  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Firma no válida' }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  const obj = event.data.object;

  try {
    if (event.type === 'checkout.session.completed' && obj.payment_status === 'paid') {
      const md = (obj.metadata ?? {}) as Record<string, string>;
      if (md.buyer_id && md.seller_id) {
        let originalPath: string | null = null;
        if (md.track_id) {
          const { data: t } = await db.from('tracks').select('original_path').eq('id', md.track_id).maybeSingle();
          originalPath = (t?.original_path as string | null) ?? null;
        }

        await db.from('orders').upsert(
          {
            source: md.source || 'purchase',
            track_id: md.track_id || null,
            auction_id: md.auction_id || null,
            commission_id: md.commission_id || null,
            offer_message_id: md.offer_message_id || null,
            proposal_id: md.proposal_id || null,
            buyer_id: md.buyer_id,
            seller_id: md.seller_id,
            genre: md.genre || null,
            title: md.title || null,
            original_path: originalPath,
            amount_cents: Number(obj.amount_total ?? md.amount_cents),
            commission_cents: Number(md.commission_cents || 0),
            status: 'paid',
            stripe_session_id: String(obj.id),
            stripe_payment_intent: obj.payment_intent ? String(obj.payment_intent) : null,
          },
          { onConflict: 'stripe_session_id', ignoreDuplicates: true },
        );

        // Una pista exclusiva sale del catálogo al venderse.
        if (md.exclusive === '1' && md.track_id) {
          await db.from('tracks').update({ status: 'hidden' }).eq('id', md.track_id);
        }
      }
    } else if (event.type === 'charge.refunded' && obj.payment_intent) {
      await db.from('orders').update({ status: 'refunded' }).eq('stripe_payment_intent', String(obj.payment_intent));
    } else if (event.type === 'account.updated' && obj.id) {
      await db
        .from('payout_accounts')
        .update({
          charges_enabled: Boolean(obj.charges_enabled),
          payouts_enabled: Boolean(obj.payouts_enabled),
        })
        .eq('stripe_account_id', String(obj.id));
    }
  } catch (err) {
    console.error('webhook error', err);
    // Si algo falla, Stripe volverá a intentarlo.
    return NextResponse.json({ error: 'Error al procesar el aviso' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
