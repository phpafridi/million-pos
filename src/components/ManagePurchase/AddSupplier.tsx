'use client'
import React, { useState, FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import { AddSupplier } from './actions/AddSupplier'

export default function AddSupplierPage() {
  const { data: session } = useSession()
  const isWarehouse = Boolean((session?.user as any)?.is_warehouse)
  const [shareWithWarehouses, setShareWithWarehouses] = useState(false)
  const [message, setMessage] = useState<string>('') // message state
  const [type, setType] = useState<'success' | 'error' | ''>('') // success or error
  const [loading, setLoading] = useState(false) // loading state for button

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    formData.set('share_with_warehouses', String(shareWithWarehouses))

    try {
      setLoading(true)

      const res = await AddSupplier(formData)
      if (res.success) {
        setMessage(res.message || 'Supplier added successfully!')
        setType('success')
        form.reset()
      } else {
        setMessage(res.message || 'Failed to add supplier')
        setType('error')
      }
    } catch (err) {
      setMessage('An unexpected error occurred')
      setType('error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Add New Supplier</h3>
            </div>

            {/* Show message */}
            {message && (
              <div
                className={`mb-3 p-2 text-center font-bold ${
                  type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                } rounded`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-8 col-sm-12 col-xs-12">
                  <div className="box-body">
                    <div className="form-group">
                      <label>
                        Company Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        placeholder="Company Name"
                        required
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Supplier Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        name="supplier_name"
                        placeholder="Supplier Name"
                        required
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Email <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        required
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Phone <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        name="phone"
                        placeholder="Phone"
                        required
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Address <span className="required">*</span>
                      </label>
                      <textarea
                        name="address"
                        className="form-control autogrow"
                        rows={5}
                        placeholder="Business Address"
                        required
                      />
                    </div>

                    {isWarehouse && (
                      <div className="form-group">
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
                          <input
                            type="checkbox"
                            checked={shareWithWarehouses}
                            onChange={(e) => setShareWithWarehouses(e.target.checked)}
                          />
                          Share this supplier with every warehouse (not visible to franchises)
                        </label>
                        <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                          Leave unchecked to keep this supplier private to just this warehouse.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="box-footer">
                <button
                  type="submit"
                  className="btn bg-navy btn-flat"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fa fa-spinner fa-spin" /> Adding...
                    </>
                  ) : (
                    'Add Supplier'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
