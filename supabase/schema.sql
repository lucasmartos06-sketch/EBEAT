-- eBeat · Esquema de la base de datos (fase 1: cuentas, pistas y audio)
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este archivo y pulsa "Run".
-- Se puede ejecutar varias veces sin problema.

-- ============================================================
-- 1. Perfiles de usuario
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Productor',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Los perfiles son visibles para todos" on public.profiles;
create policy "Los perfiles son visibles para todos"
  on public.profiles for select using (true);

drop policy if exists "Cada usuario edita su perfil" on public.profiles;
create policy "Cada usuario edita su perfil"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Crea el perfil automáticamente cuando alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Pistas
-- ============================================================
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  genre text not null,
  bpm integer check (bpm between 40 and 300),
  price_cents integer not null check (price_cents >= 0),
  license text not null default 'comercial' check (license in ('personal', 'comercial', 'exclusiva')),
  description text check (char_length(description) <= 2000),
  audio_path text not null,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

create index if not exists tracks_genre_idx on public.tracks (genre);
create index if not exists tracks_created_idx on public.tracks (created_at desc);

alter table public.tracks enable row level security;

drop policy if exists "Las pistas publicadas son visibles" on public.tracks;
create policy "Las pistas publicadas son visibles"
  on public.tracks for select
  using (status = 'published' or auth.uid() = producer_id);

drop policy if exists "Cada productor publica sus pistas" on public.tracks;
create policy "Cada productor publica sus pistas"
  on public.tracks for insert
  with check (auth.uid() = producer_id);

drop policy if exists "Cada productor edita sus pistas" on public.tracks;
create policy "Cada productor edita sus pistas"
  on public.tracks for update
  using (auth.uid() = producer_id) with check (auth.uid() = producer_id);

drop policy if exists "Cada productor borra sus pistas" on public.tracks;
create policy "Cada productor borra sus pistas"
  on public.tracks for delete
  using (auth.uid() = producer_id);

-- ============================================================
-- 3. Almacenamiento de audio
-- ============================================================
-- Fase 1: bucket público para poder escuchar las pistas.
-- Antes de vender de verdad hay que añadir un bucket privado para los
-- archivos originales y una versión de previsualización con marca de agua.
insert into storage.buckets (id, name, public)
values ('previews', 'previews', true)
on conflict (id) do nothing;

drop policy if exists "El audio es visible para todos" on storage.objects;
create policy "El audio es visible para todos"
  on storage.objects for select
  using (bucket_id = 'previews');

drop policy if exists "Cada usuario sube a su carpeta" on storage.objects;
create policy "Cada usuario sube a su carpeta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Cada usuario borra su audio" on storage.objects;
create policy "Cada usuario borra su audio"
  on storage.objects for delete to authenticated
  using (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);
