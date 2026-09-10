'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchLoyaltyRedemptions } from './actions/FetchLoyaltyRedemptions'

function firstOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function LoyaltyRedemptionsReport() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [data, setData] = useState<Awaited<ReturnType<typeof FetchLoyaltyRedemptions>> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const result = await FetchLoyaltyRedemptions(startDate, endDate)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Loyalty Redemptions</a></li>
          <li><a href="#">Report</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Date Range</h3>
            </div>
            <div className="box-background" style={{ padding: 16 }}>
              <div className="row">
                <div className="col-sm-4">
                  <label>From</label>
                  <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="col-sm-4">
                  <label>To</label>
                  <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="col-sm-4">
                  <label>&nbsp;</label>
                  <button className="btn bg-navy btn-flat form-control" onClick={load} disabled={loading}>
                    {loading ? 'Loading...' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {data && (
            <>
              <div className="row">
                <div className="col-md-4">
                  <div className="small-box bg-aqua">
                    <div className="inner"><h3>{data.redemptions.length}</h3><p>Redemptions in Range</p></div>
                    <div className="icon"><i className="fa fa-id-card"></i></div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="small-box" style={{ background: '#b8860b', color: '#fff' }}>
                    <div className="inner"><h3>{data.totalPointsRedeemed}</h3><p>Total Points Redeemed</p></div>
                    <div className="icon"><i className="fa fa-star"></i></div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="small-box bg-red">
                    <div className="inner"><h3>{data.totalDiscountGiven.toFixed(2)}</h3><p>Total Discount Given</p></div>
                    <div className="icon"><i className="fa fa-money"></i></div>
                  </div>
                </div>
              </div>

              {isSuperAdmin && data.byShop.length > 0 && (
                <div className="box box-primary">
                  <div className="box-header box-header-background with-border">
                    <h3 className="box-title">By Franchise</h3>
                  </div>
                  <div className="box-background">
                    <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th className="active">Franchise</th>
                          <th className="active text-right">Redemptions</th>
                          <th className="active text-right">Points Redeemed</th>
                          <th className="active text-right">Discount Given</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byShop.map((s) => (
                          <tr key={s.shop_name}>
                            <td><strong>{s.shop_name}</strong></td>
                            <td className="text-right">{s.redemption_count}</td>
                            <td className="text-right">{s.points_redeemed}</td>
                            <td className="text-right">{s.discount_given.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Redemptions</h3>
                </div>
                <div className="box-background">
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th className="active">Order #</th>
                          <th className="active">Date</th>
                          <th className="active">Customer</th>
                          {isSuperAdmin && <th className="active">Franchise</th>}
                          <th className="active">Cashier</th>
                          <th className="active text-right">Points</th>
                          <th className="active text-right">Discount</th>
                          <th className="active text-right">Order Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.redemptions.length > 0 ? data.redemptions.map((r) => (
                          <tr key={r.order_id}>
                            <td>{r.order_number || '—'}</td>
                            <td>{new Date(r.order_date).toLocaleDateString()}</td>
                            <td>{r.customer_name}<br /><small className="text-muted">{r.phone}</small></td>
                            {isSuperAdmin && <td style={{ fontSize: 12, color: '#4b5563' }}>{r.shop_name}</td>}
                            <td>{r.sales_person}</td>
                            <td className="text-right" style={{ color: '#b8860b', fontWeight: 700 }}>{r.points_redeemed}</td>
                            <td className="text-right">{r.discount_amount.toFixed(2)}</td>
                            <td className="text-right"><strong>{r.grand_total.toFixed(2)}</strong></td>
                          </tr>
                        )) : (
                          <tr><td colSpan={isSuperAdmin ? 8 : 7} className="text-center"><strong>No redemptions in this range.</strong></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
