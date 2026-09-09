'use client'
import React, { useState } from 'react'
import { AddCustomerData } from './actions/AddCustomerData'
import { toast } from 'sonner'

export default function AddCustomer() {
  const [form, setForm] = useState({
    customer_name: '',
    email: '',
    phone: '',
    discount: '',
    address: '',
  })

  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleChangeArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('customer_name', form.customer_name)
    formData.append('email', form.email)
    formData.append('phone', form.phone)
    formData.append('discount', form.discount)
    formData.append('address', form.address)

    try {
      const result = await AddCustomerData(formData)
      if (result.success) {
        toast.success('Customer added successfully!')
        // Clear form after success
        setForm({
          customer_name: '',
          email: '',
          phone: '',
          discount: '',
          address: '',
        })
      } else {
        toast.error('Failed to add customer. Please try again.')
      }
    } catch (error) {
      console.error(error)
      toast.error('Unexpected error. Please try again later.')
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
              <h3 className="box-title">Add Customer</h3>
            </div>

            <form onSubmit={handleSubmit} method="post">
              <div className="row">
                <div className="col-md-8 col-sm-12 col-xs-12">
                  <div className="box-body">
                    <div className="form-group">
                      <label>
                        Customer Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        name="customer_name"
                        value={form.customer_name}
                        onChange={handleChange}
                        placeholder="Customer Name"
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Email <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="Email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        placeholder="Phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="form-control"
                      />
                      <div style={{ color: '#E13300' }} id="phone_result"></div>
                    </div>

                    <div className="form-group">
                      <label>Discount %</label>
                      <input
                        type="text"
                        placeholder="Discount"
                        name="discount"
                        value={form.discount}
                        onChange={handleChange}
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
                        value={form.address}
                        onChange={handleChangeArea}
                        placeholder="Address"
                        rows={5}
                        required
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <input type="hidden" name="customer_code" />
              <input type="hidden" name="customer_id" id="customer_id" />

              <div className="box-footer">
                <button
                  type="submit"
                  id="customer_btn"
                  className="btn bg-navy btn-flat"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
