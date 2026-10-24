"""Browser regression checks against npm run preview on port 4174.
Uses mocked API responses; run SQL tests separately to verify database enforcement.
Requires Playwright for Python and a Chromium installation.
"""
import base64
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('APP_TEST_URL','http://localhost:4174')
RID='30000000-0000-4000-8000-000000000001'
IID='30000000-0000-4000-8000-000000000002'
OID='30000000-0000-4000-8000-000000000003'
menu={'restaurant':{'id':RID,'slug':'sufra','nameAr':'مطعم الاختبار','nameEn':'Test restaurant','subtitleAr':'قائمة الاختبار','accent':'#063239','phone':'','whatsapp':'','city':'دمشق','neighborhood':'','exchangeRate':15000,'dineIn':True,'takeaway':True,'delivery':True,'taxPercent':10,'servicePercent':5,'discountPercent':10,'isOpen':True,'enforceHours':False,'timezone':'Asia/Damascus','usdEstimateEnabled':True,'design':{}},'table':None,'items':[{'id':IID,'categoryId':'cat','nameAr':'طبق الاختبار','nameEn':'Test dish','descriptionAr':'طبق طازج','descriptionEn':'Fresh dish','imageUrl':'','price':10000,'tags':[],'available':True,'popular':True,'optionGroups':[]}],'categories':[{'id':'cat','nameAr':'رئيسية','nameEn':'Mains'}],'zones':[{'id':'zone','nameAr':'دمشق','fee':2000,'minimum':0}],'wallets':[],'hours':[]}
order={'id':OID,'restaurant_id':RID,'order_number':1,'public_token':'token','mode':'takeaway','status':'received','customer_name':'Test customer','customer_phone':'0900000000','delivery_address':'','payment_method':'Cash','payment_status':'pending','payment_reference':'','total_syp':10350,'internal_note':'','cancellation_reason':'','created_at':'2026-10-20T06:00:00Z','updated_at':'2026-10-20T06:00:00Z','restaurant_tables':None,'order_lines':[{'id':'line','menu_item_id':IID,'item_name_ar':'طبق الاختبار','item_name_en':'Test dish','unit_price_syp':10000,'quantity':1,'note':'No onions','order_line_options':[]}]}
state={'role':None,'status':'preparing','fail_submit':False,'submissions':[],'patches':[]}
def handler(route):
    url=route.request.url
    if '.supabase.co/' not in url:
        if url.startswith(BASE): return route.continue_()
        return route.fulfill(status=200,body='',content_type='text/plain')
    data={}
    if '/rpc/get_public_menu' in url: data=menu
    elif '/rpc/submit_public_order' in url:
        payload=route.request.post_data_json['p_payload'];state['submissions'].append(payload)
        if state['fail_submit']: return route.fulfill(status=500,json={'message':'test_network_error'})
        data={'id':OID,'orderNumber':'SF-1','publicToken':'token','total':10350,'status':'received'}
    elif '/rpc/track_public_order' in url: data={'status':state['status'],'total':10350}
    elif '/rpc/pf_ensure_platform_admin' in url: data=False
    elif '/rpc/staff_update_order' in url:
        payload=route.request.post_data_json;state['patches'].append(payload)
        data={'updatedAt':'2026-10-20T06:02:00Z','status':payload['p_patch'].get('status',order['status'])}
    elif '/rpc/set_item_availability' in url:
        menu['items'][0]['available']=route.request.post_data_json['p_available'];data={'success':True}
    elif '/rpc/sync_admin_settings' in url: data={'success':True}
    elif '/rpc/sync_admin_menu' in url: data={'success':True}
    elif '/rpc/get_admin_operations' in url: data={'acceptingOrders':True,'notifications':False,'sound':False,'staff':[],'audit':[]}
    elif '/auth/v1/user' in url: data={'id':'test-user','email':'test@example.test','app_metadata':{'provider':'email'},'user_metadata':{},'aud':'authenticated','created_at':'2026-01-01T00:00:00Z'}
    elif '/rest/v1/restaurant_members' in url: data=[{'restaurant_id':RID,'role':state['role'],'display_name':'Test staff','restaurants':{'slug':'sufra','name_ar':'مطعم الاختبار'}}] if state['role'] else []
    elif '/rest/v1/orders' in url: data=[order]
    else: data=[]
    route.fulfill(status=200,json=data)

