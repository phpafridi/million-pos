'use client'
import React, { useState } from 'react'
import { toast } from 'sonner'

export default function AddLedger() {
  const [form, setForm] = useState({
    ledger_name: '',
    mobile_number: '',
    email: '',
    address: '',
  })

  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Submitting ledger form:', form) // Debug log
      
      const response = await fetch('/api/ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      console.log('Response status:', response.status) // Debug log
      
      const data = await response.json()
      console.log('Response data:', data) // Debug log

      if (data.success) {
        toast.success('Ledger created successfully!')
        // Clear form after success
        setForm({
          ledger_name: '',
          mobile_number: '',
          email: '',
          address: '',
        })
        // Reload the page to refresh the list
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to create ledger')
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error) // Detailed error log
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
              <h3 className="box-title">Create New Ledger</h3>
            </div>

            <form onSubmit={handleSubmit} method="post">
              <div className="row">
                <div className="col-md-8 col-sm-12 col-xs-12">
                  <div className="box-body">
                    <div className="form-group">
                      <label>
                        Ledger Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        name="ledger_name"
                        value={form.ledger_name}
                        onChange={handleChange}
                        placeholder="Customer Name"
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Mobile Number <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Mobile Number"
                        name="mobile_number"
                        value={form.mobile_number}
                        onChange={handleChange}
                        className="form-control"
                        required
                        pattern="[0-9]{10,15}"
                        title="Enter valid mobile number (10-15 digits)"
                      />
                      <small className="text-muted">Unique mobile number required</small>
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="Email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <textarea
                        name="address"
                        className="form-control autogrow"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Address"
                        rows={3}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="box-footer">
                <button
                  type="submit"
                  className="btn bg-navy btn-flat"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}