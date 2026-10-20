create or replace function private.menu_design_sanitize(p_design jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'pg_catalog', 'public', 'private', 'pg_temp'
as $fn$
begin
  if p_design is null or jsonb_typeof(p_design) <> 'object' then
    return '{}'::jsonb;
  end if;
  if octet_length(p_design::text) > 48000 then
    raise exception 'menu_design_too_large' using errcode = 'P0001';
  end if;
  return p_design;
end;
$fn$;

create or replace function private.sync_menu_design(p_restaurant_id uuid, p_design jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'pg_temp'
as $fn$
declare
  v_design jsonb;
begin
  if not private.is_restaurant_member(
    p_restaurant_id,
    array['owner', 'manager']::public.staff_role[]
  ) then
    raise exception 'Owner or manager access is required';
  end if;
  v_design := private.menu_design_sanitize(p_design);
  update public.restaurants
     set menu_design = v_design,
         updated_at = now()
   where id = p_restaurant_id;
  return v_design;
end;
$fn$;

create or replace function public.sync_menu_design(p_restaurant_id uuid, p_design jsonb)
returns jsonb
language sql
set search_path to 'pg_catalog', 'public', 'private', 'pg_temp'
as $fn$
  select private.sync_menu_design(p_restaurant_id, p_design);
$fn$;

revoke all on function public.sync_menu_design(uuid, jsonb) from public;
grant execute on function public.sync_menu_design(uuid, jsonb) to authenticated;
