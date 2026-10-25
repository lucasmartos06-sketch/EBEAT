-- eBeat · Fase 8: sanciones por fraude (herramienta de administración y aplicación real)
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes las fases 1 a 5. Se puede ejecutar varias veces sin problema.

-- ============================================================
-- 1. Tabla de sanciones
-- ============================================================
create table if not exists public.sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  level integer not null check (level between 1 and 4),  -- 1 aviso, 2 suspensión, 3 anulación, 4 expulsión
  reason text not null check (char_length(reason) between 1 and 1000),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sanctions_user_idx on public.sanctions (user_id, active);

alter table public.sanctions enable row level security;

-- Cada usuario ve sus propias sanciones; los administradores ven todas.
drop policy if exists "Ven la sanción el afectado y los admins" on public.sanctions;
create policy "Ven la sanción el afectado y los admins"
  on public.sanctions for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

-- Nadie escribe en esta tabla desde la web: solo las funciones de administración de abajo.

-- ¿Tiene el usuario una suspensión o expulsión activa? (nivel 2 o superior)
create or replace function public.is_suspended(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sanctions where user_id = p_user and active and level >= 2
  );
$$;

grant execute on function public.is_suspended(uuid) to anon, authenticated;

-- ============================================================
-- 2. Una cuenta suspendida no puede publicar, subastar, pujar ni proponer
-- ============================================================
create or replace function public.block_if_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col text;
  v_user uuid;
begin
  v_col := case tg_table_name
    when 'tracks' then 'producer_id'
    when 'auctions' then 'seller_id'
    when 'auction_bids' then 'bidder_id'
    when 'commission_proposals' then 'producer_id'
    else 'buyer_id'
  end;
  v_user := (to_jsonb(new) ->> v_col)::uuid;
  if public.is_suspended(v_user) then
    raise exception 'Tu cuenta está suspendida. Consulta tus avisos en el panel.';
  end if;
  return new;
end;
$$;

drop trigger if exists block_suspended_tracks on public.tracks;
create trigger block_suspended_tracks before insert on public.tracks
  for each row execute function public.block_if_suspended();

drop trigger if exists block_suspended_auctions on public.auctions;
create trigger block_suspended_auctions before insert on public.auctions
  for each row execute function public.block_if_suspended();

drop trigger if exists block_suspended_bids on public.auction_bids;
create trigger block_suspended_bids before insert on public.auction_bids
  for each row execute function public.block_if_suspended();

drop trigger if exists block_suspended_proposals on public.commission_proposals;
create trigger block_suspended_proposals before insert on public.commission_proposals
  for each row execute function public.block_if_suspended();

drop trigger if exists block_suspended_commissions on public.commissions;
create trigger block_suspended_commissions before insert on public.commissions
  for each row execute function public.block_if_suspended();

-- ============================================================
-- 3. Funciones de administración
-- ============================================================
create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Solo administradores';
  end if;
end;
$$;

-- Busca usuarios por nombre o correo.
create or replace function public.admin_find_users(p_q text)
returns table (id uuid, display_name text, email text, max_active_level integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select p.id, p.display_name, u.email::text,
           coalesce((select max(s.level) from public.sanctions s where s.user_id = p.id and s.active), 0)
      from public.profiles p
      join auth.users u on u.id = p.id
     where p_q is not null and length(trim(p_q)) >= 2
       and (p.display_name ilike '%' || trim(p_q) || '%' or u.email ilike '%' || trim(p_q) || '%')
     order by p.display_name
     limit 20;
end;
$$;

-- Aplica una sanción. Nivel 4 (expulsión) oculta además todas las pistas del usuario.
create or replace function public.apply_sanction(p_user uuid, p_level integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.require_admin();
  if p_user = auth.uid() then raise exception 'No puedes sancionarte a ti mismo'; end if;
  if p_level not between 1 and 4 then raise exception 'Nivel no válido'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'Escribe el motivo'; end if;

  insert into public.sanctions (user_id, level, reason, created_by)
  values (p_user, p_level, trim(p_reason), auth.uid())
  returning id into v_id;

  if p_level = 4 then
    update public.tracks set status = 'hidden' where producer_id = p_user;
  end if;
  return v_id;
end;
$$;

-- Levanta una sanción (por ejemplo, tras una apelación aceptada).
create or replace function public.lift_sanction(p_sanction uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  update public.sanctions set active = false where id = p_sanction;
end;
$$;

-- Últimas sanciones, con el nombre del usuario.
create or replace function public.admin_sanctions()
returns table (id uuid, user_id uuid, display_name text, level integer, reason text, active boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select s.id, s.user_id, p.display_name, s.level, s.reason, s.active, s.created_at
      from public.sanctions s
      join public.profiles p on p.id = s.user_id
     order by s.created_at desc
     limit 50;
end;
$$;

revoke execute on function public.require_admin() from public, anon;
revoke execute on function public.admin_find_users(text) from public, anon;
revoke execute on function public.apply_sanction(uuid, integer, text) from public, anon;
revoke execute on function public.lift_sanction(uuid) from public, anon;
revoke execute on function public.admin_sanctions() from public, anon;
grant execute on function public.require_admin() to authenticated;
grant execute on function public.admin_find_users(text) to authenticated;
grant execute on function public.apply_sanction(uuid, integer, text) to authenticated;
grant execute on function public.lift_sanction(uuid) to authenticated;
grant execute on function public.admin_sanctions() to authenticated;
