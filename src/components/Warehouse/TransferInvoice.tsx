'use client'
import React from 'react'

type TransferInvoiceData = {
  transfer_number: string
  status: string
  sent_date: string
  received_date: string | null
  total_amount: number
  amount_paid: number
  balance: number
  notes: string | null
  from_shop: { shop_name: string; shop_code: string }
  to_shop: { shop_name: string; shop_code: string }
  items: { product_name: string; quantity: number; unit_price: number; sub_total: number }[]
  payments: { amount: number; method: string; paid_at: string; recorded_by: string }[]
}

type Props = {
  transfer: TransferInvoiceData
  onClose: () => void
}

export default function TransferInvoice({ transfer, onClose }: Props) {
  const handlePrint = () => window.print()

  return (
    <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-dialog" style={{ marginTop: 30, width: 480 }}>
        <div className="modal-content">
          <div className="modal-header no-print">
            <button type="button" className="close" onClick={onClose}>&times;</button>
            <h4 className="modal-title">Transfer Invoice</h4>
          </div>

          <div className="modal-body" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Stock Transfer Invoice</div>
              <div style={{ fontSize: 13, color: '#8a90a3' }}>{transfer.transfer_number}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
              <tbody>
                <tr><td><strong>From</strong></td><td>{transfer.from_shop.shop_name} ({transfer.from_shop.shop_code})</td></tr>
                <tr><td><strong>To</strong></td><td>{transfer.to_shop.shop_name} ({transfer.to_shop.shop_code})</td></tr>
                <tr><td><strong>Sent Date</strong></td><td>{new Date(transfer.sent_date).toLocaleDateString()}</td></tr>
                {transfer.received_date && (
                  <tr><td><strong>Delivered</strong></td><td>{new Date(transfer.received_date).toLocaleDateString()}</td></tr>
                )}
                <tr><td><strong>Status</strong></td><td style={{ textTransform: 'capitalize' }}>{transfer.status}</td></tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, border: '1px solid #ccc' }}>
              <thead>
                <tr style={{ background: '#f5f6fa' }}>
                  <th style={{ border: '1px solid #ccc', padding: 4, textAlign: 'left' }}>Product</th>
                  <th style={{ border: '1px solid #ccc', padding: 4 }}>Qty</th>
                  <th style={{ border: '1px solid #ccc', padding: 4 }}>Unit Price</th>
                  <th style={{ border: '1px solid #ccc', padding: 4 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((i, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #ccc', padding: 4 }}>{i.product_name}</td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>{i.quantity}</td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{i.unit_price.toFixed(2)}</td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{i.sub_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
              <tbody>
                <tr><td>Total</td><td style={{ textAlign: 'right' }}><strong>{transfer.total_amount.toFixed(2)}</strong></td></tr>
                <tr><td>Paid</td><td style={{ textAlign: 'right' }}>{transfer.amount_paid.toFixed(2)}</td></tr>
                <tr><td><strong>Balance</strong></td><td style={{ textAlign: 'right' }}><strong>{transfer.balance.toFixed(2)}</strong></td></tr>
              </tbody>
            </table>

            {transfer.notes && <p style={{ fontSize: 12 }}><strong>Notes:</strong> {transfer.notes}</p>}

            {transfer.payments.length > 0 && (
              <>
                <hr />
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: '#8a90a3' }}>Payment History</div>
                <ul style={{ paddingLeft: 18, fontSize: 12 }}>
                  {transfer.payments.map((p, idx) => (
                    <li key={idx}>{new Date(p.paid_at).toLocaleDateString()} — {p.amount.toFixed(2)} ({p.method}) by {p.recorded_by}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="modal-footer no-print">
            <button className="btn bg-navy btn-flat" onClick={handlePrint}>Print</button>
            <button className="btn btn-default" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .modal { position: static !important; background: none !important; }
          .modal-dialog { margin: 0 !important; width: 100% !important; }
          .modal-content { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  )
}
