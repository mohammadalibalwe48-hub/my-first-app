# Sufra QR Menu MVP

A mobile-first QR menu and digital ordering prototype tailored to restaurants in Syria. The implementation follows the product baseline in [`FUNCTIONAL_SPECIFICATION.md`](FUNCTIONAL_SPECIFICATION.md).

## Included

- Arabic-first responsive customer menu with search, category filters, dietary filters, and SYP/USD display.
- Item option groups, cooking notes, persistent cart, and quantity management.
- Dine-in, takeaway, and delivery checkout flows with local payment methods.
- Persistent customer order history and visual order tracking.
- Structured WhatsApp order handoff.
- Restaurant dashboard with live-order workflow columns.
- Menu stock controls and multi-restaurant demo switching.
- Desktop, tablet, and mobile layouts.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

The current prototype stores carts and orders in browser local storage. Production deployment still requires the multi-tenant backend, authentication, database, real-time events, media storage, and approved WhatsApp Business integration described in the functional specification.

## Site structure & routing

- `/` — Product showcase (marketing) for the platform **SYRIAN QR**: digital menus, dine-in ordering from the table via QR, local payments, and an orders dashboard.
- `/c/<slug>` — Per-cafe storefronts. Currently `sufra` (سُفرة الشام) and `cozy` (Cozy Corner), each with its own accent palette (see `src/cafeTheme.ts`). Legacy `?restaurant=<slug>` links still resolve to the same storefront.
- `/admin` — Staff dashboard entry (legacy `?admin=1` also works).
- Adding a new cafe requires **no routing code change**: create a row for the new slug in the Supabase `restaurants` table and, optionally, add an accent palette entry in `src/cafeTheme.ts`. The storefront is served from `index.html` via the SPA catch-all rewrite in `vercel.json`.
