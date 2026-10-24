# SYRIAN QR — food app experience

The chosen direction is the user's white-and-coral mobile food-app reference. This release replaces the customer component tree and old stylesheet stack, rather than applying another theme to the previous interface.

## Components and ownership

- `src/components/AppKit.tsx`: buttons, icon buttons, image/error fallback, section headings, empty states and dialog headings.
- `src/features/customer/Experience.tsx`: restaurant profile, search/filter/saved-dish browsing, food cards, dish selection, basket, order feed and tracking.
- `src/features/customer/core.tsx`: currency display, quantity control and accessible overlay lifecycle.
- `src/features/customer/app.css`: the customer component styles, including guided checkout. The previous customer.css/mobile/refresh/atlas stylesheets are removed.
- `src/features/CustomerUI.tsx`: checkout's existing validated controller and form fields, now exposed as fulfilment → details → payment steps.
- `src/pages/CafeLayout.tsx`: new app navigation, restaurant context, desktop basket rail, mobile basket action and notifications.
- `src/landing/LandingPage.tsx`: restaurant discovery with working name/cuisine search and place-type filters.
- `src/features/WorkspaceShell.tsx`: restaurant switcher, workspace navigation, account menu, notification shortcut and command header.
- `src/features/AdminUI.tsx`: redesigned overview with actual metrics, queue and service status; searchable order inbox replaces the seven-column board. Existing protected editors and order actions remain connected.
- `src/features/StaffWorkstation.tsx`: kitchen preparation-stage and cashier payment-stage filters, within the shared workspace.
- `src/features/workspace-app.css`: workspace and direct staff sign-in components. Previous forest/olive overrides and the old promotional entry styles are removed.
- `src/pages/platform/platform-app.css`: platform-owner navigation and owner-console component system.

## Experience rules

- Saved dishes persist locally, scoped to the restaurant. Invalid stored preference shapes are ignored.
- Dish options and quantity determine the displayed total. Required/minimum/maximum selections are enforced before adding.
- The basket is dismissed before checkout opens; only one dialog is active.
- Checkout's Continue controls cannot submit the order. The final confirmation is a separate button/DOM identity. Required fields are validated at the details boundary and again before submission.
- Existing server totals, discount/tax/service/delivery calculations, verified QR table context, geofence checks, submission idempotency and retry behaviour remain authoritative.
- Orders retain their receipts, live status, cancellation information and current-price reorder flow.
- Owner/manager/kitchen/cashier permissions, push notifications and session recovery remain in place.
- Setup is available in a collapsed dashboard section; service information has priority.
- Mobile workspace navigation follows the selected section as counts, fonts and viewport dimensions change.

## Visual foundation

White surfaces, light neutral backgrounds, coral actions and warm accents; DM Sans for English UI and Tajawal for Arabic. Large rectangular food images, compact navigation, clear product pricing, contained dialogs and focus indicators. Existing restaurant image/content data stays attached to its restaurant. No fake ratings, nutrition, discounts, estimated delivery promises or production fixture records are added.

Responsive product grids use two columns on phones, three on tablets, and two or three alongside the desktop order rail. Mobile keeps menu/orders/basket navigation reachable. The PWA/browser theme and recovery surfaces use the new app materials.
