'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  FetchTransfers, FetchTransferById, ReceiveStockTransfer, CancelStockTransfer, RecordTransferPayment, LogDamageReturnReceipt,
} from './actions/StockTransferActions'
import TransferInvoice from './TransferInvoice'
import { hasPermission } from '@/lib/clientPermissions'

const STATUS_BADGE: Record<string, string> = {
  pending: 'label-warning',
  received: 'label-success',
  cancelled: 'label-danger',
}

export default function ManageStockTransfers() {
  const { data: session } = useSession()
  const actingUser = session?.user?.name || session?.user?.email || 'Staff'
  const isWarehouseShop = Boolean((session?.user as any)?.is_warehouse)
  const canView = hasPermission(session, 'action:view-transfer', 'view')
  const canManageStatus = hasPermission(session, 'action:manage-transfer-status')
  const canRecordPayment = hasPermission(session, 'action:record-transfer-payment')

  const [direction, setDirection] = useState<'all' | 'incoming' | 'outgoing'>('all')
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTransfer, setActiveTransfer] = useState<any | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [busy, setBusy] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setTransfers(await FetchTransfers(direction))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [direction]) // eslint-disable-line react-hooks/exhaustive-deps

  const openTransfer = async (id: number) => {
    const detail = await FetchTransferById(id)
    setActiveTransfer(detail)
    setPaymentAmount('')
  }

  const handleReceive = async (id: number) => {
    if (!confirm('Confirm this delivery as received? This only marks it delivered for billing — the franchise still needs to record the stock as their own incoming stock separately.')) return
    setBusy(true)
    try {
      await ReceiveStockTransfer(id, actingUser)
      toast.success('Transfer marked as delivered')
      setActiveTransfer(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive transfer')
    } finally {
      setBusy(false)
    }
  }

  const handleLogDamage = async (id: number) => {
    if (!confirm('Log these items as damaged stock received? This records them in your damage report — only do this after actually inspecting what arrived.')) return
    setBusy(true)
    try {
      await LogDamageReturnReceipt(id, actingUser)
      toast.success('Damage receipt logged')
      setActiveTransfer(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to log damage receipt')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this transfer? Stock will be restored to the sender.')) return
    setBusy(true)
    try {
      await CancelStockTransfer(id, actingUser)
      toast.success('Transfer cancelled')
      setActiveTransfer(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel transfer')
    } finally {
      setBusy(false)
    }
  }

  const handlePayment = async () => {
    if (!activeTransfer || !paymentAmount) return
    setBusy(true)
    try {
      await RecordTransferPayment({
        transfer_id: activeTransfer.transfer_id,
        amount: Number(paymentAmount),
        method: paymentMethod,
        recorded_by: actingUser,
      })
      toast.success('Payment recorded')
      const refreshed = await FetchTransferById(activeTransfer.transfer_id)
      setActiveTransfer(refreshed)
      setPaymentAmount('')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Manage Transfers</a></li>
          <li><a href="#">Warehouse</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Filter</h3>
            </div>
            <div className="box-background" style={{ padding: 16 }}>
              <select className="form-control" style={{ maxWidth: 240 }} value={direction} onChange={(e) => setDirection(e.target.value as any)}>
                <option value="all">All Transfers</option>
                <option value="incoming">Incoming (sent to me)</option>
                <option value="outgoing">Outgoing (sent by me)</option>
              </select>
            </div>
          </div>

          <div className="box-footer">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th className="active">Transfer #</th>
                  <th className="active">From</th>
                  <th className="active">To</th>
                  <th className="active">Total</th>
                  <th className="active">Balance</th>
                  <th className="active">Status</th>
                  <th className="active">Action</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length > 0 ? (
                  transfers.map((t) => (
                    <tr key={t.transfer_id}>
                      <td><strong>{t.transfer_number}</strong></td>
                      <td>{t.from_shop.shop_name}</td>
                      <td>{t.to_shop.shop_name}</td>
                      <td>{t.total_amount.toFixed(2)}</td>
                      <td>{t.balance.toFixed(2)}</td>
                      <td><span className={`label ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                      <td>
                        {canView ? (
                          <button className="btn btn-xs btn-default" onClick={() => openTransfer(t.transfer_id)}>View</button>
                        ) : (
                          <button className="btn btn-xs btn-default" disabled title="No permission to view transfer details"><i className="fa fa-lock"></i></button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center"><strong>{loading ? 'Loading...' : 'No transfers found.'}</strong></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {activeTransfer && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveTransfer(null) }}>
          <div className="modal-dialog" style={{ marginTop: 30, width: 520 }}>
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveTransfer(null)}>&times;</button>
                <h4 className="modal-title">Transfer {activeTransfer.transfer_number}</h4>
              </div>
              <div className="modal-body">
                <p>
                  <strong>{activeTransfer.from_shop.shop_name}</strong> → <strong>{activeTransfer.to_shop.shop_name}</strong><br />
                  <span className={`label ${STATUS_BADGE[activeTransfer.status]}`}>{activeTransfer.status}</span>{' '}
                  <small className="text-muted">sent {new Date(activeTransfer.sent_date).toLocaleDateString()}</small>
                </p>

                <table className="table table-bordered">
                  <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {activeTransfer.items.map((i: any) => (
                      <tr key={i.transfer_item_id}>
                        <td>{i.product_name}</td>
                        <td>{i.quantity}</td>
                        <td>{i.unit_price.toFixed(2)}</td>
                        <td>{i.sub_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table className="table" style={{ marginBottom: 0 }}>
                  <tbody>
                    <tr><td>Total</td><td className="text-right"><strong>{activeTransfer.total_amount.toFixed(2)}</strong></td></tr>
                    <tr><td>Paid</td><td className="text-right">{activeTransfer.amount_paid.toFixed(2)}</td></tr>
                    <tr><td><strong>Balance</strong></td><td className="text-right"><strong>{activeTransfer.balance.toFixed(2)}</strong></td></tr>
                  </tbody>
                </table>

                {activeTransfer.notes && <p><strong>Notes:</strong> {activeTransfer.notes}</p>}

                {activeTransfer.balance > 0 && canRecordPayment && (
                  <>
                    <hr />
                    <label><strong>Record Payment</strong></label>
                    <div className="row">
                      <div className="col-xs-5">
                        <input type="number" step="0.01" className="form-control" placeholder="Amount"
                          value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                      </div>
                      <div className="col-xs-4">
                        <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="easypaisa">Easypaisa</option>
                          <option value="jazzcash">JazzCash</option>
                        </select>
                      </div>
                      <div className="col-xs-3">
                        <button className="btn bg-navy btn-block" onClick={handlePayment} disabled={busy}>Pay</button>
                      </div>
                    </div>
                  </>
                )}

                {activeTransfer.payments && activeTransfer.payments.length > 0 && (
                  <>
                    <hr />
                    <label><strong>Payment History</strong></label>
                    <ul className="list-unstyled">
                      {activeTransfer.payments.map((p: any) => (
                        <li key={p.payment_id}>{new Date(p.paid_at).toLocaleDateString()} — {p.amount.toFixed(2)} ({p.method}) by {p.recorded_by}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {activeTransfer.status === 'pending' && canManageStatus && (
                  <>
                    <button className="btn btn-danger" onClick={() => handleCancel(activeTransfer.transfer_id)} disabled={busy}>Cancel Transfer</button>
                    <button className="btn btn-success" onClick={() => handleReceive(activeTransfer.transfer_id)} disabled={busy}>Mark as Delivered</button>
                  </>
                )}
                {activeTransfer.status === 'received' && activeTransfer.transfer_type === 'damage_return' && isWarehouseShop && !activeTransfer.damage_logged && (
                  <button className="btn btn-warning" onClick={() => handleLogDamage(activeTransfer.transfer_id)} disabled={busy}>
                    <i className="fa fa-exclamation-triangle"></i> Log Damage Receipt
                  </button>
                )}
                <button className="btn btn-default" onClick={() => setShowInvoice(true)}>Print Invoice</button>
                <button className="btn btn-default" onClick={() => setActiveTransfer(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoice && activeTransfer && (
        <TransferInvoice transfer={activeTransfer} onClose={() => setShowInvoice(false)} />
      )}
    </div>
  )
}
