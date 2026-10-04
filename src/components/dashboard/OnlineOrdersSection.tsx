'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { getOnlineOrderStats } from './actions/getOnlineOrderStats'
import type { OnlineOrderStats } from './actions/getOnlineOrderStats'

// Same look as the rest of the Head Office dashboard
const card: React.CSSProperties = {
  background: '#ffffff', borderRadius: 14, padding: '20px 22px',
  border: '1px solid #edf0f5', boxShadow: '0 1px 3px rgba(20,20,43,0.04)',
}
const sectionTitle: React.CSSProperties = { color: '#1a1d29', fontSize: 14, fontWeight: 700 }
const mutedText: React.CSSProperties = { color: '#8a90a3', fontSize: 12 }

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const STATUS_COLORS: Record<string, { bg: string; fg: string; bar: string }> = {
  pending:    { bg: '#fff6e5', fg: '#b7791f', bar: '#f59e0b' },
  processing: { bg: '#eef0ff', fg: '#4f46e5', bar: '#6366f1' },
  shipped:    { bg: '#e6f8fb', fg: '#0e7490', bar: '#06b6d4' },
  delivered:  { bg: '#eafaf1', fg: '#1a9c5c', bar: '#22c55e' },
  cancelled:  { bg: '#fdecea', fg: '#d9403a', bar: '#ef4444' },
}
const PAY_COLORS: Record<string, { bg: string; fg: string }> = {
  paid:     { bg: '#eafaf1', fg: '#1a9c5c' },
  pending:  { bg: '#fff6e5', fg: '#b7791f' },
  failed:   { bg: '#fdecea', fg: '#d9403a' },
  refunded: { bg: '#f1f2f6', fg: '#6b7280' },
}
const FALLBACK = { bg: '#f1f2f6', fg: '#6b7280', bar: '#9ca3af' }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const prettyMethod = (m: string) => (m.toLowerCase() === 'cod' ? 'Cash on Delivery' : cap(m))

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600, background: bg, color: fg }}>
      {label}
    </span>
  )
}

export default function OnlineOrdersSection({ currency }: { currency: string }) {
  const [stats, setStats] = useState<OnlineOrderStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    const res = await getOnlineOrderStats(force)
    if (res.ok) { setStats(res.data); setError('') } else { setError(res.error) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => `${currency}${n.toFixed(2)}`

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: '#1a1d29', fontSize: 18, fontWeight: 700 }}>eCommerce Website</div>
        <Pill label="Online" bg="#eef0ff" fg="#4f46e5" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {stats?.generated_at && !isNaN(new Date(stats.generated_at).getTime()) && (
          <span style={mutedText}>Updated {new Date(stats.generated_at).toLocaleString('en-PK')}</span>
        )}
        <button className="btn btn-default btn-xs" onClick={() => load(true)} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
    </div>
  )

  // First load, nothing to show yet
  if (!stats && loading) {
    return <div style={{ ...card, marginBottom: 16 }}>{header}<div style={{ ...mutedText, padding: '30px 0', textAlign: 'center' }}>Loading eCommerce data…</div></div>
  }

  // Failed and we have nothing to fall back on
  if (!stats) {
    return (
      <div style={{ ...card, marginBottom: 16 }}>
        {header}
        <div style={{ background: '#fff6e5', color: '#b7791f', borderRadius: 10, padding: '14px 16px', fontSize: 13 }}>
          eCommerce data is unavailable right now. {error}
        </div>
      </div>
    )
  }

  const t = stats.totals
  const statusKeys = [
    ...STATUS_ORDER.filter((s) => s in stats.orders_by_status),
    ...Object.keys(stats.orders_by_status).filter((s) => !STATUS_ORDER.includes(s)),
  ]
  const allOrdersCount = Math.max(statusKeys.reduce((sum, s) => sum + stats.orders_by_status[s].count, 0), 1)
  const methodKeys = Object.keys(stats.orders_by_payment_method)
  const payKeys = Object.keys(stats.orders_by_payment_status)

  const kpis = [
    { label: 'Total Orders', value: String(t.total_orders), sub: 'excluding cancelled' },
    { label: 'Net Sales', value: fmt(t.total_sales), sub: `after ${fmt(t.refunded_amount)} refunds` },
    { label: 'Gross Sales', value: fmt(t.gross_sales), sub: 'before refunds' },
    { label: 'Avg Order Value', value: fmt(t.average_order_value), sub: 'net sales ÷ orders' },
  ]
  const periods = [
    { label: 'Today', p: stats.periods.today },
    { label: 'Last 7 Days', p: stats.periods.last_7_days },
    { label: 'This Month', p: stats.periods.this_month },
  ]

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      {header}

      {error && (
        <div style={{ background: '#fff6e5', color: '#b7791f', borderRadius: 10, padding: '8px 14px', fontSize: 12, marginBottom: 14 }}>
          Showing the last loaded data — the latest refresh failed. {error}
        </div>
      )}

      {/* Headline numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ border: '1px solid #edf0f5', borderRadius: 12, padding: '14px 16px' }}>
            <div style={mutedText}>{k.label}</div>
            <div style={{ color: '#1a1d29', fontSize: 22, fontWeight: 700, margin: '4px 0 2px' }}>{k.value}</div>
            <div style={{ ...mutedText, fontSize: 11 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Rolling periods */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        {periods.map(({ label, p }) => (
          <div key={label} style={{ background: '#f8f9fc', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={mutedText}>{label}</div>
              <div style={{ color: '#1a1d29', fontSize: 18, fontWeight: 700 }}>{fmt(p.gross_sales)}</div>
            </div>
            <Pill label={`${p.orders} order${p.orders === 1 ? '' : 's'}`} bg="#ffffff" fg="#4f46e5" />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {/* Orders by status */}
        <div>
          <div style={{ ...sectionTitle, marginBottom: 8 }}>Orders by Status</div>
          <table className="table" style={{ marginBottom: 0 }}>
            <tbody>
              {statusKeys.map((s) => {
                const row = stats.orders_by_status[s]
                const c = STATUS_COLORS[s] ?? FALLBACK
                return (
                  <tr key={s}>
                    <td style={{ width: 110, verticalAlign: 'middle' }}><Pill label={cap(s)} bg={c.bg} fg={c.fg} /></td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ background: '#f1f2f6', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${(row.count / allOrdersCount) * 100}%`, background: c.bar, height: 6, borderRadius: 4 }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', width: 50, verticalAlign: 'middle', fontWeight: 700 }}>{row.count}</td>
                    <td style={{ textAlign: 'right', width: 110, verticalAlign: 'middle', color: '#6b7280' }}>{fmt(row.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Payments */}
        <div>
          <div style={{ ...sectionTitle, marginBottom: 8 }}>Payments</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {payKeys.map((k) => {
              const c = PAY_COLORS[k] ?? FALLBACK
              return <Pill key={k} label={`${cap(k)}: ${stats.orders_by_payment_status[k]}`} bg={c.bg} fg={c.fg} />
            })}
          </div>
          {methodKeys.length > 0 ? (
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr style={mutedText}>
                  <th>Method</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {methodKeys.map((m) => (
                  <tr key={m}>
                    <td>{prettyMethod(m)}</td>
                    <td style={{ textAlign: 'right' }}>{stats.orders_by_payment_method[m].count}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(stats.orders_by_payment_method[m].amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={mutedText}>No paid-method data yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
