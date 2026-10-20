"""Admin visual/layout regressions using mock API data and a real Chromium browser.
Run npm run build, then npm run preview -- --port 4174. Requires Python Playwright.
No production data is created or modified.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

# Reuse the existing workflow fixtures without executing its test runner.
fixtures = {}
exec((Path(__file__).parent / 'smoke_workflows.py').read_text().split('with sync_playwright() as p:')[0], fixtures)
BASE = fixtures['BASE']
menu, order, state = fixtures['menu'], fixtures['order'], fixtures['state']
menu['hours'] = [{'weekday': i, 'open': '10:00', 'close': '23:00', 'enabled': True} for i in range(7)]
order['customer_name'] = 'اسم زبون طويل للتأكد من التفاف النص وعدم خروجه من البطاقة'
order['order_lines'][0]['note'] = 'A_long_unbroken_preparation_note_' * 6
order['payment_reference'] = 'reference-' * 12
routes = ['overview','orders','kitchen','cashier','menu','tables','reports','operations','settings','design']
ARTIFACTS = Path('/tmp/admin-design-review')
ARTIFACTS.mkdir(exist_ok=True)

def bounds(page):
    return page.evaluate('''() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,
      content:[...document.querySelectorAll('.adm-body input,.adm-body textarea,.adm-body select,.adm-body > .adm-body__in > *,.adm-work-ticket')]
       .filter(e=>e.getBoundingClientRect().width&&!e.closest('.mds-preview'))
       .filter(e=>{const r=e.getBoundingClientRect();return r.left < -2 || r.right > innerWidth+2})
       .map(e=>({class:e.className,x:e.getBoundingClientRect().x,w:e.getBoundingClientRect().width}))})''')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    errors=[]
    for width,lang in [(320,'ar'),(390,'ar'),(768,'ar'),(1280,'ar'),(390,'en'),(1280,'en')]:
        context=browser.new_context(viewport={'width':width,'height':900})
        context.route('**/*',fixtures['handler']);fixtures['seed_staff'](context,'owner')
        context.add_init_script('localStorage.setItem("syrianqr-language",'+json.dumps(json.dumps(lang))+')')
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        shell_style=None
        for tab in routes:
            page.goto(BASE+'/admin/sufra/'+tab)
            page.locator('.adm-body').wait_for()
            if tab in ['kitchen','cashier']: page.locator('.adm-workstation').wait_for()
            if tab=='settings': page.locator('.adm-hours-policy').wait_for()
            assert page.locator('.adm--workspace').count()==1,tab
            nav=page.locator('.adm-nav')
            assert nav.get_by_role('button').count()==10
            selected=nav.locator('[aria-current=page]');assert selected.count()==1
            if width<=900: page.wait_for_function('''()=>{const n=document.querySelector('.adm-nav').getBoundingClientRect(),a=document.querySelector('.adm-nav [aria-current=page]').getBoundingClientRect();return a.left>=n.left-2&&a.right<=n.right+2}''',timeout=2000)
            r=selected.bounding_box();n=nav.bounding_box()
            if width<=900: assert r['x']>=n['x']-2 and r['x']+r['width']<=n['x']+n['width']+2,(width,tab,'active tab off-screen',r,n)
            actual=page.locator('.adm-mast').evaluate('(e)=>({background:getComputedStyle(e).backgroundImage,border:getComputedStyle(e).borderRadius})')
            if shell_style is None:shell_style=actual
            else:assert actual==shell_style,(tab,'inconsistent mast styling')
            measurement=bounds(page)
            assert measurement['scroll']<=width+1,(width,tab,measurement)
            assert not measurement['content'],(width,tab,measurement)
            if tab in ['kitchen','cashier']:
                assert page.locator('.adm-work-ticket').count()==1
                # RTL and LTR search text must reserve space for the inset icon.
                field=page.locator('.adm-workstation .adm-search input').first
                assert int(field.evaluate('e=>parseFloat(getComputedStyle(e).paddingInlineStart)'))>=40
                field.fill('no-order-matches-this')
                page.locator('.adm-workstation .adm-empty').wait_for()
                page.locator('.adm-workstation .adm-empty button').click()
                page.locator('.adm-work-ticket').wait_for()
                if width in [390,1280] and lang=='ar':page.screenshot(path=str(ARTIFACTS/f'{tab}-{width}.png'),full_page=True)
                page.evaluate('window.scrollTo(0,400)');page.wait_for_timeout(60)
                bar=page.locator('.adm-bar').bounding_box();navbox=nav.bounding_box()
                assert navbox['y']>=bar['y']+bar['height']-1,(width,tab,'sticky navigation overlaps top bar',navbox,bar)
            if tab=='menu' and width==320:
                page.get_by_role('button',name='إضافة صنف',exact=False).first.click()
                modal=page.get_by_role('dialog');modal.wait_for()
                assert modal.bounding_box()['width']<=width
                assert modal.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),'item editor overflows on mobile'
                page.get_by_role('button',name='إغلاق',exact=True).click()
        context.close()
        print('PASS all 10 admin tabs:',width,lang,flush=True)
    for role in ['kitchen','cashier']:
        context=browser.new_context(viewport={'width':390,'height':844});context.route('**/*',fixtures['handler']);fixtures['seed_staff'](context,role)
        page=context.new_page();page.goto(BASE+'/admin/sufra/'+role);page.locator('.adm-workstation').wait_for()
        assert page.locator('.adm-nav button').count()==1,'restricted role sees manager navigation'
        assert page.locator('.adm-mast').count()==1,'restricted role lacks shared header'
        context.close();print('PASS shared layout and restricted navigation:',role,flush=True)
    assert not errors,errors
    browser.close()
print('PASS consistent admin chrome, Arabic/English layouts, wrapping, search, empty states, sticky navigation, and mobile item editor')
