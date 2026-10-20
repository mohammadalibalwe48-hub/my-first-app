-- Device subscriptions are private to their signed-in owner and restaurant.
create table public.staff_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 endpoint text not null check (length(endpoint) < 2048 and endpoint ~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'),
 p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}=?$'),
 auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}={0,2}$'),
 created_at timestamptz not null default now(),
 unique(user_id,restaurant_id,endpoint)
);
alter table public.staff_push_subscriptions enable row level security;
revoke all on public.staff_push_subscriptions from anon,authenticated;
grant select,insert,update,delete on public.staff_push_subscriptions to authenticated;
grant all on public.staff_push_subscriptions to service_role;
create policy own_push_read on public.staff_push_subscriptions for select to authenticated using(user_id=auth.uid());
create policy own_push_insert on public.staff_push_subscriptions for insert to authenticated with check(user_id=auth.uid() and private.is_restaurant_member(restaurant_id));
create policy own_push_update on public.staff_push_subscriptions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and private.is_restaurant_member(restaurant_id));
create policy own_push_delete on public.staff_push_subscriptions for delete to authenticated using(user_id=auth.uid());

-- Transactional outbox: customer orders succeed even when a push provider is down.
create table public.order_push_jobs (
 id uuid primary key default gen_random_uuid(),
 order_id uuid unique references public.orders(id) on delete cascade,
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 test_subscription_id uuid references public.staff_push_subscriptions(id) on delete cascade,
 payload jsonb not null,
 delivered uuid[] not null default '{}',
 attempts integer not null default 0,
 lease uuid,
 next_attempt_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 check(order_id is not null or test_subscription_id is not null)
);
alter table public.order_push_jobs enable row level security;
revoke all on public.order_push_jobs from public,anon,authenticated;
grant all on public.order_push_jobs to service_role;
create index pending_order_push on public.order_push_jobs(next_attempt_at) where finished_at is null;

create function public.claim_order_push_jobs() returns setof public.order_push_jobs
language sql security definer set search_path='' as $$
 update public.order_push_jobs j set lease=gen_random_uuid(),attempts=j.attempts+1,next_attempt_at=now()+interval '2 minutes'
 where j.id in (select q.id from public.order_push_jobs q where q.finished_at is null and q.next_attempt_at<=now() and q.created_at>now()-interval '24 hours' order by q.created_at limit 10 for update skip locked)
 returning j.*;
$$;
revoke all on function public.claim_order_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_order_push_jobs() to service_role;

-- Re-check membership at send time, including suspended accounts and platform admins.
create function public.order_push_targets(p_restaurant_id uuid)
returns setof public.staff_push_subscriptions language sql stable security definer set search_path='' as $$
 select s.* from public.staff_push_subscriptions s where s.restaurant_id=p_restaurant_id and
 (exists(select 1 from public.restaurant_members m where m.user_id=s.user_id and m.restaurant_id=s.restaurant_id and m.active)
 or exists(select 1 from public.platform_admins a where a.user_id=s.user_id));
$$;
revoke all on function public.order_push_targets(uuid) from public,anon,authenticated;
grant execute on function public.order_push_targets(uuid) to service_role;

-- Replaced by the infrastructure migration; local SQL tests need no network extensions.
create function private.kick_order_push() returns void language plpgsql security definer set search_path='' as $$begin return; end$$;
revoke all on function private.kick_order_push() from public,anon,authenticated;
create function private.enqueue_order_push() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.restaurants;
begin
 select * into r from public.restaurants where id=new.restaurant_id;
 insert into public.order_push_jobs(order_id,restaurant_id,payload) values(new.id,new.restaurant_id,jsonb_build_object(
 'title','طلب جديد · '||r.name_ar,'body','وصل الطلب رقم '||new.order_number,
 'tag','order-'||new.id,'url','/admin/'||r.slug||'/orders'));
 perform private.kick_order_push();
 return new;
end$$;
revoke all on function private.enqueue_order_push() from public,anon,authenticated;
create trigger orders_enqueue_push after insert on public.orders for each row execute function private.enqueue_order_push();
