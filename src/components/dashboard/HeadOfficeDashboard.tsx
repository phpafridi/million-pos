'use client'
import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LabelList,
} from 'recharts'

import { getRevenue } from './actions/getRevenue'
import { getProfit } from './actions/getProfit'
import { getSalesQuantity } from './actions/getSalesQuantity'
import { getStockValue } from './actions/getStockValuet'
import { getRevenueTrend, DailyRevenuePoint } from './actions/getRevenueTrend'
import { getTopProductsByShop, ProductByShopRow } from './actions/getTopProductsByShop'
import { getDashboardComparisons, DashboardComparisons } from './actions/getDashboardComparisons'
import FetchShopRollup, { ShopRollupRow } from '../reports/actions/FetchShopRollup'
import { getKPIsByShop, ShopKPI } from './actions/getKPIsByShop'
import { fetchCurrency } from '../settings/actions/fetchCurrency'

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#ef4444', '#84cc16']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function ChangeBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 20,
      background: up ? '#eafaf1' : '#fdecea',
      color: up ? '#1a9c5c' : '#d9403a',
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// Card container styles shared across the dashboard
const card: React.CSSProperties = {
  background: '#ffffff', borderRadius: 14, padding: '20px 22px',
  border: '1px solid #edf0f5', boxShadow: '0 1px 3px rgba(20,20,43,0.04)',
}
const sectionTitle: React.CSSProperties = { color: '#1a1d29', fontSize: 14, fontWeight: 700 }
const mutedText: React.CSSProperties = { color: '#8a90a3', fontSize: 12 }

