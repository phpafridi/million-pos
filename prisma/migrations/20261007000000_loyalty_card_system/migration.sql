ALTER TABLE `tbl_customer` ADD COLUMN `card_number` VARCHAR(30) NULL UNIQUE AFTER `loyalty_points`;

INSERT INTO `tbl_theme_setting` (`setting_key`, `setting_value`, `category`, `label`, `updated_at`) VALUES
('loyalty_points_per_100_spent', '1', 'general', 'Loyalty Points Earned per 100 Spent', CURRENT_TIMESTAMP(0)),
('loyalty_point_redeem_value', '1', 'general', 'Discount Value per Point Redeemed', CURRENT_TIMESTAMP(0));
