-- Table QR tokens are capabilities: only restaurant staff may enumerate them.
-- Customers resolve a scanned token through get_public_menu instead.
drop policy if exists tables_public_resolve on public.restaurant_tables;
create policy tables_staff_select
on public.restaurant_tables for select to authenticated
using (private.is_restaurant_member(restaurant_id));

-- RLS must not be the only boundary protecting token enumeration.
revoke all privileges on table public.restaurant_tables from anon;
