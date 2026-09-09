-- ============================================================
-- Sync settings table
-- ============================================================
CREATE TABLE `tbl_sync_setting` (
    `sync_setting_id` INTEGER NOT NULL AUTO_INCREMENT,
    `data_type` VARCHAR(50) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `is_synced` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `tbl_sync_setting_data_type_key`(`data_type`),
    PRIMARY KEY (`sync_setting_id`)
) DEFAULT CHARACTER SET utf8mb4;

-- Products/categories/tax/measurement units default to synced (shared) —
-- matches current behavior, nothing changes until Head Office turns one
-- off. Tailor data defaults to NOT synced (private per shop) — matches
-- how it already works today and the safer default given it contains
-- customer contact details and body measurements.
INSERT INTO `tbl_sync_setting` (`data_type`, `label`, `is_synced`, `updated_at`) VALUES
('products', 'Products', true, CURRENT_TIMESTAMP(0)),
('categories', 'Categories & Sub-categories', true, CURRENT_TIMESTAMP(0)),
('tax_rules', 'Tax Rules', true, CURRENT_TIMESTAMP(0)),
('measurement_units', 'Measurement Units', true, CURRENT_TIMESTAMP(0)),
('tailor_data', 'Tailor Customer Data', false, CURRENT_TIMESTAMP(0));

-- ============================================================
-- Add nullable shop_id to every data type that can now be toggled
-- between shared (shop_id = NULL) and private (shop_id = a real shop).
-- Existing rows all become NULL (shared) — nothing changes for anyone
-- until Head Office actually flips a toggle off.
-- ============================================================
ALTER TABLE `tbl_product` ADD COLUMN `shop_id` INTEGER NULL;
CREATE INDEX `tbl_product_shop_id_idx` ON `tbl_product`(`shop_id`);
ALTER TABLE `tbl_product` ADD CONSTRAINT `tbl_product_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_category` ADD COLUMN `shop_id` INTEGER NULL;
CREATE INDEX `tbl_category_shop_id_idx` ON `tbl_category`(`shop_id`);
ALTER TABLE `tbl_category` ADD CONSTRAINT `tbl_category_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_subcategory` ADD COLUMN `shop_id` INTEGER NULL;
CREATE INDEX `tbl_subcategory_shop_id_idx` ON `tbl_subcategory`(`shop_id`);
ALTER TABLE `tbl_subcategory` ADD CONSTRAINT `tbl_subcategory_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_tax` ADD COLUMN `shop_id` INTEGER NULL;
CREATE INDEX `tbl_tax_shop_id_idx` ON `tbl_tax`(`shop_id`);
ALTER TABLE `tbl_tax` ADD CONSTRAINT `tbl_tax_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Measurement units had a globally-unique unit_code; switch to
-- (shop_id, unit_code) so a private unit in one shop can't block another
-- shop from using the same code for their own private unit.
ALTER TABLE `tbl_measurement_unit` DROP INDEX `tbl_measurement_unit_unit_code_key`;
ALTER TABLE `tbl_measurement_unit` ADD COLUMN `shop_id` INTEGER NULL;
ALTER TABLE `tbl_measurement_unit` ADD UNIQUE INDEX `tbl_measurement_unit_shop_id_unit_code_key`(`shop_id`, `unit_code`);
ALTER TABLE `tbl_measurement_unit` ADD CONSTRAINT `tbl_measurement_unit_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE SET NULL ON UPDATE CASCADE;
