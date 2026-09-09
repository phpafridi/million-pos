-- CreateTable
CREATE TABLE `tbl_measurement_unit` (
    `unit_id` INTEGER NOT NULL AUTO_INCREMENT,
    `unit_code` VARCHAR(50) NOT NULL,
    `unit_label` VARCHAR(100) NOT NULL,
    `is_packet_based` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `tbl_measurement_unit_unit_code_key`(`unit_code`),
    PRIMARY KEY (`unit_id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable
CREATE TABLE `tbl_printer_setting` (
    `printer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `printer_name` VARCHAR(100) NOT NULL,
    `paper_width_mm` INTEGER NOT NULL DEFAULT 80,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `layout_json` TEXT NOT NULL,
    `applies_to` VARCHAR(30) NOT NULL DEFAULT 'all',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`printer_id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable
CREATE TABLE `tbl_theme_setting` (
    `theme_setting_id` INTEGER NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` VARCHAR(50) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'general',
    `label` VARCHAR(150) NOT NULL,
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `tbl_theme_setting_setting_key_key`(`setting_key`),
    PRIMARY KEY (`theme_setting_id`)
) DEFAULT CHARACTER SET utf8mb4;

-- Seed: measurement units (keeps existing hardcoded values working, adds meter + pcs as requested)
INSERT INTO `tbl_measurement_unit` (`unit_code`, `unit_label`, `is_packet_based`, `sort_order`, `is_active`, `updated_at`) VALUES
('item', 'Item', false, 1, true, CURRENT_TIMESTAMP(0)),
('pieces', 'Packet in Pieces', true, 2, true, CURRENT_TIMESTAMP(0)),
('pcs', 'Pcs', false, 3, true, CURRENT_TIMESTAMP(0)),
('kg', 'Kg', false, 4, true, CURRENT_TIMESTAMP(0)),
('g', 'Grams', false, 5, true, CURRENT_TIMESTAMP(0)),
('liters', 'Liters', false, 6, true, CURRENT_TIMESTAMP(0)),
('meter', 'Meter', false, 7, true, CURRENT_TIMESTAMP(0));

-- Seed: default printer setting
INSERT INTO `tbl_printer_setting` (`printer_name`, `paper_width_mm`, `is_default`, `layout_json`, `applies_to`, `updated_at`) VALUES
('Default Thermal Printer', 80, true, '{"showLogo":true,"showBusinessAddress":true,"showTaxBreakdown":true,"showCashier":true,"headerText":"","footerText":"Thank you for shopping with us!","fontSize":"normal","showBarcode":true}', 'all', CURRENT_TIMESTAMP(0));

-- Seed: default theme colours (matches current admin.css defaults; safe to edit from admin UI afterwards)
INSERT INTO `tbl_theme_setting` (`setting_key`, `setting_value`, `category`, `label`, `updated_at`) VALUES
('color_primary', '#4f46e5', 'general', 'Primary Color', CURRENT_TIMESTAMP(0)),
('color_sidebar_bg', '#1f2937', 'sidebar', 'Sidebar Background', CURRENT_TIMESTAMP(0)),
('color_sidebar_text', '#e5e7eb', 'sidebar', 'Sidebar Text', CURRENT_TIMESTAMP(0)),
('color_topbar_bg', '#ffffff', 'topbar', 'Top Bar Background', CURRENT_TIMESTAMP(0)),
('color_topbar_text', '#111827', 'topbar', 'Top Bar Text', CURRENT_TIMESTAMP(0)),
('color_button_primary', '#4f46e5', 'buttons', 'Primary Button', CURRENT_TIMESTAMP(0)),
('color_button_danger', '#dc2626', 'buttons', 'Danger Button', CURRENT_TIMESTAMP(0)),
('color_page_bg', '#f3f4f6', 'pages', 'Page Background', CURRENT_TIMESTAMP(0)),
('color_card_bg', '#ffffff', 'pages', 'Card Background', CURRENT_TIMESTAMP(0)),
('color_text', '#111827', 'pages', 'Body Text', CURRENT_TIMESTAMP(0));
