-- Add category_id as nullable first, so existing rows can be backfilled
-- before it becomes a required column.
ALTER TABLE `tbl_product` ADD COLUMN `category_id` INT NULL AFTER `subcategory_id`;

-- Backfill category_id from each product's existing subcategory -> category
-- relationship, so no existing product loses its category classification.
UPDATE `tbl_product` p
JOIN `tbl_subcategory` s ON p.subcategory_id = s.subcategory_id
SET p.category_id = s.category_id
WHERE p.subcategory_id IS NOT NULL;

-- Safety net: any product that somehow has no valid subcategory falls
-- back to whichever category has the lowest ID, rather than being left
-- with an impossible NULL category.
UPDATE `tbl_product`
SET `category_id` = (SELECT MIN(category_id) FROM `tbl_category`)
WHERE `category_id` IS NULL;

-- Now category_id is reliably populated for every row, so it can become
-- required and get its foreign key.
ALTER TABLE `tbl_product` MODIFY COLUMN `category_id` INT NOT NULL;
ALTER TABLE `tbl_product` ADD CONSTRAINT `tbl_product_category_id_fkey`
  FOREIGN KEY (`category_id`) REFERENCES `tbl_category`(`category_id`);

-- Subcategory is no longer required or assigned — clear it out and drop
-- the NOT NULL constraint, matching the actual requested behavior.
ALTER TABLE `tbl_product` MODIFY COLUMN `subcategory_id` INT NULL;
UPDATE `tbl_product` SET `subcategory_id` = NULL;
