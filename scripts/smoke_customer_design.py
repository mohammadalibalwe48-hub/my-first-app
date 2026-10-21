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
# Saved legacy editor appearance must not override the new unified design.
menu['restaurant']['design']={'palette':{'canvas':'#000000','ink':'#ffffff','action':'#ff0000'},'layout':{'hero':'cover','cards':'overlay'}}

def check_bounds(page):
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),'Page overflows horizontally'
 if page.get_by_role('dialog').count():
  assert page.get_by_role('dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),'Dialog overflows horizontally'
  box=page.get_by_role('dialog').bounding_box();assert box['x']>=0 and box['x']+box['width']<=page.viewport_size['width']+1,box

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
   page.locator('.home-hero__photo img').evaluate('(e)=>e.decode()')
   assert page.locator('.home-hero__photo img').evaluate('e=>e.naturalWidth>0'),'Landing photo did not load'
   page.locator('.home-venue').first.click();page.locator('.cx-dish').first.wait_for();check_bounds(page)
   assert page.locator('.cx').get_attribute('data-cd-cards') is None,'Legacy design still controls cards'
   assert page.locator('.cx-dish__media').first.evaluate('e=>getComputedStyle(e).borderRadius')=='50%'
   media=page.locator('.cx-dish__media').first.bounding_box();assert abs(media['width']-media['height'])<2,'Round thumbnail is stretched'
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
   page.locator('.cx-mode').nth(1).click();page.locator('input[name=customer]').fill('Guest fixture');page.locator('input[name=phone]').fill('0900000000');check_bounds(page)
   assert not errors,errors
   context.close();print('PASS storefront, home, modifiers, basket removal, checkout, focus and bounds:',width,lang,flush=True)
 # Removal is complete for owner navigation and old bookmarks.
 context=browser.new_context(viewport={'width':1280,'height':900});context.route('**/*',fixtures['handler']);fixtures['seed_staff'](context,'owner');page=context.new_page();page.goto(BASE+'/admin/sufra/design');page.locator('.adm-nav').wait_for()
 assert page.locator('.adm-nav button').count()==9
 assert page.get_by_role('button',name='استوديو التصميم',exact=False).count()==0
 assert page.locator('.adm-title').first.inner_text() not in ['استوديو التصميم','Design studio']
 context.close();browser.close()
print('PASS removed studio navigation and legacy bookmark fallback')
