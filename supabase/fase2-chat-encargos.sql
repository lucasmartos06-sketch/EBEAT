-- eBeat · Fase 2: chat de negociación y encargos
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes el esquema de la fase 1. Se puede ejecutar varias veces sin problema.

-- ============================================================
-- 1. Encargos (un comprador describe el beat que quiere)
-- ============================================================
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  genre text not null,
  budget_cents integer not null check (budget_cents >= 0),
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  chosen_producer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists commissions_status_idx on public.commissions (status, created_at desc);

alter table public.commissions enable row level security;

drop policy if exists "Los encargos son visibles para todos" on public.commissions;
create policy "Los encargos son visibles para todos"
  on public.commissions for select using (true);

drop policy if exists "Cada usuario crea sus encargos" on public.commissions;
create policy "Cada usuario crea sus encargos"
  on public.commissions for insert
  with check (auth.uid() = buyer_id and status = 'open' and chosen_producer_id is null);

-- Las propuestas de los productores
create table if not exists public.commission_proposals (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commissions (id) on delete cascade,
  producer_id uuid not null references public.profiles (id) on delete cascade,
  price_cents integer not null check (price_cents >= 0),
  message text not null check (char_length(message) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (commission_id, producer_id)
);

alter table public.commission_proposals enable row level security;

drop policy if exists "Ven la propuesta su autor y quien hizo el encargo" on public.commission_proposals;
create policy "Ven la propuesta su autor y quien hizo el encargo"
  on public.commission_proposals for select
  using (
    producer_id = auth.uid()
    or exists (
      select 1 from public.commissions c
      where c.id = commission_id and c.buyer_id = auth.uid()
    )
  );

drop policy if exists "Los productores envían propuestas" on public.commission_proposals;
create policy "Los productores envían propuestas"
  on public.commission_proposals for insert
  with check (
    producer_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.commissions c
      where c.id = commission_id and c.status = 'open' and c.buyer_id <> auth.uid()
    )
  );

-- ============================================================
-- 2. Conversaciones y mensajes (chat con ofertas)
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks (id) on delete set null,
  commission_id uuid references public.commissions (id) on delete set null,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default '',
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create index if not exists conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

alter table public.conversations enable row level security;

