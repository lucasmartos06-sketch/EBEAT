-- eBeat · Fase 4: ranking mensual por género
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes las fases 1, 2 y 3. Se puede ejecutar varias veces sin problema.

-- Fecha en la que se cerró cada encargo (para contarlo en el mes correcto).
alter table public.commissions add column if not exists closed_at timestamptz;

create or replace function public.close_commission(p_commission uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  update public.commissions
     set status = 'closed', closed_at = now()
   where id = p_commission and buyer_id = auth.uid() and status <> 'closed';
end;
$$;

revoke execute on function public.close_commission(uuid) from public, anon;
grant execute on function public.close_commission(uuid) to authenticated;

-- Ranking de un mes y un género. p_month es el día 1 del mes (por ejemplo, 2026-10-01).
-- Puntos por ahora:  pista nueva publicada +2 (máximo 3 al mes) · subasta vendida +10 · encargo completado +25.
-- Las ventas normales y las valoraciones se sumarán cuando existan los pagos.
create or replace function public.monthly_ranking(p_month date, p_genre text)
returns table (
  producer_id uuid,
  display_name text,
  points integer,
  new_tracks integer,
  auction_sales integer,
  commissions_done integer
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select (p_month::timestamp at time zone 'Europe/Madrid') as s,
           ((p_month + interval '1 month')::timestamp at time zone 'Europe/Madrid') as e
  ),
  nt as (
    select t.producer_id, least(count(*), 3)::int as n
      from public.tracks t cross join bounds b
     where t.genre = p_genre and t.status = 'published'
       and t.created_at >= b.s and t.created_at < b.e
     group by t.producer_id
  ),
  au as (
    select a.seller_id as producer_id, count(*)::int as n
      from public.auctions a
      join public.tracks t on t.id = a.track_id
      cross join bounds b
     where a.result = 'won' and t.genre = p_genre
       and a.ends_at >= b.s and a.ends_at < b.e
     group by a.seller_id
  ),
  co as (
    select c.chosen_producer_id as producer_id, count(*)::int as n
      from public.commissions c cross join bounds b
     where c.status = 'closed' and c.chosen_producer_id is not null and c.genre = p_genre
       and c.closed_at >= b.s and c.closed_at < b.e
     group by c.chosen_producer_id
  ),
  ids as (
    select producer_id from nt
    union select producer_id from au
    union select producer_id from co
  )
  select i.producer_id,
         p.display_name,
         (coalesce(nt.n, 0) * 2 + coalesce(au.n, 0) * 10 + coalesce(co.n, 0) * 25)::int as points,
         coalesce(nt.n, 0) as new_tracks,
         coalesce(au.n, 0) as auction_sales,
         coalesce(co.n, 0) as commissions_done
    from ids i
    join public.profiles p on p.id = i.producer_id
    left join nt on nt.producer_id = i.producer_id
    left join au on au.producer_id = i.producer_id
    left join co on co.producer_id = i.producer_id
   order by points desc, p.display_name
   limit 50;
$$;

grant execute on function public.monthly_ranking(date, text) to anon, authenticated;
