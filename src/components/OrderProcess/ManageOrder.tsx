'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { FetchOrders, SerializedOrder } from './actions/FetchOrders'
import { updateOrderStatus } from './actions/UpdateOrderStatus'
import { fetchCurrency } from '../settings/actions/fetchCurrency'
import { hasPermission } from '@/lib/clientPermissions'
import { toast } from 'sonner'

const STATUS_LABEL: Record<number, { text: string; className: string }> = {
  0: { text: 'Pending', className: 'label-warning' },
  1: { text: 'Cancelled', className: 'label-danger' },
  2: { text: 'Completed', className: 'label-success' },
}

export default function ManageOrder() {
  const { data: session } = useSession()
  const canView = hasPermission(session, 'action:view-order', 'view')
  const canChangeStatus = hasPermission(session, 'action:change-order-status')
  const [orders, setOrders] = useState<SerializedOrder[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | '0' | '1' | '2'>('all')
  const [currency, setCurrency] = useState('Rs')
  const [loading, setLoading] = useState(true)

  const [confirmOrderId, setConfirmOrderId] = useState<number | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    FetchOrders().then((data) => { setOrders(data); setLoading(false) })
  }, [])

  useEffect(() => {
    fetchCurrency().then((data) => { if (data?.currency) setCurrency(data.currency) })
  }, [])

  const handleChangeStatus = async (orderId: number, status: number) => {
    try {
      await updateOrderStatus(orderId, status)
      setOrders((prev) => prev.map((o) => o.order_id === orderId ? { ...o, order_status: status } : o))
      toast.success(status === 2 ? 'Order confirmed' : 'Order cancelled')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status')
    } finally {
      setConfirmOrderId(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const displayNo = order.order_number || String(order.order_no)
    const matchesSearch =
      displayNo.toLowerCase().includes(search.toLowerCase()) ||
      order.sales_person.toLowerCase().includes(search.toLowerCase()) ||
      new Date(order.order_date).toLocaleDateString().includes(search)

    const matchesStatus = statusFilter === 'all' ? true : order.order_status.toString() === statusFilter

    return matchesSearch && matchesStatus
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentOrders = itemsPerPage === -1 ? filteredOrders : filteredOrders.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Manage Orders</a></li>
          <li><a href="#">Order Process</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          {!loading && (
            <div className="row">
              <div className="col-md-3">
                <div className="small-box bg-aqua">
                  <div className="inner"><h3>{orders.length}</h3><p>Total Orders</p></div>
                  <div className="icon"><i className="fa fa-shopping-cart"></i></div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="small-box bg-yellow">
                  <div className="inner"><h3>{orders.filter(o => o.order_status === 0).length}</h3><p>Pending</p></div>
                  <div className="icon"><i className="fa fa-clock-o"></i></div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="small-box bg-green">
                  <div className="inner"><h3>{orders.filter(o => o.order_status === 2).length}</h3><p>Completed</p></div>
                  <div className="icon"><i className="fa fa-check-circle"></i></div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="small-box bg-red">
                  <div className="inner"><h3>{currency} {orders.filter(o => o.order_status === 2).reduce((s, o) => s + Number(o.grand_total), 0).toFixed(0)}</h3><p>Completed Value</p></div>
                  <div className="icon"><i className="fa fa-money"></i></div>
                </div>
              </div>
            </div>
          )}

          <div className="box box-primary">
            <div className="box-header box-header-background with-border d-flex justify-between items-center">
              <h3 className="box-title text-center">Manage Orders</h3>
              <input
                type="text"
                placeholder="Search by order no, date, sales person…"
                className="form-control w-64 inline-block ml-4"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              />
            </div>

            <div className="box-body">
              <div className="mb-3 flex justify-between items-center">
                <div style={{ display: 'flex', gap: 10 }}>
                  <div>
                    <label>Status: </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="form-control d-inline-block w-auto ml-2"
                    >
                      <option value="all">All</option>
                      <option value="0">Pending</option>
                      <option value="1">Cancelled</option>
                      <option value="2">Completed</option>
                    </select>
                  </div>
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
                    <th className="active text-center">Order No</th>
                    <th className="active text-center">Order Date</th>
                    <th className="active text-center">Status</th>
                    <th className="active text-center">Total</th>
                    <th className="active text-center">Sales By</th>
                    <th className="active text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center"><strong>Loading orders...</strong></td></tr>
                  ) : currentOrders.length > 0 ? (
                    currentOrders.map((order, i) => {
                      const status = STATUS_LABEL[order.order_status] || STATUS_LABEL[2]
                      return (
                        <tr key={order.order_id} className="text-center">
                          <td>{indexOfFirstItem + i + 1}</td>
                          <td>
                            {canView ? (
                              <Link href={`/dashboard/order-process/invoice/${order.order_id}?isOrder=true`}>
                                <strong>{order.order_number || order.order_no}</strong>
                              </Link>
                            ) : (
                              <strong>{order.order_number || order.order_no}</strong>
                            )}
                          </td>
                          <td>{new Date(order.order_date).toLocaleDateString()}</td>
                          <td><span className={`label ${status.className}`}>{status.text}</span></td>
                          <td><strong>{currency} {order.grand_total}</strong></td>
                          <td>{order.sales_person}</td>
                          <td>
                            <div className="btn-group">
                              {canView ? (
                                <Link href={`/dashboard/order-process/invoice/${order.order_id}?isOrder=true`}>
                                  <button className="btn bg-navy btn-xs" title="View">
                                    <i className="fa fa-eye"></i> View
                                  </button>
                                </Link>
                              ) : (
                                <button className="btn btn-default btn-xs" disabled title="No permission to view order details">
                                  <i className="fa fa-lock"></i> View
                                </button>
                              )}
                              {order.order_status === 0 && canChangeStatus && (
                                <button
                                  className="btn btn-warning btn-xs"
                                  style={{ marginLeft: 6 }}
                                  title="Change Status"
                                  onClick={() => setConfirmOrderId(order.order_id)}
                                >
                                  <i className="fa fa-refresh"></i> Change
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan={7} className="text-center"><strong>No orders found</strong></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {confirmOrderId !== null && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOrderId(null) }}>
          <div className="modal-dialog" style={{ marginTop: 100, width: 420 }}>
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setConfirmOrderId(null)}>&times;</button>
                <h4 className="modal-title">Change Order Status</h4>
              </div>
              <div className="modal-body">
                <p>Do you want to <strong>confirm</strong> or <strong>cancel</strong> this order?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => confirmOrderId && handleChangeStatus(confirmOrderId, 2)}>✅ Confirm</button>
                <button className="btn btn-danger" onClick={() => confirmOrderId && handleChangeStatus(confirmOrderId, 1)}>❌ Cancel</button>
                <button className="btn btn-default" onClick={() => setConfirmOrderId(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
