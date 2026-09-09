'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { FetchTailorOrders, FetchTailorOrderById, UpdateTailorOrderStatus } from './actions/TailorActions'
import TailorOrderSlip from './TailorOrderSlip'
import { hasPermission } from '@/lib/clientPermissions'

type OrderRow = {
  tailor_order_id: number
  order_number: string
  garment_type: string
  quantity: number
  price: number
  advance_paid: number
  status: string
  status_label: string
  order_date: string
  promised_date: string | null
  delivery_method: string | null
  tailor_customer: { customer_name: string; phone: string; tailor_customer_id: number }
  shop?: { shop_name: string }
}

const STATUS_OPTIONS = [
  { value: 'received', label: 'Received' },
  { value: 'in_process', label: 'In Process' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_BADGE: Record<string, string> = {
  received: 'label-default',
  in_process: 'label-warning',
  ready: 'label-info',
  delivered: 'label-success',
  cancelled: 'label-danger',
}

export default function ManageTailorOrders() {
  const { data: session } = useSession()
  const changedBy = session?.user?.name || session?.user?.email || 'Staff'
  const canView = hasPermission(session, 'action:view-tailor-order', 'view')
  const canUpdateStatus = hasPermission(session, 'action:update-tailor-status')
  const canPrint = hasPermission(session, 'action:print-tailor-slip', 'view')

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [activeOrder, setActiveOrder] = useState<any | null>(null)
  const [slipOrder, setSlipOrder] = useState<any | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [riderName, setRiderName] = useState('')
  const [trackingNote, setTrackingNote] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await FetchTailorOrders({ status: statusFilter || undefined, search: search || undefined })
      setOrders(data as OrderRow[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openOrder = async (id: number) => {
    const detail = await FetchTailorOrderById(id)
    if (detail) {
      setActiveOrder(detail)
      setNewStatus(detail.status)
      setNote('')
      setRiderName(detail.rider_name || '')
      setTrackingNote(detail.tracking_note || '')
    }
  }

  const printSlip = async (id: number) => {
    const detail = await FetchTailorOrderById(id)
    if (detail) setSlipOrder(detail)
  }

  const handleUpdate = async () => {
    if (!activeOrder) return
    setUpdating(true)
    try {
      await UpdateTailorOrderStatus({
        tailor_order_id: activeOrder.tailor_order_id,
        status: newStatus as any,
        changed_by: changedBy,
        note,
        rider_name: riderName || undefined,
        tracking_note: trackingNote || undefined,
      })
      toast.success('Order updated')
      setActiveOrder(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Tailor Orders</a></li>
          <li><a href="#">Tailor</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Filters</h3>
            </div>
            <div className="box-background" style={{ padding: 16 }}>
              <div className="row">
                <div className="col-md-3">
                  <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <input type="text" className="form-control" placeholder="Search order #, customer name, or phone"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <button className="btn bg-navy btn-flat" onClick={load} disabled={loading}>
                    {loading ? 'Loading...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="box-footer">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th className="active">Order #</th>
                  <th className="active">Customer</th>
                  <th className="active">Garment</th>
                  <th className="active">Promised</th>
                  <th className="active">Balance</th>
                  <th className="active">Status</th>
                  <th className="active">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((o) => (
                    <tr key={o.tailor_order_id}>
                      <td><strong>{o.order_number}</strong></td>
                      <td>
                        <Link href={`/dashboard/customer/profile/${o.tailor_customer.tailor_customer_id}`} target="_blank">
                          {o.tailor_customer.customer_name}
                        </Link>
                        <br /><small className="text-muted">{o.tailor_customer.phone}</small>
                      </td>
                      <td>{o.garment_type} x{o.quantity}</td>
                      <td>{o.promised_date ? new Date(o.promised_date).toLocaleDateString() : '—'}</td>
                      <td>{(o.price - o.advance_paid).toFixed(2)}</td>
                      <td><span className={`label ${STATUS_BADGE[o.status]}`}>{o.status_label}</span></td>
                      <td>
                        {canView ? (
                          <Link href={`/dashboard/tailor/orders/${o.tailor_order_id}`}>
                            <button className="btn btn-xs bg-navy" title="View Full Details">
                              <i className="fa fa-eye"></i>
                            </button>
                          </Link>
                        ) : (
                          <button className="btn btn-xs btn-default" disabled title="No permission to view order details">
                            <i className="fa fa-lock"></i>
                          </button>
                        )}{' '}
                        {canUpdateStatus && (
                          <button className="btn btn-xs btn-default" onClick={() => openOrder(o.tailor_order_id)}>
                            Manage
                          </button>
                        )}{' '}
                        {canPrint && (
                          <button className="btn btn-xs btn-default" onClick={() => printSlip(o.tailor_order_id)}>
                            <i className="fa fa-print"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center"><strong>{loading ? 'Loading...' : 'No orders found.'}</strong></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {activeOrder && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveOrder(null) }}>
          <div className="modal-dialog" style={{ marginTop: 40 }}>
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveOrder(null)}>&times;</button>
                <h4 className="modal-title">
                  Order {activeOrder.order_number}
                  {' '}
                  <Link href={`/dashboard/tailor/orders/${activeOrder.tailor_order_id}`} target="_blank" style={{ fontSize: 12 }}>
                    <i className="fa fa-external-link"></i> Full Details
                  </Link>
                </h4>
              </div>
              <div className="modal-body">
                <p>
                  <strong>{activeOrder.tailor_customer.customer_name}</strong> — {activeOrder.tailor_customer.phone}
                  {' '}
                  <Link href={`/dashboard/customer/profile/${activeOrder.tailor_customer.tailor_customer_id}`} target="_blank" style={{ fontSize: 12 }}>
                    <i className="fa fa-external-link"></i> Full profile &amp; measurements
                  </Link>
                  <br />
                  {activeOrder.garment_type} x{activeOrder.quantity} — Price {Number(activeOrder.price).toFixed(2)}, Advance {Number(activeOrder.advance_paid).toFixed(2)}
                </p>

                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Note (optional)</label>
                  <input type="text" className="form-control" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                {(newStatus === 'ready' || newStatus === 'delivered') && activeOrder.delivery_method === 'home_delivery' && (
                  <>
                    <div className="form-group">
                      <label>Rider Name</label>
                      <input type="text" className="form-control" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Tracking Note (courier #, instructions, etc.)</label>
                      <input type="text" className="form-control" value={trackingNote} onChange={(e) => setTrackingNote(e.target.value)} />
                    </div>
                  </>
                )}

                <hr />
                <label><strong>History</strong></label>
                <ul className="list-unstyled">
                  {activeOrder.status_history?.map((h: any) => (
                    <li key={h.status_log_id} style={{ marginBottom: 4 }}>
                      <span className={`label ${STATUS_BADGE[h.status]}`}>{h.status}</span>{' '}
                      <small>{new Date(h.changed_at).toLocaleString()} by {h.changed_by}{h.note ? ` — ${h.note}` : ''}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button className="btn btn-default" onClick={() => setActiveOrder(null)}>Close</button>
                <button className="btn bg-navy" onClick={handleUpdate} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {slipOrder && (
        <TailorOrderSlip order={slipOrder} onClose={() => setSlipOrder(null)} />
      )}
    </div>
  )
}
