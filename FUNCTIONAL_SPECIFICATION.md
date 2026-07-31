# Functional Specification
## Syria QR Menu & Digital Ordering SaaS

**Document status:** Product and technical baseline  
**Audience:** Product, engineering, design, operations, restaurant owners, implementation partners  
**Primary market:** Syria, with regional extensibility  
**Product type:** Mobile-first, multi-tenant SaaS web application  
**Primary currency:** Syrian Pound (SYP / ل.س)  
**Version:** 1.0

---

## 1. Executive Summary

The product is a high-speed, mobile-first QR menu and digital ordering platform for restaurants, cafés, bakeries, shisha venues, and dark kitchens. A customer scans a table-specific QR code or opens a direct restaurant menu link, browses the menu without registration, customizes items, submits an order, and tracks its status.

Every order is delivered to two operational channels:

1. The restaurant's live web order desk.
2. The restaurant's configured WhatsApp business number through a structured invoice message.

The system supports in-table dining, takeaway, and delivery. It is designed for local operating realities: SYP-first pricing, optional USD estimates, cash-heavy workflows, local mobile wallets, Arabic and English interfaces, right-to-left layout, low-bandwidth networks, intermittent connectivity, and mobile-first administration.

The platform must remain useful even when only the menu and order submission paths are available. It must never require a customer account, native application download, or online card payment.

---

## 2. Product Goals and Success Criteria

### 2.1 Goals

- Replace printed menus with centrally managed digital menus.
- Reduce order-taking friction and transcription errors.
- Send actionable orders to kitchen and service staff immediately.
- Support table service, pickup, and delivery in one workflow.
- Give restaurants a simple operational dashboard requiring minimal training.
- Provide accurate SYP totals while supporting an optional configurable USD estimate.
- Operate acceptably on low-end mobile devices and slow or unstable connections.
- Provide a reusable multi-restaurant SaaS foundation.

### 2.2 Non-goals for the initial release

- Native iOS or Android applications.
- Integrated card acquiring or guaranteed payment settlement.
- Full delivery-driver dispatch and route optimization.
- Complex accounting, payroll, procurement, or recipe-costing modules.
- Marketplace discovery across restaurants.
- Automatic exchange-rate feeds without restaurant approval.
- Unattended offline order acceptance when the server cannot receive an order.

### 2.3 Business success metrics

- Customer menu first contentful render: target under 2.5 seconds on a mid-range mobile connection; usable menu shell under 1.5 seconds where possible.
- Median customer order completion: under 60 seconds for a returning menu visitor with a single item.
- Menu-to-order conversion rate.
- Order submission success rate: at least 99% for requests reaching the service.
- Percentage of orders acknowledged by staff within five minutes.
- Reduction in manual order-entry errors.
- Restaurant activation time: under 30 minutes for a basic menu and QR set.
- Monthly active restaurants, repeat order rate, and subscription retention.

---

## 3. Personas and Roles

### 3.1 Customer

An unregistered guest using a phone browser. The customer may be Arabic- or English-speaking and may have limited connectivity. The customer can browse, customize, submit, and track an order using a temporary session identifier.

### 3.2 Restaurant owner or manager

Creates the restaurant profile, configures settings, manages menus, generates QR codes, monitors orders, and views basic reports.

### 3.3 Order desk or cashier

Receives and confirms orders, contacts customers when necessary, updates status, and handles payment or table-service coordination.

### 3.4 Kitchen staff

Views operational order details, accepts work, marks items or orders as preparing and ready, and records unavailable items.

### 3.5 Delivery or service staff

Uses order contact, address, table, pickup, and payment information to complete handoff. This role may be represented by the manager in the first release.

### 3.6 Platform administrator

Manages tenants, plans, support access, feature flags, system health, audit access, and abuse controls. Platform administrators must not see restaurant data by default without an explicit support/audit action.

---

## 4. Tenant and Restaurant Model

