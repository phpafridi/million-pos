'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export type ShopKPI = {
  shop_id: number
  shop_name: string
  shop_code: string
  revenue: number
  profit: number
  sales_count: number
  stock_value: number
}

/** Revenue, profit, sales count, and stock value broken down per franchise — Head Office only. */
export async function getKPIsByShop(): Promise<ShopKPI[]> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) return []

  const shops = await prisma.tbl_shop.findMany({
    where: { is_active: true, is_head_office: false },
    select: { shop_id: true, shop_name: true, shop_code: true },
    orderBy: { shop_id: 'asc' },
  })

  const salesRows: any[] = await prisma.$queryRaw`
    SELECT
      shop_id,
      COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS revenue,
      COALESCE(SUM(CAST(total_tax AS DOUBLE)), 0) AS tax,
      COALESCE(SUM(CAST(discount_amount AS DOUBLE)), 0) AS discount,
      COUNT(*) AS sales_count
    FROM tbl_order
    WHERE order_status IN (2, 4)
    GROUP BY shop_id
  `

  const tailorRows: any[] = await prisma.$queryRaw`
    SELECT
      shop_id,
      COALESCE(SUM(CAST(advance_paid AS DOUBLE)), 0) AS tailor_income,
      COUNT(*) AS tailor_count
    FROM tbl_tailor_order
    WHERE status != 'cancelled'
    GROUP BY shop_id
  `

  const stockRows: any[] = await prisma.$queryRaw`
    SELECT
      i.shop_id,
      SUM(i.product_quantity * COALESCE(pp.buying_price, 0)) AS stock_value
    FROM tbl_inventory i
    LEFT JOIN tbl_product_price pp
      ON pp.product_id = i.product_id AND pp.shop_id = i.shop_id
    GROUP BY i.shop_id
  `

  const salesMap = new Map(salesRows.map((r) => [r.shop_id, r]))
  const tailorMap = new Map(tailorRows.map((r) => [r.shop_id, r]))
  const stockMap = new Map(stockRows.map((r) => [r.shop_id, Number(r.stock_value || 0)]))

  return shops.map((s) => {
    const sales = salesMap.get(s.shop_id)
    const tailor = tailorMap.get(s.shop_id)
    const posRevenue = Number(sales?.revenue || 0)
    const tax = Number(sales?.tax || 0)
    const discount = Number(sales?.discount || 0)
    const tailorIncome = Number(tailor?.tailor_income || 0)
    return {
      shop_id: s.shop_id,
      shop_name: s.shop_name,
      shop_code: s.shop_code,
      revenue: posRevenue + tailorIncome,
      profit: (posRevenue - tax - discount) + tailorIncome,
      sales_count: Number(sales?.sales_count || 0) + Number(tailor?.tailor_count || 0),
      stock_value: stockMap.get(s.shop_id) || 0,
    }
  })
}
