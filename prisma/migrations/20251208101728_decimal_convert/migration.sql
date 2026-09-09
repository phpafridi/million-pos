/*
  Warnings:

  - You are about to alter the column `qty` on the `tbl_damage_product` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - The `decrease` column on the `tbl_damage_product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `product_quantity` on the `tbl_inventory` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `notify_quantity` on the `tbl_inventory` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `product_quantity` on the `tbl_order_details` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `packet_size` on the `tbl_product` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `grand_total` on the `tbl_purchase` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `qty` on the `tbl_purchase_product` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `unit_price` on the `tbl_purchase_product` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `sub_total` on the `tbl_purchase_product` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `quantity_above` on the `tbl_tier_price` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to drop the `tbl_localization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `tbl_damage_product` MODIFY `qty` DECIMAL(10, 2) NOT NULL,
    DROP COLUMN `decrease`,
    ADD COLUMN `decrease` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tbl_inventory` MODIFY `product_quantity` DECIMAL(10, 2) NOT NULL,
    MODIFY `notify_quantity` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `tbl_order` MODIFY `sub_total` DECIMAL(10, 2) NOT NULL,
    MODIFY `discount` DECIMAL(10, 2) NOT NULL,
    MODIFY `discount_amount` DECIMAL(10, 2) NOT NULL,
    MODIFY `total_tax` DECIMAL(10, 2) NOT NULL,
    MODIFY `grand_total` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_order_details` MODIFY `product_quantity` DECIMAL(10, 2) NOT NULL,
    MODIFY `buying_price` DECIMAL(10, 2) NOT NULL,
    MODIFY `selling_price` DECIMAL(10, 2) NOT NULL,
    MODIFY `product_tax` DECIMAL(10, 2) NOT NULL,
    MODIFY `sub_total` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_product` MODIFY `packet_size` DECIMAL(10, 2) NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tbl_product_price` MODIFY `buying_price` DECIMAL(10, 2) NOT NULL,
    MODIFY `selling_price` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_purchase` MODIFY `grand_total` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_purchase_product` MODIFY `qty` DECIMAL(10, 2) NOT NULL,
    MODIFY `unit_price` DECIMAL(10, 2) NOT NULL,
    MODIFY `sub_total` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_special_offer` MODIFY `offer_price` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `tbl_tax` MODIFY `tax_rate` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_tier_price` MODIFY `tier_price` DECIMAL(10, 2) NOT NULL,
    MODIFY `quantity_above` DECIMAL(10, 2) NOT NULL;

-- DropTable
DROP TABLE `tbl_localization`;

-- DropTable
DROP TABLE `tbl_tag`;
