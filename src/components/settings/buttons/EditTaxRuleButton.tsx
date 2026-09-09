'use client'
import React, { useState } from 'react'
import { EditTaxRules } from '../actions/EditTaxRules'

type Props = {
  id: number
  title: string
  rate: number
  taxType: number
  onSuccess: () => void
}

export default function EditTaxRuleButton({ id, title, rate, taxType, onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [newTitle, setNewTitle] = useState(title)
  const [newRate, setNewRate] = useState(rate)
  const [newTaxType, setNewTaxType] = useState(taxType)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await EditTaxRules(id, newTitle, newRate, newTaxType)

    if (res.success) {
      alert("Tax rule updated successfully!")
      setIsOpen(false)
      onSuccess()
    } else {
      alert("Error: " + res.error)
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-warning btn-sm">Edit</button>

      {isOpen && (
        <div className="modal fade in" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleUpdate}>
                <div className="modal-header">
                  <h4 className="modal-title">Edit Tax Rule</h4>
                  <button type="button" className="close" onClick={() => setIsOpen(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" className="form-control" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Rate</label>
                    <input type="number" className="form-control" value={newRate} onChange={(e) => setNewRate(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Tax Type</label>
                    <select className="form-control" value={newTaxType} onChange={(e) => setNewTaxType(Number(e.target.value))}>
                      <option value="1">Percentage (%)</option>
                      <option value="2">Fixed ($)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-default" onClick={() => setIsOpen(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
