create or replace function private.get_admin_operations(p_restaurant_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
begin
  if not private.is_restaurant_member(p_restaurant_id, array['owner','manager','cashier','kitchen','viewer']::public.staff_role[]) then
    raise exception 'Restaurant membership is required';
  end if;
  return jsonb_build_object(
    'acceptingOrders', coalesce((select acceptance_state = 'open' from public.restaurants where id = p_restaurant_id), false),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', rm.user_id, 'name', rm.display_name, 'role', rm.role, 'active', rm.active) order by rm.created_at) from public.restaurant_members rm where rm.restaurant_id = p_restaurant_id), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'action', a.action, 'actor', coalesce(rm.display_name, 'النظام'), 'createdAt', a.created_at) order by a.created_at desc) from (select * from public.audit_events where restaurant_id = p_restaurant_id order by created_at desc limit 100) a left join public.restaurant_members rm on rm.restaurant_id = a.restaurant_id and rm.user_id = a.actor_id), '[]'::jsonb)
  );
end;
$$;

create or replace function private.manage_admin_staff(
  p_restaurant_id uuid,
  p_action text,
  p_user_id uuid default null,
  p_email text default null,
  p_display_name text default null,
  p_role public.staff_role default 'cashier',
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
declare
  target_user_id uuid := p_user_id;
  target_name text;
begin
  if not private.is_restaurant_member(p_restaurant_id, array['owner','manager']::public.staff_role[]) then
    raise exception 'Owner or manager access is required';
  end if;
  if p_action = 'add' then
    if target_user_id is null and nullif(trim(p_email), '') is not null then
      select id into target_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
    end if;
    if target_user_id is null then raise exception 'Staff account not found. Ask the user to sign up first.'; end if;
    if p_role = 'owner' then raise exception 'Owner role cannot be assigned here'; end if;
    target_name := coalesce(nullif(trim(p_display_name), ''), split_part(coalesce(p_email, ''), '@', 1), 'موظف');
    insert into public.restaurant_members(restaurant_id, user_id, role, display_name, active)
    values (p_restaurant_id, target_user_id, p_role, left(target_name, 120), true)
    on conflict (restaurant_id, user_id) do update set role = excluded.role, display_name = excluded.display_name, active = true;
  elsif p_action = 'update' then
    if target_user_id is null or p_role = 'owner' then raise exception 'Invalid staff update'; end if;
    update public.restaurant_members set role = p_role, display_name = coalesce(nullif(trim(p_display_name), ''), display_name), active = p_active where restaurant_id = p_restaurant_id and user_id = target_user_id and role <> 'owner';
    if not found then raise exception 'Staff member not found or protected'; end if;
  elsif p_action = 'toggle' then
    update public.restaurant_members set active = p_active where restaurant_id = p_restaurant_id and user_id = target_user_id and role <> 'owner';
    if not found then raise exception 'Staff member not found or protected'; end if;
  elsif p_action = 'remove' then
    delete from public.restaurant_members where restaurant_id = p_restaurant_id and user_id = target_user_id and role <> 'owner';
    if not found then raise exception 'Staff member not found or protected'; end if;
  else raise exception 'Unsupported staff action'; end if;
  insert into public.audit_events(restaurant_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_restaurant_id, auth.uid(), left(coalesce(p_action, 'staff update'), 240), 'restaurant_member', target_user_id, jsonb_build_object('role', p_role, 'active', p_active, 'email', p_email));
  return jsonb_build_object('success', true, 'userId', target_user_id);
end;
$$;

create or replace function public.manage_admin_staff(
  p_restaurant_id uuid,
  p_action text,
  p_user_id uuid default null,
  p_email text default null,
  p_display_name text default null,
  p_role public.staff_role default 'cashier',
  p_active boolean default true
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$ select private.manage_admin_staff($1,$2,$3,$4,$5,$6,$7); $$;

grant execute on function public.manage_admin_staff(uuid,text,uuid,text,text,public.staff_role,boolean) to authenticated;
