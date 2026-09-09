CREATE TABLE `tbl_stock_transfer` (
    `transfer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `transfer_number` VARCHAR(30) NOT NULL,
    `from_shop_id` INTEGER NOT NULL,
    `to_shop_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_by` VARCHAR(100) NOT NULL,
    `sent_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `received_date` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `tbl_stock_transfer_transfer_number_key`(`transfer_number`),
    PRIMARY KEY (`transfer_id`)
) DEFAULT CHARACTER SET utf8mb4;

CREATE INDEX `tbl_stock_transfer_from_shop_id_idx` ON `tbl_stock_transfer`(`from_shop_id`);
CREATE INDEX `tbl_stock_transfer_to_shop_id_idx` ON `tbl_stock_transfer`(`to_shop_id`);
CREATE INDEX `tbl_stock_transfer_status_idx` ON `tbl_stock_transfer`(`status`);

ALTER TABLE `tbl_stock_transfer`
  ADD CONSTRAINT `tbl_stock_transfer_from_shop_id_fkey`
  FOREIGN KEY (`from_shop_id`) REFERENCES `tbl_shop`(`shop_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tbl_stock_transfer`
  ADD CONSTRAINT `tbl_stock_transfer_to_shop_id_fkey`
  FOREIGN KEY (`to_shop_id`) REFERENCES `tbl_shop`(`shop_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `tbl_stock_transfer_item` (
    `transfer_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `transfer_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_name` VARCHAR(128) NOT NULL,
    `quantity` DECIMAL(10,1) NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `sub_total` DECIMAL(10,2) NOT NULL,

    PRIMARY KEY (`transfer_item_id`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `tbl_stock_transfer_item`
  ADD CONSTRAINT `tbl_stock_transfer_item_transfer_id_fkey`
  FOREIGN KEY (`transfer_id`) REFERENCES `tbl_stock_transfer`(`transfer_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tbl_stock_transfer_item`
  ADD CONSTRAINT `tbl_stock_transfer_item_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `tbl_stock_transfer_payment` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `transfer_id` INTEGER NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `method` VARCHAR(30) NOT NULL,
    `note` TEXT NULL,
    `recorded_by` VARCHAR(100) NOT NULL,
    `paid_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `tbl_stock_transfer_payment`
  ADD CONSTRAINT `tbl_stock_transfer_payment_transfer_id_fkey`
  FOREIGN KEY (`transfer_id`) REFERENCES `tbl_stock_transfer`(`transfer_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
