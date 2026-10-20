create or replace function private.sync_admin_menu(p_restaurant_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
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
      else gen_random_uuid()
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
      else gen_random_uuid()
    end;

    insert into public.menu_items (
      id, restaurant_id, category_id, name_ar, name_en, description_ar,
      description_en, image_url, price_syp, tags, popular, available,
      visible, archived, sort_order
    ) values (
      item_id, p_restaurant_id, category_id,
      left(trim(coalesce(item_entry ->> 'name', '')), 180),
      left(trim(coalesce(item_entry ->> 'en', item_entry ->> 'name', '')), 180),
      coalesce(item_entry ->> 'desc', ''), '', nullif(item_entry ->> 'image', ''),
      greatest(coalesce((item_entry ->> 'price')::bigint, 0), 0),
      coalesce(array(select jsonb_array_elements_text(item_entry -> 'tags')), '{}'::text[]),
      coalesce((item_entry ->> 'popular')::boolean, false),
      coalesce((item_entry ->> 'available')::boolean, true),
      true, false, cardinality(item_ids)
    )
    on conflict (id) do update set
      category_id = excluded.category_id,
      name_ar = excluded.name_ar,
      name_en = excluded.name_en,
      description_ar = excluded.description_ar,
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
        else gen_random_uuid()
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
          else gen_random_uuid()
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
$$;

create or replace function public.sync_admin_menu(p_restaurant_id uuid, p_payload jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.sync_admin_menu(p_restaurant_id, p_payload);
$$;

revoke all on function private.sync_admin_menu(uuid, jsonb) from public;
grant execute on function private.sync_admin_menu(uuid, jsonb) to authenticated;
revoke all on function public.sync_admin_menu(uuid, jsonb) from public;
grant execute on function public.sync_admin_menu(uuid, jsonb) to authenticated;
