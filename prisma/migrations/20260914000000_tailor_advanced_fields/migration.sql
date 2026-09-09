-- Tailor customer: new measurement fields + email for notifications
ALTER TABLE `tbl_tailor_customer` ADD COLUMN `email` VARCHAR(100) NULL AFTER `phone`;
ALTER TABLE `tbl_tailor_customer` ADD COLUMN `measurement_teera` DECIMAL(5,2) NULL AFTER `measurement_length`;
ALTER TABLE `tbl_tailor_customer` ADD COLUMN `measurement_daman` DECIMAL(5,2) NULL AFTER `measurement_neck`;

-- Tailor order: design/cut codes, style options, itemized charges
ALTER TABLE `tbl_tailor_order` ADD COLUMN `design_number` VARCHAR(30) NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `size_1` VARCHAR(20) NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `size_2` VARCHAR(20) NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `pocket_style` VARCHAR(20) NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `collar_style` VARCHAR(20) NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `collar_cut` VARCHAR(20) NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `qurta_style` VARCHAR(20) NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `style_options` JSON NULL;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `tailoring_amount` DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `extra_stitching_amount` DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE `tbl_tailor_order` ADD COLUMN `other_charges_amount` DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill: existing orders' full price becomes their "tailoring amount"
-- so the new itemized breakdown still sums correctly for old records.
UPDATE `tbl_tailor_order` SET `tailoring_amount` = `price` WHERE `tailoring_amount` = 0;
