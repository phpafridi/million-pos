'use client'
import React, { useEffect, useState } from 'react'
import { AddTaxRules } from './actions/AddTaxRules'
import { FetchTaxes } from './actions/FetchTaxes'
import EditTaxRuleButton from './buttons/EditTaxRuleButton'
import { toast } from 'sonner'

type AddTax = {
  tax_id: number
  tax_title: string
  tax_rate: number
  tax_type: number
}

export default function ManageTaxRules() {
  const [taxes, setTaxes] = useState<AddTax[]>([])
  const [title, setTitle] = useState<string | ''>('')
  const [rate, setRate] = useState<number | ''>('')
  const [taxType, setTaxType] = useState<number | ''>('')

  const getTaxRules = async () => {
    const data = await FetchTaxes()
    setTaxes(data)
  }

  useEffect(() => {
    getTaxRules()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || rate === '' || taxType === '') {
      toast.error('All fields are required')
      return
    }

    const result = await AddTaxRules({
      title: title as string,
      rate: Number(rate),
      taxType: Number(taxType),
    })

    if (result.success) {
      toast.success('Tax rule saved successfully!')
      setTitle('')
      setRate('')
      setTaxType('')
      getTaxRules()
    } else {
      console.error('Error:', result.error)
      toast.error('Failed to save tax rule.')
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li>
            <a href="#">Manage Tax Rules</a>
          </li>
          <li>
            <a href="#">Settings</a>
          </li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Manage Tax Rules</h3>
                </div>

                <div className="box-background text-center">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 col-sm-12 col-xs-12 col-md-offset-3">
                        <div className="form-group text-center">
                          <label>
                            Title <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            name="tax_title"
                            placeholder="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="form-control text-center"
                          />
                        </div>

                        <div className="form-group text-center">
                          <label>
                            Rate <span className="required">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            name="tax_rate"
                            placeholder="Rate"
                            value={rate}
                            onChange={(e) =>
                              setRate(
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            className="form-control text-center"
                          />
                        </div>

                        <div className="form-group text-center">
                          <label>
                            Tax Type <span className="required">*</span>
                          </label>
                          <select
                            name="tax_type"
                            className="form-control text-center"
                            value={taxType}
                            onChange={(e) =>
                              setTaxType(
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            required
                          >
                            <option value="">Select Tax Type</option>
                            <option value="1">Percentage (%)</option>
                            <option value="2">Fixed ($)</option>
                          </select>
                        </div>
                        <br />

                        <button
                          type="submit"
                          className="btn bg-navy btn-flat text-center"
                        >
                          Save Tax Rule
                        </button>
                        <br />
                        <br />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Rules Table */}
          <div className="box-footer text-center">
            <div className="row">
              <div className="col-md-10 col-md-offset-1">
                <table
                  className="table table-bordered table-striped text-center"
                  id="dataTables-example"
                >
                  <thead>
                    <tr>
                      <th className="active text-center">SL</th>
                      <th className="active text-center">Tax Name</th>
                      <th className="active text-center">Tax Rate</th>
                      <th className="active text-center">Tax Type</th>
                      <th className="col-sm-2 active text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxes.length > 0 ? (
                      taxes.map((tax, index) => (
                        <tr key={tax.tax_id} className="text-center">
                          <td>{index + 1}</td>
                          <td>{tax.tax_title}</td>
                          <td>{tax.tax_rate}</td>
                          <td>
                            {tax.tax_type === 1
                              ? 'Percentage (%)'
                              : tax.tax_type === 2
                              ? 'Fixed ($)'
                              : 'Unknown'}
                          </td>
                          <td>
                            <EditTaxRuleButton
                              id={tax.tax_id}
                              title={tax.tax_title}
                              rate={tax.tax_rate}
                              taxType={tax.tax_type}
                              onSuccess={getTaxRules}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center">
                          <strong>No tax rules found.</strong>
                        </td>
                      </tr>
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
