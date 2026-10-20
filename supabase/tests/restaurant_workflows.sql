-- LOCAL regression tests. All fixtures and orders are rolled back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('20000000-0000-4000-8000-000000000001','workflow-owner@example.test'),
 ('20000000-0000-4000-8000-000000000002','workflow-kitchen@example.test'),
 ('20000000-0000-4000-8000-000000000003','workflow-cashier@example.test'),
 ('20000000-0000-4000-8000-000000000004','workflow-outsider@example.test');
insert into public.restaurant_members(restaurant_id,user_id,role,display_name,active)
select r.id,u.id,u.role::public.staff_role,'Workflow fixture',true
from public.restaurants r cross join (values
 ('20000000-0000-4000-8000-000000000001'::uuid,'owner'),
 ('20000000-0000-4000-8000-000000000002'::uuid,'kitchen'),
 ('20000000-0000-4000-8000-000000000003'::uuid,'cashier')) u(id,role)
where r.slug='sufra';
select set_config('test.restaurant',(select id::text from public.restaurants where slug='sufra'),true);
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.sync_admin_menu(current_setting('test.restaurant')::uuid,'{
 "categories":[{"id":"workflow-category","name":"Workflow test","en":"Workflow test"}],
 "items":[
  {"id":"workflow-item-a","name":"A","en":"A","category":"Workflow test","price":10000,"tags":[],"available":true,"preparationMinutes":20,"options":[{"id":"workflow-group-a","name":"Extras A","required":false,"options":[{"id":"workflow-option-a","name":"Extra A","price":100}]}]},
  {"id":"workflow-item-b","name":"B","en":"B","category":"Workflow test","price":5000,"tags":[],"available":true,"availableFrom":"2099-01-01T00:00:00Z","availableUntil":"2099-01-02T00:00:00Z","options":[{"id":"workflow-group-b","name":"Extras B","required":false,"options":[{"id":"workflow-option-b","name":"Extra B","price":200}]}]}
 ]}'::jsonb);
do $$ begin
 begin
  perform public.sync_admin_settings(current_setting('test.restaurant')::uuid,'{"discountPercent":-1}');
  raise exception 'Invalid discount accepted';
 exception when raise_exception then if sqlerrm <> 'invalid_discount' then raise; end if; end;
 perform public.sync_admin_settings(current_setting('test.restaurant')::uuid,'{"discountPercent":10,"taxPercent":10,"servicePercent":5,"enforceHours":false,"nameEn":"Test restaurant","hours":[{"weekday":1,"enabled":true,"open":"22:00","close":"02:00"}],"zones":[],"wallets":[]}');
end $$;
reset role;
do $$ begin
 if (select count(*) from public.menu_items where restaurant_id=current_setting('test.restaurant')::uuid and not archived)<>2 then raise exception 'New item IDs collided'; end if;
 if (select preparation_minutes from public.menu_items where name_ar='A' and restaurant_id=current_setting('test.restaurant')::uuid)<>20 then raise exception 'Preparation target not saved'; end if;
 if (select count(*) from public.option_groups where restaurant_id=current_setting('test.restaurant')::uuid and name_ar in ('Extras A','Extras B'))<>2 then raise exception 'Option group IDs collided'; end if;
end $$;
update public.restaurants set discount_percent=10,service_percent=5,tax_percent=10,enforce_business_hours=false,acceptance_state='open',takeaway_enabled=true where id=current_setting('test.restaurant')::uuid;
select set_config('test.itema',private.stable_sync_uuid(current_setting('test.restaurant')::uuid,'workflow-item-a')::text,true);
select set_config('test.itemb',private.stable_sync_uuid(current_setting('test.restaurant')::uuid,'workflow-item-b')::text,true);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare receipt jsonb; duplicate jsonb; payload jsonb;
begin
 payload := jsonb_build_object('restaurantSlug','sufra','idempotencyKey',gen_random_uuid(),'mode','takeaway','phone','test','lines',jsonb_build_array(jsonb_build_object('itemId',current_setting('test.itema')::uuid,'quantity',1,'optionIds','[]'::jsonb)));
 receipt := public.submit_public_order(payload);
 if (receipt->>'total')::bigint<>10350 then raise exception 'Incorrect server discount/fees: %',receipt; end if;
 perform set_config('test.order',receipt->>'id',true);
 duplicate := public.submit_public_order(payload);
 if duplicate->>'id'<>receipt->>'id' or not (duplicate->>'duplicate')::boolean then raise exception 'Order retry was not idempotent'; end if;
 begin
  payload := jsonb_set(jsonb_set(payload,'{idempotencyKey}',to_jsonb(gen_random_uuid())),'{lines,0,itemId}',to_jsonb(current_setting('test.itemb')::uuid));
  perform public.submit_public_order(payload);
  raise exception 'Scheduled item unexpectedly ordered';
 exception when raise_exception then if sqlerrm <> 'item_unavailable' then raise; end if; end;
