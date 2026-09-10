'use client'

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { FetchCustomerData } from "./actions/FetchCustomerData"
import Link from 'next/link'
import { hasPermission } from '@/lib/clientPermissions'

type Customer = {
  customer_id: number
  customer_name: string | null
  customer_code: number
  email: string
  phone: string | null
  address: string | null
  discount: string | null
  _count?: { tailor_orders: number }
}

export default function ManageCustomer() {
  const { data: session } = useSession()
  const canViewProfile = hasPermission(session, 'action:view-customer-profile', 'view')
  const canEdit = hasPermission(session, 'action:edit-customer')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // search + pagination states
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const getCustomers = async () => {
    try {
      setLoading(true)
      const data = await FetchCustomerData()
      setCustomers(data)
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getCustomers()
  }, [])

  // 🔍 filter customers by search
  const filteredCustomers = customers.filter((c) =>
    [c.customer_name, c.email, c.phone]
      .filter(Boolean)
      .some((field) => field?.toLowerCase().includes(search.toLowerCase()))
  )

  // 📑 pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentCustomers =
    itemsPerPage === -1 ? filteredCustomers : filteredCustomers.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)

  return (
    <section className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="box box-primary ">
            <div className="box-header box-header-background with-border d-flex justify-between items-center">
              <h3 className="box-title text-center">Manage Customer</h3>

              {/* 🔍 Search Box */}
              <input
                type="text"
                placeholder="Search..."
                className="form-control w-64 inline-block ml-4"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="box-body">
              {/* Pagination Controls */}
              <div className="mb-3 flex justify-between items-center">
                <div>
                  <label>Show: </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="form-control d-inline-block w-auto ml-2"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={-1}>All</option>
                  </select>
                </div>

                {itemsPerPage !== -1 && (
                  <div>
                    <button
                      className="btn btn-sm btn-default mr-2"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      Prev
                    </button>
                    <span>
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <button
                      className="btn btn-sm btn-default ml-2"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <table
                id="datatable"
                className="table table-striped table-bordered datatable-buttons text-center"
              >
                <thead>
                  <tr>
                    <th className="active col-sm-1 text-center">Sl</th>
                    <th className="active text-center">Customer Name</th>
                    <th className="active text-center">Email</th>
                    <th className="active text-center">Phone</th>
                    <th className="active text-center">Discount</th>
                    <th className="active text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center">
                        <strong>Loading customers...</strong>
                      </td>
                    </tr>
                  ) : currentCustomers.length > 0 ? (
                    currentCustomers.map((customer, index) => (
                      <tr key={customer.customer_code} className="custom-tr text-center">
                        <td>{indexOfFirstItem + index + 1}</td>
                        <td>
                          {customer.customer_name}
                          {(customer._count?.tailor_orders || 0) > 0 && (
                            <Link href="/dashboard/tailor/customers" title="Also has tailor order history">
                              <span className="label label-info" style={{ marginLeft: 6, fontSize: 10, cursor: 'pointer' }}>
                                <i className="fa fa-scissors"></i> Tailor
                              </span>
                            </Link>
                          )}
                        </td>
                        <td>{customer.email}</td>
                        <td>{customer.phone}</td>
                        <td>{customer.discount} %</td>
                        <td>
                          <div className="btn-group">
                            {canViewProfile ? (
                              <Link href={`/dashboard/customer/profile/${customer.customer_id}`}>
                                <button
                                  className="btn btn-default btn-xs"
                                  title="View Profile"
                                  data-toggle="tooltip"
                                  data-placement="top"
                                >
                                  <i className="fa fa-user"></i> Profile
                                </button>
                              </Link>
                            ) : (
                              <button className="btn btn-default btn-xs" disabled title="No permission to view customer profiles">
                                <i className="fa fa-lock"></i> Profile
                              </button>
                            )}
                            {canEdit ? (
                              <Link href={`/dashboard/customer/edit-customer/${customer.email}`}>
                                <button
                                  className="btn bg-navy btn-xs"
                                  title="Edit"
                                  data-toggle="tooltip"
                                  data-placement="top"
                                >
                                  <i className="fa fa-pencil"></i>
                                </button>
                              </Link>
                            ) : (
                              <button className="btn btn-default btn-xs" disabled title="No permission to edit customers">
                                <i className="fa fa-lock"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center">
                        <strong>No record found</strong>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
