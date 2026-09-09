-- The POS and Purchase pages originally defaulted to a dark navy/green
-- theme. Updating the already-seeded rows to a clean, light theme that
-- matches the Head Office dashboard's look instead.
UPDATE `tbl_theme_setting` SET `setting_value` = '#f5f6fa' WHERE `setting_key` = 'color_pos_bg';
UPDATE `tbl_theme_setting` SET `setting_value` = '#ffffff' WHERE `setting_key` = 'color_pos_panel_bg';
UPDATE `tbl_theme_setting` SET `setting_value` = '#ffffff' WHERE `setting_key` = 'color_pos_topbar_bg';
UPDATE `tbl_theme_setting` SET `setting_value` = '#6366f1' WHERE `setting_key` = 'color_pos_accent';
UPDATE `tbl_theme_setting` SET `setting_value` = '#f5f6fa' WHERE `setting_key` = 'color_purchase_bg';
UPDATE `tbl_theme_setting` SET `setting_value` = '#ffffff' WHERE `setting_key` = 'color_purchase_panel_bg';
UPDATE `tbl_theme_setting` SET `setting_value` = '#ffffff' WHERE `setting_key` = 'color_purchase_topbar_bg';
UPDATE `tbl_theme_setting` SET `setting_value` = '#6366f1' WHERE `setting_key` = 'color_purchase_accent';
