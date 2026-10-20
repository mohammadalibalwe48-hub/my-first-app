create or replace function public.get_public_menu(p_slug text, p_table_token uuid default null)
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
select jsonb_build_object(
  'restaurant', jsonb_build_object(
    'id',r.id,'slug',r.slug,'nameAr',r.name_ar,'nameEn',r.name_en,'subtitleAr',r.subtitle_ar,'subtitleEn',r.subtitle_en,
    'logoUrl',r.logo_url,'coverUrl',r.cover_url,'accent',r.accent_color,'phone',r.phone,'whatsapp',r.whatsapp,
    'city',r.city,'neighborhood',r.neighborhood,'acceptanceState',r.acceptance_state,'closureMessageAr',r.closure_message_ar,
    'usdEstimateEnabled',r.usd_estimate_enabled,'exchangeRate',r.exchange_rate_syp,'exchangeRateUpdatedAt',r.exchange_rate_updated_at,
    'dineIn',r.dine_in_enabled,'takeaway',r.takeaway_enabled,'delivery',r.delivery_enabled,'taxPercent',r.tax_percent,'servicePercent',r.service_percent
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
$$;
revoke all on function public.get_public_menu(text,uuid) from public;
grant execute on function public.get_public_menu(text,uuid) to anon,authenticated;

create or replace function public.submit_public_order(p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
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

  if p_payload ? 'tableToken' and nullif(p_payload->>'tableToken','') is not null then
    select * into table_row from public.restaurant_tables where restaurant_id=r.id and qr_token=(p_payload->>'tableToken')::uuid and active;
    if not found and requested_mode='dine-in' then raise exception 'invalid_table' using errcode='P0001'; end if;
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
$$;
revoke all on function public.submit_public_order(jsonb) from public;
grant execute on function public.submit_public_order(jsonb) to anon,authenticated;

create or replace function public.track_public_order(p_token uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp
as $$
select jsonb_build_object('id',o.id,'orderNumber','SF-'||o.order_number,'restaurantName',r.name_ar,'restaurantPhone',r.phone,'status',o.status,'mode',o.mode,'customerName',o.customer_name,'table',t.label_ar,'address',o.delivery_address,'pickupTime',o.pickup_time,'paymentMethod',o.payment_method,'subtotal',o.subtotal_syp,'serviceCharge',o.service_charge_syp,'tax',o.tax_syp,'deliveryFee',o.delivery_fee_syp,'total',o.total_syp,'createdAt',o.created_at,
'lines',coalesce((select jsonb_agg(jsonb_build_object('nameAr',l.item_name_ar,'nameEn',l.item_name_en,'quantity',l.quantity,'unitPrice',l.unit_price_syp,'lineTotal',l.line_total_syp,'note',l.note,'options',coalesce((select jsonb_agg(jsonb_build_object('nameAr',x.option_name_ar,'nameEn',x.option_name_en,'price',x.price_delta_syp)) from public.order_line_options x where x.order_line_id=l.id),'[]'::jsonb))) from public.order_lines l where l.order_id=o.id),'[]'::jsonb),
'events',coalesce((select jsonb_agg(jsonb_build_object('status',e.new_status,'createdAt',e.created_at) order by e.created_at) from public.order_status_events e where e.order_id=o.id),'[]'::jsonb))
from public.orders o join public.restaurants r on r.id=o.restaurant_id left join public.restaurant_tables t on t.id=o.table_id where o.public_token=p_token;
$$;
revoke all on function public.track_public_order(uuid) from public;
grant execute on function public.track_public_order(uuid) to anon,authenticated;

create or replace function private.record_order_status_event()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status is distinct from old.status then
  insert into public.order_status_events(order_id,previous_status,new_status,actor_id,reason) values(new.id,old.status,new.status,(select auth.uid()),case when new.status='cancelled' then new.cancellation_reason else '' end);
  insert into public.audit_events(restaurant_id,actor_id,action,entity_type,entity_id,metadata) values(new.restaurant_id,(select auth.uid()),'order_status_changed','order',new.id,jsonb_build_object('from',old.status,'to',new.status));
 end if;
 return new;
end $$;
create trigger order_status_audit after update of status on public.orders for each row execute function private.record_order_status_event();