The system is multi-tenant. A tenant is a restaurant business or restaurant group. Each tenant has one or more restaurant locations. A location owns its menu, tables, orders, operational settings, users, and messaging configuration.

### 4.1 Restaurant profile

Required fields:

- Restaurant display name in Arabic and optionally English.
- Logo and optional cover image.
- Public menu slug and shareable URL.
- Primary phone number.
- WhatsApp number, including country code.
- Address and optional map link.
- City, neighborhood, and service area.
- Default language and enabled languages.
- Time zone, default `Asia/Damascus` unless explicitly configured.
- Operational hours by day.
- Order acceptance state: open, paused, or closed.
- Primary currency: SYP.
- Optional USD display and configured exchange rate.

### 4.2 Isolation requirements

- Every restaurant-owned record must include a location or tenant ownership boundary.
- API authorization must enforce tenant scope server-side.
- A customer session must only access the restaurant identified by its signed menu context.
- Restaurant staff must only see locations granted to their user.
- Public menu URLs must not expose administrative identifiers or secrets.

---

## 5. Customer Experience

## 5.1 Entry points

A customer can enter through:

1. A table QR URL containing a signed restaurant location and table context.
2. A restaurant's public menu URL without a table.
3. A campaign or social-media link containing an optional source or location context.

The QR code must not contain mutable pricing or menu data. It should contain a short public URL and an opaque signed or random context token. The server resolves the current table and restaurant state.

### 5.2 First-load behavior

The customer sees the restaurant identity, language switcher, currency switcher, service availability, and menu categories. If the location is closed, the menu remains viewable but ordering is disabled or scheduled ordering is shown according to restaurant settings.

The interface must:

- Use responsive, touch-friendly controls.
- Default to Arabic RTL where configured.
- Support Arabic and English labels and menu content.
- Avoid blocking the menu on non-essential images.
- Use compressed responsive images, lazy loading, cached assets, and skeleton states.
- Clearly show when data is stale or the service is temporarily unavailable.

### 5.3 Menu discovery

Customers can:

- Browse categories such as appetizers, main courses, drinks, shisha, desserts, and daily specials.
- Search by item name and description in the active language.
- Filter by vegetarian, chef special, spicy, popular, available now, and other configured dietary tags.
- Sort by restaurant-defined order; optional price sorting may be enabled.
- See item image, name, short description, price, availability, tags, and preparation estimate where configured.
- Open an item detail view without losing scroll position.

Unavailable items must remain either hidden or visibly marked unavailable based on restaurant configuration. Items added before becoming unavailable must be revalidated at checkout.

### 5.4 Currency display

SYP is the authoritative transaction currency. The customer can toggle an estimated USD display if enabled by the restaurant.

- SYP must be displayed as an integer amount unless the restaurant explicitly supports sub-unit precision.
- USD is informational only and cannot change the payable SYP total.
- The UI must label the USD amount as an estimate and show the exchange-rate timestamp or version.
- Historical orders must preserve the exchange rate used at order creation.
- Rounding rules must be deterministic and documented in the tenant configuration.

### 5.5 Item customization

An item may have option groups. Each group defines:

- Name in Arabic and English.
- Required or optional selection.
- Minimum and maximum selections.
- Single- or multi-select behavior.
- Options with price adjustments in SYP.
- Optional availability per option.
- Optional default selection.

Supported examples include size, cooking preference, sauces, toppings, add-ons, spice level, and shisha flavor. The customer can add free-text notes subject to a configurable character limit.

The UI must prevent submission until required choices are complete. The order payload must contain a price snapshot of the selected item and options; the server recalculates the authoritative total.

### 5.6 Cart and persistence

The cart is stored locally on the device and scoped by restaurant location, language-independent menu context, and table context. It must survive accidental refreshes and temporary navigation away from the page.

The cart must be cleared or revalidated when:

