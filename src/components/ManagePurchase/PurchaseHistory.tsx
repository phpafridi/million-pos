'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import FetchPurchaseHistory from '../ManagePurchase/actions/FetchPurchaseHistory'
import { hasPermission } from '@/lib/clientPermissions'
import Link from 'next/link'

type Purchase = {
  purchase_id: number
  purchase_order_number: number
  supplier_name: string
  grand_total: number
  purchase_ref: string
  purchase_by: string
  createdAt: string
  details: {
    product_name: string
    qty: number
    unit_price: number
    sub_total: number
  }[]
}

export default function PurchaseHistory() {
  const { data: session } = useSession()
  const canView = hasPermission(session, 'action:view-purchase-invoice', 'view')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ Pagination + Search + Show All state
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    const loadPurchases = async () => {
      const data = await FetchPurchaseHistory()
      const mapped = data.map((p: any) => ({
        ...p,
        createdAt: new Date(p.datetime).toLocaleString(),
      }))
      setPurchases(mapped)
      setLoading(false)
    }
    loadPurchases()
  }, [])

  // ✅ Search filter
  const filteredPurchases = purchases.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.purchase_order_number.toString().includes(q) ||
      p.supplier_name.toLowerCase().includes(q) ||
      p.purchase_by.toLowerCase().includes(q) ||
      p.createdAt.toLowerCase().includes(q)
    )
  })

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage)
  const paginatedPurchases = showAll
    ? filteredPurchases
    : filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <section className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border text-center">
              <h3 className="box-title">Purchase History</h3>
            </div>
            <div className="box-body">
              {/* ✅ Search + Show All */}
              <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3">
                <input
                  type="text"
                  placeholder="Search by purchase no, supplier, date, or user..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="form-control w-full md:w-1/3"
                />
                <button
                  className={`btn ${showAll ? 'btn-primary' : 'btn-default'}`}
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Paginate' : 'Show All'}
                </button>
              </div>

              <table className="table table-striped table-bordered text-center datatable-buttons">
                <thead>
                  <tr>
                    <th>Sl</th>
                    <th>Purchase No.</th>
                    <th>Supplier Name</th>
                    <th>Purchase Date</th>
                    <th>Grand Total</th>
                    <th>Purchase By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>
                        <strong>Loading purchases...</strong>
                      </td>
                    </tr>
                  ) : paginatedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <strong>There is no record to display</strong>
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map((p, idx) => (
                      <tr key={p.purchase_id}>
                        <td>{(currentPage - 1) * itemsPerPage + (idx + 1)}</td>
                        <td>
                          {canView ? (
                            <a href={`/dashboard/manage-purchase/invoice/${p.purchase_id}`}>
                              PUR-{p.purchase_order_number}
                            </a>
                          ) : (
                            <span>PUR-{p.purchase_order_number}</span>
                          )}
                        </td>
                        <td>{p.supplier_name}</td>
                        <td>{p.createdAt}</td>
                        <td>{p.grand_total.toFixed(2)}</td>
                        <td>{p.purchase_by}</td>
                        <td>
                          {canView ? (
                            <Link href={`/dashboard/manage-purchase/invoice/${p.purchase_id}`}>
                              <span className="glyphicon glyphicon-search"></span>
                            </Link>
                          ) : (
                            <span className="glyphicon glyphicon-lock" title="No permission to view purchase invoices"></span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* ✅ Pagination controls (only show if not "Show All") */}
              {!loading && !showAll && filteredPurchases.length > itemsPerPage && (
                <div className="flex justify-center items-center mt-6 gap-3">
                  <button
                    className="btn btn-sm btn-default"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => (
                    <button
                      key={idx + 1}
                      className={`btn btn-sm ${currentPage === idx + 1 ? 'btn-primary' : 'btn-default'}`}
                      onClick={() => setCurrentPage(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  ))}

                  <button
                    className="btn btn-sm btn-default"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
