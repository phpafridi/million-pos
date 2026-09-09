'use client'

import React, { useEffect, useState } from 'react'
import FetchOrderById, { OrderWithDetails } from './actions/FetchOrderById'
import { getCompanyLogo, getCompanyName } from './actions/FetchCompanyDetails'
import { FetchReturnByOrder } from './actions/ProcessReturn'
import InvoicePDF from './InvoicePDF'
import ReturnModal from './ReturnModal'
import ReturnInvoice from './ReturnInvoice'
import FetchProducts from '../Product/actions/FetchProduct'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/clientPermissions'
import PrintReceipt from '../Print/PrintReceipt'

type OrderDetail = {
  product_id: number
  product_name: string
  product_code: string
  product_quantity: number
  selling_price: number
  sub_total: number
  measurement_units: string
  packet_size: number
  attributes: { attribute_name: string; attribute_value: string }[]
}

type OrderData = {
  order_no: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  sales_person: string
  tax: number
  sub_total: number
  discount: number
  discount_amount: number
  payment_method: string
  datetime: string
  order_status: number
  details: OrderDetail[]
  grand_total: number
}

type AllProduct = {
  product_id: number
  product_name: string
  product_code: string
  selling_price: number
  inventory: number
}

type ReturnRecord = {
  return_id: number
  return_no: number
  return_type: string
  refund_method?: string | null
  return_date: string
  note: string | null
  processed_by: string
  items: {
    return_item_id: number
    product_name: string
    product_code: string
    qty: number
    unit_price: number
    sub_total: number
    item_type: string
    attributes?: { attribute_name: string; attribute_value: string }[]
  }[]
}

type Props = {
  id: string
  isOrder: boolean
}