- The restaurant changes.
- The menu version changes incompatibly.
- An item or option is no longer available.
- The order is successfully submitted.

Local storage must not contain payment secrets, staff credentials, or unnecessary personal data. A customer can remove their cart through a visible action.

### 5.7 Checkout modes

#### In-table dining

- Table number is pre-filled from the QR context.
- Manual table selection is disabled by default for security and enabled only when the restaurant permits it.
- Customer can optionally provide a name or seat reference.
- Payment options include cash at table and configured wallet options.

#### Takeaway

- Customer provides name and phone number where required by the restaurant.
- Customer selects or requests a pickup time from available slots.
- The restaurant can configure minimum lead time and maximum advance window.
- Payment options include cash at pickup and configured mobile wallets.

#### Delivery

- Customer must provide name, reachable phone number, and delivery address.
- Address may include neighborhood, building, floor, landmark, and optional map pin/link.
- The restaurant can configure service areas, delivery fee rules, minimum order, and estimated delivery time.
- Payment options include cash on delivery and configured mobile wallets.
- Delivery orders cannot be submitted outside enabled service areas unless staff override is available.

### 5.8 Payment methods

The initial product supports payment intent capture, not automated settlement verification.

Supported methods:

- Cash at table.
- Cash on delivery.
- Cash at pickup.
- Syriatel Cash.
- MTN Cash where applicable to the market configuration.
- BEMO Cash / Sham Cash where configured.
- Other wallet methods added through a payment-provider configuration model.

For wallet payments, the checkout displays the restaurant merchant identifier and instructions. The customer may enter a reference number or upload proof only if enabled. The order starts as payment pending unless staff marks it verified. Staff must be able to record verification status and payment reference.

### 5.9 Order confirmation and tracking

After submission, the customer receives a confirmation page containing:

- Human-readable order number.
- Current status.
- Restaurant name and contact action.
- Items, options, notes, quantities, totals, payment mode, and table/pickup/delivery details.
- Estimated preparation or delivery time when available.
- A tracking URL containing a non-guessable order token.

Statuses shown to customers:

1. Received.
2. Confirmed or preparing.
3. Ready for pickup / ready at table.
4. Out for delivery.
5. Completed.
6. Cancelled.

The tracking page uses real-time updates when available and polling fallback when not. It must not expose internal notes, other orders, staff identities, or sensitive payment data.

---

## 6. Restaurant Admin Experience

## 6.1 Authentication and access

Staff authenticate through a secure web login. The first release should support password-based login with email or phone identifier and optional one-time-code recovery. Multi-factor authentication is recommended for owners and platform administrators.

Permissions:

- Owner: full location and billing access.
- Manager: menu, orders, settings, and staff access according to grants.
- Order desk: orders and customer contact details; no billing or destructive menu controls.
- Kitchen: order queue and status updates; limited customer data.
- Viewer: read-only dashboard and reports.

All privileged actions must be auditable.

## 6.2 Live orders desk

The dashboard displays orders in columns or tabs:

- Pending.
- Confirmed.
- Preparing.
- Ready.
- Out for delivery.
- Completed.
- Cancelled.

The restaurant may hide unused statuses, but the underlying order history remains immutable.

Each order card displays order number, age, order mode, table or pickup time, customer name when available, payment state, total, and urgency indicators. Opening an order displays full item customizations and notes.

Actions:

- Accept or confirm.
- Move to preparing.
- Move to ready.
- Mark out for delivery.
- Mark completed.
- Cancel with a reason.
- Print or copy the kitchen ticket.
- Re-send the WhatsApp invoice.
- Add an internal note.
- Contact the customer using a phone or WhatsApp action where permitted.
- Record payment verification.

The dashboard must support filtering by order mode, date, payment state, status, and search by order number or phone number.

### 6.3 Notifications and reliability

