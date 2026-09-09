'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { FetchTailorCustomerList } from './actions/FetchTailorCustomerList'
import { hasPermission } from '@/lib/clientPermissions'

export default function TailorCustomerList() {
  const { data: session } = useSession()
  const canView = hasPermission(session, 'action:view-customer-profile', 'view')
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async (q?: string) => {
    setLoading(true)
    const data = await FetchTailorCustomerList(q)
    setCustomers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Tailor Customers</a></li>
          <li><a href="#">Tailor</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border d-flex justify-between items-center">
              <h3 className="box-title">Tailor Customers</h3>
              <input
                type="text"
                placeholder="Search by name, phone, or email…"
                className="form-control w-64 inline-block ml-4"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="box-body">
              <p className="text-muted" style={{ fontSize: 12 }}>
                Showing every customer with a tailor order or saved measurements. New Tailor Order search by phone/email
                still works for customers not listed here yet.
              </p>
              <table className="table table-striped table-bordered text-center">
                <thead>
                  <tr>
                    <th className="active col-sm-1 text-center">Sl</th>
                    <th className="active text-center">Name</th>
                    <th className="active text-center">Phone</th>
                    <th className="active text-center">Email</th>
                    <th className="active text-center">Tailor Orders</th>
                    <th className="active text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center"><strong>Loading...</strong></td></tr>
                  ) : customers.length > 0 ? (
                    customers.map((c, i) => (
                      <tr key={c.customer_id}>
                        <td>{i + 1}</td>
                        <td>
                          {c.customer_name}
                          {c.is_gold_member && (
                            <span className="label" style={{ marginLeft: 6, background: '#b8860b', color: '#fff', fontSize: 10 }}>★ GOLD</span>
                          )}
                        </td>
                        <td>{c.phone}</td>
                        <td>{c.email}</td>
                        <td>{c.tailor_order_count}</td>
                        <td>
                          {canView ? (
                            <Link href={`/dashboard/customer/profile/${c.customer_id}`}>
                              <button className="btn bg-navy btn-xs"><i className="fa fa-eye"></i> View Profile</button>
                            </Link>
                          ) : (
                            <button className="btn btn-default btn-xs" disabled title="No permission to view customer profiles">
                              <i className="fa fa-lock"></i> View Profile
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="text-center"><strong>No tailor customers yet — they'll show up here after their first order or saved measurements.</strong></td></tr>
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
