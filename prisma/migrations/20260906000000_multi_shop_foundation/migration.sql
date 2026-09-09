-- ============================================================
-- Multi-shop / franchise foundation
-- Existing single-shop data is preserved by creating a
-- "Head Office" shop with shop_id = 1 and pointing all
-- existing rows at it (the new columns default to 1).
-- ============================================================

-- CreateTable: shops / franchises
CREATE TABLE `tbl_shop` (
    `shop_id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop_code` VARCHAR(30) NOT NULL,
    `shop_name` VARCHAR(150) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `is_head_office` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `tbl_shop_shop_code_key`(`shop_code`),
    PRIMARY KEY (`shop_id`)
) DEFAULT CHARACTER SET utf8mb4;

-- Seed: Head Office as shop_id = 1 so every @default(1) column below
-- already points at a valid, real shop.
INSERT INTO `tbl_shop` (`shop_id`, `shop_code`, `shop_name`, `is_head_office`, `is_active`, `updated_at`)
VALUES (1, 'HEAD-OFFICE', 'Head Office', true, true, CURRENT_TIMESTAMP(0));

-- AlterTable: add shop_id to every per-shop table
ALTER TABLE `tbl_ledger` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_inventory` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_product_price` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_purchase` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_order` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_return` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_damage_product` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_supplier` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_customer` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_business_profile` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_printer_setting` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_special_offer` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_tier_price` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `tbl_purchase_batch` ADD COLUMN `shop_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `user` ADD COLUMN `shop_id` INTEGER NULL;
ALTER TABLE `user` ADD COLUMN `is_super_admin` BOOLEAN NOT NULL DEFAULT false;

-- Uniqueness: one price row / one inventory row per product per shop
ALTER TABLE `tbl_inventory` ADD UNIQUE INDEX `tbl_inventory_product_id_shop_id_key`(`product_id`, `shop_id`);
ALTER TABLE `tbl_product_price` ADD UNIQUE INDEX `tbl_product_price_product_id_shop_id_key`(`product_id`, `shop_id`);

-- Indexes for fast per-shop filtering
CREATE INDEX `tbl_ledger_shop_id_idx` ON `tbl_ledger`(`shop_id`);
CREATE INDEX `tbl_purchase_shop_id_idx` ON `tbl_purchase`(`shop_id`);
CREATE INDEX `tbl_order_shop_id_idx` ON `tbl_order`(`shop_id`);
CREATE INDEX `tbl_return_shop_id_idx` ON `tbl_return`(`shop_id`);
CREATE INDEX `tbl_damage_product_shop_id_idx` ON `tbl_damage_product`(`shop_id`);
CREATE INDEX `tbl_supplier_shop_id_idx` ON `tbl_supplier`(`shop_id`);
CREATE INDEX `tbl_customer_shop_id_idx` ON `tbl_customer`(`shop_id`);
CREATE INDEX `tbl_business_profile_shop_id_idx` ON `tbl_business_profile`(`shop_id`);
CREATE INDEX `tbl_printer_setting_shop_id_idx` ON `tbl_printer_setting`(`shop_id`);
CREATE INDEX `tbl_special_offer_shop_id_idx` ON `tbl_special_offer`(`shop_id`);
CREATE INDEX `tbl_tier_price_shop_id_idx` ON `tbl_tier_price`(`shop_id`);
CREATE INDEX `tbl_purchase_batch_shop_id_idx` ON `tbl_purchase_batch`(`shop_id`);

-- Foreign keys
ALTER TABLE `tbl_ledger` ADD CONSTRAINT `tbl_ledger_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_inventory` ADD CONSTRAINT `tbl_inventory_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_product_price` ADD CONSTRAINT `tbl_product_price_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_purchase` ADD CONSTRAINT `tbl_purchase_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_order` ADD CONSTRAINT `tbl_order_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_return` ADD CONSTRAINT `tbl_return_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_damage_product` ADD CONSTRAINT `tbl_damage_product_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_supplier` ADD CONSTRAINT `tbl_supplier_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_customer` ADD CONSTRAINT `tbl_customer_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_business_profile` ADD CONSTRAINT `tbl_business_profile_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_printer_setting` ADD CONSTRAINT `tbl_printer_setting_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_special_offer` ADD CONSTRAINT `tbl_special_offer_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_tier_price` ADD CONSTRAINT `tbl_tier_price_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `user` ADD CONSTRAINT `user_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Make whoever is currently the only user a super admin (CEO), so nobody
-- is locked out after this migration. Re-assign roles afterwards as needed.
UPDATE `user` SET `is_super_admin` = true;
