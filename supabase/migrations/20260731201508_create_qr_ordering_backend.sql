create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.staff_role as enum ('owner','manager','cashier','kitchen','viewer');
create type public.order_mode as enum ('dine-in','takeaway','delivery');
create type public.order_status as enum ('received','confirmed','preparing','ready','out-for-delivery','completed','cancelled');
create type public.payment_status as enum ('pending','verified','rejected','refunded');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_ar text not null,
  name_en text,
  subtitle_ar text not null default '',
  subtitle_en text not null default '',
  logo_url text,
  cover_url text,
  accent_color text not null default '#153a2f',
  phone text not null default '',
  whatsapp text not null default '',
  address_ar text not null default '',
  address_en text not null default '',
  map_url text,
  city text not null default '',
  neighborhood text not null default '',
  timezone text not null default 'Asia/Damascus',
  default_language text not null default 'ar' check (default_language in ('ar','en')),
  enabled_languages text[] not null default array['ar','en'],
  acceptance_state text not null default 'open' check (acceptance_state in ('open','paused','closed')),
  closure_message_ar text not null default '',
  closure_message_en text not null default '',
  currency text not null default 'SYP' check (currency = 'SYP'),
  usd_estimate_enabled boolean not null default true,
  exchange_rate_syp numeric(14,2) not null default 10000 check (exchange_rate_syp > 0),
  exchange_rate_updated_at timestamptz not null default now(),
  dine_in_enabled boolean not null default true,
  takeaway_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  tax_percent numeric(6,3) not null default 0 check (tax_percent between 0 and 100),
  service_percent numeric(6,3) not null default 0 check (service_percent between 0 and 100),
  privacy_ar text not null default '',
  privacy_en text not null default '',
  terms_ar text not null default '',
  terms_en text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_tenant_idx on public.restaurants(tenant_id);

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null default 'viewer',
  display_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (restaurant_id,user_id)
);
create index restaurant_members_user_idx on public.restaurant_members(user_id,restaurant_id);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  enabled boolean not null default true,
  opens_at time not null default '09:00',
  closes_at time not null default '23:00',
  unique (restaurant_id,weekday)
);

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider text not null,
  merchant_identifier text not null,
  instructions_ar text not null default '',
  instructions_en text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wallet_accounts_restaurant_idx on public.wallet_accounts(restaurant_id,sort_order);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name_ar text not null,
  name_en text not null default '',
  fee_syp bigint not null default 0 check (fee_syp >= 0),
  minimum_syp bigint not null default 0 check (minimum_syp >= 0),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (restaurant_id,name_ar)
);
create index delivery_zones_restaurant_idx on public.delivery_zones(restaurant_id,sort_order);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name_ar text not null,
  name_en text not null default '',
  description_ar text not null default '',
  description_en text not null default '',
  image_url text,
  visible boolean not null default true,
  archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id,name_ar)
);
create index categories_restaurant_idx on public.categories(restaurant_id,archived,sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name_ar text not null,
  name_en text not null default '',
  description_ar text not null default '',
  description_en text not null default '',
  image_url text,
  gallery_urls text[] not null default '{}',
  price_syp bigint not null check (price_syp >= 0),
  tags text[] not null default '{}',
  popular boolean not null default false,
  available boolean not null default true,
  visible boolean not null default true,
  archived boolean not null default false,
  preparation_minutes integer check (preparation_minutes is null or preparation_minutes > 0),
  sku text,
  sort_order integer not null default 0,
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_restaurant_idx on public.menu_items(restaurant_id,category_id,archived,sort_order);
create index menu_items_available_idx on public.menu_items(restaurant_id,available,visible) where not archived;

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name_ar text not null,
  name_en text not null default '',
  required boolean not null default false,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections > 0),
  reusable boolean not null default false,
  sort_order integer not null default 0,
  archived boolean not null default false,
  check (min_selections <= max_selections),
  check (not required or min_selections > 0)
);
create index option_groups_restaurant_idx on public.option_groups(restaurant_id,archived,sort_order);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.option_groups(id) on delete cascade,
  name_ar text not null,
  name_en text not null default '',
  price_delta_syp bigint not null default 0,
  available boolean not null default true,
  default_selected boolean not null default false,
  sort_order integer not null default 0
);
create index options_group_idx on public.options(option_group_id,sort_order);

