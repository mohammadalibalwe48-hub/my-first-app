create or replace function private.bootstrap_initial_owner()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := lower(coalesce((select auth.email()), ''));
  owner_count integer;
  restaurant_count integer;
  inserted_count integer;
  confirmed_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if current_email <> 'admin@qrcode-syria.com' then
    raise exception 'This account is not eligible for initial owner onboarding';
  end if;

  select email_confirmed_at into confirmed_at
  from auth.users
  where id = current_user_id;
  if confirmed_at is null then
    raise exception 'Confirm the owner email before onboarding';
  end if;

  select count(*) into owner_count
  from public.restaurant_members
  where role = 'owner' and active;

  if owner_count > 0 then
    raise exception 'Initial owner onboarding has already been completed';
  end if;

  select count(*) into restaurant_count
  from public.restaurants
  where slug in ('sufra', 'cozy') and active;

  if restaurant_count <> 2 then
    raise exception 'Demo restaurants are not ready for onboarding';
  end if;

  insert into public.restaurant_members (restaurant_id, user_id, role, display_name, active)
  select r.id, current_user_id, 'owner', 'مالك سُفرة', true
  from public.restaurants r
  where r.slug in ('sufra', 'cozy')
  on conflict (restaurant_id, user_id) do update
    set role = excluded.role,
        display_name = excluded.display_name,
        active = true;

  get diagnostics inserted_count = row_count;
  return jsonb_build_object('success', true, 'restaurants', inserted_count);
end;
$$;
