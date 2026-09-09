'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

type ThemeSetting = {
  theme_setting_id: number
  setting_key: string
  setting_value: string
  category: string
  label: string
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  sidebar: 'Sidebar',
  topbar: 'Top Bar',
  buttons: 'Buttons',
  pages: 'Pages',
  pos_page: 'Point of Sale Page',
  purchase_page: 'Purchase Page',
}

export default function ManageThemeSettings() {
  const [settings, setSettings] = useState<ThemeSetting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const getSettings = async () => {
    try {
      const res = await fetch('/api/theme-settings')
      const json = await res.json()
      if (json.success) {
        setSettings(json.data)
        const initial: Record<string, string> = {}
        json.data.forEach((s: ThemeSetting) => { initial[s.setting_key] = s.setting_value })
        setValues(initial)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load theme settings')
    }
  }

  useEffect(() => { getSettings() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(values).map(([setting_key, setting_value]) => ({ setting_key, setting_value }))
      const res = await fetch('/api/theme-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Theme updated! Refresh any open page to see the new colours.')
      } else {
        toast.error(json.error || 'Failed to save theme')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save theme')
    } finally {
      setSaving(false)
    }
  }

  const categories = Array.from(new Set(settings.map(s => s.category)))

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Theme Settings</a></li>
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
                  <h3 className="box-title">Page & UI Colours</h3>
                </div>

                <div className="box-background">
                  {categories.map((cat) => (
                    <div key={cat} style={{ marginBottom: 24 }}>
                      <h4 style={{ marginLeft: 16 }}>{CATEGORY_LABELS[cat] || cat}</h4>
                      <div className="row" style={{ padding: '0 16px' }}>
                        {settings.filter(s => s.category === cat).map((s) => (
                          <div className="col-md-3 col-sm-6" key={s.setting_key} style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6 }}>{s.label}</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                type="color"
                                value={values[s.setting_key] || '#000000'}
                                onChange={(e) => setValues(prev => ({ ...prev, [s.setting_key]: e.target.value }))}
                                style={{ width: 40, height: 34, padding: 0, border: 'none' }}
                              />
                              <input
                                type="text"
                                value={values[s.setting_key] || ''}
                                onChange={(e) => setValues(prev => ({ ...prev, [s.setting_key]: e.target.value }))}
                                className="form-control"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="text-center" style={{ paddingBottom: 20 }}>
                    <button className="btn bg-navy btn-flat" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Theme'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
