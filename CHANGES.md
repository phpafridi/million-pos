# Changes Made This Session

This document summarizes everything built/changed, in the order you should
apply it, plus what's still outstanding.

## 1. Setup — run these in order

```bash
npm install
npx prisma migrate deploy   # or `prisma migrate dev` in a dev environment
npx prisma generate
npm run dev
```

New migrations added this session (must run in this order, they're already
timestamped correctly so `migrate deploy` will apply them in sequence):

1. `20260905000000_add_measurement_printer_theme` — measurement units, printer settings, theme settings tables
2. `20260906000000_multi_shop_foundation` — the shop table + shop_id on every per-shop table
3. `20260907000000_add_product_sku` — optional SKU field on products
4. `20260908000000_purchase_batch_shop_fk` — fixes a missed foreign key from migration #2
5. `20260909000000_per_shop_uniqueness` — makes customer email / ledger phone unique per-shop instead of globally
6. `20260910000000_refund_method_and_audit_log` — refund method, activity log, full tailor module
7. `20260911000000_attribute_set_fields` — reusable attribute templates

**Important:** migration #2 assigns all your *existing* data to a
"Head Office" shop (`shop_id = 1`) automatically, and makes your current
user account a super admin. Nothing existing is deleted or reassigned
incorrectly — but back up your database before running it, as with any
migration.

## 2. What's fully built and working

- **Measurement units** — admin-managed (Settings → Measurement Units), used dynamically in Add/Edit Product
- **Printer settings** — name, paper width, layout options, wired into the thermal receipt print flow
- **Theme/colour customization** — admin-managed colours (Settings → Theme Settings), applied sitewide
- **Backup & restore** — full JSON export/import of the whole database (Settings → Backup & Restore)
- **Product attributes** shown on sale invoice, thermal receipt, purchase invoice, and return/exchange invoice
- **Multi-shop / franchise architecture**:
  - Register franchises (Settings → Manage Franchises) — CEO/super-admin only
  - New franchises automatically inherit the shared product catalog at zero stock/price
  - New products automatically propagate to every franchise
  - Every table that should be per-shop (inventory, pricing, purchases, sales, returns, damage, ledger, customers, suppliers) is scoped — audited for cross-tenant leaks and fixed
  - CEO/super-admin sees combined data everywhere; a shop-switcher lets them act as a specific franchise in POS/purchasing
  - Staff are assigned to a shop; only Head Office or a franchise admin can manage staff accounts
  - Cross-franchise report (Reports → All Franchises Report)
- **Barcode / QR / SKU** unified — POS search matches all three, label printing supports both barcode and QR with a toggle
- **Role hierarchy**: Head Office (super admin) → Franchise Admin (`flag = '1'`) → Staff, enforced server-side on user management
- **Activity log** (Reports → Activity Log) — records sales, refunds/exchanges, order cancellations, damage write-offs, ledger transactions, staff account changes, purchases, and price edits, each with who/what shop/what happened. Head Office sees everything; franchise admins see their own shop.
- **Refund types**: cash / card / bank transfer / Easypaisa / JazzCash / store credit, distinct from product exchange
- **Tailor module** (new "Tailor" nav section):
  - Customer intake with Pakistani tailoring measurements (length, chest, waist, hip, shoulder, sleeve length/round, neck, shalwar length, bottom)
  - Garment orders with fabric details, pricing, advance payment
  - Status workflow: Received → In Process → Ready → Delivered / Cancelled, with full history
  - Delivery tracking: pickup vs. home delivery, rider name, tracking notes
  - Auto-generated tracking codes (TLR-0001, TLR-0002...)
  - Printable customer tracking slip

## 3. Completed in the final pass (previously listed as gaps)

- **Attribute set templates** (Settings → Attribute Templates) — define reusable attribute groups (e.g. "Clothing" → Size, Color, Material). When adding a product, pick a template to instantly add those attribute rows; you just fill in the values. Wired into Add Product (not yet into Edit Product — a small follow-up if you want it there too).
- **CEO stock comparison** (Reports → Stock Comparison) — every product's stock level across every franchise, side by side, with low-stock cells highlighted. Head Office only.
- **Tailor reporting** (Tailor → Tailor Report) — orders due within 7 days that aren't delivered yet, a status breakdown, and revenue (order value, advance collected, balance due) for a chosen date range.

## 4. Known gaps / not yet built

- Attribute templates aren't wired into the Edit Product screen yet, only Add Product.
- A handful of lower-traffic read paths weren't individually audited for shop-scoping (e.g. tag management, category management — these are shared/global by design, which is probably correct, but wasn't explicitly re-verified).
- **I have not been able to run this code.** My sandbox can't reach the Prisma binary download host or a live MySQL server, so everything here is the result of careful manual writing and review, not an actual test run. Please treat the first real run as a testing pass, not a rollout.

## 5. Recommended first test pass

1. Run migrations against a **copy** of your database, not production.
2. Confirm your existing account still logs in and is marked super admin.
3. Register a test franchise, confirm it shows the existing product catalog at zero stock.
4. Add a product, confirm it appears in both franchises.
5. Make a sale as a shop user; check the receipt shows attributes and correct printer settings.
6. Log in as super admin, check the shop-switcher in POS/Purchasing, and the All Franchises Report.
7. Try measurement units, theme settings, backup/restore.
8. Create a tailor order, update its status, print the slip.
9. Check Reports → Activity Log shows the actions from steps 4-8.
