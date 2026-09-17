'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { FetchTailorCustomers, AddOrUpdateTailorCustomer, AddTailorOrder, FetchTailorOrderById, FetchTailorOrdersByCustomer } from './actions/TailorActions'
import TailorOrderSlip from './TailorOrderSlip'
import FractionInput from './FractionInput'
import IconOptionPicker from './IconOptionPicker'
import { STYLE_ICONS, GenericTag } from './icons/StyleIcons'
import PhotoPicker from '../shared/PhotoPicker'
import { UploadEntityPhotos } from '@/lib/entityPhotos'
import PrintReceipt from '../Print/PrintReceipt'
import { formatAsFraction } from '@/lib/formatMeasurement'

type Customer = {
  tailor_customer_id: number
  customer_name: string
  phone: string
  email: string | null
  address: string | null
  measurement_length: number | null
  measurement_teera: number | null
  measurement_chest: number | null
  measurement_waist: number | null
  measurement_hip: number | null
  measurement_shoulder: number | null
  measurement_sleeve_length: number | null
  measurement_sleeve_round: number | null
  measurement_neck: number | null
  measurement_daman: number | null
  measurement_shalwar_length: number | null
  measurement_bottom: number | null
  measurement_notes: string | null
  custom_measurements?: Record<string, number | null> | null
}

const emptyMeasurements = {
  measurement_length: '', measurement_teera: '', measurement_chest: '', measurement_waist: '', measurement_hip: '',
  measurement_shoulder: '', measurement_sleeve_length: '', measurement_sleeve_round: '',
  measurement_neck: '', measurement_daman: '', measurement_shalwar_length: '', measurement_bottom: '', measurement_notes: '',
}