create table public.menu_item_option_groups (
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  option_group_id uuid not null references public.option_groups(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (menu_item_id,option_group_id)
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_code text not null,
  label_ar text not null,
  label_en text not null default '',
  area text not null default '',
  qr_token uuid not null default gen_random_uuid() unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id,table_code)
);
create index restaurant_tables_restaurant_idx on public.restaurant_tables(restaurant_id,active);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_number bigint generated always as identity,
  public_token uuid not null default gen_random_uuid() unique,
  idempotency_key uuid not null,
  mode public.order_mode not null,
  status public.order_status not null default 'received',
  table_id uuid references public.restaurant_tables(id) on delete set null,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  customer_name text not null default '',
  customer_phone text not null default '',
  delivery_address text not null default '',
  pickup_time text not null default '',
  payment_method text not null,
  payment_status public.payment_status not null default 'pending',
  payment_reference text not null default '',
  subtotal_syp bigint not null check (subtotal_syp >= 0),
  service_charge_syp bigint not null default 0 check (service_charge_syp >= 0),
  tax_syp bigint not null default 0 check (tax_syp >= 0),
  delivery_fee_syp bigint not null default 0 check (delivery_fee_syp >= 0),
  total_syp bigint not null check (total_syp >= 0),
  exchange_rate_syp numeric(14,2),
  internal_note text not null default '',
  cancellation_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id,idempotency_key),
  unique (restaurant_id,order_number)
);
create index orders_restaurant_status_idx on public.orders(restaurant_id,status,created_at desc);
create index orders_restaurant_phone_idx on public.orders(restaurant_id,customer_phone);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name_ar text not null,
  item_name_en text not null default '',
  unit_price_syp bigint not null check (unit_price_syp >= 0),
  quantity integer not null check (quantity between 1 and 100),
  note text not null default '' check (char_length(note) <= 500),
  line_total_syp bigint not null check (line_total_syp >= 0)
);
create index order_lines_order_idx on public.order_lines(order_id);