def seed_staff(context,role):
    state['role']=role
    encoded=base64.urlsafe_b64encode(json.dumps({'sub':'test-user','role':'authenticated','exp':int(time.time())+3600}).encode()).decode().rstrip('=')
    session={'access_token':'eyJhbGciOiJIUzI1NiJ9.'+encoded+'.test','refresh_token':'test','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':'test-user','email':'test@example.test','app_metadata':{},'user_metadata':{}}}
    context.add_init_script('localStorage.setItem("syrianqr-language",JSON.stringify("en"));localStorage.setItem("sb-xgkpoxyirycravtxfyes-auth-token",'+json.dumps(json.dumps(session))+');')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844})
    context.route('**/*',handler)
    context.add_init_script('localStorage.setItem("syrianqr-language",JSON.stringify("en"))')
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/c/sufra');page.get_by_role('heading',name='All dishes').wait_for()
    page.get_by_role('button',name='Add Test dish',exact=False).click()
    page.get_by_role('button',name='Open basket',exact=False).first.click()
    page.get_by_role('button',name='Continue to checkout',exact=False).click()
    page.get_by_role('button',name='Takeaway',exact=False).click();page.get_by_role('button',name='Continue',exact=True).click()
    page.locator('input[name=customer]').fill('Test customer');page.locator('input[name=phone]').fill('0900000000')
    page.get_by_label('Remember my name, phone and address on this device only').check()
    assert page.locator('.cx-checkout__sum').inner_text().find('10,350')>=0
    assert page.locator('input[name=payment]').count()==1,'Unconfigured wallets shown'
    page.get_by_role('button',name='Continue',exact=True).click()
    assert not state['submissions'],'Advancing checkout submitted an order without final confirmation'
    state['fail_submit']=True;page.get_by_role('button',name='Place order',exact=True).click()
    page.get_by_role('button',name='Retry order',exact=True).wait_for();assert page.locator('input[name=phone]').input_value()=='0900000000'
    state['fail_submit']=False;page.get_by_role('button',name='Retry order',exact=True).click()
    page.wait_for_url('**/orders');assert state['submissions'][0]['idempotencyKey']==state['submissions'][1]['idempotencyKey']
    page.get_by_role('button',name='Close',exact=True).click()
    assert page.evaluate('JSON.parse(localStorage.getItem("syrianqr-checkout-v1-sufra")).phone')=='0900000000'
    state['status']='completed';page.evaluate('window.dispatchEvent(new Event("focus"))');page.get_by_role('button',name='Reorder at current prices').wait_for()
    page.get_by_role('button',name='Reorder at current prices').click();page.get_by_role('button',name='Continue to checkout',exact=False).click()
    assert page.locator('input[name=phone]').input_value()=='0900000000'
    page.get_by_role('button',name='Delivery',exact=False).click();assert '12,350' in page.locator('.cx-checkout__sum').inner_text();page.get_by_role('button',name='Continue',exact=True).click()
    page.get_by_label('Remember my name, phone and address on this device only').uncheck();assert page.evaluate('localStorage.getItem("syrianqr-checkout-v1-sufra")') is None
    assert '12,350' in page.locator('.cx-checkout__sum').inner_text()
    assert not errors,errors
    context.close()
    print('PASS customer checkout, accurate totals, failure recovery, idempotent retry, preferences, live history, and reorder')
    for role,view in [('kitchen','kitchen'),('cashier','cashier'),('owner','settings')]:
        context=browser.new_context(viewport={'width':1280,'height':900});context.route('**/*',handler);seed_staff(context,role)
        page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(BASE+'/admin/sufra/'+view)
        if role=='kitchen':
            page.get_by_role('heading',name='Kitchen display').wait_for();page.locator('.workstation-stage-tabs').get_by_role('button',name='Ready',exact=True).click();page.locator('.adm-workstation .adm-empty').wait_for();page.locator('.workstation-stage-tabs').get_by_role('button',name='All orders',exact=True).click();page.get_by_role('button',name='Accept order').click()
            assert state['patches'][-1]['p_patch']=={'status':'confirmed'}
            assert page.get_by_role('button',name='Confirm payment received').count()==0
            page.get_by_role('button',name='Test dish Available').click()
            page.get_by_role('button',name='Test dish Sold out').wait_for()
            page.goto(BASE+'/admin/sufra/settings');page.wait_for_url('**/kitchen')
        elif role=='cashier':
            page.get_by_role('heading',name='Cashier desk').wait_for();page.get_by_role('button',name='Confirm payment received').click()
            assert state['patches'][-1]['p_patch']=={'payment_status':'verified'}
            assert page.get_by_role('button',name='Accept order').count()==0
        else:
            page.get_by_text('خصم على الأصناف %',exact=True).wait_for()
            page.goto(BASE+'/admin/sufra/orders');page.locator('.workspace-order-row').first.click();page.get_by_role('dialog').wait_for();page.locator('button[aria-label="إغلاق الملف"]').click();assert page.get_by_role('dialog').count()==0
            page.goto(BASE+'/admin/sufra/menu');page.get_by_role('button',name='إضافة صنف',exact=False).first.click()
            page.get_by_text('جدولة توفر الصنف',exact=True).wait_for()
        context.close();print('PASS',role,'workspace and permissions')
    assert not errors,errors
    browser.close()
