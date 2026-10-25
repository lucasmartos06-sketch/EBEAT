import { NextResponse } from 'next/server';
import { serviceClient, siteOrigin, userFromRequest } from '@/lib/serverAuth';
import { stripeConfigured, stripeRequest } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Crea (si hace falta) la cuenta de cobro del productor y devuelve el enlace para completar sus datos en Stripe.
export async function POST(req: Request) {
  try {
    const db = serviceClient();
    if (!stripeConfigured() || !db) {
      return NextResponse.json({ error: 'Los pagos todavía no están activados.' }, { status: 503 });
    }
    const user = await userFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Entra con tu cuenta.' }, { status: 401 });

    const { data: existing } = await db
      .from('payout_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id as string | undefined;
    if (!accountId) {
      const account = await stripeRequest<{ id: string }>('POST', '/accounts', {
        type: 'express',
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { user_id: user.id },
      });
      accountId = account.id;
      await db.from('payout_accounts').insert({ user_id: user.id, stripe_account_id: accountId });
    }

    const origin = siteOrigin(req);
    const link = await stripeRequest<{ url: string }>('POST', '/account_links', {
      account: accountId,
      refresh_url: `${origin}/panel?cobros=reintentar`,
      return_url: `${origin}/panel?cobros=volver`,
      type: 'account_onboarding',
    });
    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error('onboard error', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo activar los cobros.' }, { status: 500 });
  }
}
