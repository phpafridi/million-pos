ALTER TABLE `tbl_shop` ADD COLUMN `login_slug` VARCHAR(50) NULL;
ALTER TABLE `tbl_shop` ADD COLUMN `is_warehouse` BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX `tbl_shop_login_slug_key` ON `tbl_shop`(`login_slug`);

-- Backfill a slug for every existing shop, derived from shop_code
-- (lowercased, non-alphanumeric stripped) so existing franchises get a
-- working login URL immediately, not just new ones going forward.
UPDATE `tbl_shop`
SET `login_slug` = LOWER(REGEXP_REPLACE(`shop_code`, '[^a-zA-Z0-9]+', ''))
WHERE `login_slug` IS NULL;

-- Head Office also becomes the first flagged warehouse, matching current
-- behavior (it was already the only shop that could send transfers).
UPDATE `tbl_shop` SET `is_warehouse` = true WHERE `is_head_office` = true;
