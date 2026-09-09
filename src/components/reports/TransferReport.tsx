'use client'
import React, { useEffect, useState } from 'react'
import { FetchTransfers } from '../Warehouse/actions/StockTransferActions'

const STATUS_BADGE: Record<string, string> = {
  pending: 'label-warning',
  received: 'label-success',
  cancelled: 'label-danger',
}

export default function TransferReport() {
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    FetchTransfers('all').then((data) => { setTransfers(data); setLoading(false) })
  }, [])

  const totalValue = transfers.reduce((s, t) => s + t.total_amount, 0)
  const totalOutstanding = transfers.reduce((s, t) => s + t.balance, 0)

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Transfer Report</a></li>
          <li><a href="#">Reports</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col-sm-4">
              <div className="box box-primary text-center" style={{ padding: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{transfers.length}</div>
                <div className="text-muted">Total Transfers (Network-wide)</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="box box-primary text-center" style={{ padding: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{totalValue.toFixed(2)}</div>
                <div className="text-muted">Total Value Transferred</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="box box-primary text-center" style={{ padding: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: totalOutstanding > 0 ? '#d9403a' : '#1a9c5c' }}>{totalOutstanding.toFixed(2)}</div>
                <div className="text-muted">Total Outstanding Balance</div>
              </div>
            </div>
          </div>

          <div className="box-footer">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th className="active">Transfer #</th>
                  <th className="active">From (Warehouse)</th>
                  <th className="active">To (Franchise)</th>
                  <th className="active">Sent</th>
                  <th className="active">Total</th>
                  <th className="active">Balance</th>
                  <th className="active">Status</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length > 0 ? (
                  transfers.map((t) => (
                    <tr key={t.transfer_id}>
                      <td><strong>{t.transfer_number}</strong></td>
                      <td>{t.from_shop.shop_name}</td>
                      <td>{t.to_shop.shop_name}</td>
                      <td>{new Date(t.sent_date).toLocaleDateString()}</td>
                      <td>{t.total_amount.toFixed(2)}</td>
                      <td>{t.balance.toFixed(2)}</td>
                      <td><span className={`label ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center"><strong>{loading ? 'Loading...' : 'No transfers yet across the network.'}</strong></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
