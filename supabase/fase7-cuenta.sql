-- eBeat · Fase 7: ajustes de cuenta (eliminar cuenta)
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este texto y pulsa "Run".
-- Hay que haber ejecutado antes las fases 1 a 5. Se puede ejecutar varias veces sin problema.

-- El usuario puede borrar su propia cuenta y todos sus datos, salvo que tenga compromisos pendientes.
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

  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
