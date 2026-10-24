# Design QA — Olive Table

## Source and scope

Source visual truth: the five images attached to the user's redesign request in this conversation. Primary menu reference: the BRIX tablet image (1280×930 source pixels), showing an olive sidebar and a cream grid of rectangular product photos. Mobile references show photo-led cards, category pills, product details, basket, and checkout; the source collages include device frames and perspective.

The request is for an inspired redesign of an existing production application. Brand names, mock ratings, tips, nutrition, and feedback forms in the source are not copied as unsupported features. No claim of pixel-identical cloning is made. Device bezels and the collage backgrounds are outside the app and are not implemented.

Implementation evidence: `/tmp/olive-review/` captures from the browser, including `home-1440-en.png`, `home-390-ar.png`, `menu-1440-en.png`, `menu-390-ar.png`, `detail-390-en.png`, `basket-390-en.png`, `checkout-390-ar.png`, and `admin-kitchen.png`. Additional captures cover 320, 768 and 1440px, English and Arabic, staff sign-in, and the platform console.

Screenshots use CSS viewports at deviceScaleFactor 1. Full-page images can be taller than the viewport. Source tablet/collage dimensions are not treated as CSS viewport dimensions; composition and app-owned regions are compared rather than the perspective and device chrome.

## Comparison history

1. [P1, fixed] A restaurant link could inherit the landing page's scroll position, placing the header over the middle of the menu. Navigation now resets scroll and focuses the main region. Post-fix evidence: `menu-1440-en.png`; the header starts at the top, sidebar begins below it, and skip navigation is hidden unless focused. Automated checks cover every tested width/language.
2. [P2, fixed] The old circular-photo container height allowed the larger rectangular detail photo to overlap the dish name. The media region now sizes naturally with contained overflow; the title and price sit below it. Post-fix evidence: `detail-390-en.png`.
3. [P2, fixed] The light workspace header retained white identity/metric labels. Explicit dark foregrounds restore readability. Post-fix evidence: `admin-kitchen.png`.
4. [P2, fixed] Selected checkout modes inherited white text over a pale surface. Selected text and icons now use dark olive. Targeted checkout verification checks the actual selected state.
5. [P2, fixed] Opening an item initiated an unnecessary smooth background scroll. Details now preserve the browsing position; dialog bounds are checked vertically and horizontally.

6. [P2, fixed] Staff sign-in retained a yellow button and lacked interior spacing. The modal now has padded cream content, olive controls, readable labels and useful access copy; verified in `staff-login.png`.

## Required surfaces

- Typography: DM Serif Display/Amiri editorial hierarchy, DM Sans/Tajawal interface text. Arabic uses native RTL alignment and readable operational weights; dish titles wrap rather than overflow. Long English identifiers and Arabic titles are covered in the browser fixture.
- Layout rhythm: tablet sidebar and inset cream canvas follow the first reference; the mobile rail and two-column photos follow the mobile references. Cards align price/add rows, dialogs remain within the viewport, and controls retain space for long content. Landing composition is an intentional original extension of the supplied menu direction.
- Colors: cream/olive surfaces and thin muted borders replace the previous dark forest blocks; terracotta distinguishes ordering actions. Selected-state contrast was reviewed after changing the materials.
- Images: rectangular food photos are large and correctly cropped; the editorial hero is a separately generated Levantine sharing-table asset. Actual dish data/photos remain attached to their original items. Broken images show a real icon fallback. No copied reference logos, fabricated ratings or generated menu records are used.
- Copy: preserves the product's real ordering, table verification and staff workflows, with Arabic and English customer copy. Sample data is used only in local browser fixtures. No unsupported nutrition, delivery-time promises or fake reviews.

## Interactions and checks

Production build and forced TypeScript check; customer workflows; all nine admin tabs and restricted roles; notifications/service worker display; startup and restored-session recovery. Responsive ordering checks cover 320, 390, 768 and 1280px in Arabic and English, required choices, quantity, removal, checkout, focus, long content, missing photos and overflow. Screenshots also cover 1440px.

Full-view screenshots were reviewed alongside the supplied visual references in the conversation. Focused review covered card image/text/price/add alignment, the dish dialog title/media boundary, selected checkout modes, and header identity/metric text. Local browser fixtures make no production data mutations. Physical iPhone/Safari behavior is not claimed.

## Follow-up polish

P3: additional restaurant-provided photography can make individual menus more distinctive without changing the shared design.

final result: passed
