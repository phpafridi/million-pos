-- Global defaults (shared platform-wide, created once)
INSERT INTO `tbl_tax` (`tax_title`, `tax_rate`, `tax_type`)
SELECT 'No Tax', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM `tbl_tax` WHERE `tax_title` = 'No Tax');

INSERT INTO `tbl_category` (`category_name`, `created_datetime`)
SELECT 'nil', CURRENT_TIMESTAMP(0)
WHERE NOT EXISTS (SELECT 1 FROM `tbl_category` WHERE `category_name` = 'nil');

INSERT INTO `tbl_subcategory` (`category_id`, `subcategory_name`, `created_datetime`)
SELECT c.`category_id`, 'nil', CURRENT_TIMESTAMP(0)
FROM `tbl_category` c
WHERE c.`category_name` = 'nil'
  AND NOT EXISTS (
    SELECT 1 FROM `tbl_subcategory` s WHERE s.`subcategory_name` = 'nil' AND s.`category_id` = c.`category_id`
  );

-- Per-shop defaults (one each, for every shop that already existed —
-- never shared between shops). customer_code must be globally unique, so
-- it's derived deterministically from shop_id to avoid collisions.
INSERT INTO `tbl_customer` (`shop_id`, `customer_code`, `customer_name`, `email`, `phone`, `address`, `discount`)
SELECT s.`shop_id`, 900000000 + s.`shop_id`, 'walkin', 'nil@gmail.com', '0', 'nil', '0'
FROM `tbl_shop` s
WHERE NOT EXISTS (
  SELECT 1 FROM `tbl_customer` c WHERE c.`shop_id` = s.`shop_id` AND c.`email` = 'nil@gmail.com'
);

INSERT INTO `tbl_supplier` (`shop_id`, `company_name`, `supplier_name`, `email`, `phone`, `address`)
SELECT s.`shop_id`, 'wholesale', 'wholesale', 'nil@gmail.com', '0', 'nil'
FROM `tbl_shop` s
WHERE NOT EXISTS (
  SELECT 1 FROM `tbl_supplier` sup WHERE sup.`shop_id` = s.`shop_id` AND sup.`supplier_name` = 'wholesale'
);
