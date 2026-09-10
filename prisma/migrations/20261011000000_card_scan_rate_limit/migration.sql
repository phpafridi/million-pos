CREATE TABLE `tbl_card_scan_attempt` (
  `attempt_id` INT NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(64) NOT NULL,
  `success` BOOLEAN NOT NULL,
  `attempted_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`attempt_id`),
  INDEX `tbl_card_scan_attempt_ip_address_attempted_at_idx`(`ip_address`, `attempted_at`)
) DEFAULT CHARACTER SET utf8mb4;
