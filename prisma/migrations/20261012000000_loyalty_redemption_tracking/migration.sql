ALTER TABLE `tbl_order` ADD COLUMN `loyalty_points_redeemed` INT NOT NULL DEFAULT 0 AFTER `discount_amount`;
ALTER TABLE `tbl_order` ADD COLUMN `loyalty_discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `loyalty_points_redeemed`;
