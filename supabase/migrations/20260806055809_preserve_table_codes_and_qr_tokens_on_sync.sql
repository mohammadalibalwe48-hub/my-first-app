create or replace function private.sync_admin_tables(p_restaurant_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'pg_temp'
as $function$
declare
  entry jsonb;
  table_id uuid;
  table_code text;
  table_ids uuid[] := '{}';
begin
  if not private.is_restaurant_member(
    p_restaurant_id,
    array['owner', 'manager']::public.staff_role[]
  ) then
    raise exception 'Owner or manager access is required';
  end if;

  if jsonb_typeof(p_payload) <> 'array' then
    raise exception 'Invalid table payload';
  end if;

  for entry in select value from jsonb_array_elements(p_payload)
  loop
    table_code := left(trim(coalesce(nullif(entry ->> 'code', ''), entry ->> 'id', '')), 40);
    if table_code = '' then
      raise exception 'Table code is required';
    end if;

    table_id := case
      when coalesce(entry ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (entry ->> 'id')::uuid
      else private.stable_sync_uuid(p_restaurant_id, table_code)
    end;

    insert into public.restaurant_tables(
      id, restaurant_id, table_code, label_ar, label_en, area, active
    ) values (
      table_id,
      p_restaurant_id,
      table_code,
      left(trim(coalesce(entry ->> 'name', 'طاولة')), 120),
      left(trim(coalesce(entry ->> 'name', 'Table')), 120),
      left(trim(coalesce(entry ->> 'area', '')), 120),
      coalesce((entry ->> 'active')::boolean, true)
    )
    on conflict (id) do update set
      table_code = excluded.table_code,
      label_ar = excluded.label_ar,
      label_en = excluded.label_en,
      area = excluded.area,
      active = excluded.active,
      updated_at = now()
    where restaurant_tables.restaurant_id = p_restaurant_id;

    table_ids := array_append(table_ids, table_id);
  end loop;

  update public.restaurant_tables
  set active = false, updated_at = now()
  where restaurant_id = p_restaurant_id
    and not (id = any(table_ids));

  return jsonb_build_object('success', true);
end;
$function$;
