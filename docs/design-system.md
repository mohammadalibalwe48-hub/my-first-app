# SYRIAN QR — food app experience

The current direction is **Saffron & Ink**: warm ivory surfaces, espresso-ink type and primary actions, and a saffron accent for commit actions (quick add, final order confirmation), active states and highlights. It builds on the food-app component tree below; behaviour, routes and component ownership are unchanged.

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
- `src/features/workspace-app.css`: workspace and direct staff sign-in components. Its token block aliases the workspace's legacy names (`--teal`, `--red`, `--yellow`, `--text-*`, `--ow-*`) to the shared Saffron & Ink tokens.
- `src/features/professional-workspace.css`: the staff theme layer for the workspace shell, sidebars, fields, buttons, platform console and staff sign-in.
- `src/pages/platform/platform-app.css`: platform-owner navigation and owner-console component system; its `--px-*` tokens alias the same palette.

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

- Tokens live once, as `--sq-*` custom properties in `src/styles.css`, and are shared by the storefront, homepage, staff workspace and platform console. Components use tokens rather than hard-coded colours; the former `atelier.css` override layer is folded in and removed.
- Palette: ink `#1c1714`, ivory canvas `#faf6f0`, white surfaces, saffron `#e9a23b` (fills only, with ink text) and saffron-ink `#8f5300` for accent text. Semantic success, warning and danger colours are separate. Body, label and accent text pairs meet WCAG AA; the lighter tertiary tone is reserved for placeholders, icons and disabled controls.
- Typography: Fraunces (Latin) and El Messiri (Arabic) for display headings; Inter (Latin) and IBM Plex Sans Arabic for UI text. Body copy is at least 12px on phones and usually 13.5–15px.
- Signature details: a low-contrast Damascene eight-point star lattice on ink surfaces, pill controls, soft layered shadows and restrained hover lift (disabled for reduced motion and touch).
- Large rectangular food images, clear prices, contained dialogs (bottom sheets on phones) and visible focus outlines. Existing restaurant image and content data stays attached to its restaurant. No fake ratings, nutrition, discounts, estimated delivery promises or production fixture records are added.

Responsive product grids use two columns on phones, three on tablets, and two or three alongside the desktop order rail. Mobile keeps menu/orders/basket navigation reachable. The staff sign-in page, browser theme colour and boot screen use the same palette.

## Staff workspace and platform console

- Shell: white command bar, ivory content canvas, and an ink sidebar whose active item has a saffron tint and edge marker (bottom marker on the mobile tab strip).
- Actions: ink for primary buttons, saffron with ink text for the single highlighted action per view, neutral sunken fills for secondary buttons, and a raised white segment for the active choice in segmented controls.
- Status colours are semantic and distinct: new (saffron), accepted (neutral), preparing and out for delivery (info blue), ready (solid green), completed and verified (soft green), payment pending (warning), cancelled and rejected (danger).
- Page titles use the display font; dense data, labels and numbers stay in the UI font. The smallest legacy text sizes were raised to 11–13.5px.
