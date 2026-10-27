# Food app experience — design QA

## Source

Source visual truth: the user-supplied mobile food-app collages (white surfaces, coral actions, food cards, categories, product details, cart and orders), together with the user's explicit selection: “Mobile food app: white, coral, large food cards.” The subsequent instruction requires changing components, page structures and the experience, rather than colors alone.

This is an original responsive adaptation for the existing SYRIAN QR production application. The device frames, fake sample ratings, nutrition, tips and unsupported feedback mechanisms in the reference are not part of the implementation.

## Implementation evidence

Browser-rendered captures under `/tmp/new-app-review/`: `home-390-ar.png`, `menu-390-en.png`, `menu-1440-en.png`, `detail-390-en.png`, `basket-390-en.png`, `checkout-390-en.png`, `admin-overview.png`, `admin-orders.png`, `admin-kitchen.png`, `admin-cashier.png`, platform and direct staff sign-in captures. Additional widths: 320, 768 and 1440px. English and Arabic customer states are captured separately.

CSS viewports use deviceScaleFactor 1. Full-page captures may exceed viewport height. Source collages include perspective/device frames, so app-owned composition and interaction patterns are compared; a pixel-identical comparison to collage dimensions is not claimed.

## Component and flow changes

- New searchable restaurant discovery and place-type filters.
- New app navigation and restaurant profile; search, category browsing, optional filter panel and locally saved favourites.
- New product cards, option selection sheet, quantity control and basket composition.
- Desktop live order summary alongside browsing; mobile basket/navigation pattern.
- Guided checkout with real steps and explicit final confirmation.
- New active/past order feed and status timeline.
- New workspace shell, direct staff sign-in, service overview and order inbox; preparation/payment filters for operational screens.
- Old customer and olive/forest override stylesheets removed.

## Review history

1. [P1, fixed] The replacement basket initially left its dialog mounted beneath checkout. The basket now closes before checkout opens; dialog-count and focus checks cover the transition.
2. [P1, fixed] React could reuse the Continue button as the final submit control during the same click. Distinct keys and default prevention prevent early submission. A workflow assertion checks that reaching payment has sent zero requests before explicit confirmation.
3. [P2, fixed] Promotional/setup content buried the new service overview. Setup now lives in a collapsed section after the live overview.
4. [P2, fixed] An active mobile workspace tab could shift off-screen after live order counts loaded. Navigation now responds to content resize, count changes and viewport changes.
5. [P2, fixed] Photo stacking hid the home feature's text/actions. Foreground actions now have explicit stacking above the photo.

## Required surfaces

- Typography: strong sans-serif hierarchy, native RTL alignment, wrapping long dish/customer names and readable action labels. No inherited olive editorial heading system in the customer app.
- Layout: changed page/component hierarchy, profile/catalogue and order-rail layout, usable mobile cards, contained dialogs, step-based checkout, service-first workspace. The final review checks primary controls against viewport edges.
- Colors: white/coral direction selected by the user, with neutral surfaces and explicit semantic statuses. Secondary text was darkened during visual review.
- Images: existing restaurant/dish images remain attached to their data. Missing-image states use real library icons; no generated menu records, reviews or ratings.
- Copy: actual ordering and account workflows, including table QR requirements and fees. Staff sign-in removes an extra modal-opening step. Local browser fixture names/photos are not production data.

## Homepage follow-up — selected food browsing rail

The selected source is the first image in the latest ideation set. It replaces the previous promotional split hero with a centered search, photo-led category filters, a swipeable desktop restaurant rail, compact mobile restaurant rows and a table QR help strip. The target also includes a small mobile preview.

Implementation evidence: `/tmp/final-homepage-rail/design-comparison.png` places the selected desktop region beside the rendered 1440px homepage. `/tmp/final-homepage-rail/mobile-comparison.png` places the source mobile preview beside the rendered 390px viewport. Full-page captures cover 320, 390, 768 and 1440px in Arabic; English is captured at 1440px. All CSS captures use deviceScaleFactor 1.

Review findings and fixes:

1. [P2, fixed] The first pass left the search area too empty compared with the source. The updated hero frames it with the two existing restaurant photos, without decorative placeholder artwork.
2. [P2, fixed] The first mobile pass placed a large image above each card's details, while the selected preview uses compact rows. The cards now put the photo beside the name, category and menu action, so both choices appear sooner.
3. [P2, fixed] The initial English title omitted the preposition in “Discover restaurants in Damascus.” The copy now preserves the Arabic heading hierarchy.

Fidelity review: DM Sans/Tajawal and the large black/coral heading preserve the source hierarchy with readable Arabic and English wrapping. Centering, section gaps, rounded search and photo chips follow the reference; the desktop rail shows one active restaurant and a preview of the next, while mobile uses full-width horizontal rows. White and warm-ivory surfaces, coral actions, real Sufra/Cozy photo crops and outlined icons match the selected style. Copy uses the two real restaurant types and Damascus, with no unsupported ratings, popularity, distance or offers. The source mock shows more food-category chips than this app has restaurant types, so the implementation only filters by the two real types plus all venues.

Responsive and interaction review: no page-level horizontal overflow at 320, 390, 768 or 1440px. Both restaurant photos load; the desktop rail control moves between venues. Search, category filters, empty search state, Arabic/English switching, restaurant menu navigation and staff access remain connected. The mobile image/text rows and language direction were reviewed against the selected phone preview.

## Validation

Production build, forced TypeScript check; customer responsive checks, required options, saved dishes, quantity/removal, checkout stages, failed-submit retry and idempotency, receipt persistence/reorder; all nine admin tabs and restricted roles; notification/service-worker tests; startup and restored-session recovery. Browser checks use mocked APIs and create no production orders. Production verification is read-only. Physical iPhone/Safari testing is not claimed.

Final responsive checks pass for all nine workspace tabs at 320/390/768/1280px, including Arabic and English layouts, active-tab visibility after live count updates, editor bounds and restricted navigation. Platform console, asset library and direct staff sign-in checks also pass.

final result: passed
