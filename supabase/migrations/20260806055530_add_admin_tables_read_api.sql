create or replace function private.get_admin_tables(p_restaurant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private', 'pg_temp'
as $function$
begin
  if not private.is_restaurant_member(
    p_restaurant_id,
    array['owner', 'manager']::public.staff_role[]
  ) then
    raise exception 'Owner or manager access is required';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'code', t.table_code,
          'name', t.label_ar,
          'area', t.area,
          'active', t.active,
          'qrToken', t.qr_token
        )
        order by t.created_at, t.table_code
      )
      from public.restaurant_tables t
      where t.restaurant_id = p_restaurant_id
    ),
    '[]'::jsonb
  );
end;
$function$;

create or replace function public.get_admin_tables(p_restaurant_id uuid)
returns jsonb
language sql
stable
set search_path to 'pg_catalog', 'public', 'private', 'pg_temp'
as $function$
  select private.get_admin_tables(p_restaurant_id);
$function$;

revoke all on function public.get_admin_tables(uuid) from public;
revoke all on function public.get_admin_tables(uuid) from anon;
grant execute on function public.get_admin_tables(uuid) to authenticated;
