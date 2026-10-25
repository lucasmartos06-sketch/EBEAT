import { NextResponse } from 'next/server';
import { serviceClient, userFromRequest } from '@/lib/serverAuth';
import { stripeConfigured, stripeRequest } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Consulta a Stripe en qué estado está la cuenta de cobro del productor y lo guarda.
export async function GET(req: Request) {
  const enabled = stripeConfigured() && Boolean(serviceClient());
  const db = serviceClient();
  if (!enabled || !db) return NextResponse.json({ payments: false });

  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Entra con tu cuenta.' }, { status: 401 });

  const { data: row } = await db
    .from('payout_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ payments: true, connected: false, charges_enabled: false, payouts_enabled: false });

  try {
    const acct = await stripeRequest<{ charges_enabled: boolean; payouts_enabled: boolean }>(
      'GET',
      `/accounts/${row.stripe_account_id}`,
    );
    await db
      .from('payout_accounts')
      .update({ charges_enabled: acct.charges_enabled, payouts_enabled: acct.payouts_enabled })
      .eq('user_id', user.id);
    return NextResponse.json({
      payments: true,
      connected: true,
      charges_enabled: acct.charges_enabled,
      payouts_enabled: acct.payouts_enabled,
    });
  } catch (err) {
    console.error('status error', err);
    return NextResponse.json({ error: 'No se pudo consultar Stripe.' }, { status: 500 });
  }
}
