create table if not exists public.restaurant_operation_preferences (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  notifications_enabled boolean not null default true,
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.restaurant_operation_preferences enable row level security;
drop policy if exists restaurant_operation_preferences_select on public.restaurant_operation_preferences;
create policy restaurant_operation_preferences_select on public.restaurant_operation_preferences for select to authenticated using (private.is_restaurant_member(restaurant_id, array['owner','manager','cashier','kitchen','viewer']::public.staff_role[]));

drop policy if exists restaurant_operation_preferences_modify on public.restaurant_operation_preferences;
create policy restaurant_operation_preferences_modify on public.restaurant_operation_preferences for all to authenticated using (private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[]));

create or replace function private.get_admin_operations(p_restaurant_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, private, auth, pg_temp as $$
begin
  if not private.is_restaurant_member(p_restaurant_id, array['owner','manager','cashier','kitchen','viewer']::public.staff_role[]) then raise exception 'Restaurant membership is required'; end if;
  return jsonb_build_object(
    'acceptingOrders', coalesce((select acceptance_state = 'open' from public.restaurants where id = p_restaurant_id), false),
    'notifications', coalesce((select notifications_enabled from public.restaurant_operation_preferences where restaurant_id = p_restaurant_id), true),
    'sound', coalesce((select sound_enabled from public.restaurant_operation_preferences where restaurant_id = p_restaurant_id), true),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', rm.user_id, 'name', rm.display_name, 'role', rm.role, 'active', rm.active) order by rm.created_at) from public.restaurant_members rm where rm.restaurant_id = p_restaurant_id), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'action', a.action, 'actor', coalesce(rm.display_name, 'النظام'), 'createdAt', a.created_at) order by a.created_at desc) from (select * from public.audit_events where restaurant_id = p_restaurant_id order by created_at desc limit 100) a left join public.restaurant_members rm on rm.restaurant_id = a.restaurant_id and rm.user_id = a.actor_id), '[]'::jsonb)
  );
end; $$;

create or replace function private.update_admin_operations(p_restaurant_id uuid, p_accepting_orders boolean default null, p_action text default null, p_notifications boolean default null, p_sound boolean default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private, auth, pg_temp as $$
begin
  if not private.is_restaurant_member(p_restaurant_id, array['owner','manager']::public.staff_role[]) then raise exception 'Owner or manager access is required'; end if;
  if p_accepting_orders is not null then update public.restaurants set acceptance_state = case when p_accepting_orders then 'open' else 'paused' end, updated_at = now() where id = p_restaurant_id; end if;
  if p_notifications is not null or p_sound is not null then
    insert into public.restaurant_operation_preferences(restaurant_id, notifications_enabled, sound_enabled) values (p_restaurant_id, coalesce(p_notifications, true), coalesce(p_sound, true))
    on conflict (restaurant_id) do update set notifications_enabled = coalesce(p_notifications, restaurant_operation_preferences.notifications_enabled), sound_enabled = coalesce(p_sound, restaurant_operation_preferences.sound_enabled), updated_at = now();
  end if;
  insert into public.audit_events(restaurant_id, actor_id, action, entity_type, entity_id, metadata) values (p_restaurant_id, auth.uid(), left(coalesce(p_action, 'تحديث حالة التشغيل'), 240), 'restaurant', p_restaurant_id, jsonb_build_object('acceptingOrders', p_accepting_orders, 'notifications', p_notifications, 'sound', p_sound));
  return jsonb_build_object('success', true);
end; $$;

create or replace function public.update_admin_operations(p_restaurant_id uuid, p_accepting_orders boolean default null, p_action text default null, p_notifications boolean default null, p_sound boolean default null)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$ select private.update_admin_operations($1,$2,$3,$4,$5); $$;
grant execute on function public.update_admin_operations(uuid,boolean,text,boolean,boolean) to authenticated;
