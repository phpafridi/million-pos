'use client'

import React, { useEffect, useState } from 'react'
import PhotoGallery from '../shared/PhotoGallery'
import { FetchEntityPhotos } from '@/lib/entityPhotos'

type ReturnItemDisplay = {
  product_name: string
  product_code: string
  qty: number
  unit_price: number
  sub_total: number
  item_type: 'returned' | 'exchange'
  attributes?: { attribute_name: string; attribute_value: string }[]
}

type ReturnData = {
  return_id: number
  return_no: number
  return_type: 'payment' | 'exchange'
  refund_method?: string | null
  return_date: string
  order_no: number
  customer_name: string
  customer_phone: string
  processed_by: string
  note?: string
  items: ReturnItemDisplay[]
  companyName?: string
}

type Props = {
  returnData: ReturnData
  onClose?: () => void
}

export default function ReturnInvoice({ returnData, onClose }: Props) {
  const [photos, setPhotos] = useState<any[]>([])
  useEffect(() => {
    FetchEntityPhotos('return', returnData.return_id).then(setPhotos).catch(() => {})
  }, [returnData.return_id])

  const returnedItems = returnData.items.filter((i) => i.item_type === 'returned')
  const exchangedItems = returnData.items.filter((i) => i.item_type === 'exchange')
  const returnTotal = returnedItems.reduce((s, i) => s + i.sub_total, 0)
  const exchangeTotal = exchangedItems.reduce((s, i) => s + i.sub_total, 0)

  const handlePrint = () => {
    const content = document.getElementById('return-invoice-print')?.innerHTML
    if (!content) return
    const win = window.open('', '', 'width=800,height=600')
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Return Invoice - RET-${returnData.return_no}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #ddd; padding: 7px 10px; }
              th { background: #f5f5f5; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .badge-return { background: #d9534f; color: #fff; padding: 2px 8px; border-radius: 4px; }
              .badge-exchange { background: #337ab7; color: #fff; padding: 2px 8px; border-radius: 4px; }
              h2 { margin: 0 0 4px; }
              .section-title { font-weight: bold; margin: 14px 0 4px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `)
      win.document.close()
      win.print()
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-default btn-sm" onClick={handlePrint}>
          <i className="fa fa-print" /> Print Return Invoice
        </button>
        {onClose && (
          <button className="btn btn-default btn-sm" style={{ marginLeft: 8 }} onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <div id="return-invoice-print" style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{returnData.companyName || 'Company'}</h2>
          <div style={{ fontSize: 13, color: '#555' }}>
            {returnData.return_type === 'payment' ? (
              <span style={{ background: '#d9534f', color: '#fff', padding: '2px 10px', borderRadius: 4 }}>
                PAYMENT RETURN / REFUND
              </span>
            ) : (
              <span style={{ background: '#337ab7', color: '#fff', padding: '2px 10px', borderRadius: 4 }}>
                PRODUCT EXCHANGE
              </span>
            )}
            {returnData.return_type === 'payment' && returnData.refund_method && (
              <span style={{ marginLeft: 8, color: '#555' }}>
                via {returnData.refund_method.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Info Row */}
        <table style={{ border: 'none', marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ border: 'none', padding: '2px 8px', width: '50%' }}>
                <strong>Return No:</strong> RET-{returnData.return_no}
              </td>
              <td style={{ border: 'none', padding: '2px 8px' }}>
                <strong>Date:</strong> {new Date(returnData.return_date).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ border: 'none', padding: '2px 8px' }}>
                <strong>Original Order:</strong> ORD-{returnData.order_no}
              </td>
              <td style={{ border: 'none', padding: '2px 8px' }}>
                <strong>Processed By:</strong> {returnData.processed_by}
              </td>
            </tr>
            <tr>
              <td style={{ border: 'none', padding: '2px 8px' }}>
                <strong>Customer:</strong> {returnData.customer_name}
              </td>
              <td style={{ border: 'none', padding: '2px 8px' }}>
                <strong>Phone:</strong> {returnData.customer_phone}
              </td>
            </tr>
          </tbody>
        </table>

        {returnData.note && (
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '6px 10px', borderRadius: 4, marginBottom: 8, fontSize: 13 }}>
            <strong>Note:</strong> {returnData.note}
          </div>
        )}

        {/* Returned Items */}
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #aaa', margin: '10px 0 4px', paddingBottom: 4 }}>
          Returned Items (Stock Restored)
        </div>
        <table>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th>#</th>
              <th style={{ textAlign: 'left' }}>Product</th>
              <th style={{ textAlign: 'left' }}>Code</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {returnedItems.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>
                  {item.product_name}
                  {item.attributes && item.attributes.length > 0 && (
                    <div style={{ fontSize: 10, color: '#6b7280' }}>
                      {item.attributes.map((a, ai) => (
                        <span key={ai} style={{ marginRight: 6 }}>{a.attribute_name}: {a.attribute_value}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td>{item.product_code}</td>
                <td style={{ textAlign: 'right' }}>{item.unit_price.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{item.qty}</td>
                <td style={{ textAlign: 'right' }}>{item.sub_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                Total Returned Value:
              </td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                {returnTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Exchange Items (only for exchange type) */}
        {returnData.return_type === 'exchange' && exchangedItems.length > 0 && (
          <>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #aaa', margin: '14px 0 4px', paddingBottom: 4 }}>
              Exchange Items (Issued to Customer)
            </div>
            <table>
              <thead>
                <tr style={{ background: '#e8f0fe' }}>
                  <th>#</th>
                  <th style={{ textAlign: 'left' }}>Product</th>
                  <th style={{ textAlign: 'left' }}>Code</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {exchangedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>
                      {item.product_name}
                      {item.attributes && item.attributes.length > 0 && (
                        <div style={{ fontSize: 10, color: '#6b7280' }}>
                          {item.attributes.map((a, ai) => (
                            <span key={ai} style={{ marginRight: 6 }}>{a.attribute_name}: {a.attribute_value}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{item.product_code}</td>
                    <td style={{ textAlign: 'right' }}>{item.unit_price.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>{item.sub_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    Total Exchange Value:
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {exchangeTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Summary */}
        <div style={{ marginTop: 16, background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 4, padding: '10px 16px' }}>
          {returnData.return_type === 'payment' ? (
            <>
              <div style={{ fontWeight: 'bold', color: '#d9534f', marginBottom: 4 }}>
                ✓ REFUND SUMMARY
              </div>
              <div>Amount to Refund to Customer: <strong>{returnTotal.toFixed(2)}</strong></div>
              <div style={{ color: '#777', fontSize: 12, marginTop: 4 }}>
                * Stock has been restored. Original payment entry has been voided.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 'bold', color: '#337ab7', marginBottom: 4 }}>
                ✓ EXCHANGE SUMMARY
              </div>
              <div>Returned Value: <strong>{returnTotal.toFixed(2)}</strong></div>
              <div>Exchange Value: <strong>{exchangeTotal.toFixed(2)}</strong></div>
              {Math.abs(returnTotal - exchangeTotal) > 0.01 && (
                <div>
                  Balance {returnTotal > exchangeTotal ? 'Refund' : 'Due'}:{' '}
                  <strong>{Math.abs(returnTotal - exchangeTotal).toFixed(2)}</strong>
                </div>
              )}
              <div style={{ color: '#777', fontSize: 12, marginTop: 4 }}>
                * Returned items restocked. Exchange items deducted from inventory.
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#999', borderTop: '1px solid #ddd', paddingTop: 10 }}>
          Thank you — {returnData.companyName || 'Our Store'}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '12px auto 0' }}>
        <label style={{ fontWeight: 700, fontSize: 13 }}>Photos</label>
        <div style={{ marginTop: 6 }}>
          <PhotoGallery photos={photos} />
        </div>
      </div>
    </div>
  )
}
