-- DropForeignKey
ALTER TABLE `account` DROP FOREIGN KEY `Account_userId_fkey`;

-- DropForeignKey
ALTER TABLE `session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_role` DROP FOREIGN KEY `User_role_email_fkey`;

-- AlterTable
ALTER TABLE `tbl_damage_product` MODIFY `product_code` VARCHAR(100) NOT NULL;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_email_fkey` FOREIGN KEY (`email`) REFERENCES `user`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `account` RENAME INDEX `Account_provider_providerAccountId_key` TO `account_provider_providerAccountId_key`;

-- RenameIndex
ALTER TABLE `session` RENAME INDEX `Session_sessionToken_key` TO `session_sessionToken_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_email_key` TO `user_email_key`;

-- RenameIndex
ALTER TABLE `user_role` RENAME INDEX `User_role_email_idx` TO `user_role_email_idx`;

-- RenameIndex
ALTER TABLE `verificationtoken` RENAME INDEX `VerificationToken_identifier_token_key` TO `verificationtoken_identifier_token_key`;

-- RenameIndex
ALTER TABLE `verificationtoken` RENAME INDEX `VerificationToken_token_key` TO `verificationtoken_token_key`;
