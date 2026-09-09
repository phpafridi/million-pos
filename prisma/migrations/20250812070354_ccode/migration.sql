-- CreateTable
CREATE TABLE `countries` (
    `idCountry` INTEGER NOT NULL AUTO_INCREMENT,
    `countryCode` CHAR(2) NOT NULL DEFAULT '',
    `countryName` VARCHAR(45) NOT NULL DEFAULT '',

    PRIMARY KEY (`idCountry`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_attribute` (
    `attribute_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `attribute_name` VARCHAR(100) NOT NULL,
    `attribute_value` TEXT NOT NULL,

    PRIMARY KEY (`attribute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_attribute_set` (
    `attribute_set_id` INTEGER NOT NULL AUTO_INCREMENT,
    `attribute_name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`attribute_set_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_business_profile` (
    `business_profile_id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(100) NOT NULL,
    `logo` VARCHAR(150) NULL,
    `full_path` VARCHAR(150) NULL,
    `email` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `phone` VARCHAR(100) NOT NULL,
    `currency` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`business_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_campaign` (
    `campaign_id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_name` VARCHAR(128) NOT NULL,
    `subject` VARCHAR(128) NOT NULL,
    `email_body` TEXT NOT NULL,
    `date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` VARCHAR(128) NOT NULL,

    PRIMARY KEY (`campaign_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_campaign_result` (
    `campaign_result_id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `campaign_name` VARCHAR(128) NOT NULL,
    `subject` VARCHAR(128) NOT NULL,
    `date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `send_by` VARCHAR(128) NOT NULL,

    PRIMARY KEY (`campaign_result_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_category` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_name` VARCHAR(100) NOT NULL,
    `created_datetime` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_customer` (
    `customer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_code` INTEGER NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `discount` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`customer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_damage_product` (
    `damage_product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `product_code` INTEGER NOT NULL,
    `product_name` VARCHAR(127) NOT NULL,
    `category` VARCHAR(128) NOT NULL,
    `qty` INTEGER NOT NULL,
    `note` TEXT NOT NULL,
    `decrease` TINYINT NOT NULL DEFAULT 0,
    `date` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`damage_product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_inventory` (
    `inventory_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `product_quantity` INTEGER NOT NULL,
    `notify_quantity` INTEGER NULL,

    PRIMARY KEY (`inventory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_invoice` (
    `invoice_id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_no` INTEGER NULL,
    `order_id` INTEGER NOT NULL,
    `invoice_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`invoice_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_localization` (
    `localization_id` INTEGER NOT NULL AUTO_INCREMENT,
    `timezone` VARCHAR(100) NOT NULL,
    `country` INTEGER NOT NULL,
    `date_format` VARCHAR(50) NOT NULL,
    `currency_format` VARCHAR(50) NOT NULL,
    `language` VARCHAR(100) NOT NULL,
    `currency` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `localization_id`(`localization_id`),
    PRIMARY KEY (`localization_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_menu` (
    `menu_id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(100) NOT NULL,
    `link` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(100) NOT NULL,
    `parent` INTEGER NOT NULL,
    `sort` INTEGER NOT NULL,

    PRIMARY KEY (`menu_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_order` (
    `order_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` INTEGER NOT NULL,
    `order_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `customer_id` INTEGER NOT NULL,
    `customer_name` VARCHAR(128) NOT NULL,
    `customer_email` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(100) NOT NULL,
    `customer_address` TEXT NOT NULL,
    `shipping_address` TEXT NOT NULL,
    `sub_total` DOUBLE NOT NULL,
    `discount` DOUBLE NOT NULL,
    `discount_amount` DOUBLE NOT NULL,
    `total_tax` DOUBLE NOT NULL,
    `grand_total` DOUBLE NOT NULL,
    `payment_method` VARCHAR(100) NOT NULL,
    `payment_ref` VARCHAR(120) NOT NULL,
    `order_status` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NOT NULL,
    `sales_person` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_order_details` (
    `order_details_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product_code` VARCHAR(200) NOT NULL,
    `product_name` VARCHAR(128) NOT NULL,
    `product_quantity` INTEGER NOT NULL,
    `buying_price` DOUBLE NOT NULL,
    `selling_price` DOUBLE NOT NULL,
    `product_tax` DOUBLE NOT NULL,
    `sub_total` DOUBLE NOT NULL,
    `price_option` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`order_details_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_product` (
    `product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_code` VARCHAR(100) NOT NULL,
    `product_name` VARCHAR(100) NOT NULL,
    `product_note` TEXT NOT NULL,
    `status` TINYINT NULL DEFAULT 1,
    `subcategory_id` INTEGER NOT NULL,
    `barcode_path` VARCHAR(300) NOT NULL,
    `barcode` VARCHAR(100) NOT NULL,
    `tax_id` INTEGER NOT NULL,

    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_product_image` (
    `product_image_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `image_path` VARCHAR(300) NOT NULL,
    `filename` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`product_image_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_product_price` (
    `product_price_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `buying_price` DOUBLE NOT NULL,
    `selling_price` DOUBLE NOT NULL,

    PRIMARY KEY (`product_price_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_product_tag` (
    `product_tag_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `tag` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`product_tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_purchase` (
    `purchase_id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_order_number` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `supplier_name` VARCHAR(128) NOT NULL,
    `grand_total` INTEGER NOT NULL,
    `purchase_ref` VARCHAR(128) NOT NULL,
    `payment_method` VARCHAR(128) NOT NULL,
    `payment_ref` VARCHAR(128) NOT NULL,
    `purchase_by` VARCHAR(100) NOT NULL,
    `datetime` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`purchase_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_purchase_product` (
    `purchase_product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_id` INTEGER NOT NULL,
    `product_code` VARCHAR(100) NOT NULL,
    `product_name` VARCHAR(128) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unit_price` INTEGER NOT NULL,
    `sub_total` INTEGER NOT NULL,

    PRIMARY KEY (`purchase_product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_special_offer` (
    `special_offer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `offer_price` DOUBLE NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,

    PRIMARY KEY (`special_offer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_subcategory` (
    `subcategory_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `subcategory_name` VARCHAR(100) NOT NULL,
    `created_datetime` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`subcategory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_supplier` (
    `supplier_id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(100) NOT NULL,
    `supplier_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,

    PRIMARY KEY (`supplier_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_tag` (
    `tag_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tag` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_tax` (
    `tax_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tax_title` VARCHAR(100) NOT NULL,
    `tax_rate` DOUBLE NOT NULL,
    `tax_type` INTEGER NOT NULL,

    PRIMARY KEY (`tax_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_tier_price` (
    `tier_price_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `tier_price` DOUBLE NOT NULL,
    `quantity_above` INTEGER NOT NULL,

    PRIMARY KEY (`tier_price_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` VARCHAR(191) NULL,
    `access_token` VARCHAR(191) NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` VARCHAR(191) NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `flag` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_role` (
    `user_role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `menu_name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `User_role_email_key`(`email`),
    PRIMARY KEY (`user_role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_role` ADD CONSTRAINT `User_role_email_fkey` FOREIGN KEY (`email`) REFERENCES `User`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;
