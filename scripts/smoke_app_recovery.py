"""Browser recovery checks; mocked APIs and interrupted asset loads, no live writes.
Run npm run build and npm run preview -- --port 4174 first.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
fixtures={}
exec((Path(__file__).parent/'smoke_workflows.py').read_text().split('with sync_playwright() as p:')[0],fixtures)
BASE=fixtures['BASE']

def context(browser, init=None):
 c=browser.new_context(viewport={'width':390,'height':844});c.route('**/*',fixtures['handler'])
 c.add_init_script('localStorage.setItem("syrianqr-language",JSON.stringify("en"))')
 if init:c.add_init_script(init)
 return c

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 # A stale chunk fails once, triggers one guarded reload, then the page opens.
 c=context(browser);failed={'count':0}
 def once(route):
  failed['count']+=1
  if failed['count']==1:return route.abort()
  return route.continue_()
 c.route('**/assets/HomePage-*.js',once)
 page=c.new_page();page.goto(BASE);page.locator('.home-venue').first.wait_for()
 assert failed['count']==2,failed
 print('PASS interrupted route chunk recovers with one reload',flush=True);c.close()
 # A permanent chunk outage must show a retry UI rather than loop or turn white.
 c=context(browser);failures={'count':0}
 def always(route):failures['count']+=1;route.abort()
 c.route('**/assets/HomePage-*.js',always);page=c.new_page();page.goto(BASE);page.locator('.app-recovery button').wait_for()
 page.wait_for_timeout(400);assert failures['count']==2,failures
 page.locator('.app-recovery button').focus();page.keyboard.press('Enter');page.locator('.app-recovery button').wait_for();assert failures['count']==3
 print('PASS permanent chunk outage has accessible manual retry and no reload loop',flush=True);c.close()
 # A failed entry bundle is caught even before React runs. Preserve the QR URL.
 c=context(browser);entry_failures={'count':0}
 def entry_failure(route):entry_failures['count']+=1;route.abort()
 c.route('**/assets/index-*.js',entry_failure);page=c.new_page();page.goto(BASE+'/c/sufra?table=qr-fixture#menu');page.locator('#boot-retry:visible').wait_for()
 assert entry_failures['count']==2,entry_failures
 assert page.url.endswith('/c/sufra?table=qr-fixture#menu'),page.url
 assert page.locator('body').inner_text().strip()
 print('PASS entry-bundle failure retains route/QR parameters and startup retry',flush=True);c.close()
 # Blocked session storage must disable auto-reload, not create an infinite retry.
 c=context(browser)
 c.add_init_script('const setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===sessionStorage)throw new Error("storage unavailable");return setItem.call(this,k,v)}')
 c.route('**/assets/HomePage-*.js',lambda r:r.abort());page=c.new_page();page.goto(BASE);page.locator('.app-recovery button').wait_for()
 print('PASS recovery remains usable when session storage is blocked',flush=True);c.close()
 # Corrupt top-level and nested saved data cannot crash the order provider.
 for data in [{"cart":{},"orders":None},{"cart":[None,{'key':'bad','qty':1,'item':{}}],"orders":[None,{'id':'bad'}]}]:
  c=context(browser,'localStorage.setItem("sufra-cart-sufra",'+json.dumps(json.dumps(data['cart']))+');localStorage.setItem("sufra-orders",'+json.dumps(json.dumps(data['orders']))+');')
  page=c.new_page();page.goto(BASE+'/c/sufra');page.locator('.cx-dish').first.wait_for();assert page.locator('.app-recovery').count()==0
  assert page.evaluate('JSON.parse(localStorage.getItem("sufra-cart-sufra")).length')==0
  c.close()
 print('PASS malformed saved basket/history data no longer crashes rendering',flush=True)
 # A healthy background/foreground cycle preserves the page, basket, and form draft.
 c=context(browser);page=c.new_page();page.goto(BASE+'/c/sufra');page.locator('.cx-add').first.click();page.locator('.cx-cartbtn').click();page.locator('.cx-cart__foot button').click()
 page.locator('.cx-mode').nth(1).click();page.locator('input[name=customer]').fill('Unsaved draft');page.evaluate('window.__resumeMarker="same-page";window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));document.dispatchEvent(new Event("visibilitychange"))')
 page.wait_for_timeout(350);assert page.evaluate('window.__resumeMarker')=='same-page';assert page.locator('input[name=customer]').input_value()=='Unsaved draft'
 page.reload();page.locator('.cx-dish').first.wait_for();page.locator('.cx-cartbtn').click();page.locator('.cx-cline').wait_for()
 page.locator('.cx-cart__foot button').click();page.locator('.cx-mode').nth(1).click();page.locator('input[name=customer]').fill('Persistent receipt');page.locator('input[name=phone]').fill('0900000000');page.get_by_role('button',name='Place order',exact=True).click();page.wait_for_url('**/orders');page.reload();page.locator('.cx-livecard').first.wait_for()
 assert page.evaluate('JSON.parse(localStorage.getItem("sufra-orders")).length')==1
 print('PASS healthy tab restoration keeps form state; valid basket and receipt survive reload',flush=True);c.close()
 # Simulate a restored document whose application root was lost.
 c=context(browser);page=c.new_page();page.goto(BASE);page.locator('.home-venue').first.wait_for();page.evaluate('document.getElementById("root").replaceChildren();window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))');page.locator('.home-venue').first.wait_for()
 print('PASS empty restored root recovers on pageshow',flush=True);c.close();browser.close()
