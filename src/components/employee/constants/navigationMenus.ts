// /constants/navigationMenus.ts
export type NavItem = {
  title: string;
  path?: string;
  children?: NavItem[];
};

export const navigationMenus: NavItem[] = [
  
  {
    title: 'Order Process',
    children: [
      { title: 'New Order', path: '/dashboard/order-process/new-order' },
      { title: 'Manage Order', path: '/dashboard/order-process/manage-order' },
      { title: 'View Order Detail', path: 'action:view-order' },
      { title: 'Change Order Status', path: 'action:change-order-status' },
      { title: 'Manage Invoice', path: '/dashboard/order-process/manage-invoice' },
      { title: 'View Invoice Detail', path: 'action:view-invoice' },
      { title: 'Returns & Exchanges', path: '/dashboard/order-process/returns' },
    ],
  },
  {
    title: 'Tailor',
    children: [
      { title: 'New Tailor Order', path: '/dashboard/tailor/new-order' },
      { title: 'Manage Tailor Orders', path: '/dashboard/tailor/orders' },
      { title: 'View Tailor Order Detail', path: 'action:view-tailor-order' },
      { title: 'Update Tailor Order Status', path: 'action:update-tailor-status' },
      { title: 'Record Tailor Payment', path: 'action:record-tailor-payment' },
      { title: 'Print Tailor Order Slip', path: 'action:print-tailor-slip' },
      { title: 'Tailor Customers', path: '/dashboard/tailor/customers' },
      { title: 'View Customer Profile', path: 'action:view-customer-profile' },
      { title: 'Edit Customer Profile', path: 'action:edit-customer-profile' },
      { title: 'Tailor Report', path: '/dashboard/tailor/report' },
    ],
  },
  {
    title: 'Warehouse',
    children: [
      { title: 'Add Stock to Warehouse', path: '/dashboard/warehouse/add-stock' },
      { title: 'Send Stock Transfer', path: '/dashboard/warehouse/send-transfer' },
      { title: 'Manage Transfers', path: '/dashboard/warehouse/transfers' },
      { title: 'View Transfer Detail', path: 'action:view-transfer' },
      { title: 'Receive / Cancel Transfer', path: 'action:manage-transfer-status' },
      { title: 'Record Transfer Payment', path: 'action:record-transfer-payment' },
      { title: 'Franchise Balances', path: '/dashboard/warehouse/balances' },
    ],
  },
  {
    title: 'Manage Purchase',
    children: [
      {
        title: 'Supplier',
        children: [
          { title: 'Add Supplier', path: '/dashboard/manage-purchase/supplier/add-supplier' },
          { title: 'Manage Supplier', path: '/dashboard/manage-purchase/supplier/manage-supplier' },
          { title: 'Edit Supplier', path: 'action:edit-supplier' },
          { title: 'Delete Supplier', path: 'action:delete-supplier' },
        ],
      },
      {
        title: 'Purchase',
        children: [
          { title: 'New Purchase', path: '/dashboard/manage-purchase/purchase/new-purchase' },
          { title: 'Purchase History', path: '/dashboard/manage-purchase/purchase/purchase-history' },
          { title: 'View Purchase Invoice', path: 'action:view-purchase-invoice' },
          { title: 'Batch Stock', path: '/dashboard/manage-purchase/purchase/batch-stock' },
        ],
      },
    ],
  },
  {
    title: 'Product',
    children: [
      { title: 'Add Product', path: '/dashboard/product/add-product' },
      { title: 'Manage Product', path: '/dashboard/product/manage-product' },
      { title: 'Edit Product', path: 'action:edit-product' },
      { title: 'Delete / Deactivate Product', path: 'action:delete-product' },
      { title: 'Barcode Print', path: '/dashboard/product/barcode-print' },
      { title: 'Damage Product', path: '/dashboard/product/damage-product' },
      {
        title: 'Category',
        children: [
          { title: 'Product Category', path: '/dashboard/product/category/product-category' },
          { title: 'Edit / Delete Category', path: 'action:manage-category' },
          { title: 'Sub Category', path: '/dashboard/product/category/sub-category' },
          { title: 'Edit / Delete Sub Category', path: 'action:manage-subcategory' },
        ],
      },
    ],
  },
  {
    title: 'Customer',
    children: [
      { title: 'Add Customer', path: '/dashboard/customer/add-customer' },
      { title: 'Manage Customer', path: '/dashboard/customer/manage-customer' },
      { title: 'View Customer Profile', path: 'action:view-customer-profile' },
      { title: 'Edit Customer', path: 'action:edit-customer' },
      { title: 'Delete Customer', path: 'action:delete-customer' },
    ],
  },
  {
    title: 'Ledger',
    children: [
      { title: 'Ledger', path: '/dashboard/ledger' },
      { title: 'Delete Ledger Entry', path: 'action:delete-ledger' },
    ],
  },
  {
    title: 'Report',
    children: [
      { title: 'Sales Report', path: '/dashboard/reports/sales-report' },
      { title: 'Customer Report', path: '/dashboard/reports/customer-report' },
      { title: 'Sales Summery Report', path: '/dashboard/reports/sales-summery-report' },
      { title: 'Purchase Report', path: '/dashboard/reports/purchase-report' },
      { title: 'Stock Report', path: '/dashboard/reports/stock-report' },
      { title: 'All Franchises Report', path: '/dashboard/reports/all-shops' },
      { title: 'Stock Comparison', path: '/dashboard/reports/stock-comparison' },
      { title: 'Activity Log', path: '/dashboard/reports/activity-log' },
    ],
  },
  {
    title: 'Settings',
    children: [
      { title: 'Business Profile', path: '/dashboard/settings/business-profile' },
      { title: 'Localisation', path: '/dashboard/settings/localisation' },
      { title: 'Manage Tax Rules', path: '/dashboard/settings/manage-tax-rules' },
      { title: 'Measurement Units', path: '/dashboard/settings/measurement-units' },
      { title: 'Printer Settings', path: '/dashboard/settings/printer-settings' },
      { title: 'Theme Settings', path: '/dashboard/settings/theme-settings' },
      { title: 'Backup & Restore', path: '/dashboard/settings/backup' },
      { title: 'Manage Franchises', path: '/dashboard/settings/shops' },
      { title: 'Manage Warehouses', path: '/dashboard/settings/warehouses' },
      { title: 'Sync Settings', path: '/dashboard/settings/sync-settings' },
      { title: 'Tailor Style Options', path: '/dashboard/settings/tailor-style-options' },
      { title: 'Notification Settings', path: '/dashboard/settings/notification-settings' },
    ],
  },
  {
    title: 'Employee Management',
    children: [
      { title: 'Employee List', path: '/dashboard/employee/employee-list' },
      { title: 'Add Employee', path: '/dashboard/employee/add-employee' },
      { title: 'Edit Employee', path: 'action:edit-employee' },
      { title: 'Delete Employee', path: 'action:delete-employee' },
    ],
  },
];