end $$;
reset role;
-- PostgreSQL now() is constant in this transaction; use a mismatched version for the stale check.
select set_config('test.stale',(select updated_at::text from public.orders where id=current_setting('test.order')::uuid),true);
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 begin
  perform public.staff_update_order(current_setting('test.order')::uuid,'{"payment_status":"verified"}');
  raise exception 'Kitchen changed a payment';
 exception when insufficient_privilege then null; end;
 begin
  update public.orders set total_syp=1 where id=current_setting('test.order')::uuid;
  raise exception 'Staff changed server-calculated total';
 exception when insufficient_privilege then null; end;
 perform public.staff_update_order(current_setting('test.order')::uuid,'{"status":"confirmed"}',current_setting('test.stale')::timestamptz);
 begin
  perform public.staff_update_order(current_setting('test.order')::uuid,'{"status":"preparing"}',current_setting('test.stale')::timestamptz - interval '1 second');
  raise exception 'Stale desk overwrote newer order';
 exception when raise_exception then if sqlerrm <> 'order_changed_refresh_required' then raise; end if; end;
 perform public.staff_update_order(current_setting('test.order')::uuid,'{"status":"preparing"}');
 perform public.staff_update_order(current_setting('test.order')::uuid,'{"status":"ready"}');
 perform public.set_item_availability(current_setting('test.restaurant')::uuid,current_setting('test.itema')::uuid,false);
end $$;
reset role;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin
 begin
  perform public.staff_update_order(current_setting('test.order')::uuid,'{"status":"completed"}');
  raise exception 'Unpaid order completed';
 exception when raise_exception then if sqlerrm <> 'payment_not_verified' then raise; end if; end;
 perform public.staff_update_order(current_setting('test.order')::uuid,'{"payment_status":"verified"}');
 perform public.staff_update_order(current_setting('test.order')::uuid,'{"status":"completed"}');
 begin
  perform public.set_item_availability(current_setting('test.restaurant')::uuid,current_setting('test.itema')::uuid,true);
  raise exception 'Cashier edited menu stock';
 exception when insufficient_privilege then null; end;
 begin
  update public.restaurant_members set role='owner' where user_id='20000000-0000-4000-8000-000000000003';
  raise exception 'Staff escalated their role';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$ begin
 begin
  perform public.staff_update_order(current_setting('test.order')::uuid,'{"payment_status":"rejected"}');
  raise exception 'Outsider edited another restaurant order';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.restaurants set enforce_business_hours=true,timezone='Asia/Damascus' where id=current_setting('test.restaurant')::uuid;
update public.business_hours set enabled=false where restaurant_id=current_setting('test.restaurant')::uuid;
update public.business_hours set enabled=true,opens_at='22:00',closes_at='02:00' where restaurant_id=current_setting('test.restaurant')::uuid and weekday=1;
do $$ begin
 if not private.restaurant_is_open(current_setting('test.restaurant')::uuid,'2026-10-20 01:00+03') then raise exception 'Overnight hours rejected'; end if;
 if private.restaurant_is_open(current_setting('test.restaurant')::uuid,'2026-10-20 03:00+03') then raise exception 'Closing time ignored'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform public.submit_public_order(jsonb_build_object('restaurantSlug','sufra','idempotencyKey',gen_random_uuid(),'mode','takeaway','phone','test','lines','[]'::jsonb));
  raise exception 'Closed restaurant accepted an order';
 exception when raise_exception then if sqlerrm <> 'outside_business_hours' then raise; end if; end;
end $$;
reset role;
rollback;
