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

`supabase/migrations` includes the 29 original migrations recovered from the project's migration history, the site-asset bucket migration, the table-token access fix, and the restaurant-workflow migration. The original migration versions and SQL are preserved. The historical seed migration creates the `sufra` and `cozy` demo menus; it contains no production orders or user accounts.

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

## Customer ordering and staff workspaces

Customers can save checkout contact details on their own device with an explicit opt-in and remove them by unchecking the preference. Language choice persists. Order history refreshes active receipts every 15 seconds while the page is visible. Reordering rebuilds a basket at current prices; unavailable items or changed options are skipped and reported before checkout.

Checkout displays delivery fees, discounts, tax and service charges. The database independently calculates the final total; discounts apply to menu items before tax/service and exclude delivery. Repeated submissions reuse an idempotency key. Unconfigured wallet methods are hidden. Payments are still verified manually by staff; no payment processor is introduced.

- `/admin/:slug/kitchen` — incoming orders, preparation progress, elapsed-time warnings, and item stock controls.
- `/admin/:slug/cashier` — payment verification, delivery dispatch, and completed handoffs.
- Owners/managers retain menu, table, reporting, team and settings screens. Kitchen and cashier roles are routed to their dedicated workspaces; viewers receive a read-only kitchen view.

The database enforces restaurant membership, role-specific order changes, and staff-editable columns. Cashiers must verify payment before completing an order. Stale updates are rejected. Staff membership changes use the guarded management RPC.

Sound must be enabled by a click in each browser session. Browser notifications need permission and a running page; these are not push notifications for a closed app. Order desks keep Realtime subscriptions and refresh every 15 seconds as a fallback.

Menu items support start/end availability dates, English descriptions and preparation targets. Dates are entered in the operator device's local time and stored as UTC. Settings support a percentage discount and optional automatic opening-hours enforcement, including overnight shifts in the restaurant's configured timezone. Both default to inactive, so the upgrade does not change current prices or opening behavior. Delivery zones, team permissions and sales reports remain available in their existing management screens.

To check the backend in a disposable PostgreSQL 17 container:

```sh
python scripts/test_database.py
```

This replays every migration and runs the SQL regression checks with minimal Auth/Storage schema stubs. It does not replace testing a full Supabase stack. For browser checks, install Playwright for Python and Chromium, then run:

```sh
npm run build
npm run preview -- --port 4174
# In a second terminal:
python scripts/smoke_workflows.py
```

The browser script uses mocked API responses and sends no production orders. The SQL tests cover actual database pricing, schedules, overnight hours, idempotency, stock permissions, staff role limits and stale-update rejection. English UI is supplied; restaurant-authored content falls back to its original text when no English version has been provided.

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


### Staff device notifications

New orders create a transactional `order_push_jobs` record. The `order-push` Edge Function sends encrypted Web Push using VAPID; `pg_net` starts delivery immediately and `pg_cron` retries pending jobs each minute, for up to 24 hours. Queue records are removed after two days. Successful devices are recorded separately, expired subscriptions are deleted, and active restaurant membership is rechecked at delivery. Push payloads include only the order number and staff route, not customer details.

On every staff device, open the restaurant workspace, choose **Enable device notifications**, allow the browser permission, and choose **Test notification**. This registers the current restaurant only. On iPhone/iPad (iOS/iPadOS 16.4+), first add the site to the Home Screen and open that installed app. Lock-screen sound follows operating-system notification and Focus settings. In-page audio requires **Enable sound** once per browser session. Signing out removes this account's device subscriptions and unsubscribes the browser.

Deployment: apply both push migrations, deploy `supabase/functions/order-push` with JWT gateway verification disabled (the handler verifies its dispatcher secret or the test sender's user JWT), and provision `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, and `ORDER_PUSH_DISPATCH_SECRET` as Edge secrets. Store the same dispatcher secret in Vault as `order_push_dispatch_secret`. The public key in `src/pushConfig.ts` must match; private keys and dispatcher secrets must never enter the repository. For another Supabase project or domain, update the fixed dispatcher URL, CORS origin and VAPID subject before deployment. Production secrets are already provisioned for this project.

Validation:

```sh
python scripts/test_database.py
npx --yes deno check --node-modules-dir=none supabase/functions/order-push/index.ts
npx --yes deno run --node-modules-dir=none --allow-env --allow-read scripts/test_web_push.ts
npm run build
# With npm run preview -- --port 4174 running:
python scripts/smoke_order_alerts.py
python scripts/smoke_workflows.py
```

The disposable PostgreSQL runner tests subscription isolation, endpoint restrictions, active-member delivery, transactional enqueueing, and job leases. Hosted `pg_net`/`pg_cron` infrastructure is checked separately on Supabase. Browser tests exercise actual audio and the service worker's notification handler with mocked order APIs. The dispatcher test checks actual payload encryption/decryption and VAPID signatures against a local simulated push provider. Real phone delivery still needs the device's notification permission and a successful device test; browser restrictions and OS settings cannot be bypassed by the application.
