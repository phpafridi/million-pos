-- Convert from a random 6-digit int to a string column so it can hold
-- the branded format (e.g. "MLN-2-PUR-0001"), matching order, invoice,
-- tailor order, and GRN numbers. Existing purchases keep their old
-- random number (now just stored as a string) — only new purchases
-- going forward get the branded sequential format.
ALTER TABLE `tbl_purchase` MODIFY COLUMN `purchase_order_number` VARCHAR(50) NOT NULL;
