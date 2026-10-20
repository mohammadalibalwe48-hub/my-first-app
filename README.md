# Syrian QR / Sufra

Arabic-first restaurant QR menus and ordering, built with React, TypeScript, Vite, and Supabase Postgres, Auth, Realtime, and Storage.

## Features

- Restaurant storefronts with search, categories, item options, dietary filters, SYP/USD display, and a persistent cart.
- Dine-in orders from table QR links, takeaway, and delivery; the database validates menu prices, options, delivery minimums, and idempotency keys.
- Order receipts and token-based tracking. Browser storage keeps cart state and order receipts; orders themselves are stored in Postgres.
- Restaurant staff dashboards for orders, menus, tables, settings, reports, team access, and menu design.
- Platform administration and an asset library restricted to platform administrators.
- WhatsApp handoff with dispatch records. This opens WhatsApp; it is not an automated WhatsApp Business delivery integration.

## Run the frontend

Use Node.js 22.12+ and npm:

```sh
npm ci
npm run dev
```

Vite reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Override them in `.env.local` to use another project or a local stack. These are public browser settings; never put a service-role key or database password in a `VITE_` variable. The checked-in configuration currently points to the QR CODE project.

```sh
npm run build
npm run preview
```

Routes and the menu design studio load on demand, so visitors do not download all staff and platform code on first load.

## Database setup

`supabase/migrations` includes the 29 original migrations recovered from the project's migration history, the site-asset bucket migration, and the table-token access fix. The original migration versions and SQL are preserved. The historical seed migration creates the `sufra` and `cozy` demo menus; it contains no production orders or user accounts.

For a new **local development** database, install the Supabase CLI and Docker, then run:

```sh
supabase start
supabase db reset --local
supabase status
```

Set `.env.local` from the local API URL and publishable/anon key reported by `supabase status`, then restart Vite. The schema uses PostgreSQL 17. Auth and Storage platform schemas are supplied by Supabase.

For a new hosted project, link that project and review `supabase db push --dry-run` before applying migrations. This creates the demo restaurants as well as the backend. Do not replay historical migrations manually on the existing QR CODE database: they are already applied there. Link the correct project and use its migration history to determine pending changes. The table-token security fix has also been applied to QR CODE and recorded in its migration history.

The existing QR CODE site-asset bucket and its three policies were verified against `20261001000000_site_assets.sql`, and that previously untracked version was marked applied. Local filenames now match the hosted migration history.

### Access controls and checks

All public application tables use RLS. Restaurant staff can read tables for their own restaurant; guests cannot enumerate table QR tokens. Guests use `get_public_menu` to resolve a token they already scanned. Order submission and token-based tracking use guarded RPCs; staff order access is scoped by restaurant membership.

Run the security regression check against a disposable, migrated local database using its connection URL from `supabase status`:

```sh
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/table_token_access.sql
```

The test rolls back its fixtures. It checks anonymous access denial, staff access, cross-restaurant isolation, nonmember isolation, and scanned-token resolution. Never run test fixtures against production.

The initial owner onboarding currently targets `admin@qrcode-syria.com`; create and verify that account through Supabase Auth before onboarding. For another installation, review the onboarding migrations and the login UI's owner address together. Do not derive permissions from user-editable metadata.

## Restaurant locations

Geofencing remains unconfigured for both demo restaurants. Dine-in requires a valid table QR token; the server additionally checks submitted GPS coordinates when the restaurant has coordinates configured. An authorized operator can enter the real coordinates or use “capture my location” in the restaurant settings and save. Do this from the restaurant, and choose an appropriate radius. Browser GPS is client-supplied and is not proof against spoofing.

## Routes

- `/` — platform marketing page.
- `/c/:slug` — restaurant menu; `?tableToken=<uuid>` resolves a table QR link.
- `/c/:slug/orders` — browser's saved order receipts and tracking.
- `/admin` — staff sign-in and workspace selection.
- `/admin/:slug/*` — restaurant workspace.
- `/platform` and `/platform/assets` — platform administration.

Legacy `?restaurant=<slug>` links redirect to the restaurant storefront. Vercel's SPA rewrite is configured in `vercel.json`.
