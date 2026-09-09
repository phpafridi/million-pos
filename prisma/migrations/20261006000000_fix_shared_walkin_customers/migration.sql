-- The bulk "Share All Customers" action previously had no exclusion for
-- the generic per-shop "walkin" placeholder customers, so running it
-- converted every franchise's own walkin into a shared customer —
-- meaning all of them showed up together in every franchise's customer
-- list, as duplicate-looking "walkin" rows.
--
-- Each walkin customer's original shop is recoverable from its
-- customer_code, which the seeding migration set to exactly
-- (900000000 + shop_id). Restore shop_id from that, for any walkin
-- customer that currently has shop_id = NULL (i.e., got shared).
UPDATE `tbl_customer`
SET `shop_id` = `customer_code` - 900000000
WHERE `shop_id` IS NULL
  AND `customer_code` >= 900000000
  AND `customer_code` < 1000000000;
