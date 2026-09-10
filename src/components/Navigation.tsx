'use client'
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Native React expand/collapse for the sidebar's dropdown sections. The
// previous approach relied on a legacy jQuery script (app.js's
// $.AdminLTE.tree()) that binds click handlers ONCE, directly, to
// whatever menu items exist in the DOM at that exact moment — not
// delegated. Since this menu is built from useSession() data that loads
// asynchronously, sections could render after that one-time binding ran
// and would then have no click handler at all. Driving open/closed state
// from React removes that category of bug entirely.
//
// `prefix` lets a section auto-open (and show as active) when the current
// route is one of its children, so refreshing on a sub-page — or just
// navigating there — doesn't collapse the menu you're actually in.
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ padding: '14px 15px 4px', pointerEvents: 'none' }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#6b7a99', textTransform: 'uppercase' }}>
        {children}
      </span>
    </li>
  );
}

function Section({
  title,
  icon,
  prefix,
  children,
}: {
  title: string
  icon: React.ReactNode
  prefix?: string | string[]
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const prefixes = Array.isArray(prefix) ? prefix : prefix ? [prefix] : [];
  const isChildActive = Boolean(pathname && prefixes.some((p) => pathname.startsWith(p)));
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  return (
    <li className={open ? 'treeview active' : 'treeview'}>
      <a href="#" onClick={(e) => { e.preventDefault(); setOpen(!open); }}>
        {icon}<span>{title}</span><i className="fa fa-angle-left pull-right"></i>
      </a>
      <ul className="treeview-menu" style={{ display: open ? 'block' : 'none' }}>
        {children}
      </ul>
    </li>
  );
}

// A single sidebar link, highlighted with the "active" class whenever
// it's the current page — this is what was completely missing before.
function NavLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: React.ReactNode
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <li className={isActive ? 'active' : undefined}>
      <Link href={href}>{icon}<span>{label}</span></Link>
    </li>
  );
}

