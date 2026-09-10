'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { FetchTailorOrderById, RecordTailorPayment, UpdateTailorOrderStatus } from './actions/TailorActions'
import { toast } from 'sonner'
import TailorOrderSlip from './TailorOrderSlip'
import { STYLE_ICONS, GenericTag } from './icons/StyleIcons'
import { hasPermission } from '@/lib/clientPermissions'
import { formatAsFraction } from '@/lib/formatMeasurement'
import PhotoPicker from '../shared/PhotoPicker'
import PhotoGallery from '../shared/PhotoGallery'
import { UploadEntityPhotos, FetchEntityPhotos } from '@/lib/entityPhotos'
import PrintReceipt from '../Print/PrintReceipt'

const STATUS_BADGE: Record<string, string> = {
  received: 'label-default',
  in_process: 'label-warning',
  ready: 'label-info',
  delivered: 'label-success',
  cancelled: 'label-danger',
}

const MEASUREMENT_ROWS: { key: string; label: string }[] = [
  { key: 'measurement_length', label: 'Length (Qad)' },
  { key: 'measurement_teera', label: 'Armhole (Teera)' },
  { key: 'measurement_chest', label: 'Chest (Seena)' },
  { key: 'measurement_waist', label: 'Waist (Kamar)' },
  { key: 'measurement_hip', label: 'Hip' },
  { key: 'measurement_shoulder', label: 'Shoulder (Shana)' },
  { key: 'measurement_sleeve_length', label: 'Sleeve Length (Bazu)' },
  { key: 'measurement_sleeve_round', label: 'Sleeve Round (Gol Bazu)' },
  { key: 'measurement_neck', label: 'Collar (Kalar)' },
  { key: 'measurement_daman', label: 'Hem Width (Daman)' },
  { key: 'measurement_shalwar_length', label: 'Shalwar Length' },
  { key: 'measurement_bottom', label: 'Ankle Opening (Paincha)' },
]

function styleIconFor(group: string, value: string | null) {
  if (!value || value === 'none') return null
  return (STYLE_ICONS as any)[group]?.[value] || GenericTag
}