- New orders trigger an in-browser audio alert after staff has interacted with the page.
- A visual alert and unread count are always shown because browsers may block audio.
- Optional browser push notification is supported where permission is granted.
- If WhatsApp delivery fails, the dashboard remains the source of truth and shows a retryable failure state.
- If a real-time connection drops, the UI shows disconnected status and uses polling fallback.
- Duplicate delivery events must not create duplicate orders.

## 6.4 Menu manager

Managers can create, reorder, archive, and restore categories. Categories have Arabic and English names, descriptions, images, visibility, and sort order.

Menu item fields:

- Arabic name and English name.
- Description in both languages.
- Primary image and optional gallery.
- Base price in SYP.
- Optional USD estimate display inherited from restaurant settings.
- Category and sort order.
- Dietary and merchandising tags.
- Preparation time.
- Availability state.
- Option groups.
- Customer-facing visibility.
- Internal SKU or kitchen code.

The one-tap out-of-stock control must take effect on the customer menu quickly and show who changed it and when. Managers can schedule availability for daily specials or operating periods.

Bulk operations should be supported for availability and category ordering. Deletion should default to archival so historical orders retain their item snapshots.

## 6.5 Option-group manager

Managers can create reusable option groups and attach them to menu items. Validation must prevent invalid combinations such as a required group with no available options. Price changes affect new orders only; historical order snapshots remain unchanged.

## 6.6 Tables and QR codes

The manager can:

- Create tables with table number, display label, floor/area, and active state.
- Generate one QR code per table.
- Generate a bulk printable sheet for selected tables.
- Download individual QR badges as PNG or SVG and print-ready PDF where supported.
- Include restaurant logo, restaurant name, table label, and scan instruction in Arabic and/or English.
- Regenerate or revoke a QR context without changing the visible table label.
- Preview the customer menu for a table.

QR content must resolve server-side so menu and restaurant changes never require reprinting. If a QR is revoked, the page must explain that the code is inactive rather than exposing an error stack.

## 6.7 Restaurant and operational settings

Managers can configure:

- Restaurant identity, logo, contact phone, WhatsApp number, address, and map link.
- Languages and default RTL/LTR behavior.
- Operational hours and holiday closures.
- Pause ordering and closure message.
- Enabled order modes.
- Delivery zones, fees, minimum order, and estimated time.
- Takeaway pickup slots and lead time.
- Table numbering and service-charge settings if applicable.
- Tax or fee labels where legally and operationally required.
- Currency exchange rate and USD display policy.
- Wallet provider names, merchant numbers, and customer instructions.
- WhatsApp invoice template and escalation contact.

Sensitive merchant details must be encrypted at rest and masked in normal UI views.

## 6.8 Reporting

The first release should provide daily and date-range summaries:

- Gross order value in SYP.
- Order count by mode and status.
- Average order value.
- Top items and categories.
- Cancellation count and reasons.
- Payment-method breakdown.
- Estimated wallet-pending amounts.
- Delivery fee totals where enabled.

Reports must clearly distinguish placed, completed, cancelled, and refunded/adjusted orders. Export to CSV is recommended.

---

## 7. Order Lifecycle and Business Rules

### 7.1 Canonical lifecycle

`Draft → Submitted/Received → Confirmed → Preparing → Ready → Out for delivery → Completed`

Valid alternatives include:

- `Received → Cancelled`.
- `Confirmed → Cancelled`.
- `Preparing → Cancelled` only with manager permission and a reason.
- `Ready → Completed` for table and pickup orders.
- `Preparing → Ready` for delivery orders before `Out for delivery`.

Every transition records actor, timestamp, previous status, new status, and optional reason.

### 7.2 Order numbering

Each location has a human-readable sequence, for example `AM-1042`, and a separate random public tracking token. Sequence reuse is forbidden. Public tokens must be unguessable.

### 7.3 Pricing calculation

The server computes:

`subtotal + service charge + delivery fee + other configured fees - discounts = total SYP`

