'use server'
import { getShopScope } from '@/lib/getShopScope'

// NOTE: a 'use server' file may only export async functions (types are
// fine — they're erased at compile time). Keep constants unexported.

export type OnlinePeriod = { orders: number; gross_sales: number }

export type OnlineOrderStats = {
  generated_at: string
  currency: string
  totals: {
    total_orders: number
    total_sales: number
    gross_sales: number
    refunded_amount: number
    average_order_value: number
  }
  orders_by_status: Record<string, { count: number; amount: number }>
  orders_by_payment_status: Record<string, number>
  orders_by_payment_method: Record<string, { count: number; amount: number }>
  periods: { today: OnlinePeriod; last_7_days: OnlinePeriod; this_month: OnlinePeriod }
}

export type OnlineOrderStatsResult =
  | { ok: true; data: OnlineOrderStats }
  | { ok: false; error: string }

const TIMEOUT_MS = 5000
const CACHE_TTL_MS = 60_000
let cache: { at: number; data: OnlineOrderStats } | null = null

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// PHP's json_encode turns an EMPTY associative array into [] instead of
// {}, so a brand-new store with no orders would send arrays here. Treating
// anything non-object as "no entries" keeps that case from breaking.
const entries = (obj: unknown): [string, any][] =>
  obj && typeof obj === 'object' ? Object.entries(obj as Record<string, any>) : []

const period = (p: any): OnlinePeriod => ({ orders: num(p?.orders), gross_sales: num(p?.gross_sales) })

function parseStats(raw: any): OnlineOrderStats | null {
  if (!raw || raw.success !== true || !raw.totals || typeof raw.totals !== 'object') return null

  return {
    generated_at: String(raw.generated_at ?? ''),
    currency: String(raw.currency ?? ''),
    totals: {
      total_orders: num(raw.totals.total_orders),
      total_sales: num(raw.totals.total_sales),
      gross_sales: num(raw.totals.gross_sales),
      refunded_amount: num(raw.totals.refunded_amount),
      average_order_value: num(raw.totals.average_order_value),
    },
    orders_by_status: Object.fromEntries(
      entries(raw.orders_by_status).map(([k, v]) => [k, { count: num(v?.count), amount: num(v?.amount) }])
    ),
    orders_by_payment_status: Object.fromEntries(
      entries(raw.orders_by_payment_status).map(([k, v]) => [k, num(v)])
    ),
    orders_by_payment_method: Object.fromEntries(
      entries(raw.orders_by_payment_method).map(([k, v]) => [k, { count: num(v?.count), amount: num(v?.amount) }])
    ),
    periods: {
      today: period(raw.periods?.today),
      last_7_days: period(raw.periods?.last_7_days),
      this_month: period(raw.periods?.this_month),
    },
  }
}

export async function getOnlineOrderStats(forceRefresh: boolean = false): Promise<OnlineOrderStatsResult> {
  try {
    // Enforced here on the server — hiding the widget in the UI alone
    // wouldn't stop a logged-in franchise user calling this action directly.
    const scope = await getShopScope()
    if (!scope.isSuperAdmin) return { ok: false, error: 'Not authorised.' }

    if (!forceRefresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return { ok: true, data: cache.data }
    }

    const url = process.env.ONLINE_ORDERS_API_URL
    const key = process.env.ONLINE_ORDERS_API_KEY
    if (!url || !key) return { ok: false, error: 'eCommerce connection is not configured yet.' }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(url, {
        headers: { 'x-api-key': key, Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      console.error('Online order stats: eCommerce API returned HTTP', res.status)
      if (res.status === 401) return { ok: false, error: 'eCommerce site rejected the API key.' }
      if (res.status === 403) return { ok: false, error: 'eCommerce site blocked the request (403).' }
      if (res.status === 429) return { ok: false, error: 'eCommerce site is rate-limiting requests — try again shortly.' }
      return { ok: false, error: `eCommerce site returned an error (${res.status}).` }
    }

    const data = parseStats(await res.json().catch(() => null))
    if (!data) return { ok: false, error: 'eCommerce site returned an unexpected response.' }

    cache = { at: Date.now(), data }
    return { ok: true, data }
  } catch (err: any) {
    if (err?.name === 'AbortError') return { ok: false, error: 'eCommerce site did not respond in time.' }
    console.error('Online order stats failed:', err?.message || err)
    return { ok: false, error: 'Could not reach the eCommerce site.' }
  }
}
