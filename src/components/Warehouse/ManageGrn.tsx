'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { FetchGrnList } from './actions/FetchGrnList'

const SOURCE_LABELS: Record<string, string> = {
  supplier_purchase: 'Supplier Purchase',
  transfer: 'Transfer',
  manual_adjustment: 'Manual Adjustment',
}
const SOURCE_ICONS: Record<string, string> = {
  supplier_purchase: 'fa-truck',
  transfer: 'fa-exchange',
  manual_adjustment: 'fa-pencil',
}

export default function ManageGrn() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  const [grns, setGrns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceType, setSourceType] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await FetchGrnList(sourceType ? { sourceType } : undefined)
      setGrns(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [sourceType]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Goods Receive Notes</a></li>
          <li><a href="#">{isSuperAdmin ? 'Head Office' : 'Warehouse'}</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border d-flex justify-between items-center">
              <h3 className="box-title">GRNs ({grns.length})</h3>
              <select className="form-control" style={{ maxWidth: 220, display: 'inline-block', float: 'right' }} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                <option value="">All Sources</option>
                <option value="supplier_purchase">Supplier Purchase</option>
                <option value="transfer">Transfer</option>
                <option value="manual_adjustment">Manual Adjustment</option>
              </select>
            </div>
            <div className="box-background">
              <div className="table-responsive">
                <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th className="active">GRN #</th>
                      <th className="active">Date</th>
                      {isSuperAdmin && <th className="active">Warehouse</th>}
                      <th className="active">Source</th>
                      <th className="active">Description</th>
                      <th className="active">Received By</th>
                      <th className="active text-right">Items</th>
                      <th className="active text-right">Total Qty</th>
                      <th className="active"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={isSuperAdmin ? 9 : 8} className="text-center">Loading...</td></tr>
                    ) : grns.length > 0 ? grns.map((g) => (
                      <tr key={g.grn_id}>
                        <td><strong>{g.grn_number}</strong></td>
                        <td>{new Date(g.created_at).toLocaleDateString()}</td>
                        {isSuperAdmin && <td style={{ fontSize: 12, color: '#4b5563' }}>{g.shop_name}</td>}
                        <td><i className={`fa ${SOURCE_ICONS[g.source_type] || 'fa-box'}`} style={{ marginRight: 5 }}></i>{SOURCE_LABELS[g.source_type] || g.source_type}</td>
                        <td>{g.source_description}</td>
                        <td>{g.received_by}</td>
                        <td className="text-right">{g.item_count}</td>
                        <td className="text-right">{g.total_quantity}</td>
                        <td>
                          <Link href={`/dashboard/warehouse/grn/${g.grn_id}`} className="btn btn-xs btn-default">
                            <i className="fa fa-eye"></i> View
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={isSuperAdmin ? 9 : 8} className="text-center"><strong>No GRNs yet.</strong></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
