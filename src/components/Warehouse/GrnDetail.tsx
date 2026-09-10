'use client'
import React, { useEffect, useState } from 'react'
import { FetchGrnById } from './actions/FetchGrnById'
import { toast } from 'sonner'

const SOURCE_LABELS: Record<string, string> = {
  supplier_purchase: 'Supplier Purchase',
  transfer: 'Transfer',
  manual_adjustment: 'Manual Adjustment',
}

export default function GrnDetail({ grnId }: { grnId: number }) {
  const [grn, setGrn] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    FetchGrnById(grnId)
      .then((data) => {
        if (!data) { toast.error('GRN not found'); return }
        setGrn(data)
      })
      .catch((err) => toast.error(err.message || 'Failed to load GRN'))
      .finally(() => setLoading(false))
  }, [grnId])

  if (loading) return <div className="right-side" style={{ minHeight: '945px', padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!grn) return <div className="right-side" style={{ minHeight: '945px', padding: 40, textAlign: 'center' }}>GRN not found.</div>

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-8 col-md-offset-2">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border d-flex justify-between items-center">
                  <h3 className="box-title">{grn.grn_number}</h3>
                  <button className="btn btn-default btn-sm" onClick={() => window.print()}>
                    <i className="fa fa-print"></i> Print
                  </button>
                </div>
                <div className="box-background" style={{ padding: 24 }}>
                  <div className="row" style={{ marginBottom: 20 }}>
                    <div className="col-sm-6">
                      <p><strong>Warehouse:</strong> {grn.shop_name} ({grn.shop_code})</p>
                      <p><strong>Received By:</strong> {grn.received_by}</p>
                    </div>
                    <div className="col-sm-6 text-right">
                      <p><strong>Date:</strong> {new Date(grn.created_at).toLocaleString()}</p>
                      <p><strong>Source:</strong> {SOURCE_LABELS[grn.source_type] || grn.source_type}</p>
                    </div>
                  </div>
                  <p><strong>Description:</strong> {grn.source_description}</p>
                  {grn.notes && <p><strong>Notes:</strong> {grn.notes}</p>}

                  <table className="table table-bordered" style={{ marginTop: 20 }}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Product</th>
                        <th className="text-right">Qty</th>
                        <th>Unit</th>
                        {grn.items.some((i: any) => i.unit_cost !== null) && <th className="text-right">Unit Cost</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {grn.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td>{item.product_code}</td>
                          <td>{item.product_name}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td>{item.unit || '—'}</td>
                          {grn.items.some((i: any) => i.unit_cost !== null) && (
                            <td className="text-right">{item.unit_cost !== null ? item.unit_cost.toFixed(2) : '—'}</td>
                          )}
                        </tr>
                      ))}
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
