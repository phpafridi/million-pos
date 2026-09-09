'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ManageNotificationSettings() {
  const [form, setForm] = useState({
    notify_email_enabled: false,
    notify_whatsapp_enabled: false,
    smtp_host: '', smtp_port: '587', smtp_secure: false,
    smtp_user: '', smtp_password: '', smtp_from_email: '', smtp_from_name: '',
    whatsapp_api_url: '', whatsapp_api_token: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmailTo, setTestEmailTo] = useState('')
  const [testWhatsAppTo, setTestWhatsAppTo] = useState('')
  const [testing, setTesting] = useState<'email' | 'whatsapp' | null>(null)

  const sendTest = async (channel: 'email' | 'whatsapp') => {
    const to = channel === 'email' ? testEmailTo : testWhatsAppTo
    if (!to.trim()) { toast.error(`Enter a ${channel === 'email' ? 'email address' : 'phone number'} to send the test to`); return }
    setTesting(channel)
    try {
      const res = await fetch('/api/notification-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, to }),
      })
      const json = await res.json()
      if (json.success) toast.success(`Test ${channel} sent — check ${to}`)
      else toast.error(json.error || `Failed to send test ${channel}`)
    } catch (err) {
      toast.error(`Failed to send test ${channel}`)
    } finally {
      setTesting(null)
    }
  }

  useEffect(() => {
    fetch('/api/notification-settings').then(r => r.json()).then(json => {
      if (json.success && json.data) {
        setForm({
          notify_email_enabled: json.data.notify_email_enabled,
          notify_whatsapp_enabled: json.data.notify_whatsapp_enabled,
          smtp_host: json.data.smtp_host || '',
          smtp_port: String(json.data.smtp_port || 587),
          smtp_secure: json.data.smtp_secure,
          smtp_user: json.data.smtp_user || '',
          smtp_password: json.data.smtp_password || '',
          smtp_from_email: json.data.smtp_from_email || '',
          smtp_from_name: json.data.smtp_from_name || '',
          whatsapp_api_url: json.data.whatsapp_api_url || '',
          whatsapp_api_token: json.data.whatsapp_api_token || '',
        })
      }
      setLoading(false)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) toast.success('Notification settings saved')
      else toast.error(json.error || 'Failed to save')
    } catch (err) {
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="right-side" style={{ minHeight: '945px' }}><p className="text-center">Loading...</p></div>

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Notification Settings</a></li>
          <li><a href="#">Settings</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-8 col-md-offset-2">

              <div className="box box-primary" style={{ marginBottom: 18 }}>
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Email (SMTP)</h3>
                </div>
                <div className="box-background" style={{ padding: 16 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input type="checkbox" checked={form.notify_email_enabled}
                      onChange={(e) => setForm({ ...form, notify_email_enabled: e.target.checked })} />
                    Send an email when a tailor order's status changes
                  </label>
                  <div className="row">
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label>SMTP Host</label>
                        <input type="text" className="form-control" placeholder="smtp.gmail.com"
                          value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label>Port</label>
                        <input type="number" className="form-control"
                          value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label>SMTP Username</label>
                        <input type="text" className="form-control"
                          value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label>SMTP Password</label>
                        <input type="password" className="form-control"
                          value={form.smtp_password} onChange={(e) => setForm({ ...form, smtp_password: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label>From Email</label>
                        <input type="email" className="form-control"
                          value={form.smtp_from_email} onChange={(e) => setForm({ ...form, smtp_from_email: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label>From Name</label>
                        <input type="text" className="form-control"
                          value={form.smtp_from_name} onChange={(e) => setForm({ ...form, smtp_from_name: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={form.smtp_secure}
                      onChange={(e) => setForm({ ...form, smtp_secure: e.target.checked })} />
                    Use TLS/SSL
                  </label>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
                    Using Gmail? Enable 2-factor authentication on the account, then generate an
                    "App Password" — use that here instead of your real Gmail password.
                  </p>
                  <hr />
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#8a90a3', textTransform: 'uppercase' }}>Send a Test Email</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="email" className="form-control" placeholder="you@example.com"
                      value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} />
                    <button className="btn btn-default" onClick={() => sendTest('email')} disabled={testing === 'email'}>
                      {testing === 'email' ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                  <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Save your settings above first, then test.</p>
                </div>
              </div>

              <div className="box box-primary" style={{ marginBottom: 18 }}>
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">WhatsApp</h3>
                </div>
                <div className="box-background" style={{ padding: 16 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input type="checkbox" checked={form.notify_whatsapp_enabled}
                      onChange={(e) => setForm({ ...form, notify_whatsapp_enabled: e.target.checked })} />
                    Send a WhatsApp message when a tailor order's status changes
                  </label>
                  <div className="form-group">
                    <label>WhatsApp API URL</label>
                    <input type="text" className="form-control" placeholder="https://your-provider.com/send"
                      value={form.whatsapp_api_url} onChange={(e) => setForm({ ...form, whatsapp_api_url: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>API Token</label>
                    <input type="password" className="form-control"
                      value={form.whatsapp_api_token} onChange={(e) => setForm({ ...form, whatsapp_api_token: e.target.value })} />
                  </div>
                  <p className="text-muted" style={{ fontSize: 12 }}>
                    Works with any WhatsApp Business API provider (Twilio, Meta Cloud API, etc.) that accepts
                    a bearer token and a <code>{'{ to, message }'}</code> JSON body. If your provider needs a
                    different request format, that's a code-level change, not a setting here.
                  </p>
                  <hr />
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#8a90a3', textTransform: 'uppercase' }}>Send a Test Message</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" className="form-control" placeholder="+92300xxxxxxx"
                      value={testWhatsAppTo} onChange={(e) => setTestWhatsAppTo(e.target.value)} />
                    <button className="btn btn-default" onClick={() => sendTest('whatsapp')} disabled={testing === 'whatsapp'}>
                      {testing === 'whatsapp' ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                  <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Save your settings above first, then test.</p>
                </div>
              </div>

              <button className="btn bg-navy btn-flat btn-block" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </button>

            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
