-- Keep privileged implementations outside the exposed API schema. Public wrappers
-- are invokers with explicit signatures and are the only callable Data API surface.
alter function public.get_public_menu(text, uuid) set schema private;
alter function public.submit_public_order(jsonb) set schema private;
alter function public.track_public_order(uuid) set schema private;

revoke all on function private.get_public_menu(text, uuid) from public, anon, authenticated;
revoke all on function private.submit_public_order(jsonb) from public, anon, authenticated;
revoke all on function private.track_public_order(uuid) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.get_public_menu(text, uuid) to anon, authenticated;
grant execute on function private.submit_public_order(jsonb) to anon, authenticated;
grant execute on function private.track_public_order(uuid) to anon, authenticated;

create function public.get_public_menu(p_slug text, p_table_token uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.get_public_menu(p_slug, p_table_token);
$$;

create function public.submit_public_order(p_payload jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.submit_public_order(p_payload);
$$;

create function public.track_public_order(p_token uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.track_public_order(p_token);
$$;

revoke all on function public.get_public_menu(text, uuid) from public;
revoke all on function public.submit_public_order(jsonb) from public;
revoke all on function public.track_public_order(uuid) from public;
grant execute on function public.get_public_menu(text, uuid) to anon, authenticated;
grant execute on function public.submit_public_order(jsonb) to anon, authenticated;
grant execute on function public.track_public_order(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
