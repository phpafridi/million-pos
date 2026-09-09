'use client'
import React, { useEffect, useState } from 'react'
import FetchProduct from './actions/FetchProducts'
import { PDFDownloadLink } from '@react-pdf/renderer'
import StockReportPDF from './StockReportPDF'
import { GetBusinessProfile } from '../settings/actions/GetBusinessProfile'
import { fetchCurrency } from '../settings/actions/fetchCurrency'

type Product = {
  id: number
  sku: string
  name: string
  cost: number
  qty: number
  stockValue: number
  measurement_units?: string
  packet_size: number
}

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export default function StockReport() {
  const [products, setProducts]   = useState<Product[]>([])
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<StockFilter>('all')
  const [loading, setLoading]     = useState(true)
  const [company, setCompany]     = useState('')
  const [currency, setCurrency]   = useState('Rs')

  useEffect(() => {
    Promise.all([FetchProduct(), GetBusinessProfile(), fetchCurrency()]).then(([data, profile, cur]) => {
      setProducts(data)
      setCompany(profile?.company_name || '')
      setCurrency(cur?.currency || 'Rs')
      setLoading(false)
    })
  }, [])

  const getDisplayQty = (p: Product) => {
    const ps = p.packet_size
    const isPackets = ps > 0 && p.qty % ps === 0
    return { displayQty: isPackets ? p.qty / ps : p.qty, displayUnit: isPackets ? 'packet' : (p.measurement_units || 'pcs') }
  }

  const getStockStatus = (qty: number) => {
    if (qty <= 0)  return { label: 'Out of Stock', color: '#dc2626', bg: '#fef2f2' }
    if (qty < 10)  return { label: 'Low Stock',    color: '#d97706', bg: '#fffbeb' }
    return              { label: 'In Stock',       color: '#16a34a', bg: '#f0fdf4' }
  }

  const filtered = products.filter(p => {
    const s = search.toLowerCase()
    const matchSearch = !s || p.sku.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || p.cost.toString().includes(s)
    const matchFilter =
      filter === 'all' ? true :
      filter === 'out_of_stock' ? p.qty <= 0 :
      filter === 'low_stock'    ? (p.qty > 0 && p.qty < 10) :
      p.qty >= 10
    return matchSearch && matchFilter
  })

  const grandTotal   = filtered.reduce((s, p) => s + p.stockValue, 0)
  const totalItems   = filtered.length
  const outOfStock   = products.filter(p => p.qty <= 0).length
  const lowStock     = products.filter(p => p.qty > 0 && p.qty < 10).length
  const inStock      = products.filter(p => p.qty >= 10).length
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(n)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const printReport = () => {
    const area = document.getElementById('stk-print')?.innerHTML
    if (!area) return
    const w = window.open('', '', 'width=1100,height=800')
    w?.document.write(`<html><head><title>Stock Report</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;padding:24px;}
      .rpt-header{text-align:center;margin-bottom:20px;border-bottom:3px solid #1a1a2e;padding-bottom:14px;}
      .rpt-header h1{font-size:20px;font-weight:800;} .rpt-header p{font-size:11px;color:#555;margin-top:4px;}
      table{width:100%;border-collapse:collapse;} thead tr{background:#f1f5f9;color:#1a1a2e;}
      th,td{padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;font-size:11px;}
      tbody tr:nth-child(even){background:#f8f9fc;}
      tfoot td{background:#f1f5f9;font-weight:700;border-top:2px solid #1a1a2e;}
      .badge{padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;}
    </style></head><body>${area}</body></html>`)
    w?.document.close(); w?.print()
  }

  return (
    <section className="content">
      <style>{`
        .rpt-wrap{background:#fff;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.08);overflow:hidden;}
        .rpt-topbar{background:linear-gradient(135deg,#312e81 0%,#4338ca 100%);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;}
        .rpt-topbar h2{color:#fff;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;}
        .rpt-topbar span{color:#c7d2fe;font-size:12px;}
        .rpt-controls{padding:16px 28px;background:#f8f9fc;border-bottom:1px solid #e5e7eb;display:flex;gap:12px;align-items:center;}
        .rpt-search{flex:1;max-width:360px;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:7px;font-size:13px;background:#fff;outline:none;}
        .rpt-search:focus{border-color:#4338ca;}
        .filter-btns{display:flex;gap:6px;}
        .f-btn{padding:6px 14px;border:1.5px solid #d1d5db;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;background:#fff;color:#374151;transition:all .12s;}
        .f-btn:hover{border-color:#4338ca;color:#4338ca;}
        .f-btn.active{background:#4338ca;border-color:#4338ca;color:#fff;}
        .f-btn.green.active{background:#16a34a;border-color:#16a34a;}
        .f-btn.amber.active{background:#d97706;border-color:#d97706;}
        .f-btn.red.active{background:#dc2626;border-color:#dc2626;}
        .rpt-actions{padding:12px 28px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;gap:10px;align-items:center;}
        .rpt-btn{padding:8px 20px;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;}
        .rpt-btn-print{background:#0ea5e9;color:#fff;} .rpt-btn-pdf{background:#16a34a;color:#fff;}
        .rpt-body{padding:24px 28px;}
        .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:24px;}
        .kpi-card{background:#f8f9fc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px 16px;border-top:3px solid #4338ca;}
        .kpi-card.green{border-top-color:#16a34a;} .kpi-card.amber{border-top-color:#d97706;} .kpi-card.red{border-top-color:#dc2626;} .kpi-card.purple{border-top-color:#7c3aed;}
        .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;margin-bottom:5px;}
        .kpi-value{font-size:18px;font-weight:800;color:#312e81;}
        .kpi-value.green{color:#16a34a;} .kpi-value.amber{color:#d97706;} .kpi-value.red{color:#dc2626;} .kpi-value.purple{color:#7c3aed;}
        .rpt-table-wrap{border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;}
        .rpt-table{width:100%;border-collapse:collapse;font-size:13px;}
        .rpt-table thead tr{background:#e8eaf5;}
        .rpt-table thead th{padding:11px 14px;color:#312e81;font-weight:700;text-align:center;font-size:12px;border-bottom:2px solid #312e81;}
        .rpt-table tbody tr:nth-child(even){background:#fafafe;}
        .rpt-table tbody tr:hover{background:#eef2ff;}
        .rpt-table tbody td{padding:10px 14px;border-bottom:1px solid #f0f2f8;text-align:center;color:#374151;}
        .rpt-table tfoot td{padding:11px 14px;background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #312e81;}
        .status-badge{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;display:inline-block;}
        .rpt-empty{text-align:center;padding:60px 20px;color:#9ca3af;}
        .rpt-empty i{font-size:48px;display:block;margin-bottom:12px;opacity:.4;}
        @media print{.no-print{display:none!important;}}
      `}</style>

      <div className="rpt-wrap">
        <div className="rpt-topbar">
          <h2><i className="fa fa-cubes" style={{ marginRight: 10 }} />Stock Report</h2>
          <span>{today} &nbsp;·&nbsp; {products.length} products total</span>
        </div>

        <div className="rpt-controls no-print">
          <input
            type="text" className="rpt-search" placeholder="Search by SKU, product name, cost…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-btns">
            {([['all','All',''],[['in_stock'],'In Stock','green'],[['low_stock'],'Low Stock','amber'],[['out_of_stock'],'Out of Stock','red']] as [any,string,string][]).map(([val, label, cls]) => (
              <button key={val} className={`f-btn ${cls} ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
            ))}
          </div>
        </div>

        {!loading && (
          <div className="rpt-actions no-print">
            <button className="rpt-btn rpt-btn-print" onClick={printReport}><i className="fa fa-print" style={{ marginRight: 6 }} />Print</button>
            <PDFDownloadLink document={<StockReportPDF products={filtered} grandTotal={grandTotal} />} fileName="stock-report.pdf">
              {({ loading: pdfL }) => <button className="rpt-btn rpt-btn-pdf">{pdfL ? 'Preparing…' : <><i className="fa fa-file-pdf-o" style={{ marginRight: 6 }} />Download PDF</>}</button>}
            </PDFDownloadLink>
            <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>
              {filtered.length} of {products.length} products shown
            </span>
          </div>
        )}

        <div className="rpt-body">
          {loading ? (
            <div className="rpt-empty"><i className="fa fa-spinner fa-spin" />Loading stock data…</div>
          ) : (
            <div id="stk-print">
              <div className="rpt-header" style={{ display: 'none' }} id="stk-print-hdr">
                <h1>{company || 'Stock Report'}</h1>
                <p>Generated: {today} &nbsp;|&nbsp; {filtered.length} products</p>
              </div>
              <style>{`@media print{#stk-print-hdr{display:block!important;}}`}</style>

              <div className="kpi-grid">
                <div className="kpi-card"><div className="kpi-label">Total Products</div><div className="kpi-value">{products.length}</div></div>
                <div className="kpi-card green"><div className="kpi-label">In Stock</div><div className="kpi-value green">{inStock}</div></div>
                <div className="kpi-card amber"><div className="kpi-label">Low Stock</div><div className="kpi-value amber">{lowStock}</div></div>
                <div className="kpi-card red"><div className="kpi-label">Out of Stock</div><div className="kpi-value red">{outOfStock}</div></div>
                <div className="kpi-card purple"><div className="kpi-label">Stock Value</div><div className="kpi-value purple">{currency} {fmt(products.reduce((s,p) => s+p.stockValue, 0))}</div></div>
              </div>

              {filtered.length === 0 ? (
                <div className="rpt-empty"><i className="fa fa-search" />No products match your search.</div>
              ) : (
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead>
                      <tr><th>#</th><th>SKU</th><th>Product Name</th><th>Unit Cost</th><th>Qty in Hand</th><th>Unit</th><th>Status</th><th>Stock Value</th></tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, i) => {
                        const { displayQty, displayUnit } = getDisplayQty(p)
                        const status = getStockStatus(p.qty)
                        return (
                          <tr key={p.id}>
                            <td style={{ color: '#9ca3af', fontSize: 11 }}>{i + 1}</td>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 11, background: '#eef2ff', padding: '1px 6px', borderRadius: 3, color: '#4338ca' }}>{p.sku}</span></td>
                            <td style={{ textAlign: 'left', fontWeight: 500 }}>{p.name}</td>
                            <td>{currency} {fmt(p.cost)}</td>
                            <td style={{ fontWeight: 700 }}>{displayQty}</td>
                            <td style={{ color: '#6b7280', fontSize: 12 }}>{displayUnit}</td>
                            <td>
                              <span className="status-badge" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                            </td>
                            <td style={{ fontWeight: 700 }}>{currency} {fmt(p.stockValue)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'right' }}>Total Stock Value ({filtered.length} products)</td>
                        <td>{currency} {fmt(grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
