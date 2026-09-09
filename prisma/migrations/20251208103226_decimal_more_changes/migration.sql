-- CreateTable
CREATE TABLE `tbl_localization` (
    `localization_id` INTEGER NOT NULL AUTO_INCREMENT,
    `currency` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `localization_id`(`localization_id`),
    PRIMARY KEY (`localization_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_tag` (
    `tag_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tag` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