export default function HeadOfficeDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currency, setCurrency] = useState('Rs')

  const [revenue, setRevenue] = useState(0)
  const [profit, setProfit] = useState(0)
  const [salesQty, setSalesQty] = useState(0)
  const [stockValue, setStockValue] = useState(0)
  const [trend, setTrend] = useState<DailyRevenuePoint[]>([])
  const [trendShopNames, setTrendShopNames] = useState<string[]>([])
  const [shopRows, setShopRows] = useState<ShopRollupRow[]>([])
  const [topProducts, setTopProducts] = useState<ProductByShopRow[]>([])
  const [topProductsShopNames, setTopProductsShopNames] = useState<string[]>([])
  const [comparisons, setComparisons] = useState<DashboardComparisons | null>(null)
  const [shopKPIs, setShopKPIs] = useState<ShopKPI[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [rev, prof, qty, stock, trendData, rollup, topData, currencyData, cmp, kpisByShop] = await Promise.all([
          getRevenue(),
          getProfit(),
          getSalesQuantity(),
          getStockValue(),
          getRevenueTrend(14),
          FetchShopRollup(firstOfMonthISO(), todayISO()),
          getTopProductsByShop(),
          fetchCurrency(),
          getDashboardComparisons(),
          getKPIsByShop(),
        ])
        setRevenue(rev)
        setProfit(prof)
        setSalesQty(qty)
        setStockValue(stock.totalValue)
        setTrend(trendData.points)
        setTrendShopNames(trendData.shopNames)
        setShopRows(rollup.rows)
        setTopProducts(topData.rows)
        setTopProductsShopNames(topData.shopNames)
        setShopKPIs(kpisByShop)
        if (currencyData?.currency) setCurrency(currencyData.currency)
        setComparisons(cmp)
        setLoading(false)
      } catch (err: any) {
        console.error('Head Office dashboard fetch error:', err)
        setError(`Failed to load dashboard: ${err?.message || err}`)
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="right-side" style={{ minHeight: '945px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa', color: '#8a90a3' }}>
        Loading Head Office dashboard...
      </div>
    )
  }
  if (error) {
    return (
      <div className="right-side" style={{ minHeight: '945px', padding: 24, background: '#f5f6fa' }}>
        <div className="alert alert-danger">{error}</div>
      </div>
    )
  }

  const activeShops = shopRows.filter(r => r.is_active)
  const totalSales = shopRows.reduce((s, r) => s + r.sales_total, 0)
  const totalPurchases = shopRows.reduce((s, r) => s + r.purchase_total, 0)

  const kpis = [
    { label: 'Total Revenue', value: `${currency}${revenue.toFixed(2)}`, badge: comparisons?.revenue.percentChange },
    { label: 'Total Profit', value: `${currency}${profit.toFixed(2)}`, badge: undefined },
    { label: 'Orders This Month', value: comparisons?.orders.current.toString() ?? salesQty.toString(), badge: comparisons?.orders.percentChange },
    { label: 'Stock Value', value: `${currency}${stockValue.toFixed(2)}`, badge: undefined },
  ]

  return (
    <div className="right-side" style={{ minHeight: '945px', background: '#f5f6fa', padding: 'clamp(14px, 3vw, 30px)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        .ho-grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .ho-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
        .ho-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ho-table th, .ho-table td { padding: 10px 8px; text-align: left; }
        @media (max-width: 480px) {
          .ho-table { font-size: 11px; }
          .ho-table th, .ho-table td { padding: 6px 4px; }
        }
      `}</style>

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ color: '#1a1d29', fontSize: 22, fontWeight: 700 }}>Network Overview</div>
          <div style={mutedText}>
            {activeShops.length} active franchise{activeShops.length !== 1 ? 's' : ''} · combined performance across the network
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="ho-grid-4" style={{ marginBottom: 16 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={card}>
            <div style={mutedText}>{kpi.label}</div>
            <div style={{ color: '#1a1d29', fontSize: 24, fontWeight: 700, margin: '6px 0 10px' }}>{kpi.value}</div>
            {kpi.badge !== undefined ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChangeBadge pct={kpi.badge} />
                <span style={{ ...mutedText, fontSize: 11 }}>vs last month</span>
              </div>
            ) : (
              <span style={{ ...mutedText, fontSize: 11 }}>current total</span>
            )}
          </div>
        ))}
      </div>

      {/* Per-franchise breakdown — the KPI cards above are network totals; this is where each franchise's own numbers live */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={sectionTitle}>Performance by Franchise</div>
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table className="table table-striped" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Franchise</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Profit</th>
                <th className="text-right">Sales</th>
                <th className="text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {shopKPIs.length > 0 ? shopKPIs.map((s) => (
                <tr key={s.shop_id}>
                  <td><strong>{s.shop_name}</strong> <span style={mutedText}>({s.shop_code})</span></td>
                  <td className="text-right">{currency} {s.revenue.toFixed(2)}</td>
                  <td className="text-right" style={{ color: s.profit >= 0 ? '#1a9c5c' : '#d9403a' }}>{currency} {s.profit.toFixed(2)}</td>
                  <td className="text-right">{s.sales_count}</td>
                  <td className="text-right">{currency} {s.stock_value.toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center">No franchise data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend + top products, both broken down by franchise */}
      <div className="ho-grid-2" style={{ marginBottom: 16 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={sectionTitle}>Revenue — Last 14 Days</div>
            <div style={mutedText}>By franchise</div>
          </div>
          {trendShopNames.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                <XAxis dataKey="date" stroke="#b0b4c2" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#b0b4c2" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {trendShopNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    name={name}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ ...mutedText, textAlign: 'center', paddingTop: 80 }}>No franchises yet</div>
          )}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={sectionTitle}>Top Products</div>
            <div style={mutedText}>By franchise</div>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" horizontal={false} />
                <XAxis type="number" stroke="#b0b4c2" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="product" stroke="#b0b4c2" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {topProductsShopNames.map((name, i) => (
                  <Bar key={name} dataKey={name} name={name} stackId="qty" fill={PIE_COLORS[i % PIE_COLORS.length]} radius={i === topProductsShopNames.length - 1 ? [0, 4, 4, 0] : undefined}>
                    <LabelList dataKey={name} position="inside" formatter={(v: number) => v > 0 ? v : ''} style={{ fontSize: 11, fill: '#fff', fontWeight: 700 }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ ...mutedText, textAlign: 'center', paddingTop: 80 }}>No sales data yet</div>
          )}
        </div>
      </div>

      {/* Per-franchise comparison */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
          <div style={sectionTitle}>Sales vs Purchases by Franchise (This Month)</div>
          <div style={mutedText}>
            Sales: {currency}{totalSales.toFixed(2)} &nbsp;·&nbsp; Purchases: {currency}{totalPurchases.toFixed(2)}
          </div>
        </div>
        {shopRows.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={shopRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="shop_name" stroke="#b0b4c2" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#b0b4c2" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sales_total" name="Sales" fill="#6366f1" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="sales_total" position="top" formatter={(v: number) => v.toFixed(0)} style={{ fontSize: 11, fill: '#6366f1', fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="purchase_total" name="Purchases" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="purchase_total" position="top" formatter={(v: number) => v.toFixed(0)} style={{ fontSize: 11, fill: '#f59e0b', fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ ...mutedText, textAlign: 'center', padding: 40 }}>No franchises registered yet</div>
        )}
      </div>

      {/* Franchise table */}
      <div style={{ ...card, overflowX: 'auto' }}>
        <div style={{ ...sectionTitle, marginBottom: 14 }}>All Franchises</div>
        <table className="ho-table">
          <thead>
            <tr style={{ color: '#8a90a3', borderBottom: '1px solid #eef0f5' }}>
              <th>Franchise</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Sales</th>
              <th style={{ textAlign: 'right' }}>Purchases</th>
              <th style={{ textAlign: 'right' }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {shopRows.map((r) => (
              <tr key={r.shop_id} style={{ borderBottom: '1px solid #f5f6fa', color: '#1a1d29' }}>
                <td>{r.shop_name} <span style={{ color: '#b0b4c2', fontSize: 11 }}>({r.shop_code})</span></td>
                <td>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                    background: r.is_active ? '#eafaf1' : '#f1f2f6',
                    color: r.is_active ? '#1a9c5c' : '#8a90a3',
                  }}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>{r.sales_count}</td>
                <td style={{ textAlign: 'right' }}>{currency}{r.sales_total.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{currency}{r.purchase_total.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: r.sales_total - r.purchase_total >= 0 ? '#1a9c5c' : '#d9403a' }}>
                  {currency}{(r.sales_total - r.purchase_total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
