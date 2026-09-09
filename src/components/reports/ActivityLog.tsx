'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchActivityLog } from './actions/FetchActivityLog'
import type { ActivityLogRow } from '@/lib/auditLog'

const ACTION_LABELS: Record<string, string> = {
  'sale.create': 'Sale',
  'refund.process': 'Refund',
  'exchange.process': 'Exchange',
  'order.cancel': 'Order Cancelled',
  'damage.record': 'Damage / Write-off',
  'ledger.transaction': 'Ledger Transaction',
  'user.create': 'Staff Created',
  'user.delete': 'Staff Deleted',
}

const ACTION_COLORS: Record<string, string> = {
  'sale.create': 'label-success',
  'refund.process': 'label-danger',
  'exchange.process': 'label-info',
  'order.cancel': 'label-warning',
  'damage.record': 'label-warning',
  'ledger.transaction': 'label-primary',
  'user.create': 'label-default',
  'user.delete': 'label-danger',
}

export default function ActivityLog() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)

  const [rows, setRows] = useState<ActivityLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await FetchActivityLog({
        action: action || undefined,
        userEmail: userEmail || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Activity Log</a></li>
          <li><a href="#">{isSuperAdmin ? 'Head Office' : 'Settings'}</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          {!isSuperAdmin && (
            <div className="alert alert-info text-center">
              You're viewing activity for your own franchise. Head Office sees every franchise's activity here.
            </div>
          )}

          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Filters</h3>
                </div>
                <div className="box-background" style={{ padding: 16 }}>
                  <div className="row">
                    <div className="col-md-3">
                      <div className="form-group">
                        <label>Action</label>
                        <select className="form-control" value={action} onChange={(e) => setAction(e.target.value)}>
                          <option value="">All actions</option>
                          {Object.entries(ACTION_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group">
                        <label>Staff Email Contains</label>
                        <input type="text" className="form-control" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="e.g. staff@shop.com" />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="form-group">
                        <label>From</label>
                        <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="form-group">
                        <label>To</label>
                        <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-2" style={{ marginTop: 24 }}>
                      <button className="btn bg-navy btn-flat" onClick={load} disabled={loading}>
                        {loading ? 'Loading...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="box-footer">
            <div className="row">
              <div className="col-md-12">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th className="active">Time</th>
                      {isSuperAdmin && <th className="active">Franchise</th>}
                      <th className="active">Staff</th>
                      <th className="active">Action</th>
                      <th className="active">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? (
                      rows.map((r) => (
                        <tr key={r.log_id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td>
                          {isSuperAdmin && <td>{r.shop_name || '—'}</td>}
                          <td>{r.user_name}<br /><small className="text-muted">{r.user_email}</small></td>
                          <td>
                            <span className={`label ${ACTION_COLORS[r.action] || 'label-default'}`}>
                              {ACTION_LABELS[r.action] || r.action}
                            </span>
                          </td>
                          <td>{r.description}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isSuperAdmin ? 5 : 4} className="text-center">
                          <strong>{loading ? 'Loading...' : 'No activity found for these filters.'}</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <p className="text-muted text-center">Showing the most recent 200 matching entries.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
