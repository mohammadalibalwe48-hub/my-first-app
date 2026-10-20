create or replace function private.get_admin_reports(
  p_restaurant_id uuid,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
stable security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
declare
  result jsonb;
begin
  if not private.is_restaurant_member(p_restaurant_id, array['owner','manager','cashier','kitchen','viewer']::public.staff_role[]) then
    raise exception 'Restaurant membership is required';
  end if;
  with scoped as (
    select o.id, o.mode, o.status, o.total_syp, o.created_at
    from public.orders o
    where o.restaurant_id = p_restaurant_id
      and (p_from is null or o.created_at >= p_from::timestamptz)
      and (p_to is null or o.created_at < (p_to + 1)::timestamptz)
  ),
  item_sales as (
    select ol.item_name_ar as name, sum(ol.quantity)::integer as qty, sum(ol.line_total_syp)::bigint as revenue
    from public.order_lines ol join scoped s on s.id = ol.order_id
    where s.status <> 'cancelled'::public.order_status
    group by ol.item_name_ar
    order by qty desc, revenue desc
    limit 8
  )
  select jsonb_build_object(
    'orderCount', (select count(*) from scoped),
    'paidOrderCount', (select count(*) from scoped where status <> 'cancelled'::public.order_status),
    'cancelledOrderCount', (select count(*) from scoped where status = 'cancelled'::public.order_status),
    'revenue', coalesce((select sum(total_syp) from scoped where status <> 'cancelled'::public.order_status), 0),
    'byMode', coalesce((select jsonb_agg(jsonb_build_object('mode', mode, 'count', count, 'revenue', revenue) order by mode) from (select mode, count(*)::integer, coalesce(sum(total_syp) filter (where status <> 'cancelled'::public.order_status), 0)::bigint as revenue from scoped group by mode) modes), '[]'::jsonb),
    'topItems', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'revenue', revenue)) from item_sales), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_admin_reports(
  p_restaurant_id uuid,
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable security invoker
set search_path = public, pg_temp
as $$ select private.get_admin_reports($1, $2, $3); $$;

grant execute on function public.get_admin_reports(uuid,date,date) to authenticated;
