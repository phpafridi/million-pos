-- Pick the lowest customer_id among all "walkin" customers as the one
-- canonical record every franchise will share from now on.
SET @canonical_walkin_id = (
  SELECT MIN(customer_id) FROM (
    SELECT customer_id FROM tbl_customer
    WHERE customer_name = 'walkin' AND email = 'nil@gmail.com'
  ) AS t
);

-- Only proceed if a walkin customer actually exists (safe no-op otherwise)
-- Reassign any orders pointing at a duplicate walkin to the canonical one.
UPDATE tbl_order o
JOIN tbl_customer c ON c.customer_id = o.customer_id
SET o.customer_id = @canonical_walkin_id
WHERE c.customer_name = 'walkin' AND c.email = 'nil@gmail.com'
  AND c.customer_id != @canonical_walkin_id
  AND @canonical_walkin_id IS NOT NULL;

-- Same for tailor orders.
UPDATE tbl_tailor_order t
JOIN tbl_customer c ON c.customer_id = t.customer_id
SET t.customer_id = @canonical_walkin_id
WHERE c.customer_name = 'walkin' AND c.email = 'nil@gmail.com'
  AND c.customer_id != @canonical_walkin_id
  AND @canonical_walkin_id IS NOT NULL;

-- Now safe to delete the now-unreferenced duplicate walkin rows.
DELETE FROM tbl_customer
WHERE customer_name = 'walkin' AND email = 'nil@gmail.com'
  AND customer_id != @canonical_walkin_id
  AND @canonical_walkin_id IS NOT NULL;

-- Make the one remaining walkin permanently shared — visible to every
-- franchise (including ones created in the future) regardless of the
-- general "Customers" sync setting, since a shared record is always
-- visible network-wide by design.
UPDATE tbl_customer
SET shop_id = NULL
WHERE customer_id = @canonical_walkin_id AND @canonical_walkin_id IS NOT NULL;
