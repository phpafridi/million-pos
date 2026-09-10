CREATE TABLE `tbl_grn` (
  `grn_id` INT NOT NULL AUTO_INCREMENT,
  `grn_number` VARCHAR(60) NOT NULL,
  `shop_id` INT NOT NULL,
  `source_type` VARCHAR(30) NOT NULL,
  `source_reference` INT NULL,
  `source_description` VARCHAR(255) NOT NULL,
  `received_by` VARCHAR(100) NOT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`grn_id`),
  UNIQUE INDEX `tbl_grn_grn_number_key`(`grn_number`),
  INDEX `tbl_grn_shop_id_idx`(`shop_id`),
  INDEX `tbl_grn_source_type_idx`(`source_type`),
  CONSTRAINT `tbl_grn_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4;

CREATE TABLE `tbl_grn_item` (
  `grn_item_id` INT NOT NULL AUTO_INCREMENT,
  `grn_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `unit_cost` DECIMAL(10,2) NULL,
  PRIMARY KEY (`grn_item_id`),
  INDEX `tbl_grn_item_grn_id_idx`(`grn_id`),
  CONSTRAINT `tbl_grn_item_grn_id_fkey` FOREIGN KEY (`grn_id`) REFERENCES `tbl_grn`(`grn_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tbl_grn_item_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4;
