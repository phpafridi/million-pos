-- Idempotency keys for orders/purchases saved from the browser, so an
-- offline-queued or retried submission can never create a duplicate.
CREATE TABLE `tbl_client_submission` (
  `submission_id` INT NOT NULL AUTO_INCREMENT,
  `client_key` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(24) NOT NULL,
  `user_id` VARCHAR(40) NOT NULL,
  `status` VARCHAR(12) NOT NULL DEFAULT 'processing',
  `result` JSON NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `tbl_client_submission_client_key_key`(`client_key`),
  INDEX `tbl_client_submission_created_at_idx`(`created_at`),
  PRIMARY KEY (`submission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
