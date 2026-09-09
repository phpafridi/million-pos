CREATE TABLE `tbl_entity_photo` (
  `photo_id` INT NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(30) NOT NULL,
  `entity_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `caption` VARCHAR(255) NULL,
  `uploaded_by` VARCHAR(100) NOT NULL,
  `uploaded_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`photo_id`),
  INDEX `tbl_entity_photo_entity_type_entity_id_idx`(`entity_type`, `entity_id`)
) DEFAULT CHARACTER SET utf8mb4;