export default function ViewInvoice({ id, isOrder }: Props) {
  const { data: session } = useSession()
  const canView = hasPermission(session, isOrder ? 'action:view-order' : 'action:view-invoice', 'view')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [rawDetails, setRawDetails] = useState<OrderDetail[]>([])
  const [companyName, setCompanyName] = useState<string>('')
  const [companyLogo, setCompanyLogo] = useState<string>('')
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returns, setReturns] = useState<ReturnRecord[]>([])
  const [showReturnInvoice, setShowReturnInvoice] = useState<ReturnRecord | null>(null)
  const [allProducts, setAllProducts] = useState<AllProduct[]>([])
  const orderId = Number(id)

  const getDisplayQuantity = (detail: OrderDetail) => {
    const packetSize = detail.packet_size
    const isMultiplePackets = packetSize > 0 && detail.product_quantity % packetSize === 0
    const displayQty = isMultiplePackets ? detail.product_quantity / packetSize : detail.product_quantity
    const displayUnit = isMultiplePackets ? 'packet' : detail.measurement_units
    return { displayQty, displayUnit }
  }

  const printInvoice = (id: string) => {
    const printContents = document.getElementById(id)?.innerHTML
    if (!printContents) return
    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Invoice</title>
        <style>
          body{font-family:Arial,sans-serif;padding:20px;}
          table{width:100%;border-collapse:collapse;margin-top:20px;}
          th,td{border:1px solid #ddd;padding:8px;text-align:right;}
          th.desc,td.desc{text-align:left;}
          h1,h2{margin:0;}
          .status{font-weight:bold;padding:4px 8px;border-radius:6px;display:inline-block;}
          .pending{color:#b7791f;}.cancelled{color:#c53030;}.confirmed{color:#2f855a;}
          .returned{color:#c53030;}.exchanged{color:#2b6cb0;}
          .company{margin-top:20px;text-align:center;font-weight:bold;}
        </style></head>
        <body>${printContents}</body></html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const loadReturns = async () => {
    const data = await FetchReturnByOrder(orderId)
    setReturns(
      (data as any[]).map((r) => ({
        return_id: r.return_id,
        return_no: r.return_no,
        return_type: r.return_type,
        return_date: typeof r.return_date === 'string' ? r.return_date : r.return_date.toISOString(),
        note: r.note,
        processed_by: r.processed_by,
        items: r.items.map((item: any) => ({
          return_item_id: item.return_item_id,
          product_name: item.product_name,
          product_code: item.product_code,
          qty: Number(item.qty),
          unit_price: Number(item.unit_price),
          sub_total: Number(item.sub_total),
          item_type: item.item_type,
        })),
      }))
    )
  }

  useEffect(() => {
    const fetchOrder = async () => {
      const o = await FetchOrderById(orderId)
      if (!o) return
      const details: OrderDetail[] = (o.details as any[]).map((d) => ({
        product_id: (d as any).product_id || 0,
        product_name: d.product_name,
        product_code: (d as any).product_code || '',
        product_quantity: d.product_quantity,
        selling_price: d.selling_price,
        sub_total: d.sub_total,
        measurement_units: d.product?.measurement_units || '',
        packet_size: d.product?.packet_size || 0,
        attributes: d.product?.attributes || [],
      }))
      const mapped: OrderData = {
        order_no: o.order_number || `${o.order_no}`,
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        customer_phone: o.customer_phone,
        customer_address: o.customer_address,
        sales_person: o.sales_person,
        order_status: o.order_status,
        tax: o.total_tax,
        sub_total: o.sub_total,
        discount: o.discount,
        discount_amount: o.discount_amount,
        payment_method: o.payment_method,
        datetime: new Date(o.order_date).toLocaleString(),
        details,
        grand_total: o.grand_total,
      }
      setOrder(mapped)
      setRawDetails(details)
    }
    const fetchCompany = async () => {
      const name = await getCompanyName()
      const logo = await getCompanyLogo()
      if (name) setCompanyName(name)
      if (logo) setCompanyLogo(logo)
    }
    const fetchProducts = async () => {
      const res = await FetchProducts()
      setAllProducts(
        (res || []).map((p: any) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          product_code: p.product_code,
          selling_price: Number(p.prices?.[0]?.selling_price) || 0,
          inventory: Number(p.inventories?.[0]?.product_quantity) || 0,
        }))
      )
    }
    fetchOrder()
    fetchCompany()
    loadReturns()
    fetchProducts()
  }, [id])

  if (!order) return <div>Loading...</div>

  if (session && !canView) {
    return (
      <div className="text-center" style={{ padding: 40 }}>
        <div className="alert alert-danger" style={{ display: 'inline-block' }}>
          <i className="fa fa-lock" style={{ marginRight: 8 }} />
          You don&apos;t have permission to view {isOrder ? 'order' : 'invoice'} details. Ask your admin to grant &quot;{isOrder ? 'View Order Detail' : 'View Invoice Detail'}&quot; access.
        </div>
      </div>
    )
  }

  const statusMap: Record<number, { label: string; className: string }> = {
    0: { label: 'Pending', className: 'status pending' },
    1: { label: 'Cancelled', className: 'status cancelled' },
    2: { label: 'Confirmed', className: 'status confirmed' },
    3: { label: 'Returned (Refunded)', className: 'status returned' },
    4: { label: 'Exchanged', className: 'status exchanged' },
  }
  const statusLabelClass: Record<number, string> = {
    0: 'label-warning',
    1: 'label-danger',
    2: 'label-success',
    3: 'label-default',
    4: 'label-info',
  }

  const canReturn = order.order_status === 2

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="/dashboard/order-process/manage-order">{isOrder ? 'Manage Order' : 'Manage Invoice'}</a></li>
          <li><a href="#">{order.order_no}</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h3 className="box-title">{order.order_no}</h3>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {isOrder && (
                      <span className={`label ${statusLabelClass[order.order_status] || 'label-default'}`} style={{ fontSize: 12 }}>
                        {statusMap[order.order_status]?.label || 'Unknown'}
                      </span>
                    )}
                    <button onClick={() => printInvoice('printableArea')} className="btn btn-default btn-sm"><i className="fa fa-print"></i> Print</button>
                    <span className="btn btn-default btn-sm" style={{ padding: '5px 10px' }}><InvoicePDF order={order} /></span>
                    <button
                      onClick={() => document.getElementById('hiddenPrintBtn')?.click()}
                      className="btn btn-default btn-sm"
                      title="Print via thermal receipt printer"
                    >
                      <i className="fa fa-receipt"></i> Reprint Receipt
                    </button>
                    {canReturn && (
                      <button className="btn btn-danger btn-sm" onClick={() => setShowReturnModal(true)}>
                        <i className="fa fa-undo" /> Return / Exchange
                      </button>
                    )}
                  </div>
                </div>

                <div className="box-background" style={{ padding: 24 }}>
                  <div id="printableArea">
                    {companyLogo && (
                      <div className="text-center" style={{ marginBottom: 12 }}>
                        <img src={`/api/uploads/${encodeURIComponent(companyLogo ?? 'default.jpg')}`} alt="Company Logo" style={{ maxHeight: 60 }} />
                      </div>
                    )}

                    <div className="row">
                      <div className="col-sm-4">
                        <p style={{ marginBottom: 2 }}><strong>Date:</strong> {order.datetime}</p>
                        <p style={{ marginBottom: 2 }}><strong>Sales Person:</strong> {order.sales_person}</p>
                        <p style={{ marginBottom: 2 }} className="text-capitalize"><strong>Payment Method:</strong> {order.payment_method}</p>
                      </div>
                      {!isOrder && (
                        <div className="col-sm-4 col-sm-offset-4">
                          <p style={{ marginBottom: 2 }}><strong>Customer:</strong> {order.customer_name}</p>
                          {order.customer_phone && <p style={{ marginBottom: 2 }}>{order.customer_phone}</p>}
                          {order.customer_email && <p style={{ marginBottom: 2 }}>{order.customer_email}</p>}
                          {order.customer_address && <p style={{ marginBottom: 2 }}>{order.customer_address}</p>}
                        </div>
                      )}
                    </div>

                    <hr />

                    <div className="table-responsive">
                    <table className="table table-striped table-bordered" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th className="active">#</th>
                          <th className="active">DESCRIPTION</th>
                          <th className="active text-right">UNIT PRICE</th>
                          <th className="active text-right">TAX</th>
                          <th className="active text-right">QUANTITY</th>
                          <th className="active">UNIT</th>
                          <th className="active text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.details.map((d, idx) => {
                          const { displayQty, displayUnit } = getDisplayQuantity(d)
                          return (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>
                                {d.product_name}
                                {d.attributes && d.attributes.length > 0 && (
                                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                    {d.attributes.map((a, ai) => (
                                      <span key={ai} style={{ marginRight: 8 }}>{a.attribute_name}: {a.attribute_value}</span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="text-right">{d.selling_price.toFixed(2)}</td>
                              <td className="text-right">{order.tax}</td>
                              <td className="text-right">{displayQty}</td>
                              <td>{displayUnit}</td>
                              <td className="text-right">{d.sub_total.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    </div>

                    <div className="row" style={{ marginTop: 16 }}>
                      <div className="col-sm-4 col-sm-offset-8">
                        <table className="table" style={{ marginBottom: 0 }}>
                          <tbody>
                            <tr><td>Subtotal</td><td className="text-right">{order.sub_total.toFixed(2)}</td></tr>
                            {order.discount_amount > 0 && (
                              <tr><td>Discount{order.discount > 0 ? ` (${order.discount}%)` : ''}</td><td className="text-right" style={{ color: '#d9403a' }}>-{order.discount_amount.toFixed(2)}</td></tr>
                            )}
                            {order.tax > 0 && (
                              <tr><td>Tax</td><td className="text-right">{order.tax}</td></tr>
                            )}
                            <tr style={{ borderTop: '2px solid #eee' }}><td><strong>Grand Total</strong></td><td className="text-right"><strong style={{ fontSize: 16 }}>{order.grand_total.toFixed(2)}</strong></td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {returns.length > 0 && (
                      <div style={{ marginTop: 20, borderTop: '2px dashed #ccc', paddingTop: 12 }}>
                        <strong style={{ color: '#d9534f' }}>
                          <i className="fa fa-undo" /> RETURN / EXCHANGE HISTORY
                        </strong>
                        {returns.map((r) => (
                          <div key={r.return_id} style={{ marginTop: 6, background: '#fff8f8', border: '1px solid #f5c6cb', borderRadius: 4, padding: '4px 10px', fontSize: 13 }}>
                            <strong>RET-{r.return_no}</strong> — {r.return_type === 'payment' ? 'Payment Refund' : 'Exchange'} — {new Date(r.return_date).toLocaleDateString()} — by {r.processed_by}
                            {r.note && <span className="text-muted"> | Note: {r.note}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-center text-muted" style={{ marginTop: 20, fontSize: 12 }}>{companyName || 'Company Name'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {returns.length > 0 && (
        <div className="container-fluid">
        <div className="box box-primary" style={{ marginTop: 0 }}>
          <div className="box-header box-header-background with-border">
            <h3 className="box-title"><i className="fa fa-undo" /> Return / Exchange Records</h3>
          </div>
          <div className="box-background" style={{ padding: 0 }}>
            <div className="box-body">
              <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead>
                  <tr>
                    <th>Return No</th><th>Type</th><th>Date</th><th>Processed By</th><th>Items</th><th>Note</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r.return_id}>
                      <td>RET-{r.return_no}</td>
                      <td>{r.return_type === 'payment' ? <span className="label label-danger">Refund</span> : <span className="label label-info">Exchange</span>}</td>
                      <td>{new Date(r.return_date).toLocaleDateString()}</td>
                      <td>{r.processed_by}</td>
                      <td>{r.items.filter((i) => i.item_type === 'returned').length} item(s)</td>
                      <td>{r.note || '—'}</td>
                      <td><button className="btn btn-xs btn-default" onClick={() => setShowReturnInvoice(r)}><i className="fa fa-eye" /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
        </div>
        )}

      {showReturnModal && (
        <ReturnModal
          orderId={orderId}
          orderNo={Number(order.order_no)}
          orderDetails={rawDetails}
          allProducts={allProducts}
          processedBy={session?.user?.name || session?.user?.email || 'Staff'}
          onClose={() => setShowReturnModal(false)}
          onSuccess={async () => {
            setShowReturnModal(false)
            await loadReturns()
            const o = await FetchOrderById(orderId)
            if (o) setOrder((prev) => prev ? { ...prev, order_status: o.order_status } : prev)
          }}
        />
      )}

      {showReturnInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReturnInvoice(null) }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, maxWidth: 750, width: '95%' }}>
            <ReturnInvoice
              returnData={{
                return_id: showReturnInvoice.return_id,
                return_no: showReturnInvoice.return_no,
                return_type: showReturnInvoice.return_type as 'payment' | 'exchange',
                refund_method: showReturnInvoice.refund_method,
                return_date: showReturnInvoice.return_date,
                order_no: Number(order.order_no),
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                processed_by: showReturnInvoice.processed_by,
                note: showReturnInvoice.note || undefined,
                items: showReturnInvoice.items.map(i => ({ ...i, item_type: i.item_type as 'exchange' | 'returned' })),

                companyName,
              }}
              onClose={() => setShowReturnInvoice(null)}
            />
          </div>
        </div>
      )}

      {/* Hidden thermal reprint trigger — reconstructs receipt data from the saved order, not live cart state */}
      <PrintReceipt
        customer={{ customer_name: order.customer_name }}
        cart={order.details.map(d => ({
          product_name: d.product_name,
          qty: d.product_quantity,
          price: d.selling_price,
          taxAmount: 0,
          packet_size: d.packet_size,
          measurement_units: d.measurement_units,
          attributes: d.attributes,
        }))}
        subtotal={order.sub_total}
        discount={order.discount_amount}
        grandTotal={order.grand_total}
        paidAmount={order.payment_method === 'pending' ? 0 : order.grand_total}
        changeAmount={0}
        orderNo={order.order_no}
        orderDate={order.datetime}
        salesPerson={order.sales_person}
      />
    </div>
  )
}
