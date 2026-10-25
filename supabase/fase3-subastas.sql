-- eBeat · Fase 3: subastas
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes el esquema de la fase 1. Se puede ejecutar varias veces sin problema.

-- ============================================================
-- 1. Tablas
-- ============================================================
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  start_cents integer not null check (start_cents >= 0),
  min_increment_cents integer not null default 100 check (min_increment_cents >= 1),
  current_cents integer not null default 0,
  bid_count integer not null default 0,
  leader_id uuid references public.profiles (id) on delete set null,
  reserve_met boolean not null default true,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'ended', 'cancelled')),
  result text check (result in ('won', 'no_bids', 'reserve_not_met')),
  winner_id uuid references public.profiles (id) on delete set null,
  final_cents integer,
  created_at timestamptz not null default now()
);

-- Solo puede haber una subasta activa por pista.
create unique index if not exists auctions_one_active_per_track
  on public.auctions (track_id) where status = 'active';
create index if not exists auctions_active_idx on public.auctions (status, ends_at);

alter table public.auctions enable row level security;

drop policy if exists "Las subastas son visibles para todos" on public.auctions;
create policy "Las subastas son visibles para todos"
  on public.auctions for select using (true);

-- El precio de reserva es secreto: solo lo ve el vendedor.
create table if not exists public.auction_secrets (
  auction_id uuid primary key references public.auctions (id) on delete cascade,
  reserve_cents integer not null check (reserve_cents >= 0)
);

alter table public.auction_secrets enable row level security;

drop policy if exists "El vendedor ve su precio de reserva" on public.auction_secrets;
create policy "El vendedor ve su precio de reserva"
  on public.auction_secrets for select
  using (
    exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.seller_id = auth.uid()
    )
  );

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists auction_bids_idx on public.auction_bids (auction_id, amount_cents desc);

alter table public.auction_bids enable row level security;

drop policy if exists "Las pujas son visibles para todos" on public.auction_bids;
create policy "Las pujas son visibles para todos"
  on public.auction_bids for select using (true);

-- Nadie escribe directamente en estas tablas: todo pasa por las funciones de abajo.

-- ============================================================
-- 2. Funciones
-- ============================================================

-- El productor lanza una subasta de una de sus pistas.
create or replace function public.create_auction(
  p_track uuid,
  p_start integer,
  p_reserve integer,
  p_hours integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track public.tracks;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v_track from public.tracks where id = p_track and status = 'published';
  if not found or v_track.producer_id <> auth.uid() then
    raise exception 'Solo puedes subastar tus propias pistas';
  end if;
  if p_start is null or p_start < 0 then raise exception 'El precio de salida no es válido'; end if;
  if p_reserve is not null and p_reserve < p_start then
    raise exception 'El precio de reserva no puede ser menor que el de salida';
  end if;
  if p_hours is null or p_hours < 1 or p_hours > 168 then
    raise exception 'La duración debe estar entre 1 hora y 7 días';
  end if;
  if exists (select 1 from public.auctions where track_id = p_track and status = 'active') then
    raise exception 'Esta pista ya tiene una subasta activa';
  end if;

  insert into public.auctions (track_id, seller_id, start_cents, reserve_met, ends_at)
  values (p_track, auth.uid(), p_start, p_reserve is null, now() + make_interval(hours => p_hours))
  returning id into v_id;

  if p_reserve is not null then
    insert into public.auction_secrets (auction_id, reserve_cents) values (v_id, p_reserve);
  end if;
  return v_id;
end;
$$;

-- Una puja. En los últimos 2 minutos, cada puja alarga la subasta otros 2 minutos.
create or replace function public.place_bid(p_auction uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.auctions;
  v_min integer;
  v_reserve integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if not found then raise exception 'La subasta no existe'; end if;
  if a.status <> 'active' or a.ends_at <= now() then raise exception 'La subasta ha terminado'; end if;
  if a.seller_id = auth.uid() then raise exception 'No puedes pujar en tu propia subasta'; end if;
  if a.leader_id = auth.uid() then raise exception 'Ya eres el mejor postor'; end if;

  v_min := case when a.bid_count = 0 then a.start_cents else a.current_cents + a.min_increment_cents end;
  if p_amount is null or p_amount < v_min then
    raise exception 'La puja mínima es % €', to_char(v_min / 100.0, 'FM999990.00');
  end if;

  insert into public.auction_bids (auction_id, bidder_id, amount_cents)
  values (p_auction, auth.uid(), p_amount);

  select reserve_cents into v_reserve from public.auction_secrets where auction_id = p_auction;

  update public.auctions
     set current_cents = p_amount,
         bid_count = bid_count + 1,
         leader_id = auth.uid(),
         reserve_met = reserve_met or (v_reserve is not null and p_amount >= v_reserve),
         ends_at = case
           when ends_at - now() < interval '2 minutes' then now() + interval '2 minutes'
           else ends_at
         end
   where id = p_auction;
end;
$$;

-- Cierra una subasta cuyo tiempo ha terminado. Puede lanzarla cualquier usuario con sesión.
-- Si hay mejor postor y se alcanzó la reserva, esa persona queda obligada a comprar.
create or replace function public.finalize_auction(p_auction uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.auctions;
  v_result text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if not found then raise exception 'La subasta no existe'; end if;
  if a.status <> 'active' then return coalesce(a.result, a.status); end if;
  if a.ends_at > now() then raise exception 'La subasta aún no ha terminado'; end if;

  if a.bid_count = 0 then
    v_result := 'no_bids';
  elsif not a.reserve_met then
    v_result := 'reserve_not_met';
  else
    v_result := 'won';
  end if;

  update public.auctions
     set status = 'ended',
         result = v_result,
         winner_id = case when v_result = 'won' then a.leader_id else null end,
         final_cents = case when v_result = 'won' then a.current_cents else null end
   where id = p_auction;
  return v_result;
end;
$$;

-- El vendedor puede cancelar una subasta que todavía no tiene pujas.
create or replace function public.cancel_auction(p_auction uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.auctions;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if not found or a.seller_id <> auth.uid() then raise exception 'No puedes cancelar esta subasta'; end if;
  if a.status <> 'active' then raise exception 'La subasta ya terminó'; end if;
  if a.bid_count > 0 then raise exception 'No se puede cancelar una subasta con pujas'; end if;
  update public.auctions set status = 'cancelled' where id = p_auction;
end;
$$;

revoke execute on function public.create_auction(uuid, integer, integer, integer) from public, anon;
revoke execute on function public.place_bid(uuid, integer) from public, anon;
revoke execute on function public.finalize_auction(uuid) from public, anon;
revoke execute on function public.cancel_auction(uuid) from public, anon;
grant execute on function public.create_auction(uuid, integer, integer, integer) to authenticated;
grant execute on function public.place_bid(uuid, integer) to authenticated;
grant execute on function public.finalize_auction(uuid) to authenticated;
grant execute on function public.cancel_auction(uuid) to authenticated;
