/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `tbl_customer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `tbl_customer_customer_code_key` ON `tbl_customer`;

-- CreateIndex
CREATE UNIQUE INDEX `tbl_customer_email_key` ON `tbl_customer`(`email`);