export default function Navigation() {
  const { data: session } = useSession();
  const roles = (session?.user?.roles as string[]) || [];
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin);
  const isWarehouseShop = Boolean((session?.user as any)?.is_warehouse);
  const isShopAdmin = (session?.user as any)?.flag === '1';
  const pathname = usePathname();

  // A shop admin (owner/manager account, flag='1') ALWAYS has full,
  // unconditional access to their own shop's operations — this does not
  // depend on their roles array being empty. Granular checkboxes are for
  // limiting individual STAFF accounts (flag='0'); an admin account
  // should never end up accidentally restricted because someone forgot
  // to check a box or click "Grant Full Access".
  const showAll = isShopAdmin || roles.length === 0;

  // Head Office is reports-and-oversight ONLY now — no product catalog
  // management, no purchasing, no direct warehouse operations. Every
  // warehouse-flagged shop operates independently through its own login
  // (adding products, making purchases, sending transfers); Head Office
  // watches deep reports across every franchise AND every warehouse
  // instead of doing any of that work itself.
  const HEAD_OFFICE_MENUS = new Set<string>([
    '/',
    'Report',
    '/dashboard/reports/sales-report',
    '/dashboard/reports/customer-report',
    '/dashboard/reports/loyalty-redemptions',
    '/dashboard/reports/sales-summery-report',
    '/dashboard/reports/purchase-report',
    '/dashboard/reports/stock-report',
    '/dashboard/reports/all-shops',
    '/dashboard/reports/stock-comparison',
    '/dashboard/reports/activity-log',
    '/dashboard/reports/transfer-report',
    '/dashboard/reports/warehouse-report',
    '/dashboard/tailor/report',
    '/dashboard/warehouse/balances',
    '/dashboard/warehouse/grn',
    'Settings',
    '/dashboard/settings/business-profile',
    '/dashboard/settings/localisation',
    '/dashboard/settings/manage-tax-rules',
    '/dashboard/settings/measurement-units',
    '/dashboard/settings/theme-settings',
    '/dashboard/settings/backup',
    '/dashboard/settings/shops',
    '/dashboard/settings/warehouses',
    '/dashboard/settings/sync-settings',
    '/dashboard/settings/loyalty-settings',
    '/dashboard/settings/tailor-style-options',
    '/dashboard/settings/notification-settings',
    'Employee Management',
    '/dashboard/employee/employee-list',
    '/dashboard/employee/add-employee',
  ]);

  // Head-Office-exclusive, even for a franchise admin whose "showAll"
  // fallback would otherwise reveal every path.
  const SUPER_ADMIN_ONLY = new Set<string>([
    '/dashboard/settings/shops',
    '/dashboard/settings/warehouses',
    '/dashboard/settings/sync-settings',
    '/dashboard/settings/loyalty-settings',
    '/dashboard/reports/all-shops',
    '/dashboard/reports/stock-comparison',
    '/dashboard/warehouse/balances',
    '/dashboard/reports/transfer-report',
    '/dashboard/reports/warehouse-report',
  ]);

  // Also open to any shop Head Office has flagged as a warehouse — not
  // exclusively Head Office itself.
  const WAREHOUSE_SHOP_MENUS = new Set<string>([
    '/dashboard/warehouse/add-stock',
    '/dashboard/warehouse/transfers',
    '/dashboard/warehouse/grn',
    'Warehouse',
  ]);

  // Core operations a warehouse needs are NOT warehouse-exclusive labels
  // (franchises use "Product"/"Manage Purchase" too) — so these can't go
  // in WAREHOUSE_SHOP_MENUS above, which also acts as a block-list for
  // everyone else. This is a grant-only list: if the shop is warehouse-
  // flagged, these always show, regardless of that account's individual
  // role checkboxes — so "warehouse has no purchase/product access"
  // can't happen just because an admin forgot to check every box.
  const WAREHOUSE_GUARANTEED_MENUS = new Set<string>([
    '/dashboard/warehouse/send-transfer',
    'Manage Purchase', 'Supplier', 'Purchase',
    '/dashboard/manage-purchase/supplier/add-supplier',
    '/dashboard/manage-purchase/supplier/manage-supplier',
    '/dashboard/manage-purchase/purchase/new-purchase',
    '/dashboard/manage-purchase/purchase/purchase-history',
    '/dashboard/manage-purchase/purchase/batch-stock',
    'Product', 'Category',
    '/dashboard/product/add-product',
    '/dashboard/product/manage-product',
    '/dashboard/product/edit-product',
    '/dashboard/product/barcode-print',
    '/dashboard/product/damage-product',
    '/dashboard/product/category/product-category',
    '/dashboard/product/category/sub-category',
    'Customer',
    '/dashboard/customer/add-customer',
    '/dashboard/customer/manage-customer',
    'Ledger',
  ]);

  const hasRole = (value: string) => {
    if (isSuperAdmin) return HEAD_OFFICE_MENUS.has(value);
    if (isWarehouseShop && (WAREHOUSE_SHOP_MENUS.has(value) || WAREHOUSE_GUARANTEED_MENUS.has(value))) return true;
    if (SUPER_ADMIN_ONLY.has(value) || WAREHOUSE_SHOP_MENUS.has(value)) return false;
    return showAll || roles.includes(value);
  };

  return (
    <ul className="sidebar-menu">

      {/* Dashboard */}
      {hasRole('/') && (
        <li className={pathname === '/' ? 'active' : undefined}>
          <Link href="/"><i className="fa fa-dashboard"></i><span>Dashboard</span></Link>
        </li>
      )}

      {/* Order Process */}
      {hasRole('Order Process') && (
        <>
          <GroupLabel>Store</GroupLabel>
          <Section title="Order Process" icon={<i className="glyphicon glyphicon-shopping-cart"></i>} prefix="/dashboard/order-process">
          {hasRole('/dashboard/order-process/new-order') && (
            <NavLink href="/dashboard/order-process/new-order" icon={<i className="fa fa-cart-plus"></i>} label="New Order" />
          )}
          {hasRole('/dashboard/order-process/manage-order') && (
            <NavLink href="/dashboard/order-process/manage-order" icon={<i className="glyphicon glyphicon-th-list"></i>} label="Manage Order" />
          )}
          {hasRole('/dashboard/order-process/manage-invoice') && (
            <NavLink href="/dashboard/order-process/manage-invoice" icon={<i className="glyphicon glyphicon-list-alt"></i>} label="Manage Invoice" />
          )}
          {hasRole('/dashboard/order-process/returns') && (
            <NavLink href="/dashboard/order-process/returns" icon={<i className="fa fa-undo"></i>} label={<>Returns &amp; Exchanges</>} />
          )}
        </Section>
        </>
      )}
      {hasRole('Tailor') && (
        <Section title="Tailor" icon={<i className="fa fa-scissors"></i>} prefix="/dashboard/tailor">
          {hasRole('/dashboard/tailor/new-order') && (
            <NavLink href="/dashboard/tailor/new-order" icon={<i className="fa fa-plus-square"></i>} label="New Tailor Order" />
          )}
          {hasRole('/dashboard/tailor/orders') && (
            <NavLink href="/dashboard/tailor/orders" icon={<i className="glyphicon glyphicon-th-list"></i>} label="Manage Tailor Orders" />
          )}
          {hasRole('/dashboard/tailor/customers') && (
            <NavLink href="/dashboard/tailor/customers" icon={<i className="fa fa-users"></i>} label="Tailor Customers" />
          )}
          {hasRole('/dashboard/tailor/report') && (
            <NavLink href="/dashboard/tailor/report" icon={<i className="fa fa-bar-chart"></i>} label="Tailor Report" />
          )}
        </Section>
      )}

      {/* Warehouse — operational, for warehouse-flagged shops only. Head Office never sees this section at all; it gets the same data as reports instead (Transfer Report, Franchise Balances under Reports). */}
      {hasRole('Warehouse') && (
        <>
          <GroupLabel>Inventory</GroupLabel>
          <Section title="Warehouse" icon={<i className="fa fa-truck"></i>} prefix="/dashboard/warehouse">
          {hasRole('/dashboard/warehouse/add-stock') && (
            <NavLink href="/dashboard/warehouse/add-stock" icon={<i className="fa fa-plus-square"></i>} label="Add Stock" />
          )}
          {hasRole('/dashboard/warehouse/send-transfer') && (
            <NavLink href="/dashboard/warehouse/send-transfer" icon={<i className="fa fa-paper-plane"></i>} label={isWarehouseShop ? "Send Stock Transfer" : "Send Damage Return"} />
          )}
          {hasRole('/dashboard/warehouse/transfers') && (
            <NavLink href="/dashboard/warehouse/transfers" icon={<i className="glyphicon glyphicon-th-list"></i>} label="Manage Transfers" />
          )}
          {hasRole('/dashboard/warehouse/grn') && (
            <NavLink href="/dashboard/warehouse/grn" icon={<i className="fa fa-file-text-o"></i>} label="Goods Receive Notes" />
          )}
        </Section>
        </>
      )}

      {/* Manage Purchase */}
      {hasRole('Manage Purchase') && (
        <Section title="Manage Purchase" icon={<i className="fa fa-truck"></i>} prefix="/dashboard/manage-purchase">
          {hasRole('Supplier') && (
            <Section title="Supplier" icon={<i className="glyphicon glyphicon-gift"></i>} prefix="/dashboard/manage-purchase/supplier">
              {hasRole('/dashboard/manage-purchase/supplier/add-supplier') && (
                <NavLink href="/dashboard/manage-purchase/supplier/add-supplier" icon={<i className="glyphicon glyphicon-plus"></i>} label="Add Supplier" />
              )}
              {hasRole('/dashboard/manage-purchase/supplier/manage-supplier') && (
                <NavLink href="/dashboard/manage-purchase/supplier/manage-supplier" icon={<i className="glyphicon glyphicon-briefcase"></i>} label="Manage Supplier" />
              )}
            </Section>
          )}

          {hasRole('Purchase') && (
            <Section title="Purchase" icon={<i className="glyphicon glyphicon-credit-card"></i>} prefix="/dashboard/manage-purchase/purchase">
              {hasRole('/dashboard/manage-purchase/purchase/new-purchase') && (
                <NavLink href="/dashboard/manage-purchase/purchase/new-purchase" icon={<i className="glyphicon glyphicon-shopping-cart"></i>} label="New Purchase" />
              )}
              {hasRole('/dashboard/manage-purchase/purchase/purchase-history') && (
                <NavLink href="/dashboard/manage-purchase/purchase/purchase-history" icon={<i className="glyphicon glyphicon-th-list"></i>} label="Purchase History" />
              )}
              {hasRole('/dashboard/manage-purchase/purchase/batch-stock') && (
                <NavLink href="/dashboard/manage-purchase/purchase/batch-stock" icon={<i className="fa fa-cubes"></i>} label="Batch Stock" />
              )}
            </Section>
          )}
        </Section>
      )}

      {/* Product */}
      {hasRole('Product') && (
        <Section title="Product" icon={<i className="glyphicon glyphicon-th-large"></i>} prefix="/dashboard/product">
          {hasRole('/dashboard/product/add-product') && (
            <NavLink href="/dashboard/product/add-product" icon={<i className="glyphicon glyphicon-plus"></i>} label="Add Product" />
          )}
          {hasRole('/dashboard/product/manage-product') && (
            <NavLink href="/dashboard/product/manage-product" icon={<i className="glyphicon glyphicon-th-list"></i>} label="Manage Product" />
          )}
          {hasRole('/dashboard/product/barcode-print') && (
            <NavLink href="/dashboard/product/barcode-print" icon={<i className="glyphicon glyphicon-barcode"></i>} label="Barcode Print" />
          )}
          {hasRole('/dashboard/product/damage-product') && (
            <NavLink href="/dashboard/product/damage-product" icon={<i className="glyphicon glyphicon-trash"></i>} label="Damage Product" />
          )}

          {/* Category */}
          {hasRole('Category') && (
            <Section title="Category" icon={<i className="glyphicon glyphicon-indent-left"></i>} prefix="/dashboard/product/category">
              {hasRole('/dashboard/product/category/product-category') && (
                <NavLink href="/dashboard/product/category/product-category" icon={<i className="glyphicon glyphicon-tag"></i>} label="Product Category" />
              )}
              {hasRole('/dashboard/product/category/sub-category') && (
                <NavLink href="/dashboard/product/category/sub-category" icon={<i className="glyphicon glyphicon-tags"></i>} label="Sub Category" />
              )}
            </Section>
          )}
        </Section>
      )}

      {/* Customer */}
      {hasRole('Customer') && (
        <>
          <GroupLabel>People</GroupLabel>
          <Section title="Customer" icon={<i className="glyphicon glyphicon-user"></i>} prefix="/dashboard/customer">
          {hasRole('/dashboard/customer/add-customer') && (
            <NavLink href="/dashboard/customer/add-customer" icon={<i className="glyphicon glyphicon-plus"></i>} label="Add Customer" />
          )}
          {hasRole('/dashboard/customer/manage-customer') && (
            <NavLink href="/dashboard/customer/manage-customer" icon={<i className="glyphicon glyphicon-th-list"></i>} label="Manage Customer" />
          )}
        </Section>
        </>
      )}

      {hasRole('Ledger') && (
        <Section title="Ledger" icon={<i className="glyphicon glyphicon-book"></i>} prefix="/dashboard/ledger">
          <NavLink href="/dashboard/ledger" icon={<i className="glyphicon glyphicon-book"></i>} label="New Ledger" />
        </Section>
      )}

      {/* Reports */}
      {hasRole('Report') && (
        <>
          <GroupLabel>Insights</GroupLabel>
          <Section title="Report" icon={<i className="glyphicon glyphicon-signal"></i>} prefix="/dashboard/reports">

          {(hasRole('/dashboard/reports/sales-report') || hasRole('/dashboard/reports/sales-summery-report') || hasRole('/dashboard/reports/purchase-report') || hasRole('/dashboard/reports/customer-report') || hasRole('/dashboard/reports/loyalty-redemptions')) && (
            <Section title="Sales & Purchases" icon={<i className="fa fa-bar-chart"></i>} prefix={["/dashboard/reports/sales-report", "/dashboard/reports/sales-summery-report", "/dashboard/reports/purchase-report", "/dashboard/reports/customer-report", "/dashboard/reports/loyalty-redemptions"]}>
              {hasRole('/dashboard/reports/sales-report') && (
                <NavLink href="/dashboard/reports/sales-report" icon={<i className="fa fa-bar-chart"></i>} label="Sales Report" />
              )}
              {hasRole('/dashboard/reports/customer-report') && (
                <NavLink href="/dashboard/reports/customer-report" icon={<i className="fa fa-users"></i>} label="Customer Report" />
              )}
              {hasRole('/dashboard/reports/loyalty-redemptions') && (
                <NavLink href="/dashboard/reports/loyalty-redemptions" icon={<i className="fa fa-id-card"></i>} label="Loyalty Redemptions" />
              )}
              {hasRole('/dashboard/reports/sales-summery-report') && (
                <NavLink href="/dashboard/reports/sales-summery-report" icon={<i className="fa fa-circle-o"></i>} label="Sales Summery Report" />
              )}
              {hasRole('/dashboard/reports/purchase-report') && (
                <NavLink href="/dashboard/reports/purchase-report" icon={<i className="fa fa-line-chart"></i>} label="Purchase Report" />
              )}
            </Section>
          )}

          {(hasRole('/dashboard/reports/stock-report') || hasRole('/dashboard/reports/stock-comparison')) && (
            <Section title="Inventory" icon={<i className="fa fa-file-o"></i>} prefix={["/dashboard/reports/stock-report", "/dashboard/reports/stock-comparison"]}>
              {hasRole('/dashboard/reports/stock-report') && (
                <NavLink href="/dashboard/reports/stock-report" icon={<i className="fa fa-file-o"></i>} label="Stock Report" />
              )}
              {hasRole('/dashboard/reports/stock-comparison') && (
                <NavLink href="/dashboard/reports/stock-comparison" icon={<i className="fa fa-balance-scale"></i>} label="Stock Comparison" />
              )}
            </Section>
          )}

          {(hasRole('/dashboard/reports/all-shops') || hasRole('/dashboard/reports/transfer-report') || hasRole('/dashboard/reports/warehouse-report') || hasRole('/dashboard/warehouse/balances') || hasRole('/dashboard/tailor/report') || hasRole('/dashboard/warehouse/grn')) && (
            <Section title="Network" icon={<i className="fa fa-globe"></i>} prefix={["/dashboard/reports/all-shops", "/dashboard/reports/transfer-report", "/dashboard/reports/warehouse-report", "/dashboard/warehouse/balances", "/dashboard/tailor/report", "/dashboard/warehouse/grn"]}>
              {hasRole('/dashboard/reports/all-shops') && (
                <NavLink href="/dashboard/reports/all-shops" icon={<i className="fa fa-globe"></i>} label="All Franchises Report" />
              )}
              {hasRole('/dashboard/tailor/report') && (
                <NavLink href="/dashboard/tailor/report" icon={<i className="fa fa-scissors"></i>} label="Tailor Report" />
              )}
              {hasRole('/dashboard/reports/transfer-report') && (
                <NavLink href="/dashboard/reports/transfer-report" icon={<i className="fa fa-exchange"></i>} label="Transfer Report" />
              )}
              {hasRole('/dashboard/reports/warehouse-report') && (
                <NavLink href="/dashboard/reports/warehouse-report" icon={<i className="fa fa-industry"></i>} label="Warehouse Report" />
              )}
              {hasRole('/dashboard/warehouse/grn') && (
                <NavLink href="/dashboard/warehouse/grn" icon={<i className="fa fa-file-text-o"></i>} label="Goods Receive Notes" />
              )}
              {hasRole('/dashboard/warehouse/balances') && (
                <NavLink href="/dashboard/warehouse/balances" icon={<i className="fa fa-balance-scale"></i>} label="Franchise Balances" />
              )}
            </Section>
          )}

          {hasRole('/dashboard/reports/activity-log') && (
            <NavLink href="/dashboard/reports/activity-log" icon={<i className="fa fa-shield"></i>} label="Activity Log" />
          )}
        </Section>
        </>
      )}

      {/* Settings */}
      {hasRole('Settings') && (
        <>
          <GroupLabel>Configuration</GroupLabel>
          <Section title="Settings" icon={<i className="fa fa-cogs"></i>} prefix="/dashboard/settings">

          <Section title="Business" icon={<i className="glyphicon glyphicon-briefcase"></i>} prefix={["/dashboard/settings/business-profile", "/dashboard/settings/localisation"]}>
            {hasRole('/dashboard/settings/business-profile') && (
              <NavLink href="/dashboard/settings/business-profile" icon={<i className="glyphicon glyphicon-briefcase"></i>} label="Business Profile" />
            )}
            {hasRole('/dashboard/settings/localisation') && (
              <NavLink href="/dashboard/settings/localisation" icon={<i className="fa fa-globe"></i>} label="Localisation" />
            )}
          </Section>

          <Section title="Catalog & Operations" icon={<i className="glyphicon glyphicon-list-alt"></i>} prefix={["/dashboard/settings/manage-tax-rules", "/dashboard/settings/measurement-units", "/dashboard/settings/printer-settings", "/dashboard/settings/tailor-style-options"]}>
            {hasRole('/dashboard/settings/manage-tax-rules') && (
              <NavLink href="/dashboard/settings/manage-tax-rules" icon={<i className="glyphicon glyphicon-credit-card"></i>} label="Manage Tax Rules" />
            )}
            {hasRole('/dashboard/settings/measurement-units') && (
              <NavLink href="/dashboard/settings/measurement-units" icon={<i className="glyphicon glyphicon-scale"></i>} label="Measurement Units" />
            )}
            {hasRole('/dashboard/settings/printer-settings') && (
              <NavLink href="/dashboard/settings/printer-settings" icon={<i className="glyphicon glyphicon-print"></i>} label="Printer Settings" />
            )}
            {hasRole('/dashboard/settings/tailor-style-options') && (
              <NavLink href="/dashboard/settings/tailor-style-options" icon={<i className="fa fa-scissors"></i>} label="Tailor Style Options" />
            )}
          </Section>

          {(hasRole('/dashboard/settings/shops') || hasRole('/dashboard/settings/warehouses') || hasRole('/dashboard/settings/sync-settings') || hasRole('/dashboard/settings/loyalty-settings')) && (
            <Section title="Network" icon={<i className="fa fa-sitemap"></i>} prefix={["/dashboard/settings/shops", "/dashboard/settings/warehouses", "/dashboard/settings/sync-settings", "/dashboard/settings/loyalty-settings"]}>
              {hasRole('/dashboard/settings/shops') && (
                <NavLink href="/dashboard/settings/shops" icon={<i className="glyphicon glyphicon-globe"></i>} label="Manage Franchises" />
              )}
              {hasRole('/dashboard/settings/warehouses') && (
                <NavLink href="/dashboard/settings/warehouses" icon={<i className="fa fa-truck"></i>} label="Manage Warehouses" />
              )}
              {hasRole('/dashboard/settings/sync-settings') && (
                <NavLink href="/dashboard/settings/sync-settings" icon={<i className="fa fa-exchange"></i>} label="Sync Settings" />
              )}
              {hasRole('/dashboard/settings/loyalty-settings') && (
                <NavLink href="/dashboard/settings/loyalty-settings" icon={<i className="fa fa-star"></i>} label="Loyalty Settings" />
              )}
            </Section>
          )}

          <Section title="System" icon={<i className="fa fa-sliders"></i>} prefix={["/dashboard/settings/theme-settings", "/dashboard/settings/backup", "/dashboard/settings/notification-settings"]}>
            {hasRole('/dashboard/settings/theme-settings') && (
              <NavLink href="/dashboard/settings/theme-settings" icon={<i className="glyphicon glyphicon-tint"></i>} label="Theme Settings" />
            )}
            {hasRole('/dashboard/settings/backup') && (
              <NavLink href="/dashboard/settings/backup" icon={<i className="glyphicon glyphicon-save"></i>} label={<>Backup &amp; Restore</>} />
            )}
            {hasRole('/dashboard/settings/notification-settings') && (
              <NavLink href="/dashboard/settings/notification-settings" icon={<i className="fa fa-bell"></i>} label="Notification Settings" />
            )}
          </Section>

        </Section>
        </>
      )}

      {/* Employee Management */}
      {hasRole('Employee Management') && (
        <Section title="Employee Management" icon={<i className="entypo-users"></i>} prefix="/dashboard/employee">
          {hasRole('/dashboard/employee/employee-list') && (
            <NavLink href="/dashboard/employee/employee-list" icon={<i className="fa fa-users"></i>} label="Employee List" />
          )}
          {hasRole('/dashboard/employee/add-employee') && (
            <NavLink href="/dashboard/employee/add-employee" icon={<i className="entypo-user-add"></i>} label="Add Employee" />
          )}
        </Section>
      )}
    </ul>
  );
}
