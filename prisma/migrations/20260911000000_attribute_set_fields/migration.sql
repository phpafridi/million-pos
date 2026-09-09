CREATE TABLE `tbl_attribute_set_field` (
    `set_field_id` INTEGER NOT NULL AUTO_INCREMENT,
    `attribute_set_id` INTEGER NOT NULL,
    `field_name` VARCHAR(100) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`set_field_id`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `tbl_attribute_set_field`
  ADD CONSTRAINT `tbl_attribute_set_field_attribute_set_id_fkey`
  FOREIGN KEY (`attribute_set_id`) REFERENCES `tbl_attribute_set`(`attribute_set_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
