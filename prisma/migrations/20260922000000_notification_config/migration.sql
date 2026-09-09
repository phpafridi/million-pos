CREATE TABLE `tbl_notification_config` (
    `config_id` INTEGER NOT NULL AUTO_INCREMENT,
    `notify_email_enabled` BOOLEAN NOT NULL DEFAULT false,
    `notify_whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false,
    `smtp_host` VARCHAR(150) NULL,
    `smtp_port` INTEGER NULL DEFAULT 587,
    `smtp_secure` BOOLEAN NOT NULL DEFAULT false,
    `smtp_user` VARCHAR(150) NULL,
    `smtp_password` VARCHAR(255) NULL,
    `smtp_from_email` VARCHAR(150) NULL,
    `smtp_from_name` VARCHAR(150) NULL,
    `whatsapp_api_url` VARCHAR(300) NULL,
    `whatsapp_api_token` VARCHAR(500) NULL,
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`config_id`)
) DEFAULT CHARACTER SET utf8mb4;

INSERT INTO `tbl_notification_config` (`config_id`, `notify_email_enabled`, `notify_whatsapp_enabled`, `updated_at`)
VALUES (1, false, false, CURRENT_TIMESTAMP(0));