export default function TailorOrderDetail({ tailorOrderId }: { tailorOrderId: number }) {
  const { data: session } = useSession()
  const canView = hasPermission(session, 'action:view-tailor-order', 'view')
  const canUpdateStatus = hasPermission(session, 'action:update-tailor-status')
  const canRecordPayment = hasPermission(session, 'action:record-tailor-payment')
  const [order, setOrder] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSlip, setShowSlip] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = () => {
    FetchTailorOrderById(tailorOrderId)
      .then((data) => {
        setOrder(data)
        if (data) setNewStatus(data.status)
      })
      .catch((err) => {
        console.error('Failed to load tailor order:', err)
        setLoadError(err?.message || 'Failed to load this order.')
      })
      .finally(() => setLoading(false))
    FetchEntityPhotos('tailor_order', tailorOrderId).then(setPhotos).catch(() => {})
  }

  useEffect(() => {
    load()
  }, [tailorOrderId])

  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [changingStatus, setChangingStatus] = useState(false)

  const handleStatusChange = async () => {
    if (!newStatus) return
    setChangingStatus(true)
    try {
      await UpdateTailorOrderStatus({
        tailor_order_id: tailorOrderId,
        status: newStatus as any,
        changed_by: session?.user?.name || session?.user?.email || 'Staff',
        note: statusNote || undefined,
      })
      toast.success('Order status updated')
      setStatusNote('')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleRecordPayment = async () => {
    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }
    setRecordingPayment(true)
    try {
      await RecordTailorPayment({
        tailor_order_id: tailorOrderId,
        amount,
        recorded_by: session?.user?.name || session?.user?.email || 'Staff',
      })
      toast.success(`Payment of ${amount.toFixed(2)} recorded`)
      setPaymentAmount('')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  if (loading) {
    return <div className="right-side" style={{ minHeight: '945px' }}><p className="text-center" style={{ marginTop: 40 }}>Loading order...</p></div>
  }

  if (loadError) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="alert alert-danger" style={{ margin: 24 }}>
          <strong>Couldn&apos;t load this order:</strong> {loadError}
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="alert alert-danger" style={{ margin: 24 }}>Order not found, or belongs to another franchise.</div>
      </div>
    )
  }

  if (session && !canView) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="alert alert-danger" style={{ margin: 24 }}>
          <i className="fa fa-lock" style={{ marginRight: 8 }} />
          You don&apos;t have permission to view tailor order details. Ask your admin to grant &quot;View Tailor Order Detail&quot; access.
        </div>
      </div>
    )
  }

  const balance = order.price - order.advance_paid
  const checkedOptions = Object.entries(order.style_options || {}).filter(([, v]) => v)

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><Link href="/dashboard/tailor/orders">Manage Tailor Orders</Link></li>
          <li><a href="#">{order.order_number}</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-8">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="box-title">{order.order_number}</h3>
                  <span className={`label ${STATUS_BADGE[order.status] || 'label-default'}`} style={{ fontSize: 13 }}>{order.status_label}</span>
                </div>
                <div className="box-background" style={{ padding: 18 }}>
                  <div className="row">
                    <div className="col-sm-6">
                      <p><strong>Garment:</strong> {order.garment_type} x{order.quantity}</p>
                      {order.fabric_details && <p><strong>Fabric:</strong> {order.fabric_details}</p>}
                      {order.design_number && <p><strong>Design #:</strong> {order.design_number}</p>}
                      {(order.size_1 || order.size_2) && <p><strong>Size:</strong> {[order.size_1, order.size_2].filter(Boolean).join(' / ')}</p>}
                    </div>
                    <div className="col-sm-6">
                      <p><strong>Order Date:</strong> {new Date(order.order_date).toLocaleDateString()}</p>
                      <p><strong>Promised Date:</strong> {order.promised_date ? new Date(order.promised_date).toLocaleDateString() : '—'}</p>
                      <p><strong>Taken By:</strong> {order.taken_by}</p>
                      {order.delivery_method && <p><strong>Delivery:</strong> {order.delivery_method === 'home_delivery' ? 'Home Delivery' : 'Pickup'}</p>}
                      {order.delivery_method === 'home_delivery' && (
                        <div style={{ background: '#fffaf0', border: '1px solid #fde3ac', borderRadius: 6, padding: '8px 12px', marginTop: 6 }}>
                          <p style={{ margin: 0 }}><strong>Delivery Address:</strong> {order.delivery_address || <span className="text-muted">Not provided</span>}</p>
                          <p style={{ margin: 0 }}><strong>Delivery Phone:</strong> {order.delivery_phone || <span className="text-muted">Not provided</span>}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(order.pocket_style || order.collar_style || order.collar_cut || order.qurta_style || checkedOptions.length > 0) && (
                    <>
                      <hr />
                      <label><strong>Style</strong></label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                        {[
                          ['pocket_style', order.pocket_style],
                          ['collar_style', order.collar_style],
                          ['collar_cut', order.collar_cut],
                          ['qurta_style', order.qurta_style],
                        ].map(([group, value]) => {
                          const Icon = styleIconFor(group as string, value as string)
                          if (!Icon) return null
                          return (
                            <div key={group as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 60 }}>
                              <div style={{ width: 36, height: 36 }}><Icon /></div>
                              <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'capitalize', textAlign: 'center' }}>{String(value).replace(/_/g, ' ')}</span>
                            </div>
                          )
                        })}
                      </div>
                      {checkedOptions.length > 0 && (
                        <p style={{ marginTop: 10, fontSize: 13 }}>
                          <strong>Extras:</strong> {checkedOptions.map(([k]) => k.replace(/_/g, ' ')).join(', ')}
                        </p>
                      )}
                    </>
                  )}

                  {order.notes && (
                    <>
                      <hr />
                      <p><strong>Notes:</strong> {order.notes}</p>
                    </>
                  )}

                  <hr />
                  <label><strong>Photos</strong></label>
                  <div style={{ marginTop: 8, marginBottom: 12 }}>
                    <PhotoGallery
                      photos={photos}
                      canDelete={canUpdateStatus}
                      onDeleted={(id) => setPhotos((prev) => prev.filter((p) => p.photo_id !== id))}
                    />
                  </div>
                  {canUpdateStatus && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <PhotoPicker files={newPhotoFiles} onChange={setNewPhotoFiles} label="Add more photos" />
                      </div>
                      {newPhotoFiles.length > 0 && (
                        <button
                          className="btn bg-navy btn-flat"
                          disabled={uploadingPhotos}
                          onClick={async () => {
                            setUploadingPhotos(true)
                            try {
                              await UploadEntityPhotos('tailor_order', tailorOrderId, newPhotoFiles, session?.user?.name || session?.user?.email || 'Staff')
                              toast.success('Photos uploaded')
                              setNewPhotoFiles([])
                              FetchEntityPhotos('tailor_order', tailorOrderId).then(setPhotos)
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to upload photos')
                            } finally {
                              setUploadingPhotos(false)
                            }
                          }}
                        >
                          {uploadingPhotos ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                    </div>
                  )}

                  <hr />
                  <label><strong>Measurements (inches)</strong></label>
                  <div className="row" style={{ marginTop: 8 }}>
                    {MEASUREMENT_ROWS.filter((r) => order.customer[r.key] != null).map((r) => (
                      <div className="col-sm-4" key={r.key} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>{r.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{formatAsFraction(order.customer[r.key])}"</div>
                      </div>
                    ))}
                    {MEASUREMENT_ROWS.every((r) => order.customer[r.key] == null) && (
                      <div className="col-sm-12 text-muted">No measurements recorded for this customer yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Status History</h3>
                </div>
                <div className="box-background" style={{ padding: 18 }}>
                  {order.status_history && order.status_history.length > 0 ? (
                    <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                      {order.status_history.map((h: any, i: number) => (
                        <li key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, borderLeft: i === order.status_history.length - 1 ? 'none' : '2px solid #e5e7eb', marginLeft: 6, paddingLeft: 16, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: -7, top: 2, width: 12, height: 12, borderRadius: '50%', background: '#6366f1' }} />
                          <div>
                            <div>
                              <span className={`label ${STATUS_BADGE[h.status] || 'label-default'}`}>{h.status.replace(/_/g, ' ')}</span>
                              <span style={{ marginLeft: 8, fontSize: 12, color: '#8a90a3' }}>{new Date(h.changed_at).toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>by {h.changed_by}{h.note ? ` — ${h.note}` : ''}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">No status changes recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Customer</h3>
                </div>
                <div className="box-background" style={{ padding: 18 }}>
                  <p style={{ marginBottom: 4 }}><strong>{order.customer.customer_name}</strong></p>
                  <p className="text-muted" style={{ marginBottom: 4 }}>{order.customer.phone}</p>
                  {order.customer.email && <p className="text-muted" style={{ marginBottom: 4 }}>{order.customer.email}</p>}
                  <Link href={`/dashboard/customer/profile/${order.customer.customer_id}`} target="_blank" className="btn btn-default btn-sm btn-block" style={{ marginTop: 10 }}>
                    <i className="fa fa-external-link"></i> Full Profile &amp; Order History
                  </Link>
                </div>
              </div>

              {canUpdateStatus && (
                <div className="box box-primary">
                  <div className="box-header box-header-background with-border">
                    <h3 className="box-title">Status</h3>
                  </div>
                  <div className="box-background" style={{ padding: 18 }}>
                    <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      <option value="received">Received</option>
                      <option value="in_process">In Process (Cutting/Stitching)</option>
                      <option value="ready">Ready for Pickup/Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional note"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      style={{ marginTop: 8 }}
                    />
                    <button
                      className="btn bg-navy btn-flat btn-block"
                      onClick={handleStatusChange}
                      disabled={changingStatus || newStatus === order.status}
                      style={{ marginTop: 8 }}
                    >
                      {changingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              )}

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Payment</h3>
                </div>
                <div className="box-background" style={{ padding: 18 }}>
                  <table className="table" style={{ marginBottom: 0 }}>
                    <tbody>
                      <tr><td>Tailoring</td><td className="text-right">{order.tailoring_amount.toFixed(2)}</td></tr>
                      <tr><td>Extra Stitching</td><td className="text-right">{order.extra_stitching_amount.toFixed(2)}</td></tr>
                      <tr><td>Other Charges</td><td className="text-right">{order.other_charges_amount.toFixed(2)}</td></tr>
                      <tr><td><strong>Total</strong></td><td className="text-right"><strong>{order.price.toFixed(2)}</strong></td></tr>
                      <tr><td>Advance Paid</td><td className="text-right">{order.advance_paid.toFixed(2)}</td></tr>
                      <tr><td><strong>Balance</strong></td><td className="text-right" style={{ color: balance > 0 ? '#d9403a' : '#1a9c5c' }}><strong>{balance.toFixed(2)}</strong></td></tr>
                    </tbody>
                  </table>

                  {balance > 0 && canRecordPayment && (
                    <>
                      <hr />
                      <label><strong>Record Payment</strong></label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="number"
                          className="form-control"
                          placeholder={`Up to ${balance.toFixed(2)}`}
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                        <button className="btn bg-navy btn-flat" onClick={handleRecordPayment} disabled={recordingPayment} style={{ whiteSpace: 'nowrap' }}>
                          {recordingPayment ? 'Saving...' : 'Add Payment'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button className="btn bg-navy btn-flat btn-block" onClick={() => setShowSlip(true)}>
                <i className="fa fa-print"></i> Print Order Slip
              </button>
              <button
                className="btn btn-default btn-flat btn-block"
                onClick={() => document.getElementById('hiddenPrintBtn')?.click()}
                title="Quick thermal receipt for the customer — the full slip above has all the measurement/style detail for the workshop"
              >
                <i className="fa fa-receipt"></i> Print Thermal Receipt
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Hidden thermal print trigger */}
      <PrintReceipt
        customer={{ customer_name: order.customer.customer_name }}
        cart={[{
          product_name: `${order.garment_type} x${order.quantity}`,
          qty: 1,
          price: order.price,
          taxAmount: 0,
        }]}
        subtotal={order.price}
        discount={0}
        grandTotal={order.price}
        paidAmount={order.advance_paid}
        changeAmount={0}
        orderNo={order.order_number}
        orderDate={order.order_date}
        salesPerson={order.taken_by}
        tailorDetails={{
          phone: order.customer?.phone,
          garmentType: order.garment_type,
          fabricDetails: order.fabric_details || undefined,
          promisedDate: order.promised_date || undefined,
          status: order.status_label,
          deliveryMethod: order.delivery_method === 'home_delivery' ? 'Home Delivery' : 'Customer Pickup',
          deliveryAddress: order.delivery_address || undefined,
          deliveryPhone: order.delivery_phone || undefined,
          styleOptions: [
            order.pocket_style,
            order.collar_style,
            order.collar_cut,
            order.qurta_style,
            ...Object.entries(order.style_options || {}).filter(([, v]) => v).map(([k]) => k),
          ]
            .filter((v): v is string => Boolean(v))
            .map((v) => v.replace(/_/g, ' ')),
          measurements: [
            ['Length', order.customer?.measurement_length],
            ['Teera', order.customer?.measurement_teera],
            ['Chest', order.customer?.measurement_chest],
            ['Waist', order.customer?.measurement_waist],
            ['Hip', order.customer?.measurement_hip],
            ['Shoulder', order.customer?.measurement_shoulder],
            ['Sleeve Length', order.customer?.measurement_sleeve_length],
            ['Sleeve Round', order.customer?.measurement_sleeve_round],
            ['Collar', order.customer?.measurement_neck],
            ['Hem Width', order.customer?.measurement_daman],
            ['Shalwar Length', order.customer?.measurement_shalwar_length],
            ['Ankle Opening', order.customer?.measurement_bottom],
          ]
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([label, v]) => ({ label: label as string, value: `${formatAsFraction(v as number)}"` })),
        }}
      />

      {showSlip && (
        <TailorOrderSlip
          order={{ ...order, tailor_customer: order.customer }}
          onClose={() => setShowSlip(false)}
        />
      )}
    </div>
  )
}
