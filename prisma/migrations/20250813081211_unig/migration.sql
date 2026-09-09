/*
  Warnings:

  - A unique constraint covering the columns `[customer_code]` on the table `tbl_customer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `tbl_customer_customer_code_key` ON `tbl_customer`(`customer_code`);
