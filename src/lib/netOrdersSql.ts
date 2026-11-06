import { Prisma } from '@/generated/prisma/client'

/*
 * Orders as revenue reports should see them, with refunds taken out.
 *
 * A payment refund marks the WHOLE order as status 3 even when only some
 * items came back, so reports that just used `order_status IN (2, 4)` dropped
 * a partially refunded sale completely (e.g. 10000 sale, 5000 refunded →
 * counted as 0 instead of 5000).
 *
 * Use it in place of tbl_order in a raw query:
 *     FROM ${NET_ORDERS} AS tbl_order WHERE order_status IN (2, 4) ...
 *     FROM ${NET_ORDERS} o JOIN tbl_shop s ...
 * The usual `order_status IN (2, 4)` filter keeps working:
 *   - partially refunded orders show as status 2 with the reduced total
 *   - fully refunded orders stay status 3 (excluded)
 * grand_total / total_tax / discount_amount are the amounts AFTER refunds.
 * A refund is valued at what the customer actually paid (see refundMath.ts).
 * Fixed SQL text only — no user input goes into it.
 */
const REFUND_LIST = `COALESCE((SELECT SUM(ri.sub_total) FROM tbl_return r JOIN tbl_return_item ri ON ri.return_id = r.return_id
    WHERE r.order_id = o.order_id AND r.return_type = 'payment' AND ri.item_type = 'returned'), 0)`
const PAID_SHARE = `(CASE WHEN o.sub_total > 0 AND o.grand_total >= 0 THEN LEAST(1, o.grand_total / o.sub_total) ELSE 1 END)`
const NET = `GREATEST(0, o.grand_total - ${REFUND_LIST} * ${PAID_SHARE})`
const KEEP = `(CASE WHEN o.grand_total > 0 THEN ${NET} / o.grand_total ELSE 1 END)`

export const NET_ORDERS_SQL = `(
  SELECT o.order_id, o.shop_id, o.customer_id, o.order_date,
         CASE WHEN o.order_status = 3 AND ${NET} > 0.005 THEN 2 ELSE o.order_status END AS order_status,
         ${NET} AS grand_total,
         o.total_tax * ${KEEP} AS total_tax,
         o.discount_amount * ${KEEP} AS discount_amount
  FROM tbl_order o
)`

export const NET_ORDERS = Prisma.raw(NET_ORDERS_SQL)
