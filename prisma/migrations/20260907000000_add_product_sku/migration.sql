ALTER TABLE `tbl_product` ADD COLUMN `sku` VARCHAR(100) NULL;
CREATE INDEX `tbl_product_sku_idx` ON `tbl_product`(`sku`);
