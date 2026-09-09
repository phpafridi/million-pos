ALTER TABLE `tbl_customer` ADD COLUMN `custom_measurements` JSON NULL;

-- Seed the 12 existing (fixed, column-backed) measurement fields as
-- editable entries in tbl_tailor_style_option, same table already used
-- for pocket/collar/checkbox options. Admins can rename these labels,
-- hide ones they don't use, and add brand new custom ones (which get
-- stored in the new custom_measurements JSON column instead of a fixed
-- column, since we can't add a new database column every time someone
-- wants a new field).
INSERT INTO `tbl_tailor_style_option` (`option_group`, `option_value`, `option_label`, `sort_order`) VALUES
('measurement_field', 'measurement_length', 'Length (Qad)', 1),
('measurement_field', 'measurement_teera', 'Armhole (Teera)', 2),
('measurement_field', 'measurement_chest', 'Chest (Seena)', 3),
('measurement_field', 'measurement_waist', 'Waist (Kamar)', 4),
('measurement_field', 'measurement_hip', 'Hip', 5),
('measurement_field', 'measurement_shoulder', 'Shoulder (Shana)', 6),
('measurement_field', 'measurement_sleeve_length', 'Sleeve Length (Bazu)', 7),
('measurement_field', 'measurement_sleeve_round', 'Sleeve Round (Gol Bazu)', 8),
('measurement_field', 'measurement_neck', 'Collar (Kalar)', 9),
('measurement_field', 'measurement_daman', 'Hem Width (Daman)', 10),
('measurement_field', 'measurement_shalwar_length', 'Shalwar Length', 11),
('measurement_field', 'measurement_bottom', 'Ankle Opening (Paincha)', 12);
