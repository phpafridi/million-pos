'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { FetchAllMembers, SetCardActiveStatus, SearchNonMemberCustomers, SetGoldMemberStatus } from '../Customer/actions/LoyaltyActions'

type Settings = {
  loyalty_system_enabled: string
  loyalty_points_per_100_spent: string
  loyalty_point_redeem_value: string
}

export default function ManageLoyaltySettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [enrollSearch, setEnrollSearch] = useState('')
  const [enrollResults, setEnrollResults] = useState<any[]>([])
  const [enrollSearching, setEnrollSearching] = useState(false)
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  const loadMembers = async (q?: string) => {
    setMembersLoading(true)
    try {
      const data = await FetchAllMembers(q)
      setMembers(data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load members')
    } finally {
      setMembersLoading(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/theme-settings')
      const json = await res.json()
      if (json.success) {
        const map: any = {}
        for (const s of json.data) map[s.setting_key] = s.setting_value
        setSettings({
          loyalty_system_enabled: map.loyalty_system_enabled ?? 'true',
          loyalty_points_per_100_spent: map.loyalty_points_per_100_spent ?? '1',
          loyalty_point_redeem_value: map.loyalty_point_redeem_value ?? '1',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(); loadMembers() }, [])

  useEffect(() => {
    const t = setTimeout(() => loadMembers(search || undefined), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!enrollSearch.trim()) { setEnrollResults([]); return }
    setEnrollSearching(true)
    const t = setTimeout(async () => {
      try {
        const results = await SearchNonMemberCustomers(enrollSearch)
        setEnrollResults(results)
      } catch (err: any) {
        toast.error(err.message || 'Search failed')
      } finally {
        setEnrollSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [enrollSearch])

  const handleEnroll = async (customer_id: number) => {
    setEnrollingId(customer_id)
    try {
      await SetGoldMemberStatus(customer_id, true)
      toast.success('Customer enrolled as a gold member')
      setEnrollSearch('')
      setEnrollResults([])
      loadMembers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll customer')
    } finally {
      setEnrollingId(null)
    }
  }

  const handleToggleActive = async (customer_id: number, currentlyActive: boolean) => {
    setBusyId(customer_id)
    try {
      await SetCardActiveStatus(customer_id, !currentlyActive)
      setMembers((prev) => prev.map((m) => m.customer_id === customer_id ? { ...m, card_active: !currentlyActive } : m))
      toast.success(!currentlyActive ? 'Card reactivated' : 'Card deactivated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update card status')
    } finally {
      setBusyId(null)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const updates = Object.entries(settings).map(([setting_key, setting_value]) => ({ setting_key, setting_value }))
      const res = await fetch('/api/theme-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Loyalty settings saved')
      } else {
        toast.error(json.error || 'Failed to save')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return <div className="right-side" style={{ minHeight: '945px', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  const isEnabled = settings.loyalty_system_enabled === 'true'

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Loyalty Settings</a></li>
          <li><a href="#">Settings</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-8 col-sm-12 col-xs-12 col-md-offset-2">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Loyalty / Membership Card System</h3>
                </div>
                <div className="box-background" style={{ padding: 24 }}>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 16, background: isEnabled ? '#eefbf1' : '#fdecea',
                    border: `1px solid ${isEnabled ? '#b8e6c4' : '#f0b4b0'}`, borderRadius: 6, marginBottom: 24,
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: isEnabled ? '#1a7a3c' : '#a83228' }}>
                        Loyalty System is {isEnabled ? 'ON' : 'OFF'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {isEnabled
                          ? 'Members can earn and redeem points at every franchise, on both POS sales and tailor orders.'
                          : 'No points are being earned or redeemed anywhere, even for existing gold members. Membership status and existing point balances are preserved — nothing is deleted by turning this off.'}
                      </div>
                    </div>
                    <label className="switch" style={{ display: 'inline-block', flexShrink: 0, marginLeft: 16 }}>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => setSettings({ ...settings, loyalty_system_enabled: e.target.checked ? 'true' : 'false' })}
                        style={{ width: 20, height: 20 }}
                      />
                    </label>
                  </div>

                  <fieldset disabled={!isEnabled} style={{ opacity: isEnabled ? 1 : 0.5 }}>
                    <div className="form-group">
                      <label>Points Earned per {`{currency}`}100 Spent</label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="form-control"
                        style={{ maxWidth: 200 }}
                        value={settings.loyalty_points_per_100_spent}
                        onChange={(e) => setSettings({ ...settings, loyalty_points_per_100_spent: e.target.value })}
                      />
                      <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                        A gold member spending 500 earns {(500 / 100) * Number(settings.loyalty_points_per_100_spent || 0)} points at this rate.
                        Only actually-paid amounts earn points — nothing left as "pending" ever earns until it's paid.
                      </p>
                    </div>

                    <div className="form-group" style={{ marginTop: 20 }}>
                      <label>Discount Value per Point Redeemed</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="form-control"
                        style={{ maxWidth: 200 }}
                        value={settings.loyalty_point_redeem_value}
                        onChange={(e) => setSettings({ ...settings, loyalty_point_redeem_value: e.target.value })}
                      />
                      <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                        Redeeming 50 points takes {(50 * Number(settings.loyalty_point_redeem_value || 0)).toFixed(2)} off the bill at this rate.
                        Staff can never redeem more than a customer's actual current balance — checked and enforced on the server at checkout, not just in the interface.
                      </p>
                    </div>
                  </fieldset>

                  <button className="btn bg-navy btn-flat" onClick={handleSave} disabled={saving} style={{ marginTop: 12 }}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Enroll a New Member</h3>
                </div>
                <div className="box-background" style={{ padding: 20 }}>
                  <input
                    type="text"
                    placeholder="Search any customer by name, phone, or email…"
                    className="form-control"
                    value={enrollSearch}
                    onChange={(e) => setEnrollSearch(e.target.value)}
                  />
                  {enrollSearching && <p className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>Searching...</p>}
                  {enrollResults.length > 0 && (
                    <table className="table table-bordered" style={{ marginTop: 12, marginBottom: 0 }}>
                      <tbody>
                        {enrollResults.map((c) => (
                          <tr key={c.customer_id}>
                            <td>
                              {c.customer_name}
                              <br /><small className="text-muted">{c.phone} — {c.shop_name}</small>
                            </td>
                            <td className="text-right" style={{ width: 140 }}>
                              <button
                                className="btn btn-sm bg-navy btn-flat"
                                disabled={enrollingId === c.customer_id}
                                onClick={() => handleEnroll(c.customer_id)}
                              >
                                {enrollingId === c.customer_id ? 'Enrolling...' : 'Enroll as Member'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {enrollSearch.trim() && !enrollSearching && enrollResults.length === 0 && (
                    <p className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>No matching customers found (or they're already a member).</p>
                  )}
                </div>
              </div>

              <div className="box box-primary">
                <div className="box-header box-header-background with-border d-flex justify-between items-center">
                  <h3 className="box-title">Members ({members.length})</h3>
                  <input
                    type="text"
                    placeholder="Search by name, phone, or card number…"
                    className="form-control"
                    style={{ maxWidth: 280, display: 'inline-block', float: 'right' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="box-background">
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th className="active">Customer</th>
                          <th className="active">Franchise</th>
                          <th className="active">Card Number</th>
                          <th className="active">Status</th>
                          <th className="active text-right">Points</th>
                          <th className="active text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {membersLoading ? (
                          <tr><td colSpan={6} className="text-center">Loading...</td></tr>
                        ) : members.length > 0 ? members.map((m) => (
                          <tr key={m.customer_id}>
                            <td>
                              <Link href={`/dashboard/customer/profile/${m.customer_id}`}>{m.customer_name}</Link>
                              <br /><small className="text-muted">{m.phone}</small>
                            </td>
                            <td style={{ fontSize: 12, color: '#4b5563' }}>{m.shop_name}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{m.card_number || '—'}</td>
                            <td>
                              <span className={`label ${m.card_active ? 'label-success' : 'label-danger'}`}>
                                {m.card_active ? 'ACTIVE' : 'DEACTIVATED'}
                              </span>
                            </td>
                            <td className="text-right" style={{ fontWeight: 700, color: '#b8860b' }}>{m.loyalty_points}</td>
                            <td className="text-center">
                              <button
                                className={`btn btn-xs ${m.card_active ? 'btn-danger' : 'btn-success'}`}
                                disabled={busyId === m.customer_id}
                                onClick={() => handleToggleActive(m.customer_id, m.card_active)}
                              >
                                {busyId === m.customer_id ? '...' : (m.card_active ? 'Deactivate' : 'Reactivate')}
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="text-center"><strong>No members yet.</strong></td></tr>
                        )}
                      </tbody>
                    </table>
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
