-- Renumber existing tailor orders (old format: TLR-0001) to the same
-- brand-prefixed scheme POS orders/invoices already use
-- (MLN-{shop_id}-TLR-0001), preserving creation order per shop so the
-- sequence numbers still make chronological sense.

SET @prefix = (SELECT COALESCE(setting_value, 'MLN') FROM tbl_theme_setting WHERE setting_key = 'document_prefix' LIMIT 1);
SET @prefix = COALESCE(@prefix, 'MLN');

SET @rownum = 0;
SET @prev_shop = -1;

UPDATE tbl_tailor_order t
JOIN (
  SELECT
    tailor_order_id,
    shop_id,
    @rownum := IF(@prev_shop = shop_id, @rownum + 1, 1) AS seq,
    @prev_shop := shop_id
  FROM tbl_tailor_order
  ORDER BY shop_id, tailor_order_id ASC
) ranked ON t.tailor_order_id = ranked.tailor_order_id
SET t.order_number = CONCAT(@prefix, '-', ranked.shop_id, '-TLR-', LPAD(ranked.seq, 4, '0'));
