create or replace function private.get_public_menu(p_slug text, p_table_token uuid DEFAULT NULL::uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
select jsonb_build_object(
  'restaurant', jsonb_build_object(
    'id',r.id,'slug',r.slug,'nameAr',r.name_ar,'nameEn',r.name_en,'subtitleAr',r.subtitle_ar,'subtitleEn',r.subtitle_en,
    'logoUrl',r.logo_url,'coverUrl',r.cover_url,'accent',r.accent_color,'phone',r.phone,'whatsapp',r.whatsapp,
    'city',r.city,'neighborhood',r.neighborhood,'acceptanceState',r.acceptance_state,'closureMessageAr',r.closure_message_ar,
    'usdEstimateEnabled',r.usd_estimate_enabled,'exchangeRate',r.exchange_rate_syp,'exchangeRateUpdatedAt',r.exchange_rate_updated_at,
    'dineIn',r.dine_in_enabled,'takeaway',r.takeaway_enabled,'delivery',r.delivery_enabled,'taxPercent',r.tax_percent,'servicePercent',r.service_percent,
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
