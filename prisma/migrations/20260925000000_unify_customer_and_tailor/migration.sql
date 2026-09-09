-- ============================================================
-- Step 1: Add loyalty + measurement fields to the unified customer table
-- ============================================================
ALTER TABLE `tbl_customer` ADD COLUMN `is_gold_member` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `tbl_customer` ADD COLUMN `loyalty_points` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_length` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_teera` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_chest` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_waist` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_hip` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_shoulder` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_sleeve_length` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_sleeve_round` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_neck` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_daman` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_shalwar_length` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_bottom` DECIMAL(5,2) NULL;
ALTER TABLE `tbl_customer` ADD COLUMN `measurement_notes` TEXT NULL;

-- ============================================================
-- Step 2: Migrate every existing tailor customer into tbl_customer.
-- Match by (shop_id, phone) if a regular customer already exists there;
-- otherwise create a new customer row from the tailor customer's data.
-- ============================================================

-- 2a. Create a customer row for any tailor customer with no phone match yet
INSERT INTO `tbl_customer` (
  `shop_id`, `customer_code`, `customer_name`, `email`, `phone`, `address`, `discount`,
  `measurement_length`, `measurement_teera`, `measurement_chest`, `measurement_waist`,
  `measurement_hip`, `measurement_shoulder`, `measurement_sleeve_length`, `measurement_sleeve_round`,
  `measurement_neck`, `measurement_daman`, `measurement_shalwar_length`, `measurement_bottom`, `measurement_notes`
)
SELECT
  tc.`shop_id`, 700000000 + tc.`tailor_customer_id`, tc.`customer_name`,
  COALESCE(tc.`email`, CONCAT('tailor', tc.`tailor_customer_id`, '@placeholder.local')),
  tc.`phone`, COALESCE(tc.`address`, 'nil'), '0',
  tc.`measurement_length`, tc.`measurement_teera`, tc.`measurement_chest`, tc.`measurement_waist`,
  tc.`measurement_hip`, tc.`measurement_shoulder`, tc.`measurement_sleeve_length`, tc.`measurement_sleeve_round`,
  tc.`measurement_neck`, tc.`measurement_daman`, tc.`measurement_shalwar_length`, tc.`measurement_bottom`, tc.`measurement_notes`
FROM `tbl_tailor_customer` tc
WHERE NOT EXISTS (
  SELECT 1 FROM `tbl_customer` c WHERE c.`shop_id` = tc.`shop_id` AND c.`phone` COLLATE utf8mb4_unicode_ci = tc.`phone` COLLATE utf8mb4_unicode_ci
);

-- 2b. For tailor customers that DID already match an existing regular
-- customer by phone, copy their measurements onto that existing record
-- (their purchase history stays exactly as it was — this only adds
-- measurement data, nothing is overwritten that already had a value).
UPDATE `tbl_customer` c
JOIN `tbl_tailor_customer` tc ON tc.`shop_id` = c.`shop_id` AND tc.`phone` COLLATE utf8mb4_unicode_ci = c.`phone` COLLATE utf8mb4_unicode_ci
SET
  c.`measurement_length` = COALESCE(c.`measurement_length`, tc.`measurement_length`),
  c.`measurement_teera` = COALESCE(c.`measurement_teera`, tc.`measurement_teera`),
  c.`measurement_chest` = COALESCE(c.`measurement_chest`, tc.`measurement_chest`),
  c.`measurement_waist` = COALESCE(c.`measurement_waist`, tc.`measurement_waist`),
  c.`measurement_hip` = COALESCE(c.`measurement_hip`, tc.`measurement_hip`),
  c.`measurement_shoulder` = COALESCE(c.`measurement_shoulder`, tc.`measurement_shoulder`),
  c.`measurement_sleeve_length` = COALESCE(c.`measurement_sleeve_length`, tc.`measurement_sleeve_length`),
  c.`measurement_sleeve_round` = COALESCE(c.`measurement_sleeve_round`, tc.`measurement_sleeve_round`),
  c.`measurement_neck` = COALESCE(c.`measurement_neck`, tc.`measurement_neck`),
  c.`measurement_daman` = COALESCE(c.`measurement_daman`, tc.`measurement_daman`),
  c.`measurement_shalwar_length` = COALESCE(c.`measurement_shalwar_length`, tc.`measurement_shalwar_length`),
  c.`measurement_bottom` = COALESCE(c.`measurement_bottom`, tc.`measurement_bottom`),
  c.`measurement_notes` = COALESCE(c.`measurement_notes`, tc.`measurement_notes`);

-- ============================================================
-- Step 3: Repoint tailor orders at the unified customer table
-- ============================================================
ALTER TABLE `tbl_tailor_order` ADD COLUMN `customer_id` INTEGER NULL;

UPDATE `tbl_tailor_order` o
JOIN `tbl_tailor_customer` tc ON tc.`tailor_customer_id` = o.`tailor_customer_id`
JOIN `tbl_customer` c ON c.`shop_id` = tc.`shop_id` AND c.`phone` COLLATE utf8mb4_unicode_ci = tc.`phone` COLLATE utf8mb4_unicode_ci
SET o.`customer_id` = c.`customer_id`;

-- Drop the old FK/column and make the new one required
ALTER TABLE `tbl_tailor_order` DROP FOREIGN KEY `tbl_tailor_order_tailor_customer_id_fkey`;
ALTER TABLE `tbl_tailor_order` DROP COLUMN `tailor_customer_id`;
ALTER TABLE `tbl_tailor_order` MODIFY COLUMN `customer_id` INTEGER NOT NULL;
ALTER TABLE `tbl_tailor_order` ADD CONSTRAINT `tbl_tailor_order_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `tbl_customer`(`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Step 4: Drop the now-redundant tailor customer table entirely
-- ============================================================
DROP TABLE `tbl_tailor_customer`;
