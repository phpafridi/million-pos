-- AlterTable
ALTER TABLE `tbl_product` ADD COLUMN `days_before_expiry_alert` INTEGER NULL DEFAULT 30,
    ADD COLUMN `expiration_date` DATE NULL,
    ADD COLUMN `has_expiration` BOOLEAN NOT NULL DEFAULT false;
