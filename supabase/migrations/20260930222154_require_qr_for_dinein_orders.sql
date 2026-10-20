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
