create or replace function private.create_whatsapp_dispatch(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private, auth, pg_temp as $$
declare dispatch_id uuid;
begin
  if not private.is_restaurant_member((select restaurant_id from public.orders where id=p_order_id), array['owner','manager','cashier','kitchen','viewer']::public.staff_role[]) then raise exception 'Restaurant membership is required'; end if;
  insert into public.whatsapp_dispatches(order_id) values (p_order_id) on conflict (order_id) do update set state='pending', updated_at=now() returning id into dispatch_id;
  insert into public.audit_events(restaurant_id, actor_id, action, entity_type, entity_id, metadata) select restaurant_id, auth.uid(), 'إعادة محاولة إرسال واتساب', 'order', p_order_id, jsonb_build_object('dispatchId', dispatch_id) from public.orders where id=p_order_id;
  return jsonb_build_object('id', dispatch_id, 'state', 'pending');
end; $$;

create or replace function public.create_whatsapp_dispatch(p_order_id uuid)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$ select private.create_whatsapp_dispatch($1); $$;
grant execute on function public.create_whatsapp_dispatch(uuid) to authenticated;

create or replace function private.update_whatsapp_dispatch(p_dispatch_id uuid, p_state text, p_provider_message_id text default null, p_error_code text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private, auth, pg_temp as $$
declare dispatch_order uuid;
begin
  select order_id into dispatch_order from public.whatsapp_dispatches where id=p_dispatch_id;
  if not private.is_restaurant_member((select restaurant_id from public.orders where id=dispatch_order), array['owner','manager','cashier','kitchen','viewer']::public.staff_role[]) then raise exception 'Restaurant membership is required'; end if;
  update public.whatsapp_dispatches set state=p_state, provider_message_id=coalesce(p_provider_message_id, provider_message_id), error_code=p_error_code, retry_count=case when p_state='failed' then retry_count+1 else retry_count end, last_attempt_at=now(), updated_at=now() where id=p_dispatch_id;
  return jsonb_build_object('success', true);
end; $$;

create or replace function public.update_whatsapp_dispatch(p_dispatch_id uuid, p_state text, p_provider_message_id text default null, p_error_code text default null)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$ select private.update_whatsapp_dispatch($1,$2,$3,$4); $$;
grant execute on function public.update_whatsapp_dispatch(uuid,text,text,text) to authenticated;
