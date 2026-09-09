-- DropForeignKey
ALTER TABLE `user_role` DROP FOREIGN KEY `User_role_email_fkey`;

-- DropIndex
DROP INDEX `User_role_email_key` ON `user_role`;

-- CreateIndex
CREATE INDEX `User_role_email_idx` ON `User_role`(`email`);

-- AddForeignKey
ALTER TABLE `User_role` ADD CONSTRAINT `User_role_email_fkey` FOREIGN KEY (`email`) REFERENCES `User`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;
