'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Warehouse = {
  shop_id: number
  shop_code: string
  shop_name: string
  login_slug: string | null
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

export default function ManageWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [newLoginCreds, setNewLoginCreds] = useState<{ email: string; password: string } | null>(null)

  const getWarehouses = async () => {
    try {
      const res = await fetch('/api/shops?type=warehouse')
      const json = await res.json()
      if (json.success) setWarehouses(json.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load warehouses')
    }
  }

  useEffect(() => { getWarehouses() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) { toast.error('Warehouse name and code are required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_name: name, shop_code: code, address, phone, email, is_warehouse: true }),
      })
      const json = await res.json()
      if (json.success) {
        setName(''); setCode(''); setAddress(''); setPhone(''); setEmail('')
        getWarehouses()
        if (json.owner_login) setNewLoginCreds(json.owner_login)
      } else {
        toast.error(json.error || 'Failed to create warehouse')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to create warehouse')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (w: Warehouse) => {
    try {
      const res = await fetch(`/api/shops/${w.shop_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !w.is_active }),
      })
      const json = await res.json()
      if (json.success) { toast.success('Updated'); getWarehouses() }
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

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Manage Warehouses</a></li>
          <li><a href="#">Settings</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-10 col-md-offset-1">

              <div className="box box-primary" style={{ marginBottom: 18 }}>
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Create Warehouse</h3>
                </div>
                <div className="box-background" style={{ padding: 16 }}>
                  <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
                    A warehouse gets its own login — from there it can add products, record purchases from suppliers,
                    and send stock transfers to franchises. This is separate from creating a customer-facing franchise.
                  </p>
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-sm-6">
                        <div className="form-group">
                          <label>Warehouse Name</label>
                          <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group">
                          <label>Warehouse Code</label>
                          <input type="text" className="form-control" placeholder="e.g. WH-MAIN" value={code} onChange={(e) => setCode(e.target.value)} required />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Phone</label>
                          <input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Email</label>
                          <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="form-group">
                          <label>Address</label>
                          <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="btn bg-navy btn-flat" disabled={saving}>
                      {saving ? 'Creating...' : '+ Create Warehouse'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Warehouses</h3>
                </div>
                <div className="box-background" style={{ padding: 0 }}>
                  <table className="table table-striped table-bordered text-center" style={{ marginBottom: 0 }}>
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
                      {warehouses.length > 0 ? (
                        warehouses.map((w) => (
                          <tr key={w.shop_id} className="text-center">
                            <td>{w.shop_code}</td>
                            <td>{w.shop_name}</td>
                            <td>
                              {w.login_slug ? (
                                <button className="btn btn-xs btn-default" onClick={() => copyLoginUrl(w.login_slug)} title={`/login/${w.login_slug}`}>
                                  <i className="fa fa-copy"></i> /login/{w.login_slug}
                                </button>
                              ) : '—'}
                            </td>
                            <td>{w.phone || '—'}</td>
                            <td>{w.is_active ? <span className="label label-success">Active</span> : <span className="label label-default">Inactive</span>}</td>
                            <td>
                              <button
                                className={`btn btn-xs btn-flat ${w.is_active ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => toggleActive(w)}
                              >
                                {w.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={6} className="text-center"><strong>No warehouses registered yet.</strong></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>

      {newLoginCreds && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,43,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setNewLoginCreds(null)}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 440, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginTop: 0 }}>✅ Warehouse registered — save this login</h4>
            <p className="text-muted" style={{ fontSize: 13 }}>
              This password is shown once. The warehouse should log in and change it right away — Employee Management → Edit.
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
