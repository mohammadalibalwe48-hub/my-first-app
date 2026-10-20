-- Run against a migrated LOCAL database as postgres. All fixtures roll back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','qr-security-staff@example.test'),
 ('10000000-0000-4000-8000-000000000002','qr-security-outsider@example.test');
insert into public.restaurant_members(restaurant_id,user_id,role,display_name,active)
select id,'10000000-0000-4000-8000-000000000001','manager','Security test',true
from public.restaurants where slug='sufra';

-- Every public table must retain RLS.
do $$ begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) then
  raise exception 'Public table without RLS';
 end if;
 if has_table_privilege('anon','public.restaurant_tables','SELECT') then
  raise exception 'Anonymous SELECT grant still exposes table tokens';
 end if;
end $$;

set local role anon;
do $$
declare result jsonb; token uuid;
begin
 begin
  select qr_token into token from public.restaurant_tables limit 1;
  raise exception 'Anonymous table-token read unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
 result := public.get_public_menu('sufra',null);
 if result->'restaurant'->>'slug' is distinct from 'sufra' or jsonb_array_length(result->'items')=0 then
  raise exception 'Public menu broke';
 end if;
 if result->'table' is distinct from 'null'::jsonb then
  raise exception 'Menu returned a table without a scanned token';
 end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$
declare result jsonb; token uuid;
begin
 if not exists(select 1 from public.restaurant_tables) then
  raise exception 'Staff lost access to their tables';
 end if;
 if exists(select 1 from public.restaurant_tables t join public.restaurants r on r.id=t.restaurant_id where r.slug<>'sufra') then
  raise exception 'Cross-restaurant table access';
 end if;
 select t.qr_token into token from public.restaurant_tables t join public.restaurants r on r.id=t.restaurant_id where r.slug='sufra' and t.active limit 1;
 perform set_config('qr_test.scanned_token',token::text,true);
 result := public.get_admin_tables((select id from public.restaurants where slug='sufra'));
 if jsonb_array_length(result)=0 then raise exception 'Admin QR management broke'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.restaurant_tables) then raise exception 'Nonmember can enumerate table tokens'; end if;
end $$;
reset role;

-- A customer who already scanned a token can still resolve that table.
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$
declare result jsonb;
begin
 result := public.get_public_menu('sufra',current_setting('qr_test.scanned_token')::uuid);
 if result->'table' = 'null'::jsonb then raise exception 'Scanned-token resolution broke'; end if;
 result := public.get_public_menu('cozy',current_setting('qr_test.scanned_token')::uuid);
 if result->'table' is distinct from 'null'::jsonb then raise exception 'Token accepted for wrong restaurant'; end if;
end $$;
reset role;
rollback;
