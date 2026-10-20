create or replace function private.stable_sync_uuid(p_restaurant_id uuid, p_client_id text)
returns uuid
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select case
    when coalesce(p_client_id, '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then p_client_id::uuid
    else md5(p_restaurant_id::text || ':' || coalesce(p_client_id, ''))::uuid
  end;
$$;

do $$
declare fn text;
begin
  select pg_get_functiondef(p.oid) into fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='sync_admin_menu' and pg_get_function_identity_arguments(p.oid)='p_restaurant_id uuid, p_payload jsonb';
  fn := replace(fn, 'else gen_random_uuid()', 'else private.stable_sync_uuid(p_restaurant_id, category_entry ->> ''id'')');
  fn := replace(fn, 'else gen_random_uuid()', 'else private.stable_sync_uuid(p_restaurant_id, item_entry ->> ''id'')');
  fn := replace(fn, 'else gen_random_uuid()', 'else private.stable_sync_uuid(p_restaurant_id, group_entry ->> ''id'')');
  fn := replace(fn, 'else gen_random_uuid()', 'else private.stable_sync_uuid(p_restaurant_id, option_entry ->> ''id'')');
  execute fn;

  select pg_get_functiondef(p.oid) into fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='sync_admin_tables' and pg_get_function_identity_arguments(p.oid)='p_restaurant_id uuid, p_payload jsonb';
  fn := replace(fn, 'else gen_random_uuid()', 'else private.stable_sync_uuid(p_restaurant_id, entry ->> ''id'')');
  execute fn;
end $$;
