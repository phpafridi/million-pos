'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchInvoices, SerializedInvoice } from './actions/FetchInvoices'
import Link from 'next/link'
import { fetchCurrency } from '../settings/actions/fetchCurrency'
import { hasPermission } from '@/lib/clientPermissions'

export default function ManageInvoice() {
  const { data: session } = useSession()
  const canView = hasPermission(session, 'action:view-invoice', 'view')
  const canViewOrder = hasPermission(session, 'action:view-order', 'view')
  const [invoices, setInvoices] = useState<SerializedInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currency, setCurrency] = useState('Rs')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    FetchInvoices().then((data) => { setInvoices(data); setLoading(false) })
    fetchCurrency().then((data) => { if (data?.currency) setCurrency(data.currency) })
  }, [])

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase()
    const invNo = inv.invoice_number || String(inv.invoice_no ?? '')
    const ordNo = inv.order.order_number || String(inv.order.order_no)
    return (
      invNo.toLowerCase().includes(q) ||
      ordNo.toLowerCase().includes(q) ||
      inv.order.customer.customer_name.toLowerCase().includes(q) ||
      new Date(inv.invoice_date).toLocaleDateString().includes(q)
    )
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentInvoices = itemsPerPage === -1 ? filteredInvoices : filteredInvoices.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Manage Invoices</a></li>
          <li><a href="#">Order Process</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          {!loading && (
            <div className="row">
              <div className="col-md-4">
                <div className="small-box bg-aqua">
                  <div className="inner"><h3>{invoices.length}</h3><p>Total Invoices</p></div>
                  <div className="icon"><i className="fa fa-file-text"></i></div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="small-box bg-green">
                  <div className="inner"><h3>{currency} {invoices.reduce((s, i) => s + Number(i.order.grand_total), 0).toFixed(0)}</h3><p>Total Revenue</p></div>
                  <div className="icon"><i className="fa fa-money"></i></div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="small-box bg-purple">
                  <div className="inner"><h3>{currency} {invoices.length > 0 ? (invoices.reduce((s, i) => s + Number(i.order.grand_total), 0) / invoices.length).toFixed(0) : '0'}</h3><p>Average Invoice</p></div>
                  <div className="icon"><i className="fa fa-calculator"></i></div>
                </div>
              </div>
            </div>
          )}

          <div className="box box-primary">
            <div className="box-header box-header-background with-border d-flex justify-between items-center">
              <h3 className="box-title text-center">Manage Invoices</h3>
              <input
                type="text"
                placeholder="Search by invoice, order, customer, or date…"
                className="form-control w-64 inline-block ml-4"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              />
            </div>

            <div className="box-body">
              <div className="mb-3 flex justify-between items-center">
                <div>
                  <label>Show: </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="form-control d-inline-block w-auto ml-2"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={-1}>All</option>
                  </select>
                </div>

                {itemsPerPage !== -1 && (
                  <div>
                    <button className="btn btn-sm btn-default mr-2" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <button className="btn btn-sm btn-default ml-2" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
                  </div>
                )}
              </div>

              <table className="table table-striped table-bordered text-center">
                <thead>
                  <tr>
                    <th className="active col-sm-1 text-center">Sl</th>
                    <th className="active text-center">Invoice No.</th>
                    <th className="active text-center">Order No.</th>
                    <th className="active text-center">Invoice Date</th>
                    <th className="active text-center">Customer</th>
                    <th className="active text-center">Payment Method</th>
                    <th className="active text-center">Order Total</th>
                    <th className="active text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center"><strong>Loading invoices...</strong></td></tr>
                  ) : currentInvoices.length > 0 ? (
                    currentInvoices.map((inv, i) => (
                      <tr key={inv.invoice_id} className="text-center">
                        <td>{indexOfFirstItem + i + 1}</td>
                        <td>
                          {canView ? (
                            <Link href={`/dashboard/order-process/invoice/${inv.order_id}?isOrder=false`}>
                              <strong>{inv.invoice_number || `INV-${inv.invoice_no ?? inv.invoice_id}`}</strong>
                            </Link>
                          ) : (
                            <strong>{inv.invoice_number || `INV-${inv.invoice_no ?? inv.invoice_id}`}</strong>
                          )}
                        </td>
                        <td>
                          {canViewOrder ? (
                            <Link href={`/dashboard/order-process/invoice/${inv.order_id}?isOrder=true`}>
                              <strong>{inv.order.order_number || `ORD-${inv.order.order_no}`}</strong>
                            </Link>
                          ) : (
                            <strong>{inv.order.order_number || `ORD-${inv.order.order_no}`}</strong>
                          )}
                        </td>
                        <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                        <td>{inv.order.customer.customer_name}</td>
                        <td className="text-capitalize">{inv.order.payment_method}</td>
                        <td><strong>{currency} {inv.order.grand_total.toFixed(2)}</strong></td>
                        <td>
                          {canView ? (
                            <Link href={`/dashboard/order-process/invoice/${inv.order_id}?isOrder=false`}>
                              <button className="btn bg-navy btn-xs" title="View">
                                <i className="fa fa-eye"></i> View
                              </button>
                            </Link>
                          ) : (
                            <button className="btn btn-default btn-xs" disabled title="No permission to view invoice details">
                              <i className="fa fa-lock"></i> View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={8} className="text-center"><strong>No invoices found</strong></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
