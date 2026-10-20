-- Backward-compatible defaults leave existing opening hours and prices unchanged.
alter table public.restaurants add column discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100);
alter table public.restaurants add column enforce_business_hours boolean not null default false;
alter table public.orders add column discount_syp bigint not null default 0 check (discount_syp >= 0);
alter table public.menu_items add constraint menu_item_availability_window check (available_from is null or available_until is null or available_until > available_from) not valid;

create or replace function private.restaurant_is_open(p_restaurant_id uuid, p_at timestamptz default now())
returns boolean language sql stable security invoker set search_path = '' as $fn$
select not r.enforce_business_hours or not exists(select 1 from public.business_hours where restaurant_id=r.id) or exists(
 select 1 from public.business_hours h cross join lateral (select p_at at time zone r.timezone as local_time) l
 where h.restaurant_id=r.id and h.enabled and (
 (h.weekday=extract(dow from l.local_time) and ((h.opens_at<h.closes_at and l.local_time::time>=h.opens_at and l.local_time::time<h.closes_at) or (h.opens_at>h.closes_at and l.local_time::time>=h.opens_at)))
 or (h.weekday=mod(extract(dow from l.local_time)::int+6,7) and h.opens_at>h.closes_at and l.local_time::time<h.closes_at)
 )) from public.restaurants r where r.id=p_restaurant_id;
