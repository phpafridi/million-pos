'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchSuppliers } from './actions/FetchSupplier'
import { DeleteSupplier } from './actions/DeleteSupplier'
import { hasPermission } from '@/lib/clientPermissions'
import Link from 'next/link'
import { toast } from 'sonner'

type Supplier = {
  supplier_id: number
  company_name: string
  supplier_name: string
  email: string
  phone: string
  address: string
  warehouse_only?: boolean
}

export default function ManageSupplier() {
  const { data: session } = useSession()
  const canEdit = hasPermission(session, 'action:edit-supplier')
  const canDelete = hasPermission(session, 'action:delete-supplier')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete supplier "${name}"? This can't be undone.`)) return
    try {
      await DeleteSupplier(id)
      toast.success('Supplier deleted')
      setSuppliers((prev) => prev.filter((s) => s.supplier_id !== id))
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier')
    }
  }

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const getSuppliers = async () => {
    try {
      setLoading(true)
      const data = await FetchSuppliers()
      setSuppliers(data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { getSuppliers() }, [])

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.company_name?.toLowerCase().includes(q) ||
      s.supplier_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    )
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentSuppliers = itemsPerPage === -1 ? filteredSuppliers : filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Manage Suppliers</a></li>
          <li><a href="#">Manage Purchase</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border d-flex justify-between items-center">
                  <h3 className="box-title text-center">Manage Suppliers</h3>
                  <input
                    type="text"
                    placeholder="Search by company, name, email, or phone…"
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
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={-1}>All</option>
                      </select>
                    </div>

                    {itemsPerPage !== -1 && (
                      <div>
                        <button
                          className="btn btn-sm btn-default mr-2"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          Prev
                        </button>
                        <span>Page {currentPage} of {totalPages || 1}</span>
                        <button
                          className="btn btn-sm btn-default ml-2"
                          disabled={currentPage === totalPages || totalPages === 0}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  <table className="table table-striped table-bordered text-center">
                    <thead>
                      <tr>
                        <th className="active col-sm-1 text-center">Sl</th>
                        <th className="active text-center">Company Name</th>
                        <th className="active text-center">Supplier Name</th>
                        <th className="active text-center">Email</th>
                        <th className="active text-center">Phone</th>
                        <th className="active text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="text-center"><strong>Loading suppliers...</strong></td></tr>
                      ) : currentSuppliers.length > 0 ? (
                        currentSuppliers.map((s, i) => (
                          <tr key={s.supplier_id} className="text-center">
                            <td>{indexOfFirstItem + i + 1}</td>
                            <td>
                              {s.company_name}
                              {s.warehouse_only && (
                                <span className="label label-info" style={{ marginLeft: 6, fontSize: 10 }}>Warehouse Only</span>
                              )}
                            </td>
                            <td>{s.supplier_name}</td>
                            <td>{s.email}</td>
                            <td>{s.phone}</td>
                            <td>
                              {canEdit ? (
                                <Link href={`/dashboard/manage-purchase/supplier/edit/${s.supplier_id}`}>
                                  <button className="btn bg-navy btn-xs" title="Edit">
                                    <i className="fa fa-pencil"></i>
                                  </button>
                                </Link>
                              ) : (
                                <button className="btn btn-default btn-xs" disabled title="No permission to edit suppliers">
                                  <i className="fa fa-lock"></i>
                                </button>
                              )}
                              {canDelete && (
                                <button className="btn btn-danger btn-xs" style={{ marginLeft: 4 }} title="Delete" onClick={() => handleDelete(s.supplier_id, s.company_name)}>
                                  <i className="fa fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={6} className="text-center"><strong>No suppliers found</strong></td></tr>
                      )}
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
