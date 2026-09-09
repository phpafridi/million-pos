'use client'
import React, { useEffect, useState } from 'react'
import { getCompanyName, getCompanyPhone, getCompanyAddress } from '../OrderProcess/actions/FetchCompanyDetails'
import { STYLE_ICONS } from './icons/StyleIcons'
import { formatAsFraction } from '@/lib/formatMeasurement'

function StyleIconLabel({ Icon, label }: { Icon: React.ComponentType; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44 }}>
      <div style={{ width: 28, height: 28 }}><Icon /></div>
      <span style={{ fontSize: 8, textTransform: 'capitalize', textAlign: 'center', color: '#555', marginTop: 2 }}>{label}</span>
    </div>
  )
}

type TailorOrderSlipData = {
  order_number: string
  garment_type: string
  fabric_details: string | null
  quantity: number
  price: number
  tailoring_amount: number
  extra_stitching_amount: number
  other_charges_amount: number
  advance_paid: number
  status_label: string
  order_date: string
  promised_date: string | null
  delivery_method: string | null
  design_number: string | null
  size_1: string | null
  size_2: string | null
  pocket_style: string | null
  collar_style: string | null
  collar_cut: string | null
  qurta_style: string | null
  style_options: Record<string, boolean> | null
  tailor_customer: {
    customer_name: string
    phone: string
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
  }
  taken_by: string
}

type Props = {
  order: TailorOrderSlipData
  onClose: () => void
}

const MEASUREMENT_ROWS: { key: keyof TailorOrderSlipData['tailor_customer']; label: string }[] = [
  { key: 'measurement_length', label: 'Length' },
  { key: 'measurement_teera', label: 'Armhole' },
  { key: 'measurement_chest', label: 'Chest' },
  { key: 'measurement_waist', label: 'Waist' },
  { key: 'measurement_hip', label: 'Hip' },
  { key: 'measurement_shoulder', label: 'Shoulder' },
  { key: 'measurement_sleeve_length', label: 'Sleeve Length' },
  { key: 'measurement_sleeve_round', label: 'Sleeve Round' },
  { key: 'measurement_neck', label: 'Collar' },
  { key: 'measurement_daman', label: 'Hem Width' },
  { key: 'measurement_shalwar_length', label: 'Shalwar Length' },
  { key: 'measurement_bottom', label: 'Ankle Opening' },
]

const STYLE_LABELS: Record<string, string> = {
  large_buttons: 'Large Buttons', metal_buttons: 'Metal Buttons', kaf_dboty: 'Kaf Dboty',
  kaj_patti: 'Kaj Patti', btn_dboty: 'Button Dboty', five_button: '5 Button', no_label: 'No Label',
  shalwar_zip: 'Shalwar Zip', two_jeb: '2 Jeb', no_jeb: 'No Jeb', nokdar_tera: 'Nokdar Teera',
  chalk_asten: 'Chalk Asten', kuf_dbl_kaj: 'Kuf Dbl Kaj',
}