$fn$;
revoke all on function private.restaurant_is_open(uuid,timestamptz) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION private.sync_admin_settings(p_restaurant_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'pg_temp'
AS $function$
declare
  hour_entry jsonb;
  zone_entry jsonb;
  wallet_entry jsonb;
  zone_id uuid;
  zone_ids uuid[] := '{}';
  provider_names text[] := '{}';
begin
  if not private.is_restaurant_member(
    p_restaurant_id,
    array['owner', 'manager']::public.staff_role[]
  ) then
    raise exception 'Owner or manager access is required';
  end if;

  if coalesce((p_payload->>'discountPercent')::numeric,0) not between 0 and 100 then raise exception 'invalid_discount'; end if;
  update public.restaurants set
    discount_percent = coalesce((p_payload->>'discountPercent')::numeric, discount_percent),
    enforce_business_hours = coalesce((p_payload->>'enforceHours')::boolean, enforce_business_hours),
    name_en = left(trim(coalesce(p_payload->>'nameEn',name_en)),180),
    subtitle_en = coalesce(p_payload->>'subtitleEn',subtitle_en),
    name_ar = left(trim(coalesce(p_payload ->> 'name', name_ar)), 180),
    subtitle_ar = coalesce(p_payload ->> 'subtitle', subtitle_ar),
    city = left(trim(coalesce(p_payload ->> 'city', city)), 120),
    neighborhood = left(trim(coalesce(p_payload ->> 'neighborhood', neighborhood)), 160),
    phone = left(trim(coalesce(p_payload ->> 'phone', phone)), 60),
    whatsapp = left(trim(coalesce(p_payload ->> 'whatsapp', whatsapp)), 60),
    exchange_rate_syp = greatest(coalesce((p_payload ->> 'rate')::numeric, exchange_rate_syp), 1),
    tax_percent = greatest(least(coalesce((p_payload ->> 'taxPercent')::numeric, tax_percent), 100), 0),
    service_percent = greatest(least(coalesce((p_payload ->> 'servicePercent')::numeric, service_percent), 100), 0),
    dine_in_enabled = coalesce((p_payload ->> 'dineIn')::boolean, dine_in_enabled),
    takeaway_enabled = coalesce((p_payload ->> 'takeaway')::boolean, takeaway_enabled),
    delivery_enabled = coalesce((p_payload ->> 'delivery')::boolean, delivery_enabled),
    usd_estimate_enabled = coalesce((p_payload ->> 'currencyEstimate')::boolean, usd_estimate_enabled),
    latitude = case when (p_payload ? 'latitude') then nullif(p_payload ->> 'latitude','')::numeric else latitude end,
    longitude = case when (p_payload ? 'longitude') then nullif(p_payload ->> 'longitude','')::numeric else longitude end,
    dinein_geofence_meters = greatest(least(coalesce(nullif(p_payload ->> 'geofenceMeters','')::integer, dinein_geofence_meters), 5000), 10),
    exchange_rate_updated_at = now(),
    updated_at = now()
  where id = p_restaurant_id;

  delete from public.business_hours where restaurant_id = p_restaurant_id;
  for hour_entry in select value from jsonb_array_elements(coalesce(p_payload -> 'hours', '[]'::jsonb))
  loop
    insert into public.business_hours(
      restaurant_id, weekday, enabled, opens_at, closes_at
    ) values (
      p_restaurant_id,
      coalesce((hour_entry ->> 'weekday')::smallint, 0),
      coalesce((hour_entry ->> 'enabled')::boolean, true),
      coalesce(nullif(hour_entry ->> 'open', '')::time, '09:00'::time),
      coalesce(nullif(hour_entry ->> 'close', '')::time, '23:00'::time)
    );
  end loop;

  for zone_entry in select value from jsonb_array_elements(coalesce(p_payload -> 'zones', '[]'::jsonb))
  loop
    zone_id := case
      when coalesce(zone_entry ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (zone_entry ->> 'id')::uuid
      else gen_random_uuid()
    end;
    insert into public.delivery_zones(
      id, restaurant_id, name_ar, name_en, fee_syp, minimum_syp,
      active, sort_order
    ) values (
      zone_id, p_restaurant_id,
      left(trim(coalesce(zone_entry ->> 'name', '')), 160),
      left(trim(coalesce(zone_entry ->> 'name', '')), 160),
      greatest(coalesce((zone_entry ->> 'fee')::bigint, 0), 0),
      greatest(coalesce((zone_entry ->> 'minimum')::bigint, 0), 0),
      coalesce((zone_entry ->> 'active')::boolean, true), cardinality(zone_ids)
    )
    on conflict (id) do update set
      name_ar = excluded.name_ar,
      name_en = excluded.name_en,
      fee_syp = excluded.fee_syp,
      minimum_syp = excluded.minimum_syp,
      active = excluded.active,
      sort_order = excluded.sort_order
    where delivery_zones.restaurant_id = p_restaurant_id;
    zone_ids := array_append(zone_ids, zone_id);
  end loop;
  update public.delivery_zones set active = false
  where restaurant_id = p_restaurant_id and not (id = any(zone_ids));

  for wallet_entry in select value from jsonb_array_elements(coalesce(p_payload -> 'wallets', '[]'::jsonb))
  loop
    provider_names := array_append(provider_names, wallet_entry ->> 'provider');
    insert into public.wallet_accounts(
      restaurant_id, provider, merchant_identifier, instructions_ar,
      instructions_en, active, sort_order
    ) values (
      p_restaurant_id, wallet_entry ->> 'provider',
      coalesce(wallet_entry ->> 'merchantIdentifier', ''), '', '',
      coalesce(nullif(wallet_entry ->> 'merchantIdentifier', ''), '') <> '',
      cardinality(provider_names) - 1
    )
    on conflict (restaurant_id, provider) do update set
      merchant_identifier = excluded.merchant_identifier,
      active = excluded.active,
      sort_order = excluded.sort_order,
      updated_at = now();
  end loop;
  update public.wallet_accounts set active = false, updated_at = now()
  where restaurant_id = p_restaurant_id and not (provider = any(provider_names));

  insert into public.audit_events(restaurant_id,actor_id,action,entity_type,entity_id) values(p_restaurant_id,auth.uid(),'Restaurant settings updated','restaurant',p_restaurant_id);
  return jsonb_build_object('success', true);
end;
$function$;


CREATE OR REPLACE FUNCTION private.sync_admin_menu(p_restaurant_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'pg_temp'
AS $function$
declare
  category_entry jsonb;
  item_entry jsonb;
  group_entry jsonb;
  option_entry jsonb;
  category_id uuid;
  item_id uuid;
  group_id uuid;
  option_id uuid;
  category_ids uuid[] := '{}';
  item_ids uuid[] := '{}';
  group_ids uuid[] := '{}';
  option_ids uuid[] := '{}';
  category_map jsonb := '{}'::jsonb;
  group_position integer;
  option_position integer;
begin
  if not private.is_restaurant_member(
    p_restaurant_id,
    array['owner', 'manager']::public.staff_role[]
  ) then
    raise exception 'Owner or manager access is required';
  end if;

  if jsonb_typeof(p_payload -> 'categories') <> 'array'
     or jsonb_typeof(p_payload -> 'items') <> 'array' then
    raise exception 'Invalid menu payload';
  end if;

  for category_entry in select value from jsonb_array_elements(p_payload -> 'categories')
  loop
    category_id := case
      when coalesce(category_entry ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (category_entry ->> 'id')::uuid
      else private.stable_sync_uuid(p_restaurant_id, category_entry ->> 'id')
    end;

    insert into public.categories (
      id, restaurant_id, name_ar, name_en, description_ar, description_en,
      visible, archived, sort_order
    ) values (
      category_id,
      p_restaurant_id,
      left(trim(coalesce(category_entry ->> 'name', '')), 160),
      left(trim(coalesce(category_entry ->> 'en', category_entry ->> 'name', '')), 160),
      '', '',
      coalesce((category_entry ->> 'visible')::boolean, true),
      coalesce((category_entry ->> 'archived')::boolean, false),
      coalesce((category_entry ->> 'sortOrder')::integer, cardinality(category_ids))
    )
    on conflict (id) do update set
      name_ar = excluded.name_ar,
      name_en = excluded.name_en,
      visible = excluded.visible,
      archived = excluded.archived,
      sort_order = excluded.sort_order,
      updated_at = now()
    where categories.restaurant_id = p_restaurant_id;

    category_ids := array_append(category_ids, category_id);
    category_map := category_map || jsonb_build_object(category_entry ->> 'name', category_id);
  end loop;

  update public.categories
  set archived = true, visible = false, updated_at = now()
  where restaurant_id = p_restaurant_id
    and not (id = any(category_ids));

  for item_entry in select value from jsonb_array_elements(p_payload -> 'items')
  loop
    category_id := nullif(category_map ->> (item_entry ->> 'category'), '')::uuid;
    if category_id is null then
      raise exception 'Unknown category: %', item_entry ->> 'category';
    end if;

    item_id := case
      when coalesce(item_entry ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (item_entry ->> 'id')::uuid
      else private.stable_sync_uuid(p_restaurant_id, item_entry ->> 'id')
    end;

    insert into public.menu_items (
      id, restaurant_id, category_id, name_ar, name_en, description_ar,
      description_en, image_url, price_syp, tags, popular, available,
      visible, archived, sort_order, available_from, available_until, preparation_minutes
    ) values (
      item_id, p_restaurant_id, category_id,
      left(trim(coalesce(item_entry ->> 'name', '')), 180),
      left(trim(coalesce(item_entry ->> 'en', item_entry ->> 'name', '')), 180),
      coalesce(item_entry ->> 'desc', ''), coalesce(item_entry ->> 'descEn',''), nullif(item_entry ->> 'image', ''),
      greatest(coalesce((item_entry ->> 'price')::bigint, 0), 0),
      coalesce(array(select jsonb_array_elements_text(item_entry -> 'tags')), '{}'::text[]),
      coalesce((item_entry ->> 'popular')::boolean, false),
      coalesce((item_entry ->> 'available')::boolean, true),
      true, false, cardinality(item_ids), nullif(item_entry->>'availableFrom','')::timestamptz, nullif(item_entry->>'availableUntil','')::timestamptz, greatest(coalesce((item_entry->>'preparationMinutes')::integer,15),1)
    )
    on conflict (id) do update set
      available_from = excluded.available_from,
      available_until = excluded.available_until,
      preparation_minutes = excluded.preparation_minutes,
      category_id = excluded.category_id,
      name_ar = excluded.name_ar,
      name_en = excluded.name_en,
      description_ar = excluded.description_ar,
      description_en = excluded.description_en,
      image_url = excluded.image_url,
      price_syp = excluded.price_syp,
      tags = excluded.tags,
      popular = excluded.popular,
      available = excluded.available,
      visible = true,
      archived = false,
      sort_order = excluded.sort_order,
      updated_at = now()
    where menu_items.restaurant_id = p_restaurant_id;

    item_ids := array_append(item_ids, item_id);
    delete from public.menu_item_option_groups where menu_item_id = item_id;
    group_position := 0;

    for group_entry in select value from jsonb_array_elements(coalesce(item_entry -> 'options', '[]'::jsonb))
    loop
      group_id := case
        when coalesce(group_entry ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (group_entry ->> 'id')::uuid
        else private.stable_sync_uuid(p_restaurant_id, group_entry ->> 'id')
      end;

      insert into public.option_groups (
        id, restaurant_id, name_ar, name_en, required, min_selections,
        max_selections, reusable, sort_order, archived
      ) values (
        group_id, p_restaurant_id,
        left(trim(coalesce(group_entry ->> 'name', '')), 160),
        left(trim(coalesce(group_entry ->> 'name', '')), 160),
        coalesce((group_entry ->> 'required')::boolean, false),
        case when coalesce((group_entry ->> 'required')::boolean, false) then 1 else 0 end,
        greatest(jsonb_array_length(coalesce(group_entry -> 'options', '[]'::jsonb)), 1),
        false, group_position, false
      )
      on conflict (id) do update set
        name_ar = excluded.name_ar,
        name_en = excluded.name_en,
        required = excluded.required,
        min_selections = excluded.min_selections,
        max_selections = excluded.max_selections,
        sort_order = excluded.sort_order,
        archived = false
      where option_groups.restaurant_id = p_restaurant_id;

      group_ids := array_append(group_ids, group_id);
      insert into public.menu_item_option_groups(menu_item_id, option_group_id, sort_order)
      values (item_id, group_id, group_position)
      on conflict (menu_item_id, option_group_id) do update
      set sort_order = excluded.sort_order;

      option_position := 0;
      for option_entry in select value from jsonb_array_elements(coalesce(group_entry -> 'options', '[]'::jsonb))
      loop
        option_id := case
          when coalesce(option_entry ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            then (option_entry ->> 'id')::uuid
          else private.stable_sync_uuid(p_restaurant_id, option_entry ->> 'id')
        end;
        insert into public.options(
          id, option_group_id, name_ar, name_en, price_delta_syp,
          available, default_selected, sort_order
        ) values (
          option_id, group_id,
          left(trim(coalesce(option_entry ->> 'name', '')), 160),
          left(trim(coalesce(option_entry ->> 'name', '')), 160),
          greatest(coalesce((option_entry ->> 'price')::bigint, 0), 0),
          true, false, option_position
        )
        on conflict (id) do update set
          name_ar = excluded.name_ar,
          name_en = excluded.name_en,
          price_delta_syp = excluded.price_delta_syp,
          available = true,
          sort_order = excluded.sort_order
        where options.option_group_id = group_id;
        option_ids := array_append(option_ids, option_id);
        option_position := option_position + 1;
      end loop;
      update public.options set available = false
      where option_group_id = group_id and not (id = any(option_ids));
      group_position := group_position + 1;
    end loop;
  end loop;

  update public.menu_items
  set archived = true, visible = false, available = false, updated_at = now()
  where restaurant_id = p_restaurant_id
    and not (id = any(item_ids));

  return jsonb_build_object('success', true);
end;
$function$;


CREATE OR REPLACE FUNCTION private.get_public_menu(p_slug text, p_table_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
select jsonb_build_object(
  'restaurant', jsonb_build_object(
    'id',r.id,'slug',r.slug,'nameAr',r.name_ar,'nameEn',r.name_en,'subtitleAr',r.subtitle_ar,'subtitleEn',r.subtitle_en,
    'logoUrl',r.logo_url,'coverUrl',r.cover_url,'accent',r.accent_color,'phone',r.phone,'whatsapp',r.whatsapp,
    'city',r.city,'neighborhood',r.neighborhood,'acceptanceState',r.acceptance_state,'closureMessageAr',r.closure_message_ar,
    'usdEstimateEnabled',r.usd_estimate_enabled,'exchangeRate',r.exchange_rate_syp,'exchangeRateUpdatedAt',r.exchange_rate_updated_at,
    'discountPercent',r.discount_percent,'enforceHours',r.enforce_business_hours,'timezone',r.timezone,'isOpen',(r.acceptance_state='open' and private.restaurant_is_open(r.id)),
    'dineIn',r.dine_in_enabled,'takeaway',r.takeaway_enabled,'delivery',r.delivery_enabled,'taxPercent',r.tax_percent,'servicePercent',r.service_percent,
    'latitude',r.latitude,'longitude',r.longitude,'geofenceMeters',r.dinein_geofence_meters,
    'design',coalesce(r.menu_design,'{}'::jsonb)
  ),
  'table', case when t.id is null then null else jsonb_build_object('id',t.id,'code',t.table_code,'labelAr',t.label_ar,'labelEn',t.label_en,'area',t.area) end,
  'hours', coalesce((select jsonb_agg(jsonb_build_object('weekday',h.weekday,'enabled',h.enabled,'open',h.opens_at,'close',h.closes_at) order by h.weekday) from public.business_hours h where h.restaurant_id=r.id),'[]'::jsonb),
  'zones', coalesce((select jsonb_agg(jsonb_build_object('id',z.id,'nameAr',z.name_ar,'nameEn',z.name_en,'fee',z.fee_syp,'minimum',z.minimum_syp,'estimatedMinutes',z.estimated_minutes) order by z.sort_order) from public.delivery_zones z where z.restaurant_id=r.id and z.active),'[]'::jsonb),
  'wallets', coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'provider',w.provider,'merchantIdentifier',w.merchant_identifier,'instructionsAr',w.instructions_ar,'instructionsEn',w.instructions_en) order by w.sort_order) from public.wallet_accounts w where w.restaurant_id=r.id and w.active),'[]'::jsonb),
  'categories', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'nameAr',c.name_ar,'nameEn',c.name_en,'descriptionAr',c.description_ar,'descriptionEn',c.description_en,'imageUrl',c.image_url,'sortOrder',c.sort_order) order by c.sort_order) from public.categories c where c.restaurant_id=r.id and c.visible and not c.archived),'[]'::jsonb),
  'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'categoryId',i.category_id,'nameAr',i.name_ar,'nameEn',i.name_en,'descriptionAr',i.description_ar,'descriptionEn',i.description_en,
      'imageUrl',i.image_url,'price',i.price_syp,'tags',i.tags,'popular',i.popular,'available',i.available,'availableFrom',i.available_from,'availableUntil',i.available_until,'preparationMinutes',i.preparation_minutes,
      'optionGroups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'nameAr',g.name_ar,'nameEn',g.name_en,'required',g.required,'minSelections',g.min_selections,'maxSelections',g.max_selections,
        'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'nameAr',o.name_ar,'nameEn',o.name_en,'price',o.price_delta_syp,'available',o.available,'defaultSelected',o.default_selected) order by o.sort_order) from public.options o where o.option_group_id=g.id and o.available),'[]'::jsonb)) order by mig.sort_order)
        from public.menu_item_option_groups mig join public.option_groups g on g.id=mig.option_group_id where mig.menu_item_id=i.id and not g.archived),'[]'::jsonb)
    ) order by i.sort_order) from public.menu_items i where i.restaurant_id=r.id and i.visible and not i.archived and exists(select 1 from public.categories c where c.id=i.category_id and c.visible and not c.archived)),'[]'::jsonb)
)
from public.restaurants r
left join public.restaurant_tables t on t.restaurant_id=r.id and t.qr_token=p_table_token and t.active
where r.slug=p_slug and r.active;
$function$;


