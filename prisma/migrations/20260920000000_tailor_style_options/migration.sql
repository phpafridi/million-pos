CREATE TABLE `tbl_tailor_style_option` (
    `option_id` INTEGER NOT NULL AUTO_INCREMENT,
    `option_group` VARCHAR(30) NOT NULL,
    `option_value` VARCHAR(50) NOT NULL,
    `option_label` VARCHAR(100) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tbl_tailor_style_option_option_group_option_value_key`(`option_group`, `option_value`),
    PRIMARY KEY (`option_id`)
) DEFAULT CHARACTER SET utf8mb4;

INSERT INTO `tbl_tailor_style_option` (`option_group`, `option_value`, `option_label`, `sort_order`) VALUES
('pocket_style', '1_side', '1 Side Pocket', 1),
('pocket_style', '2_side', '2 Side Pocket', 2),

('collar_style', 'gol_bain', 'Gol Bain', 1),
('collar_style', 'sida_bain', 'Sida Bain', 2),
('collar_style', 'half_bain', 'Half Bain', 3),
('collar_style', 'gol_gala', 'Gol Gala', 4),

('collar_cut', 'american', 'American Cut', 1),
('collar_cut', 'english', 'English Cut', 2),
('collar_cut', 'french', 'French Cut', 3),

('qurta_style', 'qurta', 'Qurta', 1),
('qurta_style', 'sida_daman', 'Sida Daman', 2),

('checkbox', 'large_buttons', 'Large Buttons', 1),
('checkbox', 'metal_buttons', 'Metal Buttons', 2),
('checkbox', 'kaf_dboty', 'Kaf Dboty', 3),
('checkbox', 'kaj_patti', 'Kaj Patti', 4),
('checkbox', 'btn_dboty', 'Button Dboty', 5),
('checkbox', 'five_button', '5 Button', 6),
('checkbox', 'no_label', 'No Label', 7),
('checkbox', 'shalwar_zip', 'Shalwar Zip', 8),
('checkbox', 'two_jeb', '2 Jeb (Pockets)', 9),
('checkbox', 'no_jeb', 'No Jeb', 10),
('checkbox', 'nokdar_tera', 'Nokdar Teera', 11),
('checkbox', 'chalk_asten', 'Chalk Asten', 12),
('checkbox', 'kuf_dbl_kaj', 'Kuf Dbl Kaj', 13);
