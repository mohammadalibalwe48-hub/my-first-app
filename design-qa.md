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

## Validation

Production build, forced TypeScript check; customer responsive checks, required options, saved dishes, quantity/removal, checkout stages, failed-submit retry and idempotency, receipt persistence/reorder; all nine admin tabs and restricted roles; notification/service-worker tests; startup and restored-session recovery. Browser checks use mocked APIs and create no production orders. Production verification is read-only. Physical iPhone/Safari testing is not claimed.

Final responsive checks pass for all nine workspace tabs at 320/390/768/1280px, including Arabic and English layouts, active-tab visibility after live count updates, editor bounds and restricted navigation. Platform console, asset library and direct staff sign-in checks also pass.

final result: passed
