'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Layout = {
  showLogo: boolean
  logoSize: 'small' | 'medium' | 'large'
  showBusinessAddress: boolean
  showTaxBreakdown: boolean
  showCashier: boolean
  showBarcode: boolean
  showAttributes: boolean
  showOrderNumber: boolean
  showDateTime: boolean
  showSku: boolean
  headerText: string
  footerText: string
  fontSize: 'small' | 'normal' | 'large'
}

type Printer = {
  printer_id: number
  printer_name: string
  paper_width_mm: number
  applies_to: string
  is_default: boolean
  layout_json: string
}

const defaultLayout: Layout = {
  showLogo: true,
  logoSize: 'medium',
  showBusinessAddress: true,
  showTaxBreakdown: true,
  showCashier: true,
  showBarcode: true,
  showAttributes: true,
  showOrderNumber: true,
  showDateTime: true,
  showSku: false,
  headerText: '',
  footerText: 'Thank you for shopping with us!',
  fontSize: 'normal',
}

export default function ManagePrinterSettings() {
  const [printers, setPrinters] = useState<Printer[]>([])
  const [name, setName] = useState('')
  const [paperWidth, setPaperWidth] = useState(80)
  const [appliesTo, setAppliesTo] = useState('all')
  const [isDefault, setIsDefault] = useState(false)
  const [layout, setLayout] = useState<Layout>(defaultLayout)
  const [saving, setSaving] = useState(false)

  const getPrinters = async () => {
    try {
      const res = await fetch('/api/printer-settings')
      const json = await res.json()
      if (json.success) setPrinters(json.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load printer settings')
    }
  }

  useEffect(() => { getPrinters() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Printer name is required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/printer-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer_name: name,
          paper_width_mm: paperWidth,
          applies_to: appliesTo,
          is_default: isDefault,
          layout,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Printer saved!')
        setName('')
        setIsDefault(false)
        setLayout(defaultLayout)
        getPrinters()
      } else {
        toast.error(json.error || 'Failed to save printer')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save printer')
    } finally {
      setSaving(false)
    }
  }

  const setDefault = async (printer_id: number) => {
    try {
      const res = await fetch(`/api/printer-settings/${printer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      })
      const json = await res.json()
      if (json.success) { toast.success('Default printer updated'); getPrinters() }
    } catch (err) {
      console.error(err)
      toast.error('Failed to set default printer')
    }
  }

  const removePrinter = async (printer_id: number) => {
    if (!confirm('Delete this printer configuration?')) return
    try {
      const res = await fetch(`/api/printer-settings/${printer_id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) { toast.success('Printer removed'); getPrinters() }
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove printer')
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Printer Settings</a></li>
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
                  <h3 className="box-title">Add / Configure Thermal Printer</h3>
                </div>

                <div className="box-background text-center">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-7 col-sm-12 col-xs-12">
                        <div className="form-group text-center">
                          <label>Printer Name (as registered in QZ Tray / OS) <span className="required">*</span></label>
                          <input type="text" required placeholder="e.g. POS-80-Series"
                            value={name} onChange={(e) => setName(e.target.value)} className="form-control text-center" />
                        </div>

                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group text-center">
                              <label>Paper Width</label>
                              <select className="form-control text-center" value={paperWidth} onChange={(e) => setPaperWidth(Number(e.target.value))}>
                                <option value={58}>58mm</option>
                                <option value={80}>80mm</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group text-center">
                              <label>Applies To</label>
                              <select className="form-control text-center" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)}>
                                <option value="all">All Documents</option>
                                <option value="invoice">Invoice</option>
                                <option value="receipt">Sale Receipt</option>
                                <option value="return">Return Slip</option>
                                <option value="purchase">Purchase Invoice</option>
                                <option value="barcode">Barcode Labels</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="form-group text-center">
                          <label>Header Text (optional, printed above logo)</label>
                          <input type="text" value={layout.headerText}
                            onChange={(e) => setLayout({ ...layout, headerText: e.target.value })} className="form-control text-center" />
                        </div>

                        <div className="form-group text-center">
                          <label>Footer Text</label>
                          <input type="text" value={layout.footerText}
                            onChange={(e) => setLayout({ ...layout, footerText: e.target.value })} className="form-control text-center" />
                        </div>

                        <div className="form-group text-center">
                          <label>Font Size</label>
                          <select className="form-control text-center" value={layout.fontSize}
                            onChange={(e) => setLayout({ ...layout, fontSize: e.target.value as Layout['fontSize'] })}>
                            <option value="small">Small</option>
                            <option value="normal">Normal</option>
                            <option value="large">Large</option>
                          </select>
                        </div>

                        {layout.showLogo && (
                          <div className="form-group text-center">
                            <label>Logo Size</label>
                            <select className="form-control text-center" value={layout.logoSize}
                              onChange={(e) => setLayout({ ...layout, logoSize: e.target.value as Layout['logoSize'] })}>
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="large">Large</option>
                            </select>
                          </div>
                        )}

                        <div className="row text-left" style={{ maxWidth: 500, margin: '0 auto' }}>
                          {([
                            ['showLogo', 'Show business logo'],
                            ['showBusinessAddress', 'Show business address'],
                            ['showTaxBreakdown', 'Show tax breakdown'],
                            ['showCashier', 'Show cashier / sales person'],
                            ['showBarcode', 'Show large order # (for easy visual reference)'],
                            ['showOrderNumber', 'Show order number'],
                            ['showDateTime', 'Show date & time'],
                            ['showAttributes', 'Show product attributes (size, color, etc.)'],
                            ['showSku', 'Show product SKU'],
                          ] as [keyof Layout, string][]).map(([key, label]) => (
                            <div className="col-md-6" key={key}>
                              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="checkbox" checked={Boolean(layout[key])}
                                  onChange={(e) => setLayout({ ...layout, [key]: e.target.checked })} />
                                {label}
                              </label>
                            </div>
                          ))}
                        </div>

                        <div className="form-group text-center" style={{ marginTop: 12 }}>
                          <label style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                            Set as default printer
                          </label>
                        </div>
                        <br />

                        <button type="submit" className="btn bg-navy btn-flat text-center" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Printer'}
                        </button>
                        <br /><br />
                      </div>

                      <div className="col-md-5 col-sm-12 col-xs-12" style={{ marginTop: 8 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Live Preview</label>
                        <div style={{
                          background: '#fff', border: '1px solid #ccc', borderRadius: 4,
                          width: paperWidth >= 80 ? 280 : 210, margin: '0 auto', padding: '12px 10px',
                          fontFamily: 'monospace', fontSize: layout.fontSize === 'large' ? 13 : 11,
                          lineHeight: 1.5, color: '#000', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}>
                          {layout.headerText && <div style={{ textAlign: 'center', fontWeight: 700 }}>{layout.headerText}</div>}
                          {layout.showLogo && (
                            <div style={{
                              textAlign: 'center', color: '#999', fontSize: 10,
                              padding: layout.logoSize === 'large' ? '14px 0' : layout.logoSize === 'small' ? '4px 0' : '8px 0',
                              border: '1px dashed #ccc', margin: '0 auto 4px',
                              width: layout.logoSize === 'large' ? '70%' : layout.logoSize === 'small' ? '30%' : '50%',
                            }}>
                              LOGO
                            </div>
                          )}
                          <div style={{ textAlign: 'center', fontWeight: 700 }}>Your Business Name</div>
                          {layout.showBusinessAddress && (
                            <div style={{ textAlign: 'center', fontSize: 10 }}>123 Main St, City<br />+92 300 1234567</div>
                          )}
                          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, margin: '6px 0' }}>Rs 1,250.00</div>
                          <div style={{ textAlign: 'center', fontWeight: 700 }}>Payment Complete</div>
                          <hr style={{ borderTop: '1px dashed #000' }} />
                          {layout.showOrderNumber && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Order #</span><span>MLN-1-ORD-0001</span></div>}
                          {layout.showDateTime && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date</span><span>9/8/2026</span></div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Customer</span><span>Walking Client</span></div>
                          {layout.showCashier && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cashier</span><span>Staff Name</span></div>}
                          <hr style={{ borderTop: '1px dashed #000' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sample Item x1</span><span>500.00</span></div>
                          {layout.showAttributes && <div style={{ fontSize: 9, color: '#666' }}>&nbsp;&nbsp;Color: Blue</div>}
                          {layout.showSku && <div style={{ fontSize: 9, color: '#666' }}>&nbsp;&nbsp;SKU: ABC123</div>}
                          <hr style={{ borderTop: '1px dashed #000' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>500.00</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>-0.00</span></div>
                          {layout.showTaxBreakdown && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><span>0.00</span></div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Grand Total</span><span>500.00</span></div>
                          <hr style={{ borderTop: '1px dashed #000' }} />
                          <div style={{ textAlign: 'center' }}>{layout.footerText}</div>
                          {layout.showBarcode && <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 6 }}>#MLN-1-ORD-0001</div>}
                        </div>
                        <p className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>
                          Approximate — the real receipt on a {paperWidth}mm thermal printer will look close to this.
                        </p>
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
                      <th className="active text-center">Name</th>
                      <th className="active text-center">Width</th>
                      <th className="active text-center">Applies To</th>
                      <th className="active text-center">Default</th>
                      <th className="col-sm-2 active text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printers.length > 0 ? (
                      printers.map((p) => (
                        <tr key={p.printer_id} className="text-center">
                          <td>{p.printer_name}</td>
                          <td>{p.paper_width_mm}mm</td>
                          <td>{p.applies_to}</td>
                          <td>{p.is_default ? '✅' : ''}</td>
                          <td>
                            {!p.is_default && (
                              <button className="btn btn-primary btn-flat btn-xs" style={{ marginRight: 6 }} onClick={() => setDefault(p.printer_id)}>
                                Set Default
                              </button>
                            )}
                            <button className="btn btn-danger btn-flat btn-xs" onClick={() => removePrinter(p.printer_id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="text-center"><strong>No printers configured.</strong></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
