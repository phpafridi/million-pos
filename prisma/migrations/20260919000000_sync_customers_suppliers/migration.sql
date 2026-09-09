-- Relax shop_id to nullable on customers/suppliers, same pattern as
-- products/categories/tax/measurement_units: NULL = shared, a real value
-- = private to that shop only.
ALTER TABLE `tbl_customer` MODIFY COLUMN `shop_id` INTEGER NULL;
ALTER TABLE `tbl_supplier` MODIFY COLUMN `shop_id` INTEGER NULL;

-- Both default to private (matches current behavior and your earlier
-- request that customer/supplier data not be shared by default).
INSERT INTO `tbl_sync_setting` (`data_type`, `label`, `is_synced`, `updated_at`) VALUES
('customers', 'Customers', false, CURRENT_TIMESTAMP(0)),
('suppliers', 'Suppliers', false, CURRENT_TIMESTAMP(0));
