/*
  Warnings:

  - You are about to alter the column `qty` on the `tbl_damage_product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.
  - You are about to alter the column `decrease` on the `tbl_damage_product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.
  - You are about to alter the column `product_quantity` on the `tbl_inventory` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.
  - You are about to alter the column `notify_quantity` on the `tbl_inventory` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.
  - You are about to alter the column `product_quantity` on the `tbl_order_details` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.
  - You are about to alter the column `packet_size` on the `tbl_product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.
  - You are about to alter the column `qty` on the `tbl_purchase_product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.
  - You are about to alter the column `quantity_above` on the `tbl_tier_price` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,1)`.

*/
-- AlterTable
ALTER TABLE `tbl_damage_product` MODIFY `qty` DECIMAL(10, 1) NOT NULL,
    MODIFY `decrease` DECIMAL(10, 1) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tbl_inventory` MODIFY `product_quantity` DECIMAL(10, 1) NOT NULL,
    MODIFY `notify_quantity` DECIMAL(10, 1) NULL;

-- AlterTable
ALTER TABLE `tbl_order_details` MODIFY `product_quantity` DECIMAL(10, 1) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_product` MODIFY `packet_size` DECIMAL(10, 1) NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tbl_purchase_product` MODIFY `qty` DECIMAL(10, 1) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_tier_price` MODIFY `quantity_above` DECIMAL(10, 1) NOT NULL;
