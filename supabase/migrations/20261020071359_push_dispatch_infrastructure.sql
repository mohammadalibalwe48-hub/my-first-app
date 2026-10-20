-- Hosted Supabase extensions; test_database.py tests the outbox separately.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create or replace function private.kick_order_push() returns void language plpgsql security definer set search_path='' as $$
declare token text;
begin
 select decrypted_secret into token from vault.decrypted_secrets where name='order_push_dispatch_secret' limit 1;
 if token is null then return; end if;
 perform net.http_post(url:='https://xgkpoxyirycravtxfyes.supabase.co/functions/v1/order-push',
 headers:=jsonb_build_object('Content-Type','application/json','x-dispatch-secret',token),body:='{}'::jsonb,timeout_milliseconds:=5000);
exception when others then
 -- The durable queue is retried by cron; an external outage must not reject an order.
 raise warning 'Push dispatch deferred (SQLSTATE %)',sqlstate;
end$$;
revoke all on function private.kick_order_push() from public,anon,authenticated;
select cron.schedule('order-push-retry','* * * * *',$$select private.kick_order_push() where exists(select 1 from public.order_push_jobs where finished_at is null and next_attempt_at<=now() and created_at>now()-interval '24 hours')$$);
select cron.schedule('order-push-cleanup','17 3 * * *',$$delete from public.order_push_jobs where created_at<now()-interval '2 days'$$);
