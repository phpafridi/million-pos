'use client'

import React, { useEffect, useState } from 'react'
import { ProcessReturn, ReturnItem, ExchangeItem } from './actions/ProcessReturn'
import PhotoPicker from '../shared/PhotoPicker'
import { UploadEntityPhotos } from '@/lib/entityPhotos'
import { toast } from 'sonner'

type OrderDetail = {
  product_id: number
  product_name: string
  product_code: string
  product_quantity: number
  selling_price: number
  sub_total: number
}

type AllProduct = {
  product_id: number
  product_name: string
  product_code: string
  selling_price: number
  inventory: number
}

type Props = {
  orderId: number
  orderNo: number
  orderDetails: OrderDetail[]
  allProducts: AllProduct[]
  onClose: () => void
  onSuccess: () => void
  processedBy: string
}

export default function ReturnModal({
  orderId,
  orderNo,
  orderDetails,
  allProducts,
  onClose,
  onSuccess,
  processedBy,
}: Props) {
  const [returnType, setReturnType] = useState<'payment' | 'exchange'>('payment')
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'store_credit'>('cash')
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({})
  const [exchangeItems, setExchangeItems] = useState<
    { product_id: number; product_name: string; product_code: string; qty: number; unit_price: number }[]
  >([])
  const [exchangeSearch, setExchangeSearch] = useState('')
  const [note, setNote] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const filteredExchangeProducts = allProducts.filter(
    (p) =>
      !exchangeItems.find((e) => e.product_id === p.product_id) &&
      (p.product_name.toLowerCase().includes(exchangeSearch.toLowerCase()) ||
        p.product_code.toLowerCase().includes(exchangeSearch.toLowerCase()))
  )

  const returnTotal = orderDetails.reduce((sum, d) => {
    const qty = returnQtys[d.product_id] || 0
    return sum + qty * d.selling_price
  }, 0)

  const exchangeTotal = exchangeItems.reduce((s, i) => s + i.qty * i.unit_price, 0)

  const addExchangeItem = (product: AllProduct) => {
    setExchangeItems((prev) => [
      ...prev,
      {
        product_id: product.product_id,
        product_name: product.product_name,
        product_code: product.product_code,
        qty: 1,
        unit_price: product.selling_price,
      },
    ])
    setExchangeSearch('')
  }

  const updateExchangeQty = (product_id: number, qty: number) => {
    setExchangeItems((prev) =>
      prev.map((i) => (i.product_id === product_id ? { ...i, qty } : i))
    )
  }

  const removeExchangeItem = (product_id: number) => {
    setExchangeItems((prev) => prev.filter((i) => i.product_id !== product_id))
  }

  const handleSubmit = async () => {
    const returnedItems: ReturnItem[] = orderDetails
      .filter((d) => (returnQtys[d.product_id] || 0) > 0)
      .map((d) => ({
        product_id: d.product_id,
        product_name: d.product_name,
        product_code: d.product_code,
        qty: returnQtys[d.product_id],
        unit_price: d.selling_price,
      }))

    if (returnedItems.length === 0) {
      toast.error('Please select at least one item to return')
      return
    }

    if (returnType === 'exchange' && exchangeItems.length === 0) {
      toast.error('Please add exchange items')
      return
    }

    if (returnType === 'exchange') {
      const diff = Math.abs(returnTotal - exchangeTotal)
      if (diff > returnTotal * 0.05 + 1) {
        toast.error(
          `Amount mismatch: Return value is ${returnTotal.toFixed(2)} but exchange value is ${exchangeTotal.toFixed(2)}`
        )
        return
      }
    }

    setLoading(true)
    const res = await ProcessReturn({
      order_id: orderId,
      return_type: returnType,
      refund_method: returnType === 'payment' ? refundMethod : undefined,
      returned_items: returnedItems,
      exchange_items: returnType === 'exchange' ? exchangeItems : undefined,
      note,
      processed_by: processedBy,
    })
    setLoading(false)

    if (res.success) {
      if (photoFiles.length > 0 && res.return_id) {
        try {
          await UploadEntityPhotos('return', res.return_id, photoFiles, processedBy)
        } catch (photoErr) {
          console.error('Failed to upload photos:', photoErr)
          toast.error('Return processed, but photos failed to upload')
        }
      }
      toast.success(res.message)
      onSuccess()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div
      className="modal fade in"
      style={{
        display: 'block',
        background: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflowY: 'auto',
      }}
    >
      <div className="modal-dialog modal-lg" style={{ marginTop: '40px' }}>
        <div className="modal-content">
          <div className="modal-header" style={{ background: '#d9534f', color: '#fff' }}>
            <button onClick={onClose} className="close" style={{ color: '#fff', opacity: 1 }}>
              ×
            </button>
            <h4 className="modal-title">
              <i className="fa fa-undo" /> Process Return — Order #{orderNo}
            </h4>
          </div>

          <div className="modal-body">
            {/* Return Type */}
            <div className="form-group">
              <label className="control-label">Return Type</label>
              <div>
                <label className="radio-inline">
                  <input
                    type="radio"
                    value="payment"
                    checked={returnType === 'payment'}
                    onChange={() => setReturnType('payment')}
                  />{' '}
                  <strong>Payment Refund</strong> — Refund money, restore stock
                </label>
                &nbsp;&nbsp;&nbsp;
                <label className="radio-inline">
                  <input
                    type="radio"
                    value="exchange"
                    checked={returnType === 'exchange'}
                    onChange={() => setReturnType('exchange')}
                  />{' '}
                  <strong>Exchange</strong> — Swap with another product of same value
                </label>
              </div>
            </div>

            {returnType === 'payment' && (
              <div className="form-group">
                <label className="control-label">Refund Method</label>
                <select
                  className="form-control"
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as typeof refundMethod)}
                  style={{ maxWidth: 280 }}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="store_credit">Store Credit</option>
                </select>
              </div>
            )}

            <hr />

            {/* Items to Return */}
            <h5>
              <strong>Select Items to Return</strong>
            </h5>
            <table className="table table-bordered table-sm">
              <thead className="thead-light">
                <tr>
                  <th>Product</th>
                  <th>Sold Qty</th>
                  <th>Unit Price</th>
                  <th>Return Qty</th>
                  <th>Return Value</th>
                </tr>
              </thead>
              <tbody>
                {orderDetails.map((d) => {
                  const rQty = returnQtys[d.product_id] || 0
                  return (
                    <tr key={d.product_id}>
                      <td>{d.product_name}</td>
                      <td>{d.product_quantity}</td>
                      <td>{d.selling_price.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: 90 }}
                          min={0}
                          max={d.product_quantity}
                          step={0.1}
                          value={rQty || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const v = Math.min(
                              parseFloat(e.target.value) || 0,
                              d.product_quantity
                            )
                            setReturnQtys((prev) => ({ ...prev, [d.product_id]: v }))
                          }}
                        />
                      </td>
                      <td className="text-right">
                        {(rQty * d.selling_price).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right">
                    <strong>Total Return Value:</strong>
                  </td>
                  <td className="text-right">
                    <strong>{returnTotal.toFixed(2)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Exchange Section */}
            {returnType === 'exchange' && (
              <>
                <hr />
                <h5>
                  <strong>Select Exchange Products</strong>{' '}
                  <small className="text-muted">
                    (Exchange value must match return value: {returnTotal.toFixed(2)})
                  </small>
                </h5>

                <div className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search product to exchange with..."
                    value={exchangeSearch}
                    onChange={(e) => setExchangeSearch(e.target.value)}
                  />
                </div>

                {/* Search Results */}
                {exchangeSearch && (
                  <div
                    className="list-group"
                    style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}
                  >
                    {filteredExchangeProducts.slice(0, 20).map((p) => (
                      <button
                        key={p.product_id}
                        type="button"
                        className="list-group-item list-group-item-action"
                        onClick={() => addExchangeItem(p)}
                      >
                        <strong>{p.product_name}</strong> — {p.product_code} — Price:{' '}
                        {p.selling_price.toFixed(2)} — Stock: {p.inventory}
                      </button>
                    ))}
                    {filteredExchangeProducts.length === 0 && (
                      <div className="list-group-item text-muted">No products found</div>
                    )}
                  </div>
                )}

                {exchangeItems.length > 0 && (
                  <table className="table table-bordered table-sm">
                    <thead className="thead-light">
                      <tr>
                        <th>Product</th>
                        <th>Unit Price</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {exchangeItems.map((item) => (
                        <tr key={item.product_id}>
                          <td>{item.product_name}</td>
                          <td>{item.unit_price.toFixed(2)}</td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: 80 }}
                              min={0.1}
                              step={0.1}
                              value={item.qty}
                              onChange={(e) =>
                                updateExchangeQty(
                                  item.product_id,
                                  parseFloat(e.target.value) || 1
                                )
                              }
                            />
                          </td>
                          <td>{(item.qty * item.unit_price).toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => removeExchangeItem(item.product_id)}
                            >
                              <i className="fa fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-right">
                          <strong>Exchange Total:</strong>
                        </td>
                        <td
                          className={`text-right font-bold ${
                            Math.abs(exchangeTotal - returnTotal) > returnTotal * 0.05 + 1
                              ? 'text-danger'
                              : 'text-success'
                          }`}
                        >
                          <strong>{exchangeTotal.toFixed(2)}</strong>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </>
            )}

            <hr />
            <div className="form-group">
              <label>Note / Reason</label>
              <textarea
                className="form-control"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note about this return..."
              />
            </div>

            <div className="form-group">
              <PhotoPicker files={photoFiles} onChange={setPhotoFiles} label="Photos (condition of returned item)" />
            </div>

            {returnType === 'payment' && (
              <div className="alert alert-warning">
                <i className="fa fa-exclamation-triangle" />{' '}
                <strong>Payment Refund:</strong> Selected items will be restocked. The original
                payment entry will be voided and the order status will be marked as Returned.
              </div>
            )}
            {returnType === 'exchange' && (
              <div className="alert alert-info">
                <i className="fa fa-exchange" />{' '}
                <strong>Exchange:</strong> Returned items will be restocked. Exchange items will be
                deducted from inventory. Order status will be marked as Exchanged.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <i className="fa fa-spinner fa-spin" /> Processing...
                </>
              ) : (
                <>
                  <i className="fa fa-undo" />{' '}
                  {returnType === 'payment' ? 'Process Refund' : 'Process Exchange'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
