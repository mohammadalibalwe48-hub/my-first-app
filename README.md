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
