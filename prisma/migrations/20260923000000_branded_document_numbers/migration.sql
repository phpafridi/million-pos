ALTER TABLE `tbl_order` ADD COLUMN `order_number` VARCHAR(30) NULL;
ALTER TABLE `tbl_order` ADD UNIQUE INDEX `tbl_order_order_number_key`(`order_number`);

ALTER TABLE `tbl_invoice` ADD COLUMN `invoice_number` VARCHAR(30) NULL;
ALTER TABLE `tbl_invoice` ADD UNIQUE INDEX `tbl_invoice_invoice_number_key`(`invoice_number`);

-- Backfill existing orders with a proper "{SHOP_CODE}-ORD-0001" style
-- number, sequential per shop in the order they were originally created.
UPDATE `tbl_order` o
JOIN (
  SELECT
    o2.order_id,
    CONCAT(s.shop_code, '-ORD-', LPAD(ROW_NUMBER() OVER (PARTITION BY o2.shop_id ORDER BY o2.order_id ASC), 4, '0')) AS new_number
  FROM `tbl_order` o2
  JOIN `tbl_shop` s ON s.shop_id = o2.shop_id
) numbered ON numbered.order_id = o.order_id
SET o.order_number = numbered.new_number
WHERE o.order_number IS NULL;

-- Same for existing invoices, sequential per shop (via the invoice's order).
UPDATE `tbl_invoice` i
JOIN (
  SELECT
    i2.invoice_id,
    CONCAT(s.shop_code, '-INV-', LPAD(ROW_NUMBER() OVER (PARTITION BY o.shop_id ORDER BY i2.invoice_id ASC), 4, '0')) AS new_number
  FROM `tbl_invoice` i2
  JOIN `tbl_order` o ON o.order_id = i2.order_id
  JOIN `tbl_shop` s ON s.shop_id = o.shop_id
) numbered ON numbered.invoice_id = i.invoice_id
SET i.invoice_number = numbered.new_number
WHERE i.invoice_number IS NULL;
