-- Public URLs let storefronts use uploaded images; only platform admins can
-- browse or mutate the bucket through the authenticated Storage API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'syrianqr-site-assets',
  'syrianqr-site-assets',
  true,
  15728640,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve object contents without authentication. Keep object
-- listing private to platform admins so the bucket cannot be enumerated.
drop policy if exists "Site assets are readable by platform admins" on storage.objects;
create policy "Site assets are readable by platform admins"
on storage.objects for select to authenticated
using (
  bucket_id = 'syrianqr-site-assets'
  and public.pf_ensure_platform_admin() is true
);

drop policy if exists "Platform admins can upload site assets" on storage.objects;
create policy "Platform admins can upload site assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'syrianqr-site-assets'
  and public.pf_ensure_platform_admin() is true
);

drop policy if exists "Platform admins can delete site assets" on storage.objects;
create policy "Platform admins can delete site assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'syrianqr-site-assets'
  and public.pf_ensure_platform_admin() is true
);