CREATE OR REPLACE FUNCTION private.submit_public_order(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r public.restaurants%rowtype;
  zone public.delivery_zones%rowtype;
  table_row public.restaurant_tables%rowtype;
  new_order public.orders%rowtype;
  line jsonb;
  selected_option jsonb;
  db_item public.menu_items%rowtype;
  db_option public.options%rowtype;
  line_id uuid;
  line_unit bigint;
  line_total bigint;
  calculated_subtotal bigint := 0;
  discount_amount bigint := 0;
  service_fee bigint := 0;
  tax_fee bigint := 0;
  delivery_fee bigint := 0;
  qty integer;
  idem uuid;
  requested_mode public.order_mode;
  selected_ids uuid[];
  v_lat numeric;
  v_lng numeric;
  v_acc numeric;
  v_dist double precision;
begin
  select * into r from public.restaurants where slug=p_payload->>'restaurantSlug' and active for share;
  if not found then raise exception 'restaurant_not_found' using errcode='P0001'; end if;
  if r.acceptance_state <> 'open' then raise exception 'restaurant_not_accepting_orders' using errcode='P0001'; end if;
  requested_mode := (p_payload->>'mode')::public.order_mode;
  if (requested_mode='dine-in' and not r.dine_in_enabled) or (requested_mode='takeaway' and not r.takeaway_enabled) or (requested_mode='delivery' and not r.delivery_enabled) then
    raise exception 'order_mode_disabled' using errcode='P0001';
  end if;
  idem := (p_payload->>'idempotencyKey')::uuid;
  if idem is null then raise exception 'idempotency_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(r.id::text || idem::text,0));
  if exists(select 1 from public.orders where restaurant_id=r.id and idempotency_key=idem) then
    select * into new_order from public.orders where restaurant_id=r.id and idempotency_key=idem;
    return jsonb_build_object('id',new_order.id,'orderNumber','SF-'||new_order.order_number,'publicToken',new_order.public_token,'status',new_order.status,'total',new_order.total_syp,'duplicate',true);
  end if;
  if not private.restaurant_is_open(r.id) then raise exception 'outside_business_hours'; end if;
  if jsonb_array_length(coalesce(p_payload->'lines','[]'::jsonb))=0 then raise exception 'cart_empty' using errcode='P0001'; end if;
  if requested_mode <> 'dine-in' and coalesce(trim(p_payload->>'phone'),'')='' then raise exception 'phone_required' using errcode='P0001'; end if;
  if requested_mode='delivery' and coalesce(trim(p_payload->>'address'),'')='' then raise exception 'address_required' using errcode='P0001'; end if;

  -- Dine-in must come from a real, active table QR token.
  if requested_mode='dine-in' then
    if nullif(p_payload->>'tableToken','') is null then
      raise exception 'table_token_required' using errcode='P0001';
    end if;
    begin
      select * into table_row from public.restaurant_tables
        where restaurant_id=r.id and qr_token=(p_payload->>'tableToken')::uuid and active;
    exception when invalid_text_representation then
      raise exception 'invalid_table' using errcode='P0001';
    end;
    if not found then raise exception 'invalid_table' using errcode='P0001'; end if;

    -- If the restaurant has coordinates configured, require GPS presence within the geofence.
    if r.latitude is not null and r.longitude is not null then
      if nullif(p_payload->>'clientLat','') is null or nullif(p_payload->>'clientLng','') is null then
        raise exception 'location_required' using errcode='P0001';
      end if;
      begin
        v_lat := (p_payload->>'clientLat')::numeric;
        v_lng := (p_payload->>'clientLng')::numeric;
        v_acc := least(greatest(coalesce(nullif(p_payload->>'clientAcc','')::numeric, 0), 0), 100);
      exception when others then
        raise exception 'location_required' using errcode='P0001';
      end;
      if v_lat between -90 and 90 and v_lng between -180 and 180 then
        v_dist := 2 * 6371000 * asin(sqrt(
          power(sin(radians((v_lat - r.latitude) / 2)), 2) +
          cos(radians(r.latitude)) * cos(radians(v_lat)) *
          power(sin(radians((v_lng - r.longitude) / 2)), 2)
        ));
        -- Forgive the device's self-reported GPS error before rejecting.
        if v_dist > r.dinein_geofence_meters + v_acc then
          raise exception 'location_too_far' using errcode='P0001';
        end if;
      else
        raise exception 'location_required' using errcode='P0001';
      end if;
    end if;
  end if;

  if requested_mode='delivery' then
    select * into zone from public.delivery_zones where id=(p_payload->>'deliveryZoneId')::uuid and restaurant_id=r.id and active;
    if not found then raise exception 'invalid_delivery_zone' using errcode='P0001'; end if;
    delivery_fee := zone.fee_syp;
  end if;

  for line in select value from jsonb_array_elements(p_payload->'lines') loop
    qty := (line->>'quantity')::integer;
    if qty < 1 or qty > 100 then raise exception 'invalid_quantity' using errcode='P0001'; end if;
    select * into db_item from public.menu_items where id=(line->>'itemId')::uuid and restaurant_id=r.id and available and visible and not archived
      and (available_from is null or available_from <= now()) and (available_until is null or available_until >= now())
      and exists(select 1 from public.categories c where c.id=menu_items.category_id and c.restaurant_id=r.id and c.visible and not c.archived) for share;
    if not found then raise exception 'item_unavailable' using errcode='P0001'; end if;
    line_unit := db_item.price_syp;
    selected_ids := array[]::uuid[];
    for selected_option in select value from jsonb_array_elements(coalesce(line->'optionIds','[]'::jsonb)) loop
      select o.* into db_option from public.options o join public.option_groups g on g.id=o.option_group_id join public.menu_item_option_groups mig on mig.option_group_id=g.id
      where o.id=(trim(both '"' from selected_option::text))::uuid and mig.menu_item_id=db_item.id and o.available and not g.archived for share of o,g;
      if not found then raise exception 'option_unavailable' using errcode='P0001'; end if;
      if db_option.id=any(selected_ids) then raise exception 'duplicate_option' using errcode='P0001'; end if;
      selected_ids := array_append(selected_ids,db_option.id);
      line_unit := line_unit + db_option.price_delta_syp;
    end loop;
    if exists(select 1 from public.menu_item_option_groups mig join public.option_groups g on g.id=mig.option_group_id where mig.menu_item_id=db_item.id and g.required and not g.archived and (select count(*) from public.options o where o.option_group_id=g.id and o.id=any(selected_ids)) < g.min_selections) then
      raise exception 'required_options_missing' using errcode='P0001';
    end if;
    if exists(select 1 from public.menu_item_option_groups mig join public.option_groups g on g.id=mig.option_group_id where mig.menu_item_id=db_item.id and not g.archived and (select count(*) from public.options o where o.option_group_id=g.id and o.id=any(selected_ids)) > g.max_selections) then
      raise exception 'too_many_options' using errcode='P0001';
    end if;
    calculated_subtotal := calculated_subtotal + line_unit*qty;
  end loop;
  if requested_mode='delivery' and calculated_subtotal < zone.minimum_syp then raise exception 'minimum_order_not_met' using errcode='P0001'; end if;
  discount_amount := round(calculated_subtotal*r.discount_percent/100.0);
  service_fee := round((calculated_subtotal-discount_amount)*r.service_percent/100.0);
  tax_fee := round((calculated_subtotal-discount_amount)*r.tax_percent/100.0);

  insert into public.orders(restaurant_id,idempotency_key,mode,table_id,delivery_zone_id,customer_name,customer_phone,delivery_address,pickup_time,payment_method,payment_reference,subtotal_syp,discount_syp,service_charge_syp,tax_syp,delivery_fee_syp,total_syp,exchange_rate_syp)
  values(r.id,idem,requested_mode,table_row.id,zone.id,left(coalesce(p_payload->>'customerName',''),120),left(coalesce(p_payload->>'phone',''),40),left(coalesce(p_payload->>'address',''),500),left(coalesce(p_payload->>'pickupTime',''),100),left(coalesce(p_payload->>'paymentMethod','cash'),80),left(coalesce(p_payload->>'paymentReference',''),120),calculated_subtotal,discount_amount,service_fee,tax_fee,delivery_fee,calculated_subtotal-discount_amount+service_fee+tax_fee+delivery_fee,r.exchange_rate_syp)
  returning * into new_order;

  for line in select value from jsonb_array_elements(p_payload->'lines') loop
    qty := (line->>'quantity')::integer;
    select * into db_item from public.menu_items where id=(line->>'itemId')::uuid;
    line_unit := db_item.price_syp;
    for selected_option in select value from jsonb_array_elements(coalesce(line->'optionIds','[]'::jsonb)) loop
      select * into db_option from public.options where id=(trim(both '"' from selected_option::text))::uuid;
      line_unit := line_unit + db_option.price_delta_syp;
    end loop;
    line_total := line_unit*qty;
    insert into public.order_lines(order_id,menu_item_id,item_name_ar,item_name_en,unit_price_syp,quantity,note,line_total_syp)
    values(new_order.id,db_item.id,db_item.name_ar,db_item.name_en,line_unit,qty,left(coalesce(line->>'note',''),500),line_total) returning id into line_id;
    for selected_option in select value from jsonb_array_elements(coalesce(line->'optionIds','[]'::jsonb)) loop
      select * into db_option from public.options where id=(trim(both '"' from selected_option::text))::uuid;
      insert into public.order_line_options(order_line_id,option_id,option_name_ar,option_name_en,price_delta_syp) values(line_id,db_option.id,db_option.name_ar,db_option.name_en,db_option.price_delta_syp);
    end loop;
  end loop;
  insert into public.order_status_events(order_id,new_status) values(new_order.id,'received');
  insert into public.whatsapp_dispatches(order_id) values(new_order.id);
  return jsonb_build_object('id',new_order.id,'orderNumber','SF-'||new_order.order_number,'publicToken',new_order.public_token,'status',new_order.status,'total',new_order.total_syp,'duplicate',false);
end;
$function$;

-- Kitchen staff may change stock without receiving general menu-edit privileges.
create function private.set_item_availability(p_restaurant_id uuid,p_item_id uuid,p_available boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_restaurant_member(p_restaurant_id,array['owner','manager','kitchen']::public.staff_role[]) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_available is null then raise exception 'availability_required'; end if;
 update public.menu_items set available=p_available where id=p_item_id and restaurant_id=p_restaurant_id and not archived;
 if not found then raise exception 'item_not_found'; end if;
 insert into public.audit_events(restaurant_id,actor_id,action,entity_type,entity_id,metadata) values(p_restaurant_id,auth.uid(),'Item availability updated','menu_item',p_item_id,jsonb_build_object('available',p_available));
 return jsonb_build_object('success',true);
end $$;
create function public.set_item_availability(p_restaurant_id uuid,p_item_id uuid,p_available boolean)
returns jsonb language sql security invoker set search_path='' as $$ select private.set_item_availability(p_restaurant_id,p_item_id,p_available) $$;
revoke all on function private.set_item_availability(uuid,uuid,boolean) from public,anon;
revoke all on function public.set_item_availability(uuid,uuid,boolean) from public,anon;
grant execute on function private.set_item_availability(uuid,uuid,boolean), public.set_item_availability(uuid,uuid,boolean) to authenticated;

-- Limit direct API updates to staff-editable fields. Row policies still scope tenants.
revoke update on public.orders from authenticated;
grant update(status,payment_status,internal_note,cancellation_reason) on public.orders to authenticated;
-- Staff management goes through the protected RPC; it prevents owner escalation.
revoke insert,update,delete on public.restaurant_members from authenticated;

create function private.enforce_staff_order_update() returns trigger language plpgsql security invoker set search_path='' as $$
declare kitchen boolean; cashier boolean;
begin
 if auth.uid() is null then
  if current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  raise exception 'authentication_required' using errcode='42501';
 end if;
 if private.is_restaurant_member(old.restaurant_id,array['owner','manager']::public.staff_role[]) then return new; end if;
 kitchen := private.is_restaurant_member(old.restaurant_id,array['kitchen']::public.staff_role[]);
 cashier := private.is_restaurant_member(old.restaurant_id,array['cashier']::public.staff_role[]);
 if not kitchen and not cashier then raise exception 'forbidden' using errcode='42501'; end if;
 if kitchen and (new.payment_status is distinct from old.payment_status or new.internal_note is distinct from old.internal_note or new.cancellation_reason is distinct from old.cancellation_reason) then raise exception 'kitchen_cannot_edit_payment_or_notes' using errcode='42501'; end if;
 if new.status is distinct from old.status then
  if kitchen and not ((old.status='received' and new.status='confirmed') or (old.status='confirmed' and new.status='preparing') or (old.status='preparing' and new.status='ready')) then raise exception 'invalid_kitchen_transition' using errcode='42501'; end if;
  if cashier and not ((old.status='received' and new.status='confirmed') or (old.status='ready' and new.status in ('out-for-delivery','completed')) or (old.status='out-for-delivery' and new.status='completed')) then raise exception 'invalid_cashier_transition' using errcode='42501'; end if;
  if new.status='out-for-delivery' and new.mode<>'delivery' then raise exception 'not_a_delivery'; end if;
  if new.status='completed' and new.payment_status<>'verified' then raise exception 'payment_not_verified'; end if;
 end if;
 return new;
end $$;
revoke all on function private.enforce_staff_order_update() from public,anon,authenticated;
create trigger enforce_staff_order_update before update on public.orders for each row execute function private.enforce_staff_order_update();

-- Invoker privileges keep RLS and column grants in force; stale desks cannot overwrite newer changes.
create function public.staff_update_order(p_order_id uuid,p_patch jsonb,p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_order public.orders%rowtype; saved public.orders%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if jsonb_typeof(p_patch) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('status','payment_status','internal_note','cancellation_reason')) then raise exception 'invalid_order_patch'; end if;
 select * into current_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'order_not_found' using errcode='42501'; end if;
 if p_expected_updated_at is not null and current_order.updated_at<>p_expected_updated_at then raise exception 'order_changed_refresh_required'; end if;
 update public.orders set
  status=case when p_patch?'status' then (p_patch->>'status')::public.order_status else status end,
  payment_status=case when p_patch?'payment_status' then (p_patch->>'payment_status')::public.payment_status else payment_status end,
  internal_note=case when p_patch?'internal_note' then left(p_patch->>'internal_note',2000) else internal_note end,
  cancellation_reason=case when p_patch?'cancellation_reason' then left(p_patch->>'cancellation_reason',500) else cancellation_reason end
 where id=p_order_id returning * into saved;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object('updatedAt',saved.updated_at,'status',saved.status,'paymentStatus',saved.payment_status);
end $$;
revoke all on function public.staff_update_order(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.staff_update_order(uuid,jsonb,timestamptz) to authenticated;

notify pgrst, 'reload schema';
