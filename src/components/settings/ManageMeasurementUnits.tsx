'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog'

type MeasurementUnit = {
  unit_id: number
  unit_code: string
  unit_label: string
  is_packet_based: boolean
  sort_order: number
  is_active: boolean
}

export default function ManageMeasurementUnits() {
  const [units, setUnits] = useState<MeasurementUnit[]>([])
  const [unitCode, setUnitCode] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [isPacketBased, setIsPacketBased] = useState(false)
  const [saving, setSaving] = useState(false)

  const getUnits = async () => {
    try {
      const res = await fetch('/api/measurement-units')
      const json = await res.json()
      if (json.success) setUnits(json.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load measurement units')
    }
  }

  useEffect(() => {
    getUnits()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!unitCode.trim() || !unitLabel.trim()) {
      toast.error('Both unit code and label are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/measurement-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_code: unitCode,
          unit_label: unitLabel,
          is_packet_based: isPacketBased,
          sort_order: units.length + 1,
        }),
      })
      const json = await res.json()

      if (json.success) {
        toast.success('Measurement unit added!')
        setUnitCode('')
        setUnitLabel('')
        setIsPacketBased(false)
        getUnits()
      } else {
        toast.error(json.error || 'Failed to add measurement unit')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to add measurement unit')
    } finally {
      setSaving(false)
    }
  }

  const [pendingRemoveUnit, setPendingRemoveUnit] = useState<number | null>(null)

  const handleDeactivate = async () => {
    if (pendingRemoveUnit === null) return
    const unit_id = pendingRemoveUnit
    setPendingRemoveUnit(null)
    try {
      const res = await fetch(`/api/measurement-units/${unit_id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Measurement unit removed')
        getUnits()
      } else {
        toast.error('Failed to remove measurement unit')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove measurement unit')
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Measurement Units</a></li>
          <li><a href="#">Settings</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Add Measurement Unit</h3>
                </div>

                <div className="box-background text-center">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 col-sm-12 col-xs-12 col-md-offset-3">
                        <div className="form-group text-center">
                          <label>Unit Code <span className="required">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. meter, box, dozen"
                            value={unitCode}
                            onChange={(e) => setUnitCode(e.target.value)}
                            className="form-control text-center"
                          />
                        </div>

                        <div className="form-group text-center">
                          <label>Display Label <span className="required">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Meter, Box, Dozen"
                            value={unitLabel}
                            onChange={(e) => setUnitLabel(e.target.value)}
                            className="form-control text-center"
                          />
                        </div>

                        <div className="form-group text-center">
                          <label style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isPacketBased}
                              onChange={(e) => setIsPacketBased(e.target.checked)}
                            />
                            This unit is sold in packets (asks for &quot;pieces per packet&quot; on Add Product)
                          </label>
                        </div>
                        <br />

                        <button type="submit" className="btn bg-navy btn-flat text-center" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Unit'}
                        </button>
                        <br /><br />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="box-footer text-center">
            <div className="row">
              <div className="col-md-10 col-md-offset-1">
                <table className="table table-bordered table-striped text-center" id="dataTables-example">
                  <thead>
                    <tr>
                      <th className="active text-center">SL</th>
                      <th className="active text-center">Code</th>
                      <th className="active text-center">Label</th>
                      <th className="active text-center">Packet-based</th>
                      <th className="col-sm-2 active text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.length > 0 ? (
                      units.map((unit, index) => (
                        <tr key={unit.unit_id} className="text-center">
                          <td>{index + 1}</td>
                          <td>{unit.unit_code}</td>
                          <td>{unit.unit_label}</td>
                          <td>{unit.is_packet_based ? 'Yes' : 'No'}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-flat btn-xs"
                              onClick={() => setPendingRemoveUnit(unit.unit_id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center">
                          <strong>No measurement units found.</strong>
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

      <DeleteConfirmDialog
        open={pendingRemoveUnit !== null}
        onOpenChange={(open) => { if (!open) setPendingRemoveUnit(null) }}
        title="Remove Measurement Unit"
        description="Remove this unit from the add-product dropdown? Existing products keep using it."
        onConfirm={handleDeactivate}
        confirmLabel="Remove"
      />
    </div>
  )
}
