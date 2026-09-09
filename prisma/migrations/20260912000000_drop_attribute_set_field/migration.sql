-- The "attribute templates" feature (reusable attribute-name groups applied
-- when adding a product) was removed — it duplicated the inline attribute
-- rows already available on the Add Product form and added an unnecessary
-- extra concept. tbl_attribute_set itself is kept (it predates this
-- project's changes and may still be referenced elsewhere); only the
-- template-fields table added for this feature is dropped.
ALTER TABLE `tbl_attribute_set_field` DROP FOREIGN KEY `tbl_attribute_set_field_attribute_set_id_fkey`;
DROP TABLE `tbl_attribute_set_field`;
