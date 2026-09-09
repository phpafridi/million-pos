-- ============================================================
-- Refund method (distinct from exchange)
-- ============================================================
ALTER TABLE `tbl_return` ADD COLUMN `refund_method` VARCHAR(30) NULL;

-- ============================================================
-- Activity log — Head Office oversight / theft prevention
-- ============================================================
CREATE TABLE `tbl_activity_log` (
    `log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop_id` INTEGER NULL,
    `user_email` VARCHAR(100) NOT NULL,
    `user_name` VARCHAR(100) NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `entity_type` VARCHAR(60) NOT NULL,
    `entity_id` VARCHAR(60) NOT NULL,
    `description` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4;

CREATE INDEX `tbl_activity_log_shop_id_idx` ON `tbl_activity_log`(`shop_id`);
CREATE INDEX `tbl_activity_log_created_at_idx` ON `tbl_activity_log`(`created_at`);
CREATE INDEX `tbl_activity_log_action_idx` ON `tbl_activity_log`(`action`);

ALTER TABLE `tbl_activity_log`
  ADD CONSTRAINT `tbl_activity_log_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Tailor module
-- ============================================================
CREATE TABLE `tbl_tailor_customer` (
    `tailor_customer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop_id` INTEGER NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `address` TEXT NULL,
    `measurement_length` DECIMAL(5,2) NULL,
    `measurement_chest` DECIMAL(5,2) NULL,
    `measurement_waist` DECIMAL(5,2) NULL,
    `measurement_hip` DECIMAL(5,2) NULL,
    `measurement_shoulder` DECIMAL(5,2) NULL,
    `measurement_sleeve_length` DECIMAL(5,2) NULL,
    `measurement_sleeve_round` DECIMAL(5,2) NULL,
    `measurement_neck` DECIMAL(5,2) NULL,
    `measurement_shalwar_length` DECIMAL(5,2) NULL,
    `measurement_bottom` DECIMAL(5,2) NULL,
    `measurement_notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`tailor_customer_id`)
) DEFAULT CHARACTER SET utf8mb4;

CREATE INDEX `tbl_tailor_customer_shop_id_idx` ON `tbl_tailor_customer`(`shop_id`);
CREATE INDEX `tbl_tailor_customer_shop_id_phone_idx` ON `tbl_tailor_customer`(`shop_id`, `phone`);

ALTER TABLE `tbl_tailor_customer`
  ADD CONSTRAINT `tbl_tailor_customer_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `tbl_tailor_order` (
    `tailor_order_id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop_id` INTEGER NOT NULL,
    `tailor_customer_id` INTEGER NOT NULL,
    `order_number` VARCHAR(30) NOT NULL,
    `garment_type` VARCHAR(60) NOT NULL,
    `fabric_details` TEXT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price` DECIMAL(10,2) NOT NULL,
    `advance_paid` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'received',
    `order_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `promised_date` DATE NULL,
    `ready_date` TIMESTAMP(0) NULL,
    `delivered_date` TIMESTAMP(0) NULL,
    `delivery_method` VARCHAR(20) NULL,
    `delivery_address` TEXT NULL,
    `delivery_phone` VARCHAR(30) NULL,
    `rider_name` VARCHAR(100) NULL,
    `tracking_note` TEXT NULL,
    `taken_by` VARCHAR(100) NOT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `tbl_tailor_order_shop_id_order_number_key`(`shop_id`, `order_number`),
    PRIMARY KEY (`tailor_order_id`)
) DEFAULT CHARACTER SET utf8mb4;

CREATE INDEX `tbl_tailor_order_shop_id_idx` ON `tbl_tailor_order`(`shop_id`);
CREATE INDEX `tbl_tailor_order_shop_id_status_idx` ON `tbl_tailor_order`(`shop_id`, `status`);

ALTER TABLE `tbl_tailor_order`
  ADD CONSTRAINT `tbl_tailor_order_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tbl_tailor_order`
  ADD CONSTRAINT `tbl_tailor_order_tailor_customer_id_fkey`
  FOREIGN KEY (`tailor_customer_id`) REFERENCES `tbl_tailor_customer`(`tailor_customer_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `tbl_tailor_order_status_log` (
    `status_log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tailor_order_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `note` TEXT NULL,
    `changed_by` VARCHAR(100) NOT NULL,
    `changed_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`status_log_id`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `tbl_tailor_order_status_log`
  ADD CONSTRAINT `tbl_tailor_order_status_log_tailor_order_id_fkey`
  FOREIGN KEY (`tailor_order_id`) REFERENCES `tbl_tailor_order`(`tailor_order_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
