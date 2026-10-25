-- eBeat · Fase 9: pagos con Stripe, originales privados y descargas
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes las fases 1 a 8. Se puede ejecutar varias veces sin problema.

-- ============================================================
-- 1. Cuentas de cobro de los productores (Stripe Connect)
-- ============================================================
create table if not exists public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

drop policy if exists "Cada usuario ve su cuenta de cobro" on public.payout_accounts;
create policy "Cada usuario ve su cuenta de cobro"
  on public.payout_accounts for select using (user_id = auth.uid());

-- Solo el servidor (con la clave de servicio) escribe en esta tabla.

-- ============================================================
-- 2. Pedidos: datos extra que rellena el servidor al cobrar
-- ============================================================
alter table public.orders add column if not exists title text;
alter table public.orders add column if not exists original_path text;
alter table public.orders add column if not exists stripe_session_id text;
alter table public.orders add column if not exists stripe_payment_intent text;
alter table public.orders add column if not exists offer_message_id uuid;
alter table public.orders add column if not exists proposal_id uuid;

create unique index if not exists orders_session_idx on public.orders (stripe_session_id);
create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders (seller_id, created_at desc);

-- ============================================================
-- 3. Originales privados (lo que se descarga tras comprar)
-- ============================================================
alter table public.tracks add column if not exists original_path text;

insert into storage.buckets (id, name, public)
values ('originals', 'originals', false)
on conflict (id) do nothing;

drop policy if exists "Cada usuario sube sus originales" on storage.objects;
create policy "Cada usuario sube sus originales"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'originals' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Dueño y compradores leen originales" on storage.objects;
create policy "Dueño y compradores leen originales"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'originals'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.orders o
         where o.buyer_id = auth.uid() and o.status = 'paid' and o.original_path = name
      )
    )
  );

drop policy if exists "Cada usuario borra sus originales" on storage.objects;
create policy "Cada usuario borra sus originales"
  on storage.objects for delete to authenticated
  using (bucket_id = 'originals' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 4. Borrar cuenta: no se permite si hay pistas ya vendidas
-- ============================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  if exists (select 1 from public.auctions where seller_id = auth.uid() and status = 'active' and bid_count > 0) then
    raise exception 'Tienes una subasta activa con pujas. Espera a que termine para borrar tu cuenta.';
  end if;
  if exists (select 1 from public.auctions where leader_id = auth.uid() and status = 'active') then
    raise exception 'Eres el mejor postor de una subasta activa. Espera a que termine para borrar tu cuenta.';
  end if;
  if exists (
    select 1 from public.auctions a
     where a.result = 'won'
       and (a.winner_id = auth.uid() or a.seller_id = auth.uid())
       and not exists (select 1 from public.orders o where o.auction_id = a.id and o.status = 'paid')
  ) then
    raise exception 'Tienes una subasta ganada pendiente de cobro o pago. No se puede borrar la cuenta todavía.';
  end if;
  if exists (
    select 1 from public.commissions c
     where c.status = 'in_progress' and (c.buyer_id = auth.uid() or c.chosen_producer_id = auth.uid())
  ) then
    raise exception 'Tienes un encargo en curso. Ciérralo antes de borrar tu cuenta.';
  end if;
  if exists (select 1 from public.orders o where o.seller_id = auth.uid() and o.status = 'paid' and o.original_path is not null) then
    raise exception 'Has vendido pistas y tus compradores todavía pueden descargarlas. Escríbenos para cerrar tu cuenta.';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
