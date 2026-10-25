-- eBeat · Fase 6: perfiles de productor
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes las fases 1 a 5. Se puede ejecutar varias veces sin problema.

-- Biografía del productor (la edita él mismo desde "Mi perfil").
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 600);

-- Cada usuario puede cambiar solo su nombre y su biografía (nada más).
revoke update on public.profiles from authenticated, anon;
grant update (display_name, bio) on public.profiles to authenticated;

-- Lista de productores con pistas publicadas, con búsqueda opcional por nombre.
create or replace function public.list_producers(p_q text default null)
returns table (
  id uuid,
  display_name text,
  bio text,
  track_count integer,
  genres text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.display_name,
         p.bio,
         count(t.id)::int as track_count,
         array_agg(distinct t.genre) as genres
    from public.profiles p
    join public.tracks t on t.producer_id = p.id and t.status = 'published'
   where p_q is null or p_q = '' or p.display_name ilike '%' || p_q || '%'
   group by p.id
   order by count(t.id) desc, p.display_name
   limit 60;
$$;

grant execute on function public.list_producers(text) to anon, authenticated;

-- Insignias de un productor: meses anteriores en los que quedó primero de su género (últimos 12 meses).
create or replace function public.producer_badges(p_producer uuid)
returns table (badge_month text, badge_genre text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m date;
  g text;
  v_top uuid;
  i integer;
begin
  for i in 1..12 loop
    m := (date_trunc('month', now() at time zone 'Europe/Madrid') - make_interval(months => i))::date;
    for g in select distinct t.genre from public.tracks t loop
      select r.producer_id into v_top from public.monthly_ranking(m, g) r order by r.points desc limit 1;
      if v_top = p_producer then
        badge_month := to_char(m, 'YYYY-MM');
        badge_genre := g;
        return next;
      end if;
    end loop;
  end loop;
end;
$$;

grant execute on function public.producer_badges(uuid) to anon, authenticated;
