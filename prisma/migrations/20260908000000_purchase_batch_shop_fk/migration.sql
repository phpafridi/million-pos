-- The multi-shop foundation migration added `shop_id` to tbl_purchase_batch
-- (with an index) but missed the foreign key constraint that every other
-- shop-scoped table got. Adding it here rather than editing that migration,
-- since it may already have been applied.
ALTER TABLE `tbl_purchase_batch`
  ADD CONSTRAINT `tbl_purchase_batch_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `tbl_shop`(`shop_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
