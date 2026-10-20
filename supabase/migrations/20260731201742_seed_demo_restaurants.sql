do $$
declare
  tenant_uuid uuid;
  sufra_uuid uuid;
  cozy_uuid uuid;
  restaurant_uuid uuid;
  category_uuid uuid;
  item_uuid uuid;
  group_uuid uuid;
  restaurant_slug text;
  restaurant_name text;
  item_record record;
begin
  insert into public.tenants(name) values ('Sufra Demo Group') returning id into tenant_uuid;

  insert into public.restaurants(
    tenant_id,slug,name_ar,name_en,subtitle_ar,subtitle_en,accent_color,phone,whatsapp,
    address_ar,city,neighborhood,exchange_rate_syp,tax_percent,service_percent
  ) values
  (tenant_uuid,'sufra','سفرة دمشق','Sufra Damascus','مطبخ شامي أصيل','Authentic Damascene Kitchen','#153a2f','+963 11 555 0101','96395550101','دمشق، المالكي','دمشق','المالكي',13000,0,5)
  returning id into sufra_uuid;

  insert into public.restaurants(
    tenant_id,slug,name_ar,name_en,subtitle_ar,subtitle_en,accent_color,phone,whatsapp,
    address_ar,city,neighborhood,exchange_rate_syp,tax_percent,service_percent
  ) values
  (tenant_uuid,'cozy','كوزي كافيه','Cozy Cafe','قهوة، حلويات وأطباق خفيفة','Coffee, desserts and light dishes','#8a5a44','+963 11 555 0202','96395550202','دمشق، أبو رمانة','دمشق','أبو رمانة',13000,0,0)
  returning id into cozy_uuid;

  foreach restaurant_uuid in array array[sufra_uuid,cozy_uuid] loop
    insert into public.business_hours(restaurant_id,weekday,enabled,opens_at,closes_at)
    select restaurant_uuid,d,true,'09:00','23:30' from generate_series(0,6) d;

    insert into public.delivery_zones(restaurant_id,name_ar,name_en,fee_syp,minimum_syp,estimated_minutes,sort_order) values
      (restaurant_uuid,'ضمن الحي','Nearby',15000,75000,30,0),
      (restaurant_uuid,'وسط دمشق','Central Damascus',25000,125000,45,1),
      (restaurant_uuid,'أطراف المدينة','Outer Damascus',40000,200000,60,2);

    insert into public.wallet_accounts(restaurant_id,provider,merchant_identifier,instructions_ar,instructions_en,sort_order) values
      (restaurant_uuid,'Syriatel Cash','0999 000 111','حوّل المبلغ وأدخل رقم العملية في الطلب.','Transfer the total and enter the transaction reference.',0),
      (restaurant_uuid,'Sham Cash / BEMO','SHAM-QR-101','حوّل المبلغ وأدخل اسم المرسل.','Transfer the total and enter the sender name.',1),
      (restaurant_uuid,'MTN Cash','0944 000 222','حوّل المبلغ واحتفظ برقم المرجع.','Transfer the total and retain the reference.',2);

    insert into public.restaurant_tables(restaurant_id,table_code,label_ar,label_en,area)
    select restaurant_uuid,n::text,'الطاولة '||lpad(n::text,2,'0'),'Table '||lpad(n::text,2,'0'),case when n <= 8 then 'الصالة الرئيسية' else 'التراس' end
    from generate_series(1,12) n;

    insert into public.categories(restaurant_id,name_ar,name_en,sort_order) values
      (restaurant_uuid,'مقبلات','Appetizers',0),
      (restaurant_uuid,'رئيسية','Main Courses',1),
      (restaurant_uuid,'سلطات','Salads',2),
      (restaurant_uuid,'مشروبات','Drinks',3),
      (restaurant_uuid,'حلويات','Desserts',4);
  end loop;

  for item_record in
    select * from (values
      ('مقبلات','حمص باللحمة','Hummus bil Lahme','حمص كريمي، لحمة مفرومة وصنوبر محمص',45000,'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=72',array['chef']::text[],true),
      ('مقبلات','كبة مقلية','Fried Kibbeh','حشوة لحم مع البصل والجوز، تقدم مع اللبن',55000,'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=72',array[]::text[],true),
      ('رئيسية','شاورما دجاج','Chicken Shawarma Plate','شاورما دجاج، بطاطا، ثوم ومخلل',75000,'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=72',array['chef']::text[],true),
      ('رئيسية','برغر عربي','Arabic Burger','قطعة لحم، جبنة وخضار طازجة',85000,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=72',array['spicy']::text[],false),
      ('سلطات','سلطة موسمية','Seasonal Salad','خضار موسمية طازجة وتتبيلة البيت',40000,'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=72',array['vegetarian']::text[],false),
      ('مشروبات','عصير برتقال','Fresh Orange Juice','برتقال طازج معصور عند الطلب',30000,'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=72',array['vegetarian']::text[],false),
      ('مشروبات','قهوة عربية','Arabic Coffee','قهوة عربية مع الهال',25000,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=72',array['chef']::text[],false),
      ('حلويات','كيك الشوكولا','Chocolate Cake','كيك شوكولا غني يقدم طازجاً',50000,'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=72',array['vegetarian']::text[],true)
    ) as x(category_name,name_ar,name_en,description_ar,price_syp,image_url,tags,popular)
  loop
    foreach restaurant_uuid in array array[sufra_uuid,cozy_uuid] loop
      select id into category_uuid from public.categories where restaurant_id=restaurant_uuid and name_ar=item_record.category_name;
      insert into public.menu_items(restaurant_id,category_id,name_ar,name_en,description_ar,price_syp,image_url,tags,popular,preparation_minutes)
      values (restaurant_uuid,category_uuid,item_record.name_ar,item_record.name_en,item_record.description_ar,
        case when restaurant_uuid=cozy_uuid then item_record.price_syp-5000 else item_record.price_syp end,
        item_record.image_url,item_record.tags,item_record.popular,20)
      returning id into item_uuid;

      if item_record.name_ar='كبة مقلية' then
        insert into public.option_groups(restaurant_id,name_ar,name_en,required,min_selections,max_selections) values
          (restaurant_uuid,'الكمية','Quantity',true,1,1) returning id into group_uuid;
        insert into public.options(option_group_id,name_ar,name_en,price_delta_syp,sort_order) values
          (group_uuid,'3 حبات','3 pieces',0,0),(group_uuid,'6 حبات','6 pieces',27000,1);
        insert into public.menu_item_option_groups(menu_item_id,option_group_id) values(item_uuid,group_uuid);
      elsif item_record.name_ar='شاورما دجاج' then
        insert into public.option_groups(restaurant_id,name_ar,name_en,required,min_selections,max_selections) values
          (restaurant_uuid,'الحجم','Size',true,1,1) returning id into group_uuid;
        insert into public.options(option_group_id,name_ar,name_en,price_delta_syp,sort_order) values
          (group_uuid,'عادي','Regular',0,0),(group_uuid,'كبير','Large',20000,1);
        insert into public.menu_item_option_groups(menu_item_id,option_group_id) values(item_uuid,group_uuid);
        insert into public.option_groups(restaurant_id,name_ar,name_en,required,min_selections,max_selections) values
          (restaurant_uuid,'إضافات','Add-ons',false,0,3) returning id into group_uuid;
        insert into public.options(option_group_id,name_ar,name_en,price_delta_syp,sort_order) values
          (group_uuid,'جبنة','Cheese',10000,0),(group_uuid,'ثوم إضافي','Extra garlic',5000,1),(group_uuid,'بطاطا','Fries',12000,2);
        insert into public.menu_item_option_groups(menu_item_id,option_group_id) values(item_uuid,group_uuid);
      end if;
    end loop;
  end loop;
end $$;
