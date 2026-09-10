'use server'
import { prisma } from '@/lib/prisma'

/**
 * Read-only loyalty configuration — safe to be directly callable from
 * client code, since it only exposes settings Head Office already
 * intends to be visible (the earn rate, redemption value, whether the
 * system is on). Kept in its own file, separate from loyalty.ts, so
 * that file can drop 'use server' and its point-awarding logic stops
 * being directly reachable from the browser at all.
 */
export async function getLoyaltyConfig() {
  const settings = await prisma.tbl_theme_setting.findMany({
    where: { setting_key: { in: ['loyalty_points_per_100_spent', 'loyalty_point_redeem_value', 'loyalty_system_enabled'] } },
  })
  const map = new Map(settings.map((s) => [s.setting_key, s.setting_value]))
  return {
    enabled: (map.get('loyalty_system_enabled') ?? 'true') === 'true',
    pointsPer100Spent: Number(map.get('loyalty_points_per_100_spent') ?? 1),
    redeemValuePerPoint: Number(map.get('loyalty_point_redeem_value') ?? 1),
  }
}
