-- Local fixtures only; every row is rolled back and no external push is sent.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
('40000000-0000-4000-8000-000000000001','push-owner@example.test'),
('40000000-0000-4000-8000-000000000002','push-outsider@example.test');
select set_config('test.restaurant',(select id::text from public.restaurants where slug='sufra'),true);
insert into public.restaurant_members(restaurant_id,user_id,role,display_name,active) values(current_setting('test.restaurant')::uuid,'40000000-0000-4000-8000-000000000001','kitchen','Push fixture',true);
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
set local role authenticated;
insert into public.staff_push_subscriptions(restaurant_id,endpoint,p256dh,auth) values(current_setting('test.restaurant')::uuid,'https://fcm.googleapis.com/fcm/send/local-fixture',repeat('a',87),repeat('b',22));
do $$ begin
 begin
  insert into public.staff_push_subscriptions(restaurant_id,endpoint,p256dh,auth) values(current_setting('test.restaurant')::uuid,'https://127.0.0.1/private',repeat('a',87),repeat('b',22));
  raise exception 'Private network endpoint accepted';
 exception when check_violation then null; end;
 begin
  perform public.claim_order_push_jobs();raise exception 'Staff claimed server jobs';
 exception when insufficient_privilege then null; end;
 begin
  perform public.order_push_targets(current_setting('test.restaurant')::uuid);raise exception 'Staff read other device keys';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.staff_push_subscriptions) then raise exception 'Outsider saw device keys'; end if;
 begin
  insert into public.staff_push_subscriptions(restaurant_id,endpoint,p256dh,auth) values(current_setting('test.restaurant')::uuid,'https://fcm.googleapis.com/fcm/send/outsider',repeat('a',87),repeat('b',22));
  raise exception 'Outsider subscribed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.orders(restaurant_id,idempotency_key,mode,payment_method,subtotal_syp,total_syp,customer_phone)
values(current_setting('test.restaurant')::uuid,gen_random_uuid(),'takeaway','cash',100,100,'private-phone');
do $$ declare job public.order_push_jobs;
begin
 select * into job from public.order_push_jobs where restaurant_id=current_setting('test.restaurant')::uuid;
 if job.id is null then raise exception 'Order missing durable push job'; end if;
 if job.payload::text like '%private-phone%' then raise exception 'Phone leaked into push'; end if;
 if (select count(*) from public.order_push_targets(current_setting('test.restaurant')::uuid))<>1 then raise exception 'Active member missed'; end if;
 update public.restaurant_members set active=false where user_id='40000000-0000-4000-8000-000000000001';
 if exists(select 1 from public.order_push_targets(current_setting('test.restaurant')::uuid)) then raise exception 'Suspended member received push'; end if;
end $$;
set local role service_role;
do $$ declare total integer; begin
 select count(*) into total from public.claim_order_push_jobs();if total<>1 then raise exception 'Job not claimed'; end if;
 if exists(select 1 from public.claim_order_push_jobs()) then raise exception 'Leased job claimed twice'; end if;
end $$;
reset role;
rollback;
