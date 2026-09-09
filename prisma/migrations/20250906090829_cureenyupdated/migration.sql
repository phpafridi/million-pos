/*
  Warnings:

  - You are about to drop the column `country` on the `tbl_localization` table. All the data in the column will be lost.
  - You are about to drop the column `currency_format` on the `tbl_localization` table. All the data in the column will be lost.
  - You are about to drop the column `date_format` on the `tbl_localization` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `tbl_localization` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `tbl_localization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `tbl_localization` DROP COLUMN `country`,
    DROP COLUMN `currency_format`,
    DROP COLUMN `date_format`,
    DROP COLUMN `language`,
    DROP COLUMN `timezone`;
