-- CreateTable
CREATE TABLE `tbl_ledger` (
    `ledger_id` INTEGER NOT NULL AUTO_INCREMENT,
    `ledger_name` VARCHAR(100) NOT NULL,
    `mobile_number` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `total_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `tbl_ledger_mobile_number_key`(`mobile_number`),
    PRIMARY KEY (`ledger_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_ledger_transaction` (
    `transaction_id` INTEGER NOT NULL AUTO_INCREMENT,
    `ledger_id` INTEGER NOT NULL,
    `transaction_type` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `description` TEXT NULL,
    `previous_balance` DECIMAL(15, 2) NOT NULL,
    `new_balance` DECIMAL(15, 2) NOT NULL,
    `reference_number` VARCHAR(100) NULL,
    `transaction_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tbl_ledger_transaction` ADD CONSTRAINT `tbl_ledger_transaction_ledger_id_fkey` FOREIGN KEY (`ledger_id`) REFERENCES `tbl_ledger`(`ledger_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
