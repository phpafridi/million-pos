'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Option = { option_id: number; option_group: string; option_value: string; option_label: string; sort_order: number }

const GROUPS = [
  { key: 'measurement_field', label: 'Measurement Fields', hint: 'These appear on every tailor order and the customer profile — rename, hide, or add new ones.' },
  { key: 'pocket_style', label: 'Pocket Style' },
  { key: 'collar_style', label: 'Bain Style' },
  { key: 'collar_cut', label: 'Collar Cut' },
  { key: 'qurta_style', label: 'Qurta Style' },
  { key: 'checkbox', label: 'Style Checkboxes' },
]

export default function ManageTailorStyleOptions() {
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tailor-style-options')
      const json = await res.json()
      if (json.success) setOptions(json.data)
    } catch (err) {
      toast.error('Failed to load tailor style options')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const addOption = async (group: string) => {
    const label = (newLabel[group] || '').trim()
    if (!label) { toast.error('Enter a name first'); return }
    setSaving(group)
    try {
      const res = await fetch('/api/tailor-style-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_group: group, option_value: label, option_label: label }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`"${label}" added`)
        setNewLabel({ ...newLabel, [group]: '' })
        load()
      } else {
        toast.error(json.error || 'Failed to add')
      }
    } catch (err) {
      toast.error('Failed to add option')
    } finally {
      setSaving(null)
    }
  }

  const removeOption = async (id: number) => {
    if (!confirm('Remove this option? Existing tailor orders that used it keep their saved value.')) return
    try {
      const res = await fetch(`/api/tailor-style-options/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Removed')
        setOptions(options.filter(o => o.option_id !== id))
      } else {
        toast.error(json.error || 'Failed to remove')
      }
    } catch (err) {
      toast.error('Failed to remove option')
    }
  }

  const startEdit = (o: Option) => {
    setEditingId(o.option_id)
    setEditValue(o.option_label)
  }

  const saveEdit = async (id: number) => {
    const label = editValue.trim()
    if (!label) { toast.error('Label cannot be empty'); return }
    try {
      const res = await fetch(`/api/tailor-style-options/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_label: label }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Renamed')
        setOptions(options.map(o => o.option_id === id ? { ...o, option_label: label } : o))
        setEditingId(null)
      } else {
        toast.error(json.error || 'Failed to rename')
      }
    } catch (err) {
      toast.error('Failed to rename')
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Tailor Style Options</a></li>
          <li><a href="#">Settings</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-10 col-md-offset-1">
              {loading ? <p className="text-center">Loading...</p> : GROUPS.map((g) => (
                <div className="box box-primary" key={g.key} style={{ marginBottom: 18 }}>
                  <div className="box-header box-header-background with-border">
                    <h3 className="box-title">{g.label}</h3>
                  </div>
                  <div className="box-background" style={{ padding: 16 }}>
                    {g.hint && <p className="text-muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>{g.hint}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {options.filter(o => o.option_group === g.key).map((o) => (
                        editingId === o.option_id ? (
                          <span key={o.option_id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#fff', border: '1px solid #6366f1', borderRadius: 20,
                            padding: '2px 6px 2px 12px', fontSize: 13,
                          }}>
                            <input
                              autoFocus
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(o.option_id); if (e.key === 'Escape') setEditingId(null) }}
                              style={{ border: 'none', outline: 'none', fontSize: 13, width: Math.max(80, editValue.length * 8) }}
                            />
                            <button onClick={() => saveEdit(o.option_id)} style={{ background: 'none', border: 'none', color: '#1a9c5c', cursor: 'pointer', fontSize: 13 }}>✓</button>
                            <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: '#8a90a3', cursor: 'pointer', fontSize: 14 }}>&times;</button>
                          </span>
                        ) : (
                          <span key={o.option_id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#eef0ff', border: '1px solid #c7ccf5', borderRadius: 20,
                            padding: '4px 6px 4px 12px', fontSize: 13, color: '#4338ca',
                          }}>
                            {o.option_label}
                            <button
                              onClick={() => startEdit(o)}
                              title="Rename"
                              style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
                            ><i className="fa fa-pencil"></i></button>
                            <button
                              onClick={() => removeOption(o.option_id)}
                              title="Remove"
                              style={{ background: 'none', border: 'none', color: '#8a90a3', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                            >&times;</button>
                          </span>
                        )
                      ))}
                      {options.filter(o => o.option_group === g.key).length === 0 && (
                        <span className="text-muted">No options yet</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Add a new ${g.label.toLowerCase()}…`}
                        value={newLabel[g.key] || ''}
                        onChange={(e) => setNewLabel({ ...newLabel, [g.key]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') addOption(g.key) }}
                        style={{ maxWidth: 320 }}
                      />
                      <button className="btn bg-navy btn-flat" onClick={() => addOption(g.key)} disabled={saving === g.key}>
                        {saving === g.key ? 'Adding...' : '+ Add'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
