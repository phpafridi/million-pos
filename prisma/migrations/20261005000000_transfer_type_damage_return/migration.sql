ALTER TABLE `tbl_stock_transfer` ADD COLUMN `transfer_type` VARCHAR(20) NOT NULL DEFAULT 'restock' AFTER `to_shop_id`;
ALTER TABLE `tbl_stock_transfer` ADD COLUMN `damage_logged` BOOLEAN NOT NULL DEFAULT false AFTER `transfer_type`;
