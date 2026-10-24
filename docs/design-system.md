# Olive Table design system

SYRIAN QR uses the supplied restaurant-menu references as inspiration: an olive navigation rail, a warm cream canvas, large rectangular food photography, thin card borders, pill categories, and a clear basket action. This is a responsive adaptation for the existing production ordering application, not a replica of the reference brands.

## Foundations

- Canvas: `#f5f2e9`; paper: `#fffcf5`.
- Olive: `#657353`; strong ink: `#35432b`.
- Ordering action: terracotta `#b65035`; hover: `#943d27`.
- English display: DM Serif Display; English interface: DM Sans.
- Arabic editorial display: Amiri; Arabic interface and operational headings: Tajawal.
- Use existing Lucide outline icons for actual controls. Keep restaurant photos and descriptions from the backend. The generated sharing-table photo is an editorial landing-page illustration, not a menu-item replacement.

## Responsive behavior

- Restaurant menu above 900px: sticky olive category sidebar and inset cream content.
- Product grid: four columns from 1350px; three from 600px; two below 600px.
- Below 900px: categories become a horizontal rail; existing mobile menu, history and basket navigation remain available.
- Restaurant changes start at the top of the menu. Opening dish details preserves the browsing position.
- Dialogs contain their own scrolling, retain keyboard focus, restore their trigger on dismissal, and keep primary actions reachable.

## Style ownership

- `src/landing/landing.css`: full public landing page.
- `src/features/customer-atlas.css`: current customer presentation; imported after the existing ordering component styles so checkout and tracking behavior is preserved.
- `src/features/olive-workspace.css`: restaurant workspace, kitchen, cashier, entry and staff sign-in presentation.
- `src/pages/platform/platform-atlas.css`: platform owner console and asset library presentation.

Do not restore saved Design Studio appearance attributes or add a theme editor. Preserve ordering validation, verified table context, role permissions, notifications, session recovery and persistence when changing presentation.

## Verification

The browser regressions cover responsive grids, restaurant navigation scroll, long dish names and prices, missing image fallback, dish choices, basket editing, checkout, focus containment, all nine admin tabs, staff roles, notifications, and session recovery. API fixtures are mocked; they do not create production orders. Screenshots were reviewed in Arabic and English on mobile and desktop. Physical Safari/iPhone verification remains separate from Chromium viewport testing.
