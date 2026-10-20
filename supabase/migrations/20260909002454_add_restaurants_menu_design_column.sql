alter table public.restaurants
  add column if not exists menu_design jsonb not null default '{}'::jsonb;

comment on column public.restaurants.menu_design is
  'Owner-authored menu design/theme configuration consumed by the public storefront.';
