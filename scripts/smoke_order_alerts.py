"""Mocked order API + real AudioContext and service-worker notification regression.
Run npm run build and npm run preview -- --port 4174 first.
Requires Python Playwright and Chromium, as smoke_workflows.py does.
"""
from pathlib import Path
ns={}
source=Path('scripts/smoke_workflows.py').read_text().split('with sync_playwright() as p:')[0]
source=source.replace("elif '/rest/v1/orders' in url: data=[order]","elif '/rest/v1/orders' in url: data=state.get('orders',[order])")
exec(source,ns)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(permissions=['notifications'])
 context.route('**/*',ns['handler']);ns['seed_staff'](context,'owner')
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 ns['state']['orders']=[]
 page.goto(ns['BASE']+'/admin/sufra/orders');page.get_by_role('button',name='Enable sound',exact=True).wait_for()
 page.get_by_role('button',name='Enable sound',exact=True).click();page.get_by_role('button',name='Mute sound',exact=True).wait_for()
 # First order from an empty desk must alert; polling is triggered with focus.
 ns['state']['orders']=[ns['order']]
 page.evaluate('window.dispatchEvent(new Event("focus"))')
 page.locator('.order-alerts [role=status]').filter(has_text='1 new order').wait_for()
 page.evaluate("history.pushState({},'', '/admin/sufra/kitchen');window.dispatchEvent(new PopStateEvent('popstate'))")
 assert page.get_by_role('button',name='Mute sound',exact=True).get_attribute('aria-pressed')=='true'
 page.evaluate('window.dispatchEvent(new Event("focus"))')
 page.wait_for_timeout(300)
 assert '1 new order' in page.locator('.order-alerts [role=status]').inner_text()
 page.get_by_role('button',name='Mute sound',exact=True).click()
 page.get_by_role('button',name='Enable sound',exact=True).wait_for()
 # New ID replacing an old order at the same array length still alerts.
 updated=dict(ns['order']);updated['id']='30000000-0000-4000-8000-000000000099';updated['order_number']=99
 ns['state']['orders']=[updated];page.evaluate('window.dispatchEvent(new Event("focus"))')
 page.locator('.order-alerts [role=status]').filter(has_text='99').wait_for()
 assert not errors,errors
 print('PASS shared alerts: empty desk, new IDs at fixed length, navigation persistence, actual AudioContext unlock/mute')
 # Browser worker receives a push payload and displays a real OS notification.
 page.evaluate('navigator.serviceWorker.register("/sw.js")')
 worker=context.wait_for_event('serviceworker') if not context.service_workers else context.service_workers[0]
 page.evaluate('navigator.serviceWorker.ready')
 worker.evaluate('self.dispatchEvent(new PushEvent("push", {data:JSON.stringify({title:"Local push fixture",body:"Worker delivery",tag:"fixture",url:"/admin/sufra/orders"})}))')
 page.wait_for_timeout(500)
 notifications=page.evaluate('(async()=>{const r=await navigator.serviceWorker.ready;return(await r.getNotifications()).map(n=>({title:n.title,body:n.body,tag:n.tag,url:n.data.url}))})()')
 assert any(n['title']=='Local push fixture' and n['url']=='/admin/sufra/orders' for n in notifications),notifications
 print('PASS real service worker push handler and Notification API display')
 context.close();browser.close()
