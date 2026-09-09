/*
  Warnings:

  - Added the required column `product_id` to the `tbl_order_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `measurement_units` to the `tbl_product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `tbl_purchase_product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tbl_order_details` ADD COLUMN `product_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `tbl_product` ADD COLUMN `measurement_units` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `tbl_purchase_product` ADD COLUMN `product_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `tbl_attribute` ADD CONSTRAINT `tbl_attribute_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_campaign_result` ADD CONSTRAINT `tbl_campaign_result_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `tbl_campaign`(`campaign_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_damage_product` ADD CONSTRAINT `tbl_damage_product_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_inventory` ADD CONSTRAINT `tbl_inventory_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_invoice` ADD CONSTRAINT `tbl_invoice_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `tbl_order`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_order` ADD CONSTRAINT `tbl_order_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `tbl_customer`(`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_order_details` ADD CONSTRAINT `tbl_order_details_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `tbl_order`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_order_details` ADD CONSTRAINT `tbl_order_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_product` ADD CONSTRAINT `tbl_product_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `tbl_subcategory`(`subcategory_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_product_image` ADD CONSTRAINT `tbl_product_image_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_product_price` ADD CONSTRAINT `tbl_product_price_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_product_tag` ADD CONSTRAINT `tbl_product_tag_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_purchase` ADD CONSTRAINT `tbl_purchase_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_supplier`(`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_purchase_product` ADD CONSTRAINT `tbl_purchase_product_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_purchase_product` ADD CONSTRAINT `tbl_purchase_product_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `tbl_purchase`(`purchase_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_special_offer` ADD CONSTRAINT `tbl_special_offer_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_subcategory` ADD CONSTRAINT `tbl_subcategory_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `tbl_category`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_tier_price` ADD CONSTRAINT `tbl_tier_price_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `tbl_product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
