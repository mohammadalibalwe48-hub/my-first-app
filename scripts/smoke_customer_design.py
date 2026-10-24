"""Reference-design regression: real browser, mocked menu APIs, no production writes.
Run npm run build and npm run preview -- --port 4174 before running.
"""
from pathlib import Path
import copy,json
from playwright.sync_api import sync_playwright
fixtures={}
exec((Path(__file__).parent/'smoke_workflows.py').read_text().split('with sync_playwright() as p:')[0],fixtures)
BASE=fixtures['BASE'];menu=fixtures['menu'];state=fixtures['state'];base_item=copy.deepcopy(menu['items'][0])
menu['categories'].append({'id':'drinks','nameAr':'مشروبات','nameEn':'Drinks'})
for i in range(1,5):
 item=copy.deepcopy(base_item);item['id']=f'30000000-0000-4000-8000-00000000001{i}';item['nameAr']=f'طبق جديد {i}';item['nameEn']=f'Dish {i}';menu['items'].append(item)
menu['items'][1]['optionGroups']=[{'id':'extras','nameAr':'إضافة','nameEn':'Extras','required':True,'minSelections':1,'maxSelections':1,'options':[{'id':'extra','nameAr':'جبنة','nameEn':'Cheese','price':1000,'available':True}]}]
menu['items'][4]['categoryId']='drinks'
menu['items'][4].update(nameAr='طبق موسمي للمشاركة مع الخضار والأعشاب والإضافات الخاصة بالمطعم',nameEn='A_very_long_seasonal_sharing_dish_name_for_wrapping',price=123456789)
menu['items'][2]['imageUrl']='/missing-design-test-photo.webp'
# Saved legacy editor appearance must not override the new unified design.
menu['restaurant']['design']={'palette':{'canvas':'#000000','ink':'#ffffff','action':'#ff0000'},'layout':{'hero':'cover','cards':'overlay'}}

def check_bounds(page):
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),'Page overflows horizontally'
 if page.get_by_role('dialog').count():
  assert page.get_by_role('dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),'Dialog overflows horizontally'
  box=page.get_by_role('dialog').bounding_box();assert box['x']>=0 and box['x']+box['width']<=page.viewport_size['width']+1,box
  page.wait_for_function('''()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.top>=-1&&r.bottom<=innerHeight+1}''')

def focus_in_dialog(page):
 page.keyboard.press('Tab');assert page.evaluate('!!document.activeElement.closest("[role=dialog]")')
 page.keyboard.press('Shift+Tab');assert page.evaluate('!!document.activeElement.closest("[role=dialog]")')

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 errors=[]
 for width in [320,390,768,1280]:
  for lang in ['ar','en']:
   context=browser.new_context(viewport={'width':width,'height':844});context.route('**/*',fixtures['handler']);context.add_init_script('localStorage.setItem("syrianqr-language",'+json.dumps(json.dumps(lang))+')')
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(BASE);page.locator('.home-venue').first.wait_for();check_bounds(page)
   page.locator('.featured-place img').evaluate('(e)=>e.decode()')
   assert page.locator('.featured-place img').evaluate('e=>e.naturalWidth>0'),'Landing photo did not load'
   page.locator('.discovery-search input').fill('no-restaurant-matches');page.locator('.ui-empty').wait_for();page.locator('.ui-empty button').click();assert page.locator('.home-venue').count()==2;page.locator('.discovery-filters button').nth(2).click();assert page.locator('.home-venue').count()==1;page.locator('.discovery-filters button').first.click()
   page.locator('.home-venue').first.click();page.locator('.cx-dish').first.wait_for();check_bounds(page)
   assert page.locator('.cx').get_attribute('data-cd-cards') is None,'Legacy design still controls cards'
   assert page.locator('.cx-head').bounding_box()['y']<=1,'Opening a restaurant keeps the old page scroll position'
   assert page.evaluate('window.scrollY')<2
   columns=page.locator('.cx-grid').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')
   assert columns==(3 if 600<=width<=900 else 2),('Wrong menu grid',width,columns)
   if width>900: assert page.locator('.desktop-order-rail').is_visible()
   else: assert not page.locator('.desktop-order-rail').is_visible()
   page.locator('.cx-dish').nth(2).locator('.is-missing').wait_for()
   assert page.locator('.cx-dish').nth(2).locator('.cx-photo-fallback').is_visible()
   page.locator('.product-save').first.click();page.locator('.saved-toggle').click();assert page.locator('.cx-dish').count()==1;page.locator('.saved-toggle').click();assert page.locator('.cx-dish').count()==5
   search=page.locator('.cx-search input');search.fill('no-dish-matches');page.locator('.cx-empty').wait_for();page.locator('.cx-empty button').click();page.locator('.cx-dish').first.wait_for()
   page.locator('.cx-dish__media').nth(1).click();page.get_by_role('dialog').wait_for();check_bounds(page);focus_in_dialog(page)
   add=page.locator('.cx-item__add');assert add.is_disabled(),'Required modifier not enforced'
   page.locator('.cx-pick').first.click();assert add.is_enabled();page.locator('.cx-item__qty .cx-stepper__btn--plus').click();add.click()
   page.locator('.cx-cartbtn').click();page.get_by_role('dialog').wait_for();check_bounds(page);focus_in_dialog(page)
   assert page.locator('.cx-cline').count()==1
   assert page.locator('.cx-cline .cx-stepper__num').inner_text()=='2'
   page.locator('.cx-cline__remove').click();assert page.locator('.cx-cline').count()==0
   page.locator('.cx-cart .cx-close').click();page.locator('.cx-dish .cx-add').first.click();page.locator('.cx-cartbtn').click();page.locator('.cx-cart__foot button').click()
   page.get_by_role('dialog').wait_for();check_bounds(page);focus_in_dialog(page)
   page.locator('.cx-mode').nth(1).click();page.locator('.cx-checkout__foot .cx-btn').click();page.locator('input[name=customer]').fill('Guest fixture');page.locator('input[name=phone]').fill('0900000000');check_bounds(page)
   assert not errors,errors
   context.close();print('PASS storefront, home, modifiers, basket removal, checkout, focus and bounds:',width,lang,flush=True)
 # Removal is complete for owner navigation and old bookmarks.
 context=browser.new_context(viewport={'width':1280,'height':900});context.route('**/*',fixtures['handler']);fixtures['seed_staff'](context,'owner');page=context.new_page();page.goto(BASE+'/admin/sufra/design');page.locator('.adm-nav').wait_for()
 assert page.locator('.adm-nav button').count()==9
 assert page.get_by_role('button',name='استوديو التصميم',exact=False).count()==0
 assert page.locator('.adm-title').first.inner_text() not in ['استوديو التصميم','Design studio']
 context.close();browser.close()
print('PASS removed studio navigation and legacy bookmark fallback')
