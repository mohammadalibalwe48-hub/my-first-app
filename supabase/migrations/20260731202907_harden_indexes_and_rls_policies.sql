create index if not exists audit_events_actor_id_idx on public.audit_events (actor_id);
create index if not exists menu_item_option_groups_option_group_id_idx on public.menu_item_option_groups (option_group_id);
create index if not exists menu_items_category_id_idx on public.menu_items (category_id);
create index if not exists order_line_options_option_id_idx on public.order_line_options (option_id);
create index if not exists order_lines_menu_item_id_idx on public.order_lines (menu_item_id);
create index if not exists order_status_events_actor_id_idx on public.order_status_events (actor_id);
create index if not exists orders_delivery_zone_id_idx on public.orders (delivery_zone_id);
create index if not exists orders_table_id_idx on public.orders (table_id);

-- Correct the tenant visibility correlation.
drop policy if exists tenants_staff_select on public.tenants;
create policy tenants_staff_select on public.tenants
for select to authenticated
using (
  exists (
    select 1
    from public.restaurants r
    where r.tenant_id = tenants.id
      and (select private.is_restaurant_member(r.id))
  )
);

-- Replace broad ALL policies with operation-specific write policies so they
-- do not overlap the intentionally broader SELECT policies.
drop policy if exists hours_staff_manage on public.business_hours;
create policy hours_staff_insert on public.business_hours for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy hours_staff_update on public.business_hours for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy hours_staff_delete on public.business_hours for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));

drop policy if exists categories_staff_manage on public.categories;
create policy categories_staff_insert on public.categories for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy categories_staff_update on public.categories for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy categories_staff_delete on public.categories for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));

drop policy if exists zones_staff_manage on public.delivery_zones;
create policy zones_staff_insert on public.delivery_zones for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy zones_staff_update on public.delivery_zones for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy zones_staff_delete on public.delivery_zones for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));

drop policy if exists items_staff_manage on public.menu_items;
create policy items_staff_insert on public.menu_items for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy items_staff_update on public.menu_items for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy items_staff_delete on public.menu_items for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));

drop policy if exists groups_staff_manage on public.option_groups;
create policy groups_staff_insert on public.option_groups for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy groups_staff_update on public.option_groups for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy groups_staff_delete on public.option_groups for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));

drop policy if exists options_staff_manage on public.options;
create policy options_staff_insert on public.options for insert to authenticated
with check (exists (select 1 from public.option_groups g where g.id = option_group_id and (select private.is_restaurant_member(g.restaurant_id, array['owner','manager']::public.staff_role[]))));
create policy options_staff_update on public.options for update to authenticated
using (exists (select 1 from public.option_groups g where g.id = option_group_id and (select private.is_restaurant_member(g.restaurant_id, array['owner','manager']::public.staff_role[]))))
with check (exists (select 1 from public.option_groups g where g.id = option_group_id and (select private.is_restaurant_member(g.restaurant_id, array['owner','manager']::public.staff_role[]))));
create policy options_staff_delete on public.options for delete to authenticated
using (exists (select 1 from public.option_groups g where g.id = option_group_id and (select private.is_restaurant_member(g.restaurant_id, array['owner','manager']::public.staff_role[]))));

drop policy if exists item_groups_staff_manage on public.menu_item_option_groups;
create policy item_groups_staff_insert on public.menu_item_option_groups for insert to authenticated
with check (exists (select 1 from public.menu_items i where i.id = menu_item_id and (select private.is_restaurant_member(i.restaurant_id, array['owner','manager']::public.staff_role[]))));
create policy item_groups_staff_update on public.menu_item_option_groups for update to authenticated
using (exists (select 1 from public.menu_items i where i.id = menu_item_id and (select private.is_restaurant_member(i.restaurant_id, array['owner','manager']::public.staff_role[]))))
with check (exists (select 1 from public.menu_items i where i.id = menu_item_id and (select private.is_restaurant_member(i.restaurant_id, array['owner','manager']::public.staff_role[]))));
create policy item_groups_staff_delete on public.menu_item_option_groups for delete to authenticated
using (exists (select 1 from public.menu_items i where i.id = menu_item_id and (select private.is_restaurant_member(i.restaurant_id, array['owner','manager']::public.staff_role[]))));

drop policy if exists tables_staff_manage on public.restaurant_tables;
create policy tables_staff_insert on public.restaurant_tables for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy tables_staff_update on public.restaurant_tables for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy tables_staff_delete on public.restaurant_tables for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));

drop policy if exists wallets_staff_manage on public.wallet_accounts;
create policy wallets_staff_insert on public.wallet_accounts for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy wallets_staff_update on public.wallet_accounts for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy wallets_staff_delete on public.wallet_accounts for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));

drop policy if exists members_manage on public.restaurant_members;
create policy members_staff_insert on public.restaurant_members for insert to authenticated
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy members_staff_update on public.restaurant_members for update to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])))
with check ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
create policy members_staff_delete on public.restaurant_members for delete to authenticated
using ((select private.is_restaurant_member(restaurant_id, array['owner','manager']::public.staff_role[])));