export default function TailorOrderSlip({ order, onClose }: Props) {
  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')

  useEffect(() => {
    getCompanyName().then((v) => setCompanyName(v || ''))
    getCompanyPhone().then((v) => setCompanyPhone(v || ''))
    getCompanyAddress().then((v) => setCompanyAddress(v || ''))
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const balance = order.price - order.advance_paid

  return (
    <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-dialog" style={{ marginTop: 30, width: 480 }}>
        <div className="modal-content">
          <div className="modal-header no-print">
            <button type="button" className="close" onClick={onClose}>&times;</button>
            <h4 className="modal-title">Tracking Slip — {order.order_number}</h4>
          </div>

          <div className="modal-body">
            <div id="tailor-slip-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, padding: 8 }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #333', paddingBottom: 10, marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>{companyName || 'Tailor Shop'}</h3>
                {companyAddress && <div style={{ fontSize: 11, color: '#555' }}>{companyAddress}</div>}
                {companyPhone && <div style={{ fontSize: 11, color: '#555' }}>{companyPhone}</div>}
              </div>

              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>{order.order_number}</div>
                <div style={{ fontSize: 11, color: '#777' }}>Keep this slip — show it to collect your order</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                <tbody>
                  <tr><td><strong>Customer</strong></td><td>{order.tailor_customer.customer_name}</td></tr>
                  <tr><td><strong>Phone</strong></td><td>{order.tailor_customer.phone}</td></tr>
                  <tr><td><strong>Garment</strong></td><td>{order.garment_type} x{order.quantity}</td></tr>
                  {order.fabric_details && <tr><td><strong>Fabric</strong></td><td>{order.fabric_details}</td></tr>}
                  {order.design_number && <tr><td><strong>Design #</strong></td><td>{order.design_number}</td></tr>}
                  {(order.size_1 || order.size_2) && (
                    <tr><td><strong>Size</strong></td><td>{[order.size_1, order.size_2].filter(Boolean).join(' / ')}</td></tr>
                  )}
                  <tr><td><strong>Order Date</strong></td><td>{new Date(order.order_date).toLocaleDateString()}</td></tr>
                  {order.promised_date && <tr><td><strong>Promised</strong></td><td>{new Date(order.promised_date).toLocaleDateString()}</td></tr>}
                  <tr><td><strong>Status</strong></td><td>{order.status_label}</td></tr>
                  {order.delivery_method && (
                    <tr><td><strong>Delivery</strong></td><td>{order.delivery_method === 'home_delivery' ? 'Home Delivery' : 'Pickup from shop'}</td></tr>
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
                {order.pocket_style && order.pocket_style !== 'none' && (
                  <StyleIconLabel Icon={STYLE_ICONS.pocket_style[order.pocket_style as keyof typeof STYLE_ICONS.pocket_style]} label={order.pocket_style.replace('_', ' ')} />
                )}
                {order.collar_style && order.collar_style !== 'none' && (
                  <StyleIconLabel Icon={STYLE_ICONS.collar_style[order.collar_style as keyof typeof STYLE_ICONS.collar_style]} label={order.collar_style.replace('_', ' ')} />
                )}
                {order.collar_cut && order.collar_cut !== 'none' && (
                  <StyleIconLabel Icon={STYLE_ICONS.collar_cut[order.collar_cut as keyof typeof STYLE_ICONS.collar_cut]} label={`${order.collar_cut} cut`} />
                )}
                {order.qurta_style && order.qurta_style !== 'none' && (
                  <StyleIconLabel Icon={STYLE_ICONS.qurta_style[order.qurta_style as keyof typeof STYLE_ICONS.qurta_style]} label={order.qurta_style.replace('_', ' ')} />
                )}
              </div>

              {(() => {
                const extraBits = Object.entries(order.style_options || {}).filter(([, v]) => v).map(([k]) => STYLE_LABELS[k] || k)
                return extraBits.length > 0 ? (
                  <div style={{ fontSize: 11, marginBottom: 10, color: '#333' }}>
                    <strong>Other: </strong>{extraBits.join(', ')}
                  </div>
                ) : null
              })()}

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, border: '1px solid #ccc' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #ccc', padding: 4 }}>Tailoring Amount</td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{order.tailoring_amount.toFixed(2)}</td>
                  </tr>
                  {order.extra_stitching_amount > 0 && (
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>Sp. Stitching</td>
                      <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{order.extra_stitching_amount.toFixed(2)}</td>
                    </tr>
                  )}
                  {order.other_charges_amount > 0 && (
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>Other Charges</td>
                      <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{order.other_charges_amount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ border: '1px solid #ccc', padding: 4 }}><strong>Total</strong></td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}><strong>{order.price.toFixed(2)}</strong></td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ccc', padding: 4 }}>Advance Paid</td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{order.advance_paid.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ccc', padding: 4 }}><strong>Balance Due</strong></td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}><strong>{balance.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}><strong>Measurements (inches)</strong></div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 10 }}>
                <tbody>
                  {MEASUREMENT_ROWS.filter((m) => order.tailor_customer[m.key] != null).map((m) => (
                    <tr key={m.key}>
                      <td style={{ padding: '2px 4px', color: '#555' }}>{m.label}</td>
                      <td style={{ padding: '2px 4px', textAlign: 'right' }}>{formatAsFraction(order.tailor_customer[m.key])}&quot;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: 'center', fontSize: 11, color: '#777', borderTop: '2px dashed #333', paddingTop: 8 }}>
                Order taken by {order.taken_by}. Thank you!
              </div>
            </div>
          </div>

          <div className="modal-footer no-print">
            <button className="btn btn-default" onClick={onClose}>Close</button>
            <button className="btn bg-navy" onClick={handlePrint}>Print Slip</button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #tailor-slip-print, #tailor-slip-print * { visibility: visible; }
          #tailor-slip-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
