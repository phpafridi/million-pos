'use client'

import React, { useEffect, useState } from 'react'
import { FetchAllReturns } from '../OrderProcess/actions/ProcessReturn'
import Link from 'next/link'

type ReturnRecord = {
  return_id: number
  return_no: number
  return_type: string
  return_date: string
  note: string | null
  processed_by: string
  order: { order_no: number; customer_name: string; grand_total: number }
  items: { qty: number; sub_total: number; item_type: string }[]
}

export default function ReturnsList() {
  const [returns, setReturns] = useState<ReturnRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'payment' | 'exchange'>('all')

  useEffect(() => {
    const load = async () => {
      const data = await FetchAllReturns()
      setReturns(
        (data as any[]).map((r) => ({
          return_id: r.return_id,
          return_no: r.return_no,
          return_type: r.return_type,
          return_date: typeof r.return_date === 'string' ? r.return_date : r.return_date.toISOString(),
          note: r.note,
          processed_by: r.processed_by,
          order: {
            order_no: r.order.order_no,
            customer_name: r.order.customer_name,
            grand_total: Number(r.order.grand_total),
          },
          items: r.items.map((i: any) => ({
            qty: Number(i.qty),
            sub_total: Number(i.sub_total),
            item_type: i.item_type,
          })),
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  const filtered = returns.filter((r) => {
    const matchType = typeFilter === 'all' || r.return_type === typeFilter
    const matchSearch =
      !search ||
      r.order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.return_no.toString().includes(search) ||
      r.order.order_no.toString().includes(search)
    return matchType && matchSearch
  })

  if (loading) return <div className="right-side">Loading returns...</div>

  return (
    <div className="right-side">
      <section className="content-header">
        <ol className="breadcrumb">
          <li><a href="/dashboard/order-process/manage-invoice">Invoices</a></li>
          <li>Returns &amp; Exchanges</li>
        </ol>
      </section>
      <br />
      <div className="container-fluid">
        <div className="box">
          <div className="box-header box-header-background with-border">
            <h3 className="box-title"><i className="fa fa-undo" /> Returns &amp; Exchange Records</h3>
          </div>
          <div className="box-body">
            <div className="row" style={{ marginBottom: 12 }}>
              <div className="col-md-5">
                <input
                  type="text" className="form-control"
                  placeholder="Search customer, return no, order no..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-md-7">
                <div className="btn-group">
                  {(['all', 'payment', 'exchange'] as const).map((t) => (
                    <button key={t} type="button"
                      className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-default'}`}
                      onClick={() => setTypeFilter(t)}>
                      {t === 'all' ? 'All' : t === 'payment' ? 'Payment Refunds' : 'Exchanges'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <table className="table table-bordered table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Return No</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Order No</th>
                  <th>Customer</th>
                  <th>Items Returned</th>
                  <th>Return Value</th>
                  <th>Processed By</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const retItems = r.items.filter((i) => i.item_type === 'returned')
                  const retValue = retItems.reduce((s, i) => s + i.sub_total, 0)
                  return (
                    <tr key={r.return_id}>
                      <td>{idx + 1}</td>
                      <td><strong>RET-{r.return_no}</strong></td>
                      <td>
                        {r.return_type === 'payment'
                          ? <span className="label label-danger">Refund</span>
                          : <span className="label label-info">Exchange</span>}
                      </td>
                      <td>{new Date(r.return_date).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/dashboard/order-process/invoice/${r.order.order_no}?isOrder=false`}
                          className="text-primary">
                          ORD-{r.order.order_no}
                        </Link>
                      </td>
                      <td>{r.order.customer_name}</td>
                      <td>{retItems.length} item(s) × {retItems.reduce((s, i) => s + i.qty, 0)} units</td>
                      <td>{retValue.toFixed(2)}</td>
                      <td>{r.processed_by}</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.note || '—'}
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/order-process/invoice/${r.order.order_no}?isOrder=false`}
                          className="btn btn-xs btn-default">
                          <i className="fa fa-eye" /> View Order
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', color: '#aaa', padding: '30px 0' }}>
                      No return records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
