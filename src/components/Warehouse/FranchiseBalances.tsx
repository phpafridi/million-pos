'use client'
import React, { useEffect, useState } from 'react'
import { FetchFranchiseBalances } from './actions/StockTransferActions'

type Balance = { shop_id: number; shop_name: string; shop_code: string; owes: number; owed: number; net: number }

export default function FranchiseBalances() {
  const [rows, setRows] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    FetchFranchiseBalances().then((data) => { setRows(data); setLoading(false) })
  }, [])

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Franchise Balances</a></li>
          <li><a href="#">Warehouse</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box-footer">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th className="active">Franchise</th>
                  <th className="active text-right">Owes (received stock, unpaid)</th>
                  <th className="active text-right">Owed (sent stock, unpaid)</th>
                  <th className="active text-right">Net Position</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((r) => (
                    <tr key={r.shop_id}>
                      <td>{r.shop_name} <small className="text-muted">({r.shop_code})</small></td>
                      <td className="text-right">{r.owes.toFixed(2)}</td>
                      <td className="text-right">{r.owed.toFixed(2)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: r.net >= 0 ? '#1a9c5c' : '#d9403a' }}>
                        {r.net.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="text-center"><strong>{loading ? 'Loading...' : 'No franchise balances yet.'}</strong></td></tr>
                )}
              </tbody>
            </table>
            <p className="text-muted" style={{ fontSize: 12 }}>
              &quot;Owes&quot; = stock this franchise has received via transfer but not fully paid for.
              &quot;Owed&quot; = stock this franchise has sent to others that hasn&apos;t been fully paid back yet.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