The customer client may display a preview but cannot be trusted for final totals. All line items contain quantity, item snapshot, option snapshots, unit adjustments, line total, and notes.

### 7.4 Validation at submission

The server validates:

- Restaurant and order mode are open.
- Table context is active where required.
- All items and options exist and are available.
- Required option constraints are satisfied.
- Quantities and notes meet limits.
- Delivery address and phone requirements are met.
- Minimum order and delivery zone rules pass.
- Pickup time is available.
- Total is recalculated from current prices.

If validation fails, the customer receives a localized actionable error and the cart is preserved for correction.

### 7.5 Cancellation and amendments

Customers cannot silently edit a submitted order. They may request cancellation through a configured contact action; staff then cancels or records an amendment. Staff can append an item only by creating an adjustment event or a linked follow-up order, preserving the original audit trail.

---

## 8. WhatsApp Order Dispatch

### 8.1 Message contents

The structured invoice must include:

- Restaurant name.
- Order number and created time.
- Order mode.
- Table number, pickup time, or delivery address.
- Customer name and phone where applicable.
- Payment method and payment state.
- Each item, quantity, selected options, notes, and line total.
- Subtotal, fees, discount if any, total SYP, and optional estimated USD.
- Customer tracking link.
- Staff action instructions or confirmation shortcut where supported.

### 8.2 Delivery architecture

WhatsApp delivery should use an approved WhatsApp Business/API provider for automated server-side dispatch. If an API is not configured, the system may provide a pre-filled `wa.me` handoff for a staff or customer device, but this is not considered reliable automated delivery.

The system stores dispatch attempts, provider message ID, delivery state, error code, retry count, and timestamps. Credentials are stored as secrets and never returned to the browser.

---

## 9. Technical Architecture

### 9.1 Recommended components

- Mobile-first web client, installable as a lightweight PWA where practical.
- Public menu and tracking application.
- Authenticated restaurant admin application.
- Multi-tenant API/backend.
- Relational database with tenant-scoped authorization.
- Object storage/CDN for logos and menu images.
- Real-time event channel for order and availability updates.
- Background job worker for WhatsApp dispatch, notifications, image processing, and retries.
- Observability stack for logs, metrics, traces, and audit events.

### 9.2 Suggested domain entities

- Tenant.
- Restaurant location.
- Staff user and role assignment.
- Restaurant settings.
- Category.
- Menu item.
- Option group and option.
- Item-to-option-group attachment.
- Table.
- QR context.
- Customer session.
- Cart snapshot.
- Order.
- Order line.
- Order option selection.
- Order status event.
- Payment method and payment record.
- Delivery zone.
- WhatsApp dispatch attempt.
- Audit event.
- Exchange-rate version.

### 9.3 API capabilities

The API must provide versioned endpoints or equivalent procedures for:

- Public restaurant/menu retrieval.
- Table context resolution.
- Search and category filtering.
- Cart validation and order submission.
- Public order tracking.
- Staff authentication and session management.
- Order listing, detail, transitions, and notes.
- Menu/category/options CRUD.
- Availability updates.
- Table and QR generation.
- Restaurant settings.
- Reports and exports.
- WhatsApp retry and dispatch status.

API responses should be compact, localized where needed, cacheable for public menu data, and explicit about stale or unavailable content.

### 9.4 Real-time behavior

Order creation emits an order-created event scoped to the restaurant location. Status changes emit order-updated events scoped to authorized staff and the order's public tracking token. Menu availability changes emit a menu-updated event.

Clients must implement:

- Reconnection with exponential backoff.
- Event de-duplication by event ID.
- State reconciliation after reconnect.
- Polling fallback with a bounded interval.

### 9.5 Low-bandwidth and intermittent-network design

