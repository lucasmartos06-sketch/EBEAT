-- eBeat · Fase 5: administradores y panel de ingresos de la plataforma
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes las fases 1, 2 y 3. Se puede ejecutar varias veces sin problema.

-- ============================================================
-- 1. Seguridad: los usuarios solo pueden cambiar su nombre en el perfil
-- ============================================================
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

-- ============================================================
-- 2. Administradores
-- ============================================================
create table if not exists public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "Cada admin ve su propia fila" on public.admins;
create policy "Cada admin ve su propia fila"
  on public.admins for select using (user_id = auth.uid());

-- Nadie puede añadirse como admin desde la web: solo se hace desde el SQL Editor de Supabase.

-- ============================================================
-- 3. Pedidos (ventas cobradas). Los rellenará el sistema de pagos.
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'purchase' check (source in ('purchase', 'auction', 'commission')),
  track_id uuid references public.tracks (id) on delete set null,
  auction_id uuid references public.auctions (id) on delete set null,
  commission_id uuid references public.commissions (id) on delete set null,
  buyer_id uuid references public.profiles (id) on delete set null,
  seller_id uuid references public.profiles (id) on delete set null,
  genre text,
  amount_cents integer not null check (amount_cents >= 0),
  commission_cents integer not null default 0 check (commission_cents >= 0),
  status text not null default 'paid' check (status in ('pending', 'paid', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

drop policy if exists "Ven el pedido comprador, vendedor y admins" on public.orders;
create policy "Ven el pedido comprador, vendedor y admins"
  on public.orders for select
  using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

-- Nadie escribe pedidos desde la web: los crea el sistema de pagos en el servidor.

-- ============================================================
-- 4. Resumen de ingresos (solo administradores)
-- ============================================================
create or replace function public.admin_income()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Solo administradores';
  end if;

  with paid as (
    select o.*, to_char(date_trunc('month', o.created_at at time zone 'Europe/Madrid'), 'YYYY-MM') as month
      from public.orders o
     where o.status = 'paid'
  ),
  m as (
    select month, count(*)::int as n, sum(amount_cents)::bigint as g, sum(commission_cents)::bigint as c
      from paid group by month
  ),
  gg as (
    select coalesce(genre, 'Sin género') as genre, count(*)::int as n,
           sum(amount_cents)::bigint as g, sum(commission_cents)::bigint as c
      from paid group by 1
  ),
  pend as (
    select count(*)::int as n, coalesce(sum(a.final_cents), 0)::bigint as total
      from public.auctions a
     where a.result = 'won'
       and not exists (select 1 from public.orders o where o.auction_id = a.id and o.status = 'paid')
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'orders', (select count(*) from paid),
      'gross_cents', (select coalesce(sum(amount_cents), 0) from paid),
      'commission_cents', (select coalesce(sum(commission_cents), 0) from paid)
    ),
    'refunded_cents', (select coalesce(sum(amount_cents), 0) from public.orders where status = 'refunded'),
    'by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', month, 'orders', n, 'gross_cents', g, 'commission_cents', c)
                       order by month desc) from m
    ), '[]'::jsonb),
    'by_genre', coalesce((
      select jsonb_agg(jsonb_build_object('genre', genre, 'orders', n, 'gross_cents', g, 'commission_cents', c)
                       order by c desc) from gg
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'created_at', t.created_at, 'source', t.source, 'genre', t.genre,
               'amount_cents', t.amount_cents, 'commission_cents', t.commission_cents, 'status', t.status
             ) order by t.created_at desc)
        from (select * from public.orders order by created_at desc limit 20) t
    ), '[]'::jsonb),
    'pending_auctions', (select jsonb_build_object('count', n, 'total_cents', total) from pend)
  ) into r;

  return r;
end;
$$;

revoke execute on function public.admin_income() from public, anon;
grant execute on function public.admin_income() to authenticated;
