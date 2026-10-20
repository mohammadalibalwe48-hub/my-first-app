create or replace function private.get_admin_operations(p_restaurant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if not private.is_restaurant_member(
    p_restaurant_id,
    array['owner','manager','cashier','kitchen','viewer']::public.staff_role[]
  ) then raise exception 'Restaurant membership is required'; end if;
  return jsonb_build_object(
    'acceptingOrders', coalesce((select acceptance_state = 'open' from public.restaurants where id = p_restaurant_id), false),
    'staff', coalesce((select jsonb_agg(jsonb_build_object(
      'id', rm.user_id, 'name', rm.display_name, 'role', rm.role, 'active', rm.active
    ) order by rm.created_at) from public.restaurant_members rm where rm.restaurant_id = p_restaurant_id), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'action', a.action, 'actor', coalesce(rm.display_name, 'النظام'), 'createdAt', a.created_at
    ) order by a.created_at desc) from (select * from public.audit_events where restaurant_id = p_restaurant_id order by created_at desc limit 100) a left join public.restaurant_members rm on rm.restaurant_id = a.restaurant_id and rm.user_id = a.actor_id), '[]'::jsonb)
  );
end;
$$;

create or replace function private.update_admin_operations(p_restaurant_id uuid, p_accepting_orders boolean, p_action text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if not private.is_restaurant_member(
    p_restaurant_id,
    array['owner','manager']::public.staff_role[]
  ) then raise exception 'Owner or manager access is required'; end if;
  update public.restaurants set
    acceptance_state = case when p_accepting_orders then 'open' else 'paused' end,
    updated_at = now()
  where id = p_restaurant_id;
  insert into public.audit_events(restaurant_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_restaurant_id, auth.uid(), left(coalesce(p_action, 'تحديث حالة التشغيل'), 240), 'restaurant', p_restaurant_id, jsonb_build_object('acceptingOrders', p_accepting_orders));
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.get_admin_operations(p_restaurant_id uuid)
returns jsonb language sql stable security invoker set search_path = pg_catalog, public, private, pg_temp
as $$ select private.get_admin_operations(p_restaurant_id); $$;
create or replace function public.update_admin_operations(p_restaurant_id uuid, p_accepting_orders boolean, p_action text)
returns jsonb language sql volatile security invoker set search_path = pg_catalog, public, private, pg_temp
as $$ select private.update_admin_operations(p_restaurant_id, p_accepting_orders, p_action); $$;

revoke all on function private.get_admin_operations(uuid) from public;
revoke all on function private.update_admin_operations(uuid, boolean, text) from public;
grant execute on function private.get_admin_operations(uuid) to authenticated;
grant execute on function private.update_admin_operations(uuid, boolean, text) to authenticated;
revoke all on function public.get_admin_operations(uuid) from public;
revoke all on function public.update_admin_operations(uuid, boolean, text) from public;
grant execute on function public.get_admin_operations(uuid) to authenticated;
grant execute on function public.update_admin_operations(uuid, boolean, text) to authenticated;