drop policy if exists "Ven la conversación sus dos participantes" on public.conversations;
create policy "Ven la conversación sus dos participantes"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'offer', 'system')),
  body text not null default '' check (char_length(body) <= 2000),
  offer_cents integer check (offer_cents >= 0),
  offer_status text check (offer_status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  check (kind = 'offer' or char_length(body) >= 1),
  check (
    (kind = 'offer' and offer_cents is not null and offer_status is not null)
    or (kind <> 'offer' and offer_cents is null and offer_status is null)
  )
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "Ven los mensajes los participantes" on public.messages;
create policy "Ven los mensajes los participantes"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Escriben los participantes" on public.messages;
create policy "Escriben los participantes"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and kind in ('text', 'offer')
    and (offer_status is null or offer_status = 'pending')
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Al llegar un mensaje, la conversación sube en la lista.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ============================================================
-- 3. Acciones seguras (se ejecutan en el servidor de la base de datos)
-- ============================================================

-- Abre (o recupera) el chat entre el comprador y el productor de una pista.
create or replace function public.start_track_conversation(p_track uuid)
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
  if not found then raise exception 'La pista no existe'; end if;
  if v_track.producer_id = auth.uid() then raise exception 'No puedes negociar contigo mismo'; end if;

  select id into v_id from public.conversations
   where track_id = p_track and buyer_id = auth.uid() limit 1;
  if v_id is null then
    insert into public.conversations (track_id, buyer_id, seller_id, subject)
    values (p_track, auth.uid(), v_track.producer_id, v_track.title)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Abre (o recupera) el chat de un encargo con el productor que envió la propuesta.
create or replace function public.start_commission_conversation(p_proposal uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop public.commission_proposals;
  v_comm public.commissions;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v_prop from public.commission_proposals where id = p_proposal;
  if not found then raise exception 'La propuesta no existe'; end if;
  select * into v_comm from public.commissions where id = v_prop.commission_id;
  if auth.uid() <> v_comm.buyer_id and auth.uid() <> v_prop.producer_id then
    raise exception 'No participas en este encargo';
  end if;

  select id into v_id from public.conversations
   where commission_id = v_comm.id and seller_id = v_prop.producer_id and buyer_id = v_comm.buyer_id limit 1;
  if v_id is null then
    insert into public.conversations (commission_id, buyer_id, seller_id, subject)
    values (v_comm.id, v_comm.buyer_id, v_prop.producer_id, 'Encargo: ' || v_comm.title)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Quien hizo el encargo acepta una propuesta: se rechazan las demás y se abre el chat.
create or replace function public.accept_proposal(p_proposal uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop public.commission_proposals;
  v_comm public.commissions;
  v_conv uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v_prop from public.commission_proposals where id = p_proposal;
  if not found then raise exception 'La propuesta no existe'; end if;
  select * into v_comm from public.commissions where id = v_prop.commission_id for update;
  if v_comm.buyer_id <> auth.uid() then raise exception 'Solo quien hizo el encargo puede aceptar'; end if;
  if v_comm.status <> 'open' then raise exception 'El encargo ya no está abierto'; end if;

  update public.commission_proposals set status = 'accepted' where id = p_proposal;
  update public.commission_proposals set status = 'rejected'
   where commission_id = v_comm.id and id <> p_proposal and status = 'pending';
  update public.commissions set status = 'in_progress', chosen_producer_id = v_prop.producer_id
   where id = v_comm.id;

  v_conv := public.start_commission_conversation(p_proposal);
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (
    v_conv, auth.uid(), 'system',
    'Propuesta aceptada por ' || to_char(v_prop.price_cents / 100.0, 'FM999990.00') || ' €.'
  );
  return v_conv;
end;
$$;

-- Quien hizo el encargo lo cierra (terminado o cancelado).
create or replace function public.close_commission(p_commission uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  update public.commissions set status = 'closed'
   where id = p_commission and buyer_id = auth.uid();
end;
$$;

-- La otra parte acepta o rechaza una oferta del chat.
create or replace function public.respond_offer(p_message uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages;
  v_conv public.conversations;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v_msg from public.messages where id = p_message for update;
  if not found or v_msg.kind <> 'offer' then raise exception 'La oferta no existe'; end if;
  select * into v_conv from public.conversations where id = v_msg.conversation_id;
  if auth.uid() <> v_conv.buyer_id and auth.uid() <> v_conv.seller_id then
    raise exception 'No participas en esta conversación';
  end if;
  if v_msg.sender_id = auth.uid() then raise exception 'No puedes responder a tu propia oferta'; end if;
  if v_msg.offer_status <> 'pending' then raise exception 'La oferta ya fue respondida'; end if;

  update public.messages
     set offer_status = case when p_accept then 'accepted' else 'rejected' end
   where id = p_message;

  insert into public.messages (conversation_id, sender_id, kind, body)
  values (
    v_msg.conversation_id, auth.uid(), 'system',
    'Oferta de ' || to_char(v_msg.offer_cents / 100.0, 'FM999990.00') || ' € '
      || case when p_accept then 'aceptada.' else 'rechazada.' end
  );
end;
$$;

-- Solo usuarios con sesión iniciada pueden usar estas acciones.
revoke execute on function public.start_track_conversation(uuid) from public, anon;
revoke execute on function public.start_commission_conversation(uuid) from public, anon;
revoke execute on function public.accept_proposal(uuid) from public, anon;
revoke execute on function public.close_commission(uuid) from public, anon;
revoke execute on function public.respond_offer(uuid, boolean) from public, anon;
grant execute on function public.start_track_conversation(uuid) to authenticated;
grant execute on function public.start_commission_conversation(uuid) to authenticated;
grant execute on function public.accept_proposal(uuid) to authenticated;
grant execute on function public.close_commission(uuid) to authenticated;
grant execute on function public.respond_offer(uuid, boolean) to authenticated;
