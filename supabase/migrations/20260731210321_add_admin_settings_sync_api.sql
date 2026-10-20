create or replace function private.sync_admin_settings(p_restaurant_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
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
$$;

create or replace function public.sync_admin_settings(p_restaurant_id uuid, p_payload jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$ select private.sync_admin_settings(p_restaurant_id, p_payload); $$;

revoke all on function private.sync_admin_settings(uuid, jsonb) from public;
grant execute on function private.sync_admin_settings(uuid, jsonb) to authenticated;
revoke all on function public.sync_admin_settings(uuid, jsonb) from public;
grant execute on function public.sync_admin_settings(uuid, jsonb) to authenticated;
