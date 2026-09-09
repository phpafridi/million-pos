-- CreateTable: Product Returns
CREATE TABLE `tbl_return` (
    `return_id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_no` INTEGER NOT NULL,
    `order_id` INTEGER NOT NULL,
    `return_type` VARCHAR(20) NOT NULL,
    `return_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `note` TEXT NULL,
    `processed_by` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`return_id`),
    INDEX `tbl_return_order_id_fkey`(`order_id`),
    CONSTRAINT `tbl_return_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `tbl_order` (`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Return Items
CREATE TABLE `tbl_return_item` (
    `return_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_name` VARCHAR(128) NOT NULL,
    `product_code` VARCHAR(100) NOT NULL,
    `qty` DECIMAL(10, 1) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `sub_total` DECIMAL(10, 2) NOT NULL,
    `item_type` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`return_item_id`),
    INDEX `tbl_return_item_return_id_fkey`(`return_id`),
    INDEX `tbl_return_item_product_id_fkey`(`product_id`),
    CONSTRAINT `tbl_return_item_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `tbl_return` (`return_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `tbl_return_item_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Purchase Batch
CREATE TABLE `tbl_purchase_batch` (
    `batch_id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_code` VARCHAR(100) NOT NULL,
    `product_name` VARCHAR(128) NOT NULL,
    `batch_number` VARCHAR(100) NOT NULL,
    `qty` DECIMAL(10, 1) NOT NULL,
    `qty_remaining` DECIMAL(10, 1) NOT NULL,
    `buying_price` DECIMAL(10, 2) NOT NULL,
    `selling_price` DECIMAL(10, 2) NOT NULL,
    `expiry_date` DATE NULL,
    `manufacture_date` DATE NULL,
    `purchase_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (`batch_id`),
    INDEX `tbl_purchase_batch_purchase_id_fkey`(`purchase_id`),
    INDEX `tbl_purchase_batch_product_id_fkey`(`product_id`),
    CONSTRAINT `tbl_purchase_batch_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `tbl_purchase` (`purchase_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `tbl_purchase_batch_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
