'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

type Shop = {
  shop_id: number
  shop_code: string
  shop_name: string
  login_slug: string | null
  address: string | null
  phone: string | null
  email: string | null
  is_head_office: boolean
  is_warehouse: boolean
  is_active: boolean
}

export default function ManageShops() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)

  const [shops, setShops] = useState<Shop[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [newLoginCreds, setNewLoginCreds] = useState<{ email: string; password: string } | null>(null)

  const getShops = async () => {
    try {
      const res = await fetch('/api/shops?type=franchise')
      const json = await res.json()
      if (json.success) setShops(json.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load franchises')
    }
  }

  useEffect(() => { getShops() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) { toast.error('Shop name and code are required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_name: name, shop_code: code, address, phone, email }),
      })
      const json = await res.json()
      if (json.success) {
        setName(''); setCode(''); setAddress(''); setPhone(''); setEmail('')
        getShops()
        if (json.owner_login) {
          setNewLoginCreds(json.owner_login)
        } else {
          toast.success(`${name} registered! Existing products are already available to them at zero stock.`)
        }
      } else {
        toast.error(json.error || 'Failed to register franchise')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to register franchise')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (shop: Shop) => {
    try {
      const res = await fetch(`/api/shops/${shop.shop_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !shop.is_active }),
      })
      const json = await res.json()
      if (json.success) { toast.success('Updated'); getShops() }
    } catch (err) {
      console.error(err)
      toast.error('Failed to update')
    }
  }

  const copyLoginUrl = (slug: string | null) => {
    if (!slug) return
    const url = `${window.location.origin}/login/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Login URL copied')
  }

  if (!isSuperAdmin) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="container-fluid" style={{ paddingTop: 40 }}>
          <div className="alert alert-warning text-center">
            Franchise management is only available to the CEO / head-office account.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Manage Franchises</a></li>
          <li><a href="#">Head Office</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Register New Franchise</h3>
                </div>

                <div className="box-background text-center">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-8 col-sm-12 col-xs-12 col-md-offset-2">
                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group text-center">
                              <label>Shop Name <span className="required">*</span></label>
                              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-control text-center" placeholder="e.g. Downtown Branch" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group text-center">
                              <label>Shop Code <span className="required">*</span></label>
                              <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="form-control text-center" placeholder="e.g. DT-01" />
                            </div>
                          </div>
                        </div>
                        <div className="form-group text-center">
                          <label>Address</label>
                          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="form-control text-center" />
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group text-center">
                              <label>Phone</label>
                              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-control text-center" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group text-center">
                              <label>Email</label>
                              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-control text-center" />
                            </div>
                          </div>
                        </div>
                        <br />
                        <button type="submit" className="btn bg-navy btn-flat" disabled={saving}>
                          {saving ? 'Registering...' : 'Register Franchise'}
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
                <table className="table table-bordered table-striped text-center">
                  <thead>
                    <tr>
                      <th className="active text-center">Code</th>
                      <th className="active text-center">Name</th>
                      <th className="active text-center">Login URL</th>
                      <th className="active text-center">Phone</th>
                      <th className="active text-center">Status</th>
                      <th className="col-sm-2 active text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shops.length > 0 ? (
                      shops.map((s) => (
                        <tr key={s.shop_id} className="text-center">
                          <td>{s.shop_code}{s.is_head_office && ' (HQ)'}</td>
                          <td>{s.shop_name}</td>
                          <td>
                            {s.login_slug ? (
                              <button className="btn btn-xs btn-default" onClick={() => copyLoginUrl(s.login_slug)} title={`/login/${s.login_slug}`}>
                                <i className="fa fa-copy"></i> /login/{s.login_slug}
                              </button>
                            ) : '—'}
                          </td>
                          <td>{s.phone || '—'}</td>
                          <td>{s.is_active ? <span className="label label-success">Active</span> : <span className="label label-default">Inactive</span>}</td>
                          <td>
                            {!s.is_head_office && (
                              <button
                                className={`btn btn-xs btn-flat ${s.is_active ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => toggleActive(s)}
                              >
                                {s.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="text-center"><strong>No franchises registered yet.</strong></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      {newLoginCreds && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,43,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setNewLoginCreds(null)}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 440, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginTop: 0 }}>✅ Franchise registered — save this login</h4>
            <p className="text-muted" style={{ fontSize: 13 }}>
              This password is shown once. The owner should log in and change it right away — Employee Management → Edit.
            </p>
            <div className="form-group">
              <label>Email</label>
              <input readOnly className="form-control" value={newLoginCreds.email} onClick={(e) => (e.target as HTMLInputElement).select()} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input readOnly className="form-control" value={newLoginCreds.password} onClick={(e) => (e.target as HTMLInputElement).select()} />
            </div>
            <button className="btn bg-navy btn-flat btn-block" onClick={() => setNewLoginCreds(null)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  )
}
