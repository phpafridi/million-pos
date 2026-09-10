'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { privatizeSharedCustomers, countSharedCustomers, shareAllCustomers, countPrivateCustomers, PrivatizeResult } from './actions/privatizeSharedCustomers'

type SyncSetting = {
  sync_setting_id: number
  data_type: string
  label: string
  is_synced: boolean
}

const DESCRIPTIONS: Record<string, string> = {
  products: 'When ON, a new product added by any franchise instantly appears in every other franchise\'s catalog (at zero stock/price). When OFF, new products stay private to whichever franchise created them.',
  categories: 'When ON, categories and sub-categories are shared across all franchises. When OFF, each franchise only sees the categories it created itself.',
  tax_rules: 'When ON, tax rules are shared across all franchises. When OFF, each franchise manages its own tax rules privately.',
  measurement_units: 'When ON, measurement units are shared across all franchises. When OFF, each franchise manages its own units privately.',
  customers: 'When ON, customer records — name, phone, email — are shared across all franchises, so any franchise can look up an existing customer by phone number and see their POS or tailor order history. When OFF (default), each franchise only sees the customers it created itself.',
  tailor_measurements: 'When ON (default), a shared customer\'s tailor measurements are visible to every franchise, not just the one that took them. When OFF, a franchise can still look up a shared customer\'s contact info and order history, but their exact body measurements stay visible only to whichever franchise actually measured them.',
  suppliers: 'When ON, supplier records are shared across all franchises. When OFF (default), each franchise manages its own suppliers privately.',
}

export default function ManageSyncSettings() {
  const [settings, setSettings] = useState<SyncSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [sharedCount, setSharedCount] = useState<number | null>(null)
  const [privatizing, setPrivatizing] = useState(false)
  const [privatizeResult, setPrivatizeResult] = useState<PrivatizeResult | null>(null)
  const [privateCount, setPrivateCount] = useState<number | null>(null)
  const [sharing, setSharing] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/sync-settings')
      const json = await res.json()
      if (json.success) setSettings(json.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load sync settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(); countSharedCustomers().then(setSharedCount); countPrivateCustomers().then(setPrivateCount) }, [])

  const runShareAll = async () => {
    if (!confirm('Make every customer shared across all franchises again? This affects ALL private customers, including ones deliberately created private by a franchise. This cannot be undone.')) return
    setSharing(true)
    try {
      const result = await shareAllCustomers()
      toast.success(`${result.shared} customer(s) are now shared`)
      countSharedCustomers().then(setSharedCount)
      countPrivateCustomers().then(setPrivateCount)
    } catch (err: any) {
      toast.error(err.message || 'Failed to share customers')
    } finally {
      setSharing(false)
    }
  }

  const runPrivatize = async () => {
    if (!confirm('Privatize existing shared customers now? Customers used by only one franchise will become private to that franchise. Customers with no orders, or used by more than one franchise, will be left shared for you to review manually. This cannot be undone.')) return
    setPrivatizing(true)
    try {
      const result = await privatizeSharedCustomers()
      setPrivatizeResult(result)
      toast.success(`${result.privatized} customer(s) privatized`)
      countSharedCustomers().then(setSharedCount)
    } catch (err: any) {
      toast.error(err.message || 'Failed to privatize customers')
    } finally {
      setPrivatizing(false)
    }
  }

  const toggle = async (dataType: string, current: boolean) => {
    setSaving(dataType)
    try {
      const res = await fetch('/api/sync-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_type: dataType, is_synced: !current }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${json.data.label} is now ${json.data.is_synced ? 'shared' : 'private'}`)
        setSettings(prev => prev.map(s => s.data_type === dataType ? json.data : s))
      } else {
        toast.error(json.error || 'Failed to update')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to update sync setting')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Sync Settings</a></li>
          <li><a href="#">Head Office</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-10 col-md-offset-1">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Data Sharing Between Franchises</h3>
                </div>
                <div className="box-background" style={{ padding: 20 }}>
                  <p className="text-muted">
                    Control which kinds of data are shared across your whole network vs. kept private to
                    whichever franchise created them. Turning something off only affects <strong>new</strong> records
                    going forward — existing shared data already visible to everyone stays that way.
                  </p>

                  {loading ? (
                    <p className="text-center">Loading...</p>
                  ) : (
                    settings.map((s) => (
                      <div key={s.data_type} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 4px', borderBottom: '1px solid #eee', gap: 20,
                      }}>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{s.label}</div>
                          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {DESCRIPTIONS[s.data_type]}
                          </div>
                        </div>
                        <div style={{ minWidth: 140, textAlign: 'right' }}>
                          <button
                            className={`btn btn-flat ${s.is_synced ? 'btn-success' : 'btn-default'}`}
                            onClick={() => toggle(s.data_type, s.is_synced)}
                            disabled={saving === s.data_type}
                          >
                            {saving === s.data_type ? 'Saving...' : s.is_synced ? '✓ Shared' : 'Private'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {sharedCount !== null && sharedCount > 0 && (
                    <div style={{ marginTop: 24, padding: 16, background: '#fff8e6', border: '1px solid #f0d99a', borderRadius: 6 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        <i className="fa fa-exclamation-triangle" style={{ color: '#b8860b', marginRight: 6 }} />
                        {sharedCount} customer{sharedCount === 1 ? ' is' : 's are'} still shared from before
                      </div>
                      <p className="text-muted" style={{ fontSize: 13 }}>
                        This is not the toggle malfunctioning — the "Customers" switch above only ever controls
                        customers created <strong>from now on</strong>. These {sharedCount} were shared at some
                        earlier point (before the switch was last turned off) and the switch has no way to know
                        about them after the fact. Run this to assign each one to whichever single franchise
                        actually has orders for them. Customers with no orders yet, or with orders from more than
                        one franchise, are left shared since there's no single owner to safely assign.
                      </p>
                      <button className="btn btn-warning btn-flat" onClick={runPrivatize} disabled={privatizing}>
                        {privatizing ? 'Working...' : `Privatize ${sharedCount} Shared Customer${sharedCount === 1 ? '' : 's'}`}
                      </button>

                      {privatizeResult && (
                        <div style={{ marginTop: 14, fontSize: 13 }}>
                          <div>✅ {privatizeResult.privatized} privatized to their one franchise</div>
                          {privatizeResult.skippedNoOrders > 0 && (
                            <div>⏭️ {privatizeResult.skippedNoOrders} skipped — no orders yet, still shared</div>
                          )}
                          {privatizeResult.skippedMultipleShops > 0 && (
                            <div>⚠️ {privatizeResult.skippedMultipleShops} skipped — used by more than one franchise, still shared (needs manual review)</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {privateCount !== null && privateCount > 0 && (
                    <div style={{ marginTop: 16, padding: 16, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        <i className="fa fa-info-circle" style={{ color: '#4338ca', marginRight: 6 }} />
                        {privateCount} customer{privateCount === 1 ? ' is' : 's are'} still private from before
                      </div>
                      <p className="text-muted" style={{ fontSize: 13 }}>
                        This is not the toggle malfunctioning — the "Customers" switch above only ever controls
                        customers created <strong>from now on</strong>. These {privateCount} were made private at some
                        earlier point (before the switch was last turned on, or by a previous Privatize action) and
                        the switch has no way to know about them after the fact. Click below to bring them in line
                        with the current "Shared" setting.
                      </p>
                      <button className="btn btn-info btn-flat" onClick={runShareAll} disabled={sharing}>
                        {sharing ? 'Working...' : `Share All ${privateCount} Private Customer${privateCount === 1 ? '' : 's'}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
