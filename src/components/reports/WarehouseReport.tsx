'use client'
import React, { useEffect, useState } from 'react'
import { getWarehouseReport, WarehouseReportRow } from './actions/getWarehouseReport'

export default function WarehouseReport() {
  const [rows, setRows] = useState<WarehouseReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWarehouseReport().then((data) => { setRows(data); setLoading(false) })
  }, [])

  const totals = rows.reduce((acc, r) => ({
    purchases: acc.purchases + r.purchase_total,
    stock: acc.stock + r.stock_value,
    transfersValue: acc.transfersValue + r.transfers_sent_value,
  }), { purchases: 0, stock: 0, transfersValue: 0 })

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Warehouse Report</a></li>
          <li><a href="#">Reports</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col-sm-4">
              <div className="box box-primary text-center" style={{ padding: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{rows.length}</div>
                <div className="text-muted">Active Warehouses</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="box box-primary text-center" style={{ padding: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{totals.purchases.toFixed(2)}</div>
                <div className="text-muted">Total Purchased from Suppliers</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="box box-primary text-center" style={{ padding: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{totals.stock.toFixed(2)}</div>
                <div className="text-muted">Total Stock Value Held</div>
              </div>
            </div>
          </div>

          <div className="box-footer">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th className="active">Warehouse</th>
                  <th className="active">Purchases (Count)</th>
                  <th className="active">Purchases (Value)</th>
                  <th className="active">Stock Value on Hand</th>
                  <th className="active">Transfers Sent (Count)</th>
                  <th className="active">Transfers Sent (Value)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((r) => (
                    <tr key={r.shop_id}>
                      <td><strong>{r.shop_name}</strong> <span className="text-muted">({r.shop_code})</span></td>
                      <td>{r.purchase_count}</td>
                      <td>{r.purchase_total.toFixed(2)}</td>
                      <td>{r.stock_value.toFixed(2)}</td>
                      <td>{r.transfers_sent}</td>
                      <td>{r.transfers_sent_value.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center"><strong>{loading ? 'Loading...' : 'No warehouses registered yet.'}</strong></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
