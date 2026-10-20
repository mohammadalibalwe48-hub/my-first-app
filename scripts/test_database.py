"""Replay migrations and SQL regression tests in a disposable PostgreSQL 17 container.
Requires Docker. Auth/Storage stubs cover only the schema dependencies used here;
use the Supabase CLI for a complete local stack. Never connects to production.
"""
import subprocess
import time
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
NAME = "qr-workflow-test-" + uuid4().hex[:10]
def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs)
bootstrap = """
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth; create schema storage; create schema extensions;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.email() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.email',true),'')$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
grant usage on schema auth to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
alter table storage.objects enable row level security;
create publication supabase_realtime;
"""
try:
    run('docker','run','--name',NAME,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-d','postgres:17-alpine')
    for attempt in range(30):
        if subprocess.run(['docker','exec',NAME,'pg_isready','-U','postgres'],capture_output=True).returncode == 0: break
        time.sleep(.3)
    def sql(source):
        return run('docker','exec','-i',NAME,'psql','-U','postgres','-v','ON_ERROR_STOP=1',input=source)
    sql(bootstrap)
    migrations = sorted((ROOT/'supabase/migrations').glob('*.sql'))
    for path in migrations: sql('begin;\n'+path.read_text()+'\ncommit;')
    print(f'PASS {len(migrations)} migrations replayed')
    for path in sorted((ROOT/'supabase/tests').glob('*.sql')):
        sql(path.read_text()); print('PASS',path.name)
except subprocess.CalledProcessError as error:
    print(error.stderr); raise
finally:
    subprocess.run(['docker','rm','-f',NAME],capture_output=True)