- Serve compressed WebP/AVIF images with small thumbnails and lazy loading.
- Avoid large JavaScript bundles; split customer and admin applications.
- Cache stable shell assets and public menu responses with safe invalidation.
- Prefer text and CSS over decorative media.
- Queue non-critical analytics until connectivity returns.
- Preserve cart and checkout form state locally.
- Use idempotency keys for order submission.
- Show explicit submission states: ready, sending, submitted, retry required.
- Never claim an order was placed until the server returns an order receipt.
- Allow the customer to copy the order summary if submission fails.

### 9.6 Persistence and state management

Server state is authoritative for menu, pricing, availability, order status, and settings. Client state manages cart, language, currency preference, current table context, checkout draft, and connection state. Local persistence must be versioned and migrated safely.

---

## 10. Security, Privacy, and Compliance

- Enforce HTTPS in production.
- Use secure, HttpOnly, SameSite cookies or an equivalent secure token strategy for staff sessions.
- Apply rate limits to public order creation, tracking lookup, search, login, and WhatsApp retry actions.
- Validate and sanitize all user input, especially notes and addresses.
- Use server-side authorization on every staff and tenant operation.
- Use idempotency keys to prevent duplicate orders from retries.
- Encrypt secrets and wallet merchant data at rest.
- Redact phone numbers and addresses from logs where feasible.
- Retain only customer information needed for order fulfillment and defined retention policies.
- Provide data export/deletion procedures appropriate to the applicable local legal requirements.
- Protect admin routes against CSRF, XSS, injection, and session fixation.
- Record security-relevant audit events without storing payment secrets.
- Avoid storing complete wallet credentials or PINs; the platform only stores merchant identifiers and customer-provided references.

The product must include a restaurant-configurable privacy notice and terms text in Arabic and English. Legal review is required before production launch, especially for payment, consumer protection, communications, and personal-data obligations in each operating jurisdiction.

---

## 11. Localization and Syria-Specific Requirements

- Arabic is a first-class language, including RTL layout, Arabic numerals optionally configurable, localized dates, and Arabic validation messages.
- English is supported for tourist-facing and bilingual venues.
- Use SYP / ل.س as the primary currency label; do not infer live exchange rates.
- Allow restaurant-defined exchange-rate updates with effective timestamp and audit history.
- Support local phone number formatting and country-code normalization.
- Support neighborhood, landmark, building, floor, and map-link address conventions common in local delivery.
- Design for cash-first service and manual wallet verification.
- Support WhatsApp as a primary operational communication channel without making it the only source of truth.
- Allow configurable provider names because availability of Syriatel, MTN, BEMO, Sham Cash, and other services can vary by location and time.
- Provide localized closed-hours, wallet instructions, delivery-area, and contact messages.
- Avoid assuming uninterrupted power or connectivity at the venue; the admin should show last synchronization time and permit controlled manual refresh.

---

## 12. Non-Functional Requirements

### Performance

- Public menu shell should be usable on low-end Android devices.
- Initial payload target: less than 250 KB compressed before images where practical.
- Menu images must have explicit dimensions to prevent layout shift.
- Admin order updates should appear within five seconds under normal connectivity.
- Order submission API target: p95 under two seconds excluding provider dispatch.

### Availability and recovery

- Target service availability: 99.5% monthly for the production SaaS baseline.
- Database backups must be automated and restoration tested.
- WhatsApp provider outage must not prevent dashboard order creation.
- Background jobs require retry, dead-letter handling, and operator visibility.

### Accessibility

- Keyboard-accessible admin flows.
- Sufficient contrast and visible focus states.
- Screen-reader labels for icons, QR controls, status changes, and form errors.
- Touch targets of at least 44 CSS pixels where feasible.
- Do not rely on color alone for status communication.

### Compatibility

- Current and previous major versions of Chrome, Safari, Firefox, and Edge on mobile and desktop.
- Android WebView-compatible customer experience where possible.
- Graceful handling of browsers without service workers or notification permission.

---

## 13. Analytics and Auditability

Product analytics events should be privacy-conscious and tenant-scoped. Recommended events:

