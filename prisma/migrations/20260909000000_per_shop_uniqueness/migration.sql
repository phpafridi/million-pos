-- Customer emails and ledger mobile numbers were globally unique, which
-- breaks multi-tenancy: two different franchises should be able to have
-- a walk-in customer with the same email/phone without colliding.
-- Switch both to a composite unique key scoped by shop_id.

-- tbl_customer: drop the old global unique on email, add (shop_id, email)
ALTER TABLE `tbl_customer` DROP INDEX `tbl_customer_email_key`;
ALTER TABLE `tbl_customer` ADD UNIQUE INDEX `tbl_customer_shop_id_email_key`(`shop_id`, `email`);

-- tbl_ledger: drop the old global unique on mobile_number, add (shop_id, mobile_number)
ALTER TABLE `tbl_ledger` DROP INDEX `tbl_ledger_mobile_number_key`;
ALTER TABLE `tbl_ledger` ADD UNIQUE INDEX `tbl_ledger_shop_id_mobile_number_key`(`shop_id`, `mobile_number`);