export default function NewTailorOrder() {
  const { data: session } = useSession()
  const takenBy = session?.user?.name || session?.user?.email || 'Staff'

  const [phone, setPhone] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searching, setSearching] = useState(false)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [customerForm, setCustomerForm] = useState({ customer_name: '', phone: '', email: '', address: '' })
  const [measurements, setMeasurements] = useState<Record<string, string>>(emptyMeasurements)

  const [orderForm, setOrderForm] = useState({
    garment_type: '', fabric_details: '', quantity: '1',
    tailoring_amount: '', extra_stitching_amount: '0', other_charges_amount: '0', advance_paid: '0',
    promised_date: '', notes: '', delivery_method: 'pickup' as 'pickup' | 'home_delivery',
    delivery_address: '', delivery_phone: '',
    design_number: '', size_1: '', size_2: '',
    pocket_style: 'none', collar_style: 'none', collar_cut: 'none', qurta_style: 'none',
  })
  const [styleOptions, setStyleOptions] = useState<Record<string, boolean>>({})
  const [dynamicOptions, setDynamicOptions] = useState<{ option_group: string; option_value: string; option_label: string }[]>([])

  useEffect(() => {
    fetch('/api/tailor-style-options').then(r => r.json()).then(json => {
      if (json.success) setDynamicOptions(json.data)
    })
  }, [])

  const optionsFor = (group: string) => dynamicOptions.filter(o => o.option_group === group)
  const iconFor = (group: keyof typeof STYLE_ICONS, value: string) =>
    (STYLE_ICONS[group] as any)[value] || GenericTag

  const [saving, setSaving] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null)
  const [lastOrderData, setLastOrderData] = useState<any | null>(null)
  const [showSlip, setShowSlip] = useState(false)
  const [pendingThermalPrint, setPendingThermalPrint] = useState(false)

  // Waits for lastOrderData to actually propagate through a re-render
  // before clicking the hidden print button, same fix as the POS receipt
  // — clicking synchronously right after setState reads stale data.
  useEffect(() => {
    if (pendingThermalPrint && lastOrderData) {
      document.getElementById('hiddenPrintBtn')?.click()
      setPendingThermalPrint(false)
    }
  }, [pendingThermalPrint, lastOrderData])

  const totalAmount = (Number(orderForm.tailoring_amount) || 0) + (Number(orderForm.extra_stitching_amount) || 0) + (Number(orderForm.other_charges_amount) || 0)

  const handleSearch = async () => {
    if (!phone.trim()) return
    setSearching(true)
    try {
      const results = await FetchTailorCustomers(phone.trim())
      setSearchResults(results as Customer[])
      if (results.length === 0) {
        setCustomerForm((f) => ({ ...f, phone: phone.trim() }))
      }
    } finally {
      setSearching(false)
    }
  }

  const pickCustomer = (c: Customer) => {
    setSelectedCustomer(c)
    setSearchResults([])
    setMeasurements({
      measurement_length: c.measurement_length?.toString() || '',
      measurement_teera: c.measurement_teera?.toString() || '',
      measurement_chest: c.measurement_chest?.toString() || '',
      measurement_waist: c.measurement_waist?.toString() || '',
      measurement_hip: c.measurement_hip?.toString() || '',
      measurement_shoulder: c.measurement_shoulder?.toString() || '',
      measurement_sleeve_length: c.measurement_sleeve_length?.toString() || '',
      measurement_sleeve_round: c.measurement_sleeve_round?.toString() || '',
      measurement_neck: c.measurement_neck?.toString() || '',
      measurement_daman: c.measurement_daman?.toString() || '',
      measurement_shalwar_length: c.measurement_shalwar_length?.toString() || '',
      measurement_bottom: c.measurement_bottom?.toString() || '',
      measurement_notes: c.measurement_notes || '',
      ...Object.fromEntries(
        Object.entries(c.custom_measurements || {}).map(([k, v]) => [k, v != null ? String(v) : ''])
      ),
    })
    setOrderHistory([])
    setLoadingHistory(true)
    FetchTailorOrdersByCustomer(c.tailor_customer_id).then((orders) => {
      setOrderHistory(orders)
      setLoadingHistory(false)
      // Pre-fill design/style preferences from their most recent order —
      // measurements already come from the customer record above, but
      // pocket style, collar style, etc. live on the order itself, so a
      // returning customer's usual preferences need to come from here
      // instead. Pricing, quantity, and dates are deliberately left
      // blank since those should be fresh for each new order.
      if (orders.length > 0) {
        const last = orders[0] as any
        setOrderForm((f) => ({
          ...f,
          garment_type: last.garment_type || f.garment_type,
          fabric_details: last.fabric_details || f.fabric_details,
          design_number: last.design_number || f.design_number,
          size_1: last.size_1 || f.size_1,
          size_2: last.size_2 || f.size_2,
          pocket_style: last.pocket_style || f.pocket_style,
          collar_style: last.collar_style || f.collar_style,
          collar_cut: last.collar_cut || f.collar_cut,
          qurta_style: last.qurta_style || f.qurta_style,
        }))
        if (last.style_options) {
          setStyleOptions(last.style_options as Record<string, boolean>)
        }
        toast.success(`Filled in from their last order (${last.order_number}) — please review before saving`)
      }
    })
  }

  const startNewCustomer = () => {
    setSelectedCustomer(null)
    setSearchResults([])
    setCustomerForm({ customer_name: '', phone, email: '', address: '' })
    setMeasurements(emptyMeasurements)
    setOrderHistory([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!orderForm.garment_type.trim() || !orderForm.tailoring_amount) {
      toast.error('Garment type and tailoring amount are required')
      return
    }
    if (!selectedCustomer && !customerForm.customer_name.trim()) {
      toast.error('Select an existing customer or enter a new customer name')
      return
    }

    setSaving(true)
    try {
      const FIXED_KEYS = new Set([
        'measurement_length', 'measurement_teera', 'measurement_chest', 'measurement_waist', 'measurement_hip',
        'measurement_shoulder', 'measurement_sleeve_length', 'measurement_sleeve_round', 'measurement_neck',
        'measurement_daman', 'measurement_shalwar_length', 'measurement_bottom', 'measurement_notes',
      ])
      const measurementPayload: Record<string, any> = {}
      const customMeasurements: Record<string, number | null> = {}
      Object.entries(measurements).forEach(([k, v]) => {
        if (FIXED_KEYS.has(k)) {
          measurementPayload[k] = k === 'measurement_notes' ? (v || null) : (v ? Number(v) : null)
        } else {
          customMeasurements[k] = v ? Number(v) : null
        }
      })
      const hasCustom = Object.keys(customMeasurements).length > 0

      let customerId = selectedCustomer?.tailor_customer_id
      if (!customerId) {
        const created = await AddOrUpdateTailorCustomer({
          customer_name: customerForm.customer_name,
          phone: customerForm.phone || phone,
          email: customerForm.email,
          address: customerForm.address,
          ...measurementPayload,
          ...(hasCustom ? { custom_measurements: customMeasurements } : {}),
        } as any)
        customerId = created.tailor_customer_id
      } else {
        await AddOrUpdateTailorCustomer({
          tailor_customer_id: customerId,
          customer_name: selectedCustomer!.customer_name,
          phone: selectedCustomer!.phone,
          email: selectedCustomer!.email || '',
          address: selectedCustomer!.address || '',
          ...measurementPayload,
          ...(hasCustom ? { custom_measurements: customMeasurements } : {}),
        } as any)
      }

      const order = await AddTailorOrder({
        tailor_customer_id: customerId!,
        garment_type: orderForm.garment_type,
        fabric_details: orderForm.fabric_details,
        quantity: Number(orderForm.quantity) || 1,
        tailoring_amount: Number(orderForm.tailoring_amount) || 0,
        extra_stitching_amount: Number(orderForm.extra_stitching_amount) || 0,
        other_charges_amount: Number(orderForm.other_charges_amount) || 0,
        advance_paid: Number(orderForm.advance_paid) || 0,
        promised_date: orderForm.promised_date || undefined,
        taken_by: takenBy,
        notes: orderForm.notes,
        delivery_method: orderForm.delivery_method,
        delivery_address: orderForm.delivery_address,
        delivery_phone: orderForm.delivery_phone,
        design_number: orderForm.design_number,
        size_1: orderForm.size_1,
        size_2: orderForm.size_2,
        pocket_style: orderForm.pocket_style,
        collar_style: orderForm.collar_style,
        collar_cut: orderForm.collar_cut,
        qurta_style: orderForm.qurta_style,
        style_options: styleOptions,
      })

      toast.success(`Order ${order.order_number} created!`)
      setLastOrderNumber(order.order_number)

      if (photoFiles.length > 0) {
        try {
          await UploadEntityPhotos('tailor_order', order.tailor_order_id, photoFiles, takenBy)
        } catch (photoErr) {
          console.error('Failed to upload photos:', photoErr)
          toast.error('Order saved, but photos failed to upload')
        }
        setPhotoFiles([])
      }

      const fullOrder = await FetchTailorOrderById(order.tailor_order_id)
      if (fullOrder) {
        setLastOrderData(fullOrder)
        setPendingThermalPrint(true)
      }

      setSelectedCustomer(null)
      setSearchResults([])
      setPhone('')
      setCustomerForm({ customer_name: '', phone: '', email: '', address: '' })
      setMeasurements(emptyMeasurements)
      setOrderForm({
        garment_type: '', fabric_details: '', quantity: '1',
        tailoring_amount: '', extra_stitching_amount: '0', other_charges_amount: '0', advance_paid: '0',
        promised_date: '', notes: '', delivery_method: 'pickup', delivery_address: '', delivery_phone: '',
        design_number: '', size_1: '', size_2: '',
        pocket_style: 'none', collar_style: 'none', collar_cut: 'none', qurta_style: 'none',
      })
      setStyleOptions({})
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">New Tailor Order</a></li>
          <li><a href="#">Tailor</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          {lastOrderNumber && (
            <div className="alert alert-success text-center">
              Last order created: <strong>{lastOrderNumber}</strong> — give this tracking code to the customer.
              {lastOrderData && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="btn btn-xs btn-default"
                    onClick={() => document.getElementById('hiddenPrintBtn')?.click()}
                    title="Missed the automatic print? Re-print the same thermal receipt."
                  >
                    <i className="fa fa-receipt"></i> Print Thermal Receipt
                  </button>
                  {' '}
                  <button type="button" className="btn btn-xs btn-default" onClick={() => setShowSlip(true)}>
                    Print Slip
                  </button>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="box box-primary">
                  <div className="box-header box-header-background with-border">
                    <h3 className="box-title">Customer</h3>
                  </div>
                  <div className="box-background" style={{ padding: 16 }}>
                    <div className="form-group">
                      <label>Search by Phone or Email</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx or email" />
                        <button type="button" className="btn btn-default" onClick={handleSearch} disabled={searching}>
                          {searching ? '...' : 'Search'}
                        </button>
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <label>Found {searchResults.length} match(es):</label>
                        {searchResults.map((c) => (
                          <div key={c.tailor_customer_id} className="list-group-item" style={{ cursor: 'pointer' }} onClick={() => pickCustomer(c)}>
                            <strong>{c.customer_name}</strong> — {c.phone}{c.email ? ` · ${c.email}` : ''}
                          </div>
                        ))}
                        <button type="button" className="btn btn-link btn-xs" onClick={startNewCustomer}>+ Add as new customer instead</button>
                      </div>
                    )}

                    {selectedCustomer ? (
                      <div className="alert alert-info">
                        <strong>{selectedCustomer.customer_name}</strong> — {selectedCustomer.phone}
                        <br />
                        <button type="button" className="btn btn-link btn-xs" onClick={startNewCustomer}>Not this customer? Clear</button>
                        <a href={`/dashboard/customer/profile/${selectedCustomer.tailor_customer_id}`} target="_blank" rel="noopener noreferrer" className="btn btn-link btn-xs">
                          <i className="fa fa-external-link"></i> Full Profile
                        </a>

                        {loadingHistory ? (
                          <div style={{ fontSize: 12, marginTop: 8, color: '#6b7280' }}>Loading order history...</div>
                        ) : orderHistory.length > 0 ? (
                          <div style={{ marginTop: 10, borderTop: '1px solid #b8daff', paddingTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, color: '#31708f' }}>
                              Order History ({orderHistory.length})
                            </div>
                            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                              {orderHistory.map((o) => (
                                <div key={o.tailor_order_id} style={{
                                  display: 'flex', justifyContent: 'space-between', fontSize: 12,
                                  padding: '4px 0', borderBottom: '1px solid #d9edf7',
                                }}>
                                  <span>{o.order_number} · {o.garment_type} x{o.quantity}</span>
                                  <span>{o.status_label} · {o.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, marginTop: 8, color: '#6b7280' }}>No previous orders for this customer.</div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="form-group">
                          <label>Customer Name <span className="required">*</span></label>
                          <input type="text" className="form-control" value={customerForm.customer_name}
                            onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Phone <span className="required">*</span></label>
                          <input type="text" className="form-control" value={customerForm.phone}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Email <small style={{ fontWeight: 400 }}>(optional — for status update notifications)</small></label>
                          <input type="email" className="form-control" value={customerForm.email}
                            onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Address</label>
                          <textarea className="form-control" value={customerForm.address}
                            onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
                        </div>
                      </>
                    )}

                    <hr />
                    <label><strong>Measurements (inches)</strong></label>
                    <div className="row">
                      {optionsFor('measurement_field').map((f) => (
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
                      <label>Other Notes</label>
                      <textarea className="form-control" value={measurements.measurement_notes}
                        onChange={(e) => setMeasurements({ ...measurements, measurement_notes: e.target.value })}
                        placeholder="e.g. specific style requests, prior fitting notes" />
                    </div>
                    <div className="form-group">
                      <PhotoPicker files={photoFiles} onChange={setPhotoFiles} label="Fabric / Garment Photos" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="box box-primary">
                  <div className="box-header box-header-background with-border">
                    <h3 className="box-title">Garment Order</h3>
                  </div>
                  <div className="box-background" style={{ padding: 16 }}>
                    <div className="form-group">
                      <label>Garment Type <span className="required">*</span></label>
                      <input type="text" className="form-control" value={orderForm.garment_type}
                        onChange={(e) => setOrderForm({ ...orderForm, garment_type: e.target.value })}
                        placeholder="e.g. Shalwar Kameez, Kurta, Coat" />
                    </div>
                    <div className="form-group">
                      <label>Fabric Details</label>
                      <textarea className="form-control" value={orderForm.fabric_details}
                        onChange={(e) => setOrderForm({ ...orderForm, fabric_details: e.target.value })}
                        placeholder="Color, material, customer-provided or shop fabric" />
                    </div>
                    <div className="row">
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Quantity</label>
                          <input type="number" min="1" className="form-control" value={orderForm.quantity}
                            onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Design # / Cut Code</label>
                          <input type="text" className="form-control" value={orderForm.design_number}
                            onChange={(e) => setOrderForm({ ...orderForm, design_number: e.target.value })} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Promised Date</label>
                          <input type="date" className="form-control" value={orderForm.promised_date}
                            onChange={(e) => setOrderForm({ ...orderForm, promised_date: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-sm-6">
                        <div className="form-group">
                          <label>Size 1 (e.g. Collar)</label>
                          <input type="text" className="form-control" value={orderForm.size_1}
                            onChange={(e) => setOrderForm({ ...orderForm, size_1: e.target.value })} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group">
                          <label>Size 2 (e.g. Cuff)</label>
                          <input type="text" className="form-control" value={orderForm.size_2}
                            onChange={(e) => setOrderForm({ ...orderForm, size_2: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <hr />
                    <label><strong>Style</strong></label>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>Pocket</div>
                      <IconOptionPicker
                        value={orderForm.pocket_style}
                        onChange={(v) => setOrderForm({ ...orderForm, pocket_style: v })}
                        options={[
                          { value: 'none', label: 'None', Icon: STYLE_ICONS.pocket_style.none },
                          ...optionsFor('pocket_style').map(o => ({ value: o.option_value, label: o.option_label, Icon: iconFor('pocket_style', o.option_value) })),
                        ]}
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>Bain Style</div>
                      <IconOptionPicker
                        value={orderForm.collar_style}
                        onChange={(v) => setOrderForm({ ...orderForm, collar_style: v })}
                        options={[
                          { value: 'none', label: 'None', Icon: STYLE_ICONS.collar_style.none },
                          ...optionsFor('collar_style').map(o => ({ value: o.option_value, label: o.option_label, Icon: iconFor('collar_style', o.option_value) })),
                        ]}
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>Collar Cut</div>
                      <IconOptionPicker
                        value={orderForm.collar_cut}
                        onChange={(v) => setOrderForm({ ...orderForm, collar_cut: v })}
                        options={[
                          { value: 'none', label: 'None', Icon: STYLE_ICONS.collar_cut.none },
                          ...optionsFor('collar_cut').map(o => ({ value: o.option_value, label: o.option_label, Icon: iconFor('collar_cut', o.option_value) })),
                        ]}
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#8a90a3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>Qurta Style</div>
                      <IconOptionPicker
                        value={orderForm.qurta_style}
                        onChange={(v) => setOrderForm({ ...orderForm, qurta_style: v })}
                        options={[
                          { value: 'none', label: 'None', Icon: STYLE_ICONS.qurta_style.none },
                          ...optionsFor('qurta_style').map(o => ({ value: o.option_value, label: o.option_label, Icon: iconFor('qurta_style', o.option_value) })),
                        ]}
                      />
                    </div>

                    <div className="row" style={{ marginBottom: 8 }}>
                      {optionsFor('checkbox').map((opt) => (
                        <div className="col-sm-6" key={opt.option_value}>
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 400 }}>
                            <input type="checkbox" checked={!!styleOptions[opt.option_value]}
                              onChange={(e) => setStyleOptions({ ...styleOptions, [opt.option_value]: e.target.checked })} />
                            {opt.option_label}
                          </label>
                        </div>
                      ))}
                    </div>

                    <hr />
                    <label><strong>Charges</strong></label>
                    <div className="row">
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Tailoring Amt <span className="required">*</span></label>
                          <input type="number" step="0.01" className="form-control" value={orderForm.tailoring_amount}
                            onChange={(e) => setOrderForm({ ...orderForm, tailoring_amount: e.target.value })} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Sp. Stitching Amt</label>
                          <input type="number" step="0.01" className="form-control" value={orderForm.extra_stitching_amount}
                            onChange={(e) => setOrderForm({ ...orderForm, extra_stitching_amount: e.target.value })} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Other Charges</label>
                          <input type="number" step="0.01" className="form-control" value={orderForm.other_charges_amount}
                            onChange={(e) => setOrderForm({ ...orderForm, other_charges_amount: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-sm-6">
                        <div className="form-group">
                          <label>Total</label>
                          <input type="text" className="form-control" value={totalAmount.toFixed(2)} disabled style={{ fontWeight: 700 }} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group">
                          <label>Advance Paid</label>
                          <input type="number" step="0.01" className="form-control" value={orderForm.advance_paid}
                            onChange={(e) => setOrderForm({ ...orderForm, advance_paid: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <hr />
                    <label><strong>Delivery</strong></label>
                    <div className="form-group">
                      <label style={{ marginRight: 16 }}>
                        <input type="radio" checked={orderForm.delivery_method === 'pickup'}
                          onChange={() => setOrderForm({ ...orderForm, delivery_method: 'pickup' })} /> Customer Pickup
                      </label>
                      <label>
                        <input type="radio" checked={orderForm.delivery_method === 'home_delivery'}
                          onChange={() => setOrderForm({ ...orderForm, delivery_method: 'home_delivery' })} /> Home Delivery
                      </label>
                    </div>
                    {orderForm.delivery_method === 'home_delivery' && (
                      <>
                        <div className="form-group">
                          <label>Delivery Address</label>
                          <textarea className="form-control" value={orderForm.delivery_address}
                            onChange={(e) => setOrderForm({ ...orderForm, delivery_address: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Delivery Contact Phone</label>
                          <input type="text" className="form-control" value={orderForm.delivery_phone}
                            onChange={(e) => setOrderForm({ ...orderForm, delivery_phone: e.target.value })} />
                        </div>
                      </>
                    )}

                    <div className="form-group">
                      <label>Notes</label>
                      <textarea className="form-control" value={orderForm.notes}
                        onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
                    </div>

                    <button type="submit" className="btn bg-navy btn-flat btn-block" disabled={saving}>
                      {saving ? 'Saving...' : 'Create Order'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
      </div>

      {showSlip && lastOrderData && (
        <TailorOrderSlip order={lastOrderData} onClose={() => setShowSlip(false)} />
      )}

      {/* Hidden thermal print trigger — kept mounted from page load (not
          just after order creation) specifically so its internal
          printer-settings fetch has time to complete in the background
          before the auto-print fires. Conditionally mounting this only
          once an order exists was the actual bug: the component would
          get created and the auto-click would fire in the very same
          instant, leaving its settings fetch zero time to finish —
          exactly why the manual "Print Thermal Receipt" button on the
          order detail page always worked (that page mounts this
          immediately on load, giving it a natural head start) while
          this auto-print did not. */}
      <PrintReceipt
        customer={{ customer_name: lastOrderData?.customer?.customer_name || lastOrderData?.tailor_customer?.customer_name || 'Customer' }}
        cart={[{
          product_name: lastOrderData ? `${lastOrderData.garment_type} x${lastOrderData.quantity}` : '',
          qty: 1,
          price: lastOrderData?.price || 0,
          taxAmount: 0,
        }]}
        subtotal={lastOrderData?.price || 0}
        discount={0}
        grandTotal={lastOrderData?.price || 0}
        paidAmount={lastOrderData?.advance_paid || 0}
        changeAmount={0}
        orderNo={lastOrderData?.order_number}
        orderDate={lastOrderData?.order_date}
        salesPerson={lastOrderData?.taken_by}
        tailorDetails={lastOrderData ? {
          phone: lastOrderData.customer?.phone || lastOrderData.tailor_customer?.phone,
          garmentType: lastOrderData.garment_type,
          fabricDetails: lastOrderData.fabric_details || undefined,
          promisedDate: lastOrderData.promised_date || undefined,
          status: lastOrderData.status_label,
          deliveryMethod: lastOrderData.delivery_method === 'home_delivery' ? 'Home Delivery' : 'Customer Pickup',
          deliveryAddress: lastOrderData.delivery_address || undefined,
          deliveryPhone: lastOrderData.delivery_phone || undefined,
          tailoringAmount: lastOrderData.tailoring_amount,
          extraStitchingAmount: lastOrderData.extra_stitching_amount,
          otherChargesAmount: lastOrderData.other_charges_amount,
          styleOptions: [
            lastOrderData.pocket_style,
            lastOrderData.collar_style,
            lastOrderData.collar_cut,
            lastOrderData.qurta_style,
            ...Object.entries(lastOrderData.style_options || {}).filter(([, v]) => v).map(([k]) => k),
          ]
            .filter((v): v is string => Boolean(v))
            .map((v) => v.replace(/_/g, ' ')),
          measurements: [
            ['Length', lastOrderData.customer?.measurement_length],
            ['Teera', lastOrderData.customer?.measurement_teera],
            ['Chest', lastOrderData.customer?.measurement_chest],
            ['Waist', lastOrderData.customer?.measurement_waist],
            ['Hip', lastOrderData.customer?.measurement_hip],
            ['Shoulder', lastOrderData.customer?.measurement_shoulder],
            ['Sleeve Length', lastOrderData.customer?.measurement_sleeve_length],
            ['Sleeve Round', lastOrderData.customer?.measurement_sleeve_round],
            ['Collar', lastOrderData.customer?.measurement_neck],
            ['Hem Width', lastOrderData.customer?.measurement_daman],
            ['Shalwar Length', lastOrderData.customer?.measurement_shalwar_length],
            ['Ankle Opening', lastOrderData.customer?.measurement_bottom],
          ]
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([label, v]) => ({ label: label as string, value: `${formatAsFraction(v as number)}"` })),
        } : undefined}
      />

    </div>
  )
}