- Menu opened.
- Search used.
- Item viewed.
- Item added to cart.
- Checkout started.
- Order submission attempted, succeeded, or failed.
- Status viewed.
- QR scanned where measurable.
- Item marked unavailable.
- Order status changed.
- WhatsApp dispatch succeeded or failed.

Audit events must cover menu price changes, availability changes, settings changes, QR revocation, role changes, order transitions, cancellations, payment verification, and message retries.

---

## 14. Acceptance Criteria

### Customer

- A customer can scan a table QR and see the correct restaurant and table context.
- A customer can browse and search Arabic and English menu content.
- Required and optional options validate correctly.
- The cart survives refresh and is scoped to the correct restaurant.
- SYP total is authoritative and USD is clearly marked as an estimate.
- In-table, takeaway, and delivery checkout enforce their respective required fields.
- An order cannot be submitted twice because of a double tap or network retry.
- Successful submission produces a tracking page and dashboard order.
- Customer status updates work through real-time delivery and polling fallback.

### Restaurant

- Staff see new orders without refreshing the page under normal connectivity.
- New orders produce a visual alert and audio alert when browser permissions allow.
- Staff can transition orders through permitted statuses with audit history.
- Managers can create categories, items, option groups, and prices.
- Out-of-stock changes propagate to public menus.
- Managers can generate and download QR codes for individual and bulk tables.
- WhatsApp invoices contain all required order information and have retry visibility.
- Restaurant settings support SYP, optional USD rate, wallet instructions, hours, and enabled order modes.

### Platform

- Restaurant data is isolated across tenants.
- Historical orders remain readable after menu edits or archival.
- Logs do not expose sensitive credentials or unnecessary customer data.
- Backups, error reporting, rate limiting, and job retries are operationally configured.

---

## 15. Release Plan

### Phase 1: MVP

- Multi-tenant restaurant and staff setup.
- Arabic/English public menu.
- SYP pricing and optional manually configured USD estimate.
- QR table contexts.
- Cart, customization, and three order modes.
- Cash and wallet payment intent capture.
- Live admin order desk with status transitions.
- Out-of-stock controls.
- WhatsApp handoff or provider integration.
- Basic tracking page.
- Basic QR download and printing.

### Phase 2: Operational maturity

- Reliable WhatsApp Business provider integration.
- Browser push notifications.
- Delivery zones and configurable fees.
- CSV reporting and order exports.
- Scheduled menu availability.
- Staff roles and full audit log UI.
- PWA caching improvements and reconnect reconciliation.
- Print-ready kitchen tickets.

### Phase 3: Scale and monetization

- Subscription plans and usage limits.
- Multiple locations per tenant.
- Advanced analytics and item performance.
- Promotions, coupons, and loyalty features.
- Integrations with POS systems and supported payment providers.
- Delivery staff workflows.
- Regional currency and localization packs beyond Syria.

---

## 16. Open Product Decisions Before Implementation

The following decisions must be confirmed during discovery and captured as tenant or platform configuration rather than hard-coded assumptions:

- Exact WhatsApp Business API provider and message-template approval process.
- Whether MTN Cash and other wallet integrations are available for automated verification.
- Restaurant service-charge, tax, and rounding rules.
- Whether customers may select a table manually when not scanning a QR.
- Delivery-zone definition method: neighborhoods, radius, polygons, or manual approval.
- Customer data retention period.
- Subscription packaging, billing currency, and support model.
- Hosting, backup region, and data-residency requirements.
- Whether the venue needs kitchen display, thermal-printer, or POS integrations in the first production release.

---

## 17. Recommended Definition of Done

A feature is complete when its happy path, validation errors, localization, authorization, audit behavior, low-connectivity behavior, analytics event, automated tests, and operational monitoring are implemented. Production readiness additionally requires a backup restoration test, load test for order submission and real-time updates, security review, mobile browser verification, Arabic RTL review, and a restaurant pilot using real table QR codes.
