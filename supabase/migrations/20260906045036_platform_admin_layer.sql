-- ============================================================
-- Platform (main) admin layer: cross-restaurant analytics
-- ============================================================

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null
);

alter table public.platform_admins enable row level security;

-- Recursive-safe membership check (security definer, bypasses RLS on the table)
create or replace function public.pf_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  )
$$;

drop policy if exists "platform_admins_select" on public.platform_admins;
create policy "platform_admins_select"
  on public.platform_admins
  for select
  using (public.pf_user_is_platform_admin());

drop policy if exists "platform_admins_manage" on public.platform_admins;
create policy "platform_admins_manage"
  on public.platform_admins
  for all
  using (public.pf_user_is_platform_admin())
  with check (public.pf_user_is_platform_admin());

-- Self-promotion for the bootstrapped owner, plus "am I an admin?" check
create or replace function public.pf_ensure_platform_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.email();
begin
  if v_uid is null then
    return false;
  end if;
  if coalesce(lower(v_email), '') = 'admin@qrcode-syria.com' then
    insert into public.platform_admins (user_id, granted_by)
    values (v_uid, v_uid)
    on conflict (user_id) do nothing;
  end if;
  return exists (select 1 from public.platform_admins where user_id = v_uid);
end;
$$;

revoke all on table public.platform_admins from anon, authenticated;
grant execute on function public.pf_user_is_platform_admin() to authenticated;
grant execute on function public.pf_ensure_platform_admin() to authenticated;

-- ============================================================
-- Cross-restaurant analytics overview
-- ============================================================
create or replace function public.pf_platform_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if not public.pf_user_is_platform_admin() then
    raise exception 'forbidden';
  end if;

  with agg as (
    select
      r.id,
      r.slug,
      r.name_ar,
      r.name_en,
      r.city,
      r.neighborhood,
      coalesce(r.accent_color, '#153a2f') as accent_color,
      r.acceptance_state,
      count(o.id) as order_count,
      count(o.id) filter (
        where o.status in ('received','confirmed','preparing','ready','out-for-delivery')
      ) as active_orders,
      coalesce(sum(o.total_syp) filter (where o.status <> 'cancelled'), 0) as revenue_syp,
      max(o.created_at) as last_order_at,
      (select count(*)::int from public.restaurant_tables t
        where t.restaurant_id = r.id and t.active) as table_count,
      (select count(*)::int from public.restaurant_members m
        where m.restaurant_id = r.id and m.active) as staff_count
    from public.restaurants r
    left join public.orders o on o.restaurant_id = r.id
    where r.active = true
    group by r.id
  ),
  statuses as (
    select o.restaurant_id, o.status::text as status, count(*)::int as n
    from public.orders o
    group by o.restaurant_id, o.status
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'totals', (
      select jsonb_build_object(
        'restaurants', count(*)::int,
        'orders', coalesce(sum(order_count)::int, 0),
        'activeOrders', coalesce(sum(active_orders)::int, 0),
        'revenueSyp', coalesce(sum(revenue_syp), 0)
      ) from agg
    ),
    'restaurants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id,
        'slug', a.slug,
        'nameAr', a.name_ar,
        'nameEn', a.name_en,
        'city', a.city,
        'neighborhood', a.neighborhood,
        'accent', a.accent_color,
        'acceptanceState', a.acceptance_state,
        'orderCount', a.order_count,
        'activeOrders', a.active_orders,
        'revenueSyp', a.revenue_syp,
        'lastOrderAt', a.last_order_at,
        'tableCount', a.table_count,
        'staffCount', a.staff_count,
        'statusBreakdown', (
          select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
          from statuses s where s.restaurant_id = a.id
        )
      ) order by a.revenue_syp desc), '[]'::jsonb)
      from agg a
    )
  ) into v_out;

  return v_out;
end;
$$;

grant execute on function public.pf_platform_overview() to authenticated;

-- ============================================================
-- Cross-restaurant recent orders (platform view)
-- ============================================================
create or replace function public.pf_platform_orders(p_limit integer default 250)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if not public.pf_user_is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(row_to_json), '[]'::jsonb)
  into v_out
  from (
    select
      o.id,
      o.order_number,
      o.public_token,
      o.mode::text as mode,
      o.status::text as status,
      o.payment_status::text as payment_status,
      o.total_syp as total_syp,
      o.customer_name,
      o.created_at,
      o.updated_at,
      r.slug as restaurant_slug,
      r.name_ar as restaurant_name,
      r.accent_color,
      t.label_ar as table_label,
      coalesce(ol.item_count, 0) as item_count
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    left join public.restaurant_tables t on t.id = o.table_id
    left join lateral (
      select count(*)::int as item_count
      from public.order_lines x where x.order_id = o.id
    ) ol on true
    order by o.created_at desc
    limit greatest(1, least(p_limit, 1000))
  ) row_to_json;

  return v_out;
end;
$$;

grant execute on function public.pf_platform_orders(integer) to authenticated;
