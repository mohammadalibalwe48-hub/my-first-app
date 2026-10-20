-- 1) Restaurant physical location + dine-in geofence radius
alter table public.restaurants
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists dinein_geofence_meters integer not null default 150;

comment on column public.restaurants.latitude is 'Restaurant physical latitude for dine-in GPS presence check.';
comment on column public.restaurants.longitude is 'Restaurant physical longitude for dine-in GPS presence check.';
comment on column public.restaurants.dinein_geofence_meters is 'Radius in meters a customer must be within to place a dine-in order.';

-- 2) Expose coordinates to the public storefront
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
      'imageUrl',i.image_url,'price',i.price_syp,'tags',i.tags,'popular',i.popular,'available',i.available,'preparationMinutes',i.preparation_minutes,
      'optionGroups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'nameAr',g.name_ar,'nameEn',g.name_en,'required',g.required,'minSelections',g.min_selections,'maxSelections',g.max_selections,
        'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'nameAr',o.name_ar,'nameEn',o.name_en,'price',o.price_delta_syp,'available',o.available,'defaultSelected',o.default_selected) order by o.sort_order) from public.options o where o.option_group_id=g.id and o.available),'[]'::jsonb)) order by mig.sort_order)
        from public.menu_item_option_groups mig join public.option_groups g on g.id=mig.option_group_id where mig.menu_item_id=i.id and not g.archived),'[]'::jsonb)
    ) order by i.sort_order) from public.menu_items i where i.restaurant_id=r.id and i.visible and not i.archived),'[]'::jsonb)
)
from public.restaurants r
left join public.restaurant_tables t on t.restaurant_id=r.id and t.qr_token=p_table_token and t.active
where r.slug=p_slug and r.active;
$function$;

-- 3) Harden dine-in: require valid table token AND GPS within geofence
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
  service_fee bigint := 0;
  tax_fee bigint := 0;
  delivery_fee bigint := 0;
  qty integer;
  idem uuid;
  requested_mode public.order_mode;
  selected_ids uuid[];
  v_lat numeric;
  v_lng numeric;
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
  if exists(select 1 from public.orders where restaurant_id=r.id and idempotency_key=idem) then
    select * into new_order from public.orders where restaurant_id=r.id and idempotency_key=idem;
    return jsonb_build_object('id',new_order.id,'orderNumber','SF-'||new_order.order_number,'publicToken',new_order.public_token,'status',new_order.status,'total',new_order.total_syp,'duplicate',true);
  end if;
  if jsonb_array_length(coalesce(p_payload->'lines','[]'::jsonb))=0 then raise exception 'cart_empty' using errcode='P0001'; end if;
  if requested_mode <> 'dine-in' and coalesce(trim(p_payload->>'phone'),'')='' then raise exception 'phone_required' using errcode='P0001'; end if;
  if requested_mode='delivery' and coalesce(trim(p_payload->>'address'),'')='' then raise exception 'address_required' using errcode='P0001'; end if;

  -- Dine-in must come from a real, active table QR token.
  if requested_mode='dine-in' then
    if nullif(p_payload->>'tableToken','') is null then
      raise exception 'table_token_required' using errcode='P0001';
    end if;
    select * into table_row from public.restaurant_tables
      where restaurant_id=r.id and qr_token=(p_payload->>'tableToken')::uuid and active;
    if not found then raise exception 'invalid_table' using errcode='P0001'; end if;

    -- If the restaurant has coordinates configured, require GPS presence within the geofence.
    if r.latitude is not null and r.longitude is not null then
      if nullif(p_payload->>'clientLat','') is null or nullif(p_payload->>'clientLng','') is null then
        raise exception 'location_required' using errcode='P0001';
      end if;
      begin
        v_lat := (p_payload->>'clientLat')::numeric;
        v_lng := (p_payload->>'clientLng')::numeric;
      exception when others then
        raise exception 'location_required' using errcode='P0001';
      end;
      if v_lat between -90 and 90 and v_lng between -180 and 180 then
        v_dist := 2 * 6371000 * asin(sqrt(
          power(sin(radians((v_lat - r.latitude) / 2)), 2) +
          cos(radians(r.latitude)) * cos(radians(v_lat)) *
          power(sin(radians((v_lng - r.longitude) / 2)), 2)
        ));
        if v_dist > r.dinein_geofence_meters then
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
      and (available_from is null or available_from <= now()) and (available_until is null or available_until >= now());
    if not found then raise exception 'item_unavailable' using errcode='P0001'; end if;
    line_unit := db_item.price_syp;
    selected_ids := array[]::uuid[];
    for selected_option in select value from jsonb_array_elements(coalesce(line->'optionIds','[]'::jsonb)) loop
      select o.* into db_option from public.options o join public.option_groups g on g.id=o.option_group_id join public.menu_item_option_groups mig on mig.option_group_id=g.id
      where o.id=(trim(both '"' from selected_option::text))::uuid and mig.menu_item_id=db_item.id and o.available and not g.archived;
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
  service_fee := round(calculated_subtotal*r.service_percent/100.0);
  tax_fee := round(calculated_subtotal*r.tax_percent/100.0);

  insert into public.orders(restaurant_id,idempotency_key,mode,table_id,delivery_zone_id,customer_name,customer_phone,delivery_address,pickup_time,payment_method,payment_reference,subtotal_syp,service_charge_syp,tax_syp,delivery_fee_syp,total_syp,exchange_rate_syp)
  values(r.id,idem,requested_mode,table_row.id,zone.id,left(coalesce(p_payload->>'customerName',''),120),left(coalesce(p_payload->>'phone',''),40),left(coalesce(p_payload->>'address',''),500),left(coalesce(p_payload->>'pickupTime',''),100),left(coalesce(p_payload->>'paymentMethod','cash'),80),left(coalesce(p_payload->>'paymentReference',''),120),calculated_subtotal,service_fee,tax_fee,delivery_fee,calculated_subtotal+service_fee+tax_fee+delivery_fee,r.exchange_rate_syp)
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

-- 4) Let owners persist coordinates from the admin settings form
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

  update public.restaurants set
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

  return jsonb_build_object('success', true);
end;
$function$;
