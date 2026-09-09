-- AddForeignKey
ALTER TABLE `tbl_product` ADD CONSTRAINT `tbl_product_tax_id_fkey` FOREIGN KEY (`tax_id`) REFERENCES `tbl_tax`(`tax_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
