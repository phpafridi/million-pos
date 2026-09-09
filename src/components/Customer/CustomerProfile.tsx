'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { FetchCustomerProfile, FetchCustomerPurchaseHistory } from './actions/FetchCustomerProfile'
import { FetchTailorOrdersByCustomer, AddOrUpdateTailorCustomer } from '../Tailor/actions/TailorActions'
import FractionInput from '../Tailor/FractionInput'
import { hasPermission } from '@/lib/clientPermissions'
import { formatAsFraction } from '@/lib/formatMeasurement'

const FIXED_MEASUREMENT_KEYS = new Set([
  'measurement_length', 'measurement_teera', 'measurement_chest', 'measurement_waist', 'measurement_hip',
  'measurement_shoulder', 'measurement_sleeve_length', 'measurement_sleeve_round', 'measurement_neck',
  'measurement_daman', 'measurement_shalwar_length', 'measurement_bottom',
])

const ORDER_STATUS_LABEL: Record<number, { text: string; className: string }> = {
  0: { text: 'Pending', className: 'label-warning' },
  1: { text: 'Cancelled', className: 'label-danger' },
  2: { text: 'Completed', className: 'label-success' },
}

export default function CustomerProfile({ customerId }: { customerId: number }) {
  const { data: session } = useSession()
  const savedBy = session?.user?.name || session?.user?.email || 'Staff'
  const canView = hasPermission(session, 'action:view-customer-profile', 'view')
  const canEdit = hasPermission(session, 'action:edit-customer-profile')

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
  const [tailorHistory, setTailorHistory] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', address: '' })
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [fieldOptions, setFieldOptions] = useState<{ option_value: string; option_label: string }[]>([])

  useEffect(() => {
    fetch('/api/tailor-style-options?group=measurement_field').then(r => r.json()).then(json => {
      if (json.success) setFieldOptions(json.data)
    })
  }, [])

  const [loadError, setLoadError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [profile, purchases, tailorOrders] = await Promise.all([
        FetchCustomerProfile(customerId),
        FetchCustomerPurchaseHistory(customerId),
        FetchTailorOrdersByCustomer(customerId),
      ])
      if (profile) {
        setCustomer(profile)
        setForm({
          customer_name: profile.customer_name,
          phone: profile.phone,
          email: profile.email,
          address: profile.address,
        })
        const m: Record<string, string> = {}
        FIXED_MEASUREMENT_KEYS.forEach((k) => { m[k] = (profile as any)[k] != null ? String((profile as any)[k]) : '' })
        const custom = (profile as any).custom_measurements || {}
        Object.entries(custom).forEach(([k, v]) => { m[k] = v != null ? String(v) : '' })
        setMeasurements(m)
      }
      setPurchaseHistory(purchases)
      setTailorHistory(tailorOrders)
    } catch (err: any) {
      console.error('Failed to load customer profile:', err)
      setLoadError(err?.message || 'Failed to load this customer\'s profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [customerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    try {
      const measurementPayload: any = {}
      const customMeasurements: Record<string, number | null> = {}
      Object.entries(measurements).forEach(([k, v]) => {
        if (FIXED_MEASUREMENT_KEYS.has(k)) {
          measurementPayload[k] = v ? Number(v) : null
        } else {
          customMeasurements[k] = v ? Number(v) : null
        }
      })
      await AddOrUpdateTailorCustomer({
        tailor_customer_id: customerId,
        customer_name: form.customer_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        ...measurementPayload,
        ...(Object.keys(customMeasurements).length > 0 ? { custom_measurements: customMeasurements } : {}),
      })
      toast.success('Customer profile saved')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="right-side" style={{ minHeight: '945px' }}><p className="text-center" style={{ marginTop: 40 }}>Loading customer profile...</p></div>
  }

  if (loadError) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="alert alert-danger" style={{ margin: 24 }}>
          <strong>Couldn&apos;t load this customer&apos;s profile:</strong> {loadError}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="alert alert-danger" style={{ margin: 24 }}>Customer not found, or belongs to another franchise.</div>
      </div>
    )
  }

  if (session && !canView) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="alert alert-danger" style={{ margin: 24 }}>
          <i className="fa fa-lock" style={{ marginRight: 8 }} />
          You don&apos;t have permission to view customer profiles. Ask your admin to grant &quot;View Customer Profile&quot; access.
        </div>
      </div>
    )
  }

  const totalSpent = purchaseHistory.filter(o => o.order_status === 2).reduce((s, o) => s + o.grand_total, 0)

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Customer Profile</a></li>
          <li><a href="#">Customer</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            {/* Left: profile summary + stats */}
            <div className="col-md-4">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">{customer.customer_name}</h3>
                </div>
                <div className="box-background" style={{ padding: 18 }}>
                  {customer.is_gold_member && (
                    <div style={{ marginBottom: 12, textAlign: 'center' }}>
                      <span style={{ background: '#b8860b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 1 }}>
                        ★ GOLD MEMBER
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1a9c5c' }}>{purchaseHistory.length}</div>
                      <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>POS Orders</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{tailorHistory.length}</div>
                      <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Tailor Orders</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Rs {totalSpent.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Total Spent (Completed)</div>
                  </div>
                  {customer.loyalty_points > 0 && (
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#b8860b' }}>{customer.loyalty_points} pts</div>
                      <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Loyalty Points</div>
                    </div>
                  )}

                  <hr />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    {canEdit && !isEditing && (
                      <button className="btn btn-default btn-xs" onClick={() => setIsEditing(true)}>
                        <i className="fa fa-pencil"></i> Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <>
                      <div className="form-group">
                        <label>Name</label>
                        <input type="text" className="form-control" value={form.customer_name}
                          onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Phone</label>
                        <input type="text" className="form-control" value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-control" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Address</label>
                        <textarea className="form-control" value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Name</div>
                        <div style={{ fontSize: 14 }}>{customer.customer_name}</div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Phone</div>
                        <div style={{ fontSize: 14 }}>{customer.phone}</div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Email</div>
                        <div style={{ fontSize: 14 }}>{customer.email}</div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Address</div>
                        <div style={{ fontSize: 14 }}>{customer.address || '—'}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: measurements + both histories */}
            <div className="col-md-8">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="box-title">Tailor Measurements (inches)</h3>
                  {canEdit && !isEditing && (
                    <button className="btn btn-default btn-xs" onClick={() => setIsEditing(true)}>
                      <i className="fa fa-pencil"></i> Edit
                    </button>
                  )}
                </div>
                <div className="box-background" style={{ padding: 18 }}>
                  {isEditing ? (
                    <>
                      <div className="row">
                        {fieldOptions.map((f) => (
                          <div className="col-sm-6" key={f.option_value}>
                            <div className="form-group">
                              <label>{f.option_label}</label>
                              <FractionInput
                                value={measurements[f.option_value] || ''}
                                onChange={(v) => setMeasurements({ ...measurements, [f.option_value]: v })}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="form-group">
                        <label>Notes</label>
                        <textarea className="form-control" value={measurements.measurement_notes || ''}
                          onChange={(e) => setMeasurements({ ...measurements, measurement_notes: e.target.value })} />
                      </div>
                      <button className="btn bg-navy btn-flat" onClick={async () => { await handleSave(); setIsEditing(false) }} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile & Measurements'}
                      </button>{' '}
                      <button className="btn btn-default btn-flat" onClick={() => setIsEditing(false)} disabled={saving}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <div className="row">
                      {fieldOptions.filter((f) => measurements[f.option_value]).length > 0 ? (
                        fieldOptions.filter((f) => measurements[f.option_value]).map((f) => (
                          <div className="col-sm-6" key={f.option_value} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>{f.option_label}</div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{formatAsFraction(measurements[f.option_value])}"</div>
                          </div>
                        ))
                      ) : (
                        <div className="col-sm-12 text-muted">No measurements recorded yet.</div>
                      )}
                      {measurements.measurement_notes && (
                        <div className="col-sm-12" style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase' }}>Notes</div>
                          <div style={{ fontSize: 13 }}>{measurements.measurement_notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">POS Order History</h3>
                </div>
                <div className="box-background" style={{ padding: 0 }}>
                  <table className="table table-striped table-bordered text-center" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th className="active">Order No</th>
                        <th className="active">Date</th>
                        <th className="active">Status</th>
                        <th className="active">Total</th>
                        <th className="active">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseHistory.length > 0 ? purchaseHistory.map((o) => {
                        const status = ORDER_STATUS_LABEL[o.order_status] || ORDER_STATUS_LABEL[2]
                        return (
                          <tr key={o.order_id}>
                            <td><strong>{o.order_number}</strong></td>
                            <td>{new Date(o.order_date).toLocaleDateString()}</td>
                            <td><span className={`label ${status.className}`}>{status.text}</span></td>
                            <td>Rs {o.grand_total.toFixed(2)}</td>
                            <td>
                              <Link href={`/dashboard/order-process/invoice/${o.order_id}?isOrder=true`}>
                                <button className="btn btn-xs bg-navy"><i className="fa fa-eye"></i> View</button>
                              </Link>
                            </td>
                          </tr>
                        )
                      }) : (
                        <tr><td colSpan={5}><strong>No POS orders yet.</strong></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Tailor Order History</h3>
                </div>
                <div className="box-background" style={{ padding: 0 }}>
                  <table className="table table-striped table-bordered text-center" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th className="active">Order No</th>
                        <th className="active">Garment</th>
                        <th className="active">Date</th>
                        <th className="active">Status</th>
                        <th className="active">Total</th>
                        <th className="active">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tailorHistory.length > 0 ? tailorHistory.map((o) => (
                        <tr key={o.tailor_order_id}>
                          <td><strong>{o.order_number}</strong></td>
                          <td>{o.garment_type} x{o.quantity}</td>
                          <td>{new Date(o.order_date).toLocaleDateString()}</td>
                          <td>{o.status_label}</td>
                          <td>Rs {o.price.toFixed(2)}</td>
                          <td>Rs {(o.price - o.advance_paid).toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6}><strong>No tailor orders yet.</strong></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
