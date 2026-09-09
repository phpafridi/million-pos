'use client'
import React, { useRef, useState } from 'react'
import { toast } from 'sonner'

export default function ManageBackup() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [restoring, setRestoring] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/backup/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Backup downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download backup')
    } finally {
      setDownloading(false)
    }
  }

  const handleRestore = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Choose a backup file first'); return }

    if (!confirm('This will REPLACE all current data with the contents of this backup file. This cannot be undone. Continue?')) return

    setRestoring(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const result = await res.json()

      if (result.success) {
        toast.success('Backup restored successfully')
        if (fileRef.current) fileRef.current.value = ''
      } else {
        toast.error(result.error || 'Restore failed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Invalid or unreadable backup file')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Backup & Restore</a></li>
          <li><a href="#">Settings</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-8 col-md-offset-2">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Take a Backup</h3>
                </div>
                <div className="box-background text-center" style={{ padding: 24 }}>
                  <p>Downloads a complete snapshot of your database (products, orders, purchases, settings — everything) as a single JSON file.</p>
                  <button className="btn bg-navy btn-flat" onClick={handleDownload} disabled={downloading}>
                    {downloading ? 'Preparing...' : 'Download Backup'}
                  </button>
                </div>
              </div>

              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Restore from Backup</h3>
                </div>
                <div className="box-background text-center" style={{ padding: 24 }}>
                  <p style={{ color: '#b91c1c' }}>
                    <strong>Warning:</strong> restoring replaces all current data with the contents of the uploaded file. Take a fresh backup first if you&apos;re unsure.
                  </p>
                  <input type="file" accept=".json,application/json" ref={fileRef} className="form-control" style={{ maxWidth: 400, margin: '0 auto 16px' }} />
                  <button className="btn btn-danger btn-flat" onClick={handleRestore} disabled={restoring}>
                    {restoring ? 'Restoring...' : 'Upload & Restore'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
