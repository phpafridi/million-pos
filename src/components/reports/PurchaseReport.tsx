'use client'
import React, { useState } from 'react'
import FetchPurchaseReport, { PurchaseReportRow } from './actions/FetchPurchaseReport'
import PurchaseReportPDF from './PurchaseReportPDF'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { GetBusinessProfile } from '../settings/actions/GetBusinessProfile'
import { fetchCurrency } from '../settings/actions/fetchCurrency'

export default function PurchaseReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [report, setReport]       = useState<PurchaseReportRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [company, setCompany]     = useState('')
  const [currency, setCurrency]   = useState('Rs')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) return
    setLoading(true)
    const [data, profile, cur] = await Promise.all([
      FetchPurchaseReport(startDate, endDate),
      GetBusinessProfile(),
      fetchCurrency(),
    ])
    setReport(data)
    setCompany(profile?.company_name || '')
    setCurrency(cur?.currency || 'Rs')
    setLoading(false)
  }

  const totalPurchases = report.length
  const totalAmount    = report.reduce((s, r) => s + r.grandTotal, 0)
  const totalItems     = report.reduce((s, r) => s + r.items.length, 0)
  const totalQty       = report.reduce((s, r) => s + r.items.reduce((x, i) => x + i.qty, 0), 0)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`

  const printReport = () => {
    const area = document.getElementById('pur-print')?.innerHTML
    if (!area) return
    const w = window.open('', '', 'width=1100,height=800')
    w?.document.write(`<html><head><title>Purchase Report</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;padding:24px;}
      .rpt-header{text-align:center;margin-bottom:20px;border-bottom:3px solid #1a1a2e;padding-bottom:14px;}
      .rpt-header h1{font-size:20px;font-weight:800;} .rpt-header p{font-size:11px;color:#555;margin-top:4px;}
      .pur-block{margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;page-break-inside:avoid;}
      .pur-head{background:#1a1a2e;color:#fff;padding:10px 14px;display:flex;gap:20px;font-size:12px;}
      .pur-head strong{font-weight:700;} .pur-head span{opacity:.8;}
      table{width:100%;border-collapse:collapse;} thead tr{background:#f1f5f9;}
      th,td{padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;}
      th{font-weight:700;color:#374151;} tfoot td{background:#f9fafb;font-weight:700;border-top:2px solid #e5e7eb;}
      .summary{display:flex;gap:16px;margin-top:20px;padding:14px;background:#f8f9fc;border-radius:8px;border:1px solid #e5e7eb;}
      .s-item{flex:1;text-align:center;} .s-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;}
      .s-val{font-size:16px;font-weight:800;color:#1a1a2e;margin-top:4px;}
    </style></head><body>${area}</body></html>`)
    w?.document.close(); w?.print()
  }

  return (
    <section className="content">
      <style>{`
        .rpt-wrap{background:#fff;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.08);overflow:hidden;}
        .rpt-topbar{background:linear-gradient(135deg,#14532d 0%,#166534 100%);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;}
        .rpt-topbar h2{color:#fff;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;}
        .rpt-topbar span{color:#bbf7d0;font-size:12px;}
        .rpt-form-area{padding:20px 28px;background:#f8f9fc;border-bottom:1px solid #e5e7eb;}
        .rpt-form-row{display:flex;gap:16px;align-items:flex-end;}
        .rpt-field{display:flex;flex-direction:column;gap:5px;flex:1;}
        .rpt-field label{font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;}
        .rpt-input{padding:9px 12px;border:1.5px solid #d1d5db;border-radius:7px;font-size:13px;background:#fff;outline:none;}
        .rpt-input:focus{border-color:#14532d;}
        .rpt-btn{padding:9px 22px;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;}
        .rpt-btn-primary{background:#14532d;color:#fff;}
        .rpt-btn-print{background:#0ea5e9;color:#fff;}
        .rpt-btn-pdf{background:#16a34a;color:#fff;}
        .rpt-actions{padding:14px 28px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;gap:10px;align-items:center;}
        .rpt-body{padding:24px 28px;}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
        .kpi-card{background:#f8f9fc;border:1.5px solid #e5e7eb;border-radius:10px;padding:16px 18px;border-top:3px solid #14532d;}
        .kpi-card.blue{border-top-color:#2563eb;} .kpi-card.amber{border-top-color:#d97706;} .kpi-card.purple{border-top-color:#7c3aed;}
        .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;margin-bottom:6px;}
        .kpi-value{font-size:19px;font-weight:800;color:#14532d;}
        .kpi-value.blue{color:#2563eb;} .kpi-value.amber{color:#d97706;} .kpi-value.purple{color:#7c3aed;}
        .pur-block{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:16px;}
        .pur-head{background:#14532d;color:#fff;padding:12px 16px;display:flex;align-items:center;gap:20px;cursor:pointer;user-select:none;}
        .pur-head:hover{background:#166534;}
        .pur-ref{background:rgba(255,255,255,.15);padding:2px 10px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:700;}
        .pur-head-info{display:flex;gap:16px;flex:1;font-size:12px;}
        .pur-head-info span{opacity:.85;}
        .pur-head-total{font-size:16px;font-weight:800;color:#bbf7d0;}
        .pur-toggle{background:rgba(255,255,255,.2);border:none;color:#fff;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;}
        .pur-table-wrap{overflow:hidden;}
        .pur-table{width:100%;border-collapse:collapse;font-size:13px;}
        .pur-table thead tr{background:#f0fdf4;}
        .pur-table thead th{padding:9px 14px;color:#14532d;font-weight:700;text-align:center;font-size:11px;border-bottom:2px solid #dcfce7;}
        .pur-table tbody tr:hover{background:#f0fdf4;}
        .pur-table tbody td{padding:9px 14px;border-bottom:1px solid #f0f2f8;text-align:center;color:#374151;}
        .pur-table tfoot td{padding:9px 14px;background:#f0fdf4;font-weight:700;text-align:center;border-top:2px solid #dcfce7;color:#14532d;}
        .rpt-empty{text-align:center;padding:60px 20px;color:#9ca3af;}
        .rpt-empty i{font-size:48px;display:block;margin-bottom:12px;opacity:.4;}
        .overall-total{background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;margin-top:20px;}
        @media print{.no-print{display:none!important;}}
      `}</style>

      <div className="rpt-wrap">
        <div className="rpt-topbar">
          <h2><i className="fa fa-shopping-cart" style={{ marginRight: 10 }} />Purchase Report</h2>
          <span>{today}</span>
        </div>

        <div className="rpt-form-area no-print">
          <div className="rpt-form-row">
            <div className="rpt-field"><label>Start Date</label><input type="date" className="rpt-input" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="rpt-field"><label>End Date</label><input type="date" className="rpt-input" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <button className="rpt-btn rpt-btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? <><i className="fa fa-spinner fa-spin" /> Generating…</> : <><i className="fa fa-search" style={{ marginRight: 6 }} />Generate</>}
            </button>
          </div>
        </div>

        {report.length > 0 && (
          <div className="rpt-actions no-print">
            <button className="rpt-btn rpt-btn-print" onClick={printReport}><i className="fa fa-print" style={{ marginRight: 6 }} />Print</button>
            <PDFDownloadLink document={<PurchaseReportPDF startDate={startDate} endDate={endDate} report={report} totals={{ totalQty, totalAmount }} />} fileName={`purchase-report-${startDate}-to-${endDate}.pdf`}>
              {({ loading: pdfL }) => <button className="rpt-btn rpt-btn-pdf">{pdfL ? 'Preparing…' : <><i className="fa fa-file-pdf-o" style={{ marginRight: 6 }} />Download PDF</>}</button>}
            </PDFDownloadLink>
            <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>{totalPurchases} purchase orders &nbsp;·&nbsp; {startDate} → {endDate}</span>
          </div>
        )}

        <div className="rpt-body">
          {report.length === 0 ? (
            <div className="rpt-empty">
              <i className="fa fa-shopping-cart" />
              {loading ? 'Loading…' : 'Select a date range and generate the report.'}
            </div>
          ) : (
            <div id="pur-print">
              <div className="rpt-header" style={{ display: 'none' }} id="pur-print-hdr">
                <h1>{company || 'Purchase Report'}</h1>
                <p>Period: {startDate} to {endDate} &nbsp;|&nbsp; Generated: {today}</p>
              </div>
              <style>{`@media print{#pur-print-hdr{display:block!important;}.pur-toggle{display:none!important;}.pur-table-wrap{display:block!important;}}`}</style>

              <div className="kpi-grid">
                <div className="kpi-card blue"><div className="kpi-label">Total Orders</div><div className="kpi-value blue">{totalPurchases}</div></div>
                <div className="kpi-card amber"><div className="kpi-label">Total Amount</div><div className="kpi-value amber">{fmt(totalAmount)}</div></div>
                <div className="kpi-card purple"><div className="kpi-label">Total Items</div><div className="kpi-value purple">{totalItems}</div></div>
                <div className="kpi-card"><div className="kpi-label">Total Qty</div><div className="kpi-value">{totalQty.toFixed(1)}</div></div>
              </div>

              {report.map(purchase => (
                <div key={purchase.id} className="pur-block">
                  <div className="pur-head" onClick={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}>
                    <span className="pur-ref">PUR-{purchase.ref}</span>
                    <div className="pur-head-info">
                      <span><i className="fa fa-truck" style={{ marginRight: 5 }} />{purchase.supplier}</span>
                      <span><i className="fa fa-calendar" style={{ marginRight: 5 }} />{purchase.date}</span>
                      <span>{purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="pur-head-total">{fmt(purchase.grandTotal)}</span>
                    <button className="pur-toggle no-print">{expandedId === purchase.id ? '▲ Hide' : '▼ Show'}</button>
                  </div>
                  <div className="pur-table-wrap" style={{ display: expandedId === purchase.id ? 'block' : 'none' }}>
                    <table className="pur-table">
                      <thead style={{ color: 'black' }}><tr><th>#</th><th>Code</th><th>Product</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
                      <tbody>
                        {purchase.items.map((item, i) => (
                          <tr key={i}>
                            <td style={{ color: '#9ca3af', fontSize: 11 }}>{i + 1}</td>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f0fdf4', padding: '1px 6px', borderRadius: 3, color: '#166534' }}>{item.code}</span></td>
                            <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.name}</td>
                            <td>{item.price.toFixed(2)}</td>
                            <td>{item.qty} <span style={{ color: '#9ca3af', fontSize: 11 }}>{item.unit}</span></td>
                            <td style={{ fontWeight: 700 }}>{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td colSpan={5} style={{ textAlign: 'right' }}>Grand Total</td><td>{purchase.grandTotal.toFixed(2)}</td></tr></tfoot>
                    </table>
                  </div>
                </div>
              ))}

              <div className="overall-total">
                <div style={{ display: 'flex', gap: 32 }}>
                  <div><div className="kpi-label">Total Orders</div><div style={{ fontWeight: 800, fontSize: 18 }}>{totalPurchases}</div></div>
                  <div><div className="kpi-label">Total Qty</div><div style={{ fontWeight: 800, fontSize: 18 }}>{totalQty.toFixed(1)}</div></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="kpi-label">Total Purchase Amount</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#14532d' }}>{fmt(totalAmount)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