create table public.order_line_options (
  id uuid primary key default gen_random_uuid(),
  order_line_id uuid not null references public.order_lines(id) on delete cascade,
  option_id uuid references public.options(id) on delete set null,
  option_name_ar text not null,
  option_name_en text not null default '',
  price_delta_syp bigint not null default 0
);
create index order_line_options_line_idx on public.order_line_options(order_line_id);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  actor_id uuid references auth.users(id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index order_status_events_order_idx on public.order_status_events(order_id,created_at);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_events_restaurant_idx on public.audit_events(restaurant_id,created_at desc);

create table public.whatsapp_dispatches (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending','sent','delivered','failed')),
  provider_message_id text,
  error_code text,
  retry_count integer not null default 0 check (retry_count >= 0),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index whatsapp_dispatches_order_idx on public.whatsapp_dispatches(order_id,created_at desc);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin new.updated_at = now(); return new; end; $$;

create trigger tenants_updated_at before update on public.tenants for each row execute function private.set_updated_at();
create trigger restaurants_updated_at before update on public.restaurants for each row execute function private.set_updated_at();
create trigger wallet_accounts_updated_at before update on public.wallet_accounts for each row execute function private.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function private.set_updated_at();
create trigger menu_items_updated_at before update on public.menu_items for each row execute function private.set_updated_at();
create trigger restaurant_tables_updated_at before update on public.restaurant_tables for each row execute function private.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function private.set_updated_at();
create trigger whatsapp_dispatches_updated_at before update on public.whatsapp_dispatches for each row execute function private.set_updated_at();

create or replace function private.is_restaurant_member(target uuid, allowed public.staff_role[] default null)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.restaurant_members m
    where m.restaurant_id = target and m.user_id = (select auth.uid()) and m.active
      and (allowed is null or m.role = any(allowed))
  );
$$;
revoke all on function private.is_restaurant_member(uuid,public.staff_role[]) from public;
grant execute on function private.is_restaurant_member(uuid,public.staff_role[]) to authenticated;

alter table public.tenants enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.business_hours enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.menu_item_option_groups enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_line_options enable row level security;
alter table public.order_status_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.whatsapp_dispatches enable row level security;

create policy tenants_staff_select on public.tenants for select to authenticated using (exists (select 1 from public.restaurants r where r.tenant_id=id and private.is_restaurant_member(r.id)));
create policy restaurants_public_select on public.restaurants for select to anon,authenticated using (active or private.is_restaurant_member(id));
create policy restaurants_staff_update on public.restaurants for update to authenticated using (private.is_restaurant_member(id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(id,array['owner','manager']::public.staff_role[]));
create policy members_select on public.restaurant_members for select to authenticated using (user_id=(select auth.uid()) or private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy members_manage on public.restaurant_members for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));

create policy hours_public_select on public.business_hours for select to anon,authenticated using (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.active));
create policy hours_staff_manage on public.business_hours for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy wallets_staff_select on public.wallet_accounts for select to authenticated using (private.is_restaurant_member(restaurant_id));
create policy wallets_staff_manage on public.wallet_accounts for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy zones_public_select on public.delivery_zones for select to anon,authenticated using (active or private.is_restaurant_member(restaurant_id));
create policy zones_staff_manage on public.delivery_zones for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy categories_public_select on public.categories for select to anon,authenticated using ((visible and not archived and exists(select 1 from public.restaurants r where r.id=restaurant_id and r.active)) or private.is_restaurant_member(restaurant_id));
create policy categories_staff_manage on public.categories for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy items_public_select on public.menu_items for select to anon,authenticated using ((visible and not archived and exists(select 1 from public.restaurants r where r.id=restaurant_id and r.active)) or private.is_restaurant_member(restaurant_id));
create policy items_staff_manage on public.menu_items for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy groups_public_select on public.option_groups for select to anon,authenticated using ((not archived and exists(select 1 from public.restaurants r where r.id=restaurant_id and r.active)) or private.is_restaurant_member(restaurant_id));
create policy groups_staff_manage on public.option_groups for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy options_public_select on public.options for select to anon,authenticated using (exists(select 1 from public.option_groups g where g.id=option_group_id and (not g.archived or private.is_restaurant_member(g.restaurant_id))));
create policy options_staff_manage on public.options for all to authenticated using (exists(select 1 from public.option_groups g where g.id=option_group_id and private.is_restaurant_member(g.restaurant_id,array['owner','manager']::public.staff_role[]))) with check (exists(select 1 from public.option_groups g where g.id=option_group_id and private.is_restaurant_member(g.restaurant_id,array['owner','manager']::public.staff_role[])));
create policy item_groups_public_select on public.menu_item_option_groups for select to anon,authenticated using (exists(select 1 from public.menu_items i where i.id=menu_item_id and (not i.archived or private.is_restaurant_member(i.restaurant_id))));
create policy item_groups_staff_manage on public.menu_item_option_groups for all to authenticated using (exists(select 1 from public.menu_items i where i.id=menu_item_id and private.is_restaurant_member(i.restaurant_id,array['owner','manager']::public.staff_role[]))) with check (exists(select 1 from public.menu_items i where i.id=menu_item_id and private.is_restaurant_member(i.restaurant_id,array['owner','manager']::public.staff_role[])));
create policy tables_public_resolve on public.restaurant_tables for select to anon,authenticated using (active or private.is_restaurant_member(restaurant_id));
create policy tables_staff_manage on public.restaurant_tables for all to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy orders_staff_select on public.orders for select to authenticated using (private.is_restaurant_member(restaurant_id));
create policy orders_staff_update on public.orders for update to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager','cashier','kitchen']::public.staff_role[])) with check (private.is_restaurant_member(restaurant_id,array['owner','manager','cashier','kitchen']::public.staff_role[]));
create policy order_lines_staff_select on public.order_lines for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and private.is_restaurant_member(o.restaurant_id)));
create policy line_options_staff_select on public.order_line_options for select to authenticated using (exists(select 1 from public.order_lines l join public.orders o on o.id=l.order_id where l.id=order_line_id and private.is_restaurant_member(o.restaurant_id)));
create policy status_events_staff_select on public.order_status_events for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and private.is_restaurant_member(o.restaurant_id)));
create policy audit_staff_select on public.audit_events for select to authenticated using (private.is_restaurant_member(restaurant_id,array['owner','manager']::public.staff_role[]));
create policy dispatch_staff_select on public.whatsapp_dispatches for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and private.is_restaurant_member(o.restaurant_id)));

revoke insert,update,delete on public.orders,public.order_lines,public.order_line_options,public.order_status_events,public.audit_events,public.whatsapp_dispatches from anon;
grant usage on schema public to anon,authenticated;
grant select on public.restaurants,public.business_hours,public.delivery_zones,public.categories,public.menu_items,public.option_groups,public.options,public.menu_item_option_groups,public.restaurant_tables to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.menu_items;
