'use client'
import React, { useState } from 'react'
import FetchSalesReport, { SalesReportRow } from './actions/FetchSalesReport'
import SalesReportPDF from './SalesReportPDF'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { GetBusinessProfile } from '../settings/actions/GetBusinessProfile'
import { fetchCurrency } from '../settings/actions/fetchCurrency'

export default function SalesReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [report, setReport]       = useState<SalesReportRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [company, setCompany]     = useState<string>('')
  const [currency, setCurrency]   = useState('Rs')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) return
    setLoading(true)
    const [data, profile, cur] = await Promise.all([
      FetchSalesReport(startDate, endDate),
      GetBusinessProfile(),
      fetchCurrency(),
    ])
    setReport(data)
    setCompany(profile?.company_name || '')
    setCurrency(cur?.currency || 'Rs')
    setLoading(false)
  }

  const totalCost    = report.reduce((s, r) => s + r.buyingCost,  0)
  const totalSelling = report.reduce((s, r) => s + r.sellingCost, 0)
  const totalGrand   = report.reduce((s, r) => s + r.grandTotal,  0)
  const totalProfit  = report.reduce((s, r) => s + r.profit,      0)
  const totalTax     = report.reduce((s, r) => s + r.tax,         0)
  const totalDisc    = report.reduce((s, r) => s + r.discount,    0)
  const profitMargin = totalSelling > 0 ? ((totalProfit / totalSelling) * 100).toFixed(1) : '0.0'

  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const printReport = () => {
    const area = document.getElementById('rpt-print')?.innerHTML
    if (!area) return
    const w = window.open('', '', 'width=1100,height=800')
    w?.document.write(`<html><head><title>Sales Report</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff;padding:28px;}
      .rpt-header{text-align:center;margin-bottom:24px;border-bottom:3px solid #1a1a2e;padding-bottom:16px;}
      .rpt-header h1{font-size:22px;font-weight:800;letter-spacing:1px;}
      .rpt-header p{font-size:11px;color:#555;margin-top:4px;}
      .rpt-meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:11px;color:#444;}
      .kpi-row{display:flex;gap:12px;margin-bottom:20px;}
      .kpi{flex:1;background:#f8f9fc;border:1px solid #e0e4ef;border-radius:6px;padding:10px 14px;}
      .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;}
      .kpi-val{font-size:16px;font-weight:800;color:#1a1a2e;margin-top:3px;}
      .kpi-val.green{color:#15803d;} .kpi-val.blue{color:#1d4ed8;} .kpi-val.red{color:#b91c1c;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      thead tr{background:#f1f5f9;color:#1a1a2e;}
      thead th{padding:9px 10px;text-align:center;font-weight:700;letter-spacing:0.5px;}
      tbody tr:nth-child(even){background:#f8f9fc;}
      tbody tr:hover{background:#eef2ff;}
      tbody td{padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:center;}
      tfoot tr{background:#f1f5f9;font-weight:700;}
      tfoot td{padding:9px 10px;border-top:2px solid #1a1a2e;text-align:center;}
      .profit{color:#15803d;font-weight:700;} .footer{text-align:center;margin-top:24px;font-size:10px;color:#9ca3af;}
      @media print{body{padding:16px;}}
    </style></head><body>${area}</body></html>`)
    w?.document.close()
    w?.print()
  }

  return (
    <section className="content">
      <style>{`
        .rpt-wrap{background:#fff;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.08);overflow:hidden;}
        .rpt-topbar{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;}
        .rpt-topbar h2{color:#fff;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;}
        .rpt-topbar span{color:#7ec8e3;font-size:12px;}
        .rpt-form-area{padding:24px 28px;background:#f8f9fc;border-bottom:1px solid #e5e7eb;}
        .rpt-form-row{display:flex;gap:16px;align-items:flex-end;}
        .rpt-field{display:flex;flex-direction:column;gap:5px;flex:1;}
        .rpt-field label{font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;}
        .rpt-input{padding:9px 12px;border:1.5px solid #d1d5db;border-radius:7px;font-size:13px;background:#fff;outline:none;transition:border .15s;}
        .rpt-input:focus{border-color:#1a1a2e;}
        .rpt-btn{padding:9px 24px;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;}
        .rpt-btn-primary{background:#1a1a2e;color:#fff;} .rpt-btn-primary:hover{background:#16213e;}
        .rpt-btn-print{background:#0ea5e9;color:#fff;} .rpt-btn-print:hover{background:#0284c7;}
        .rpt-btn-pdf{background:#16a34a;color:#fff;} .rpt-btn-pdf:hover{background:#15803d;}
        .rpt-actions{padding:14px 28px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;gap:10px;align-items:center;}
        .rpt-body{padding:24px 28px;}
        .kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:24px;}
        .kpi-card{background:#f8f9fc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px 16px;border-top:3px solid #1a1a2e;}
        .kpi-card.green{border-top-color:#16a34a;} .kpi-card.blue{border-top-color:#2563eb;} .kpi-card.amber{border-top-color:#d97706;} .kpi-card.red{border-top-color:#dc2626;} .kpi-card.purple{border-top-color:#7c3aed;}
        .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;margin-bottom:6px;}
        .kpi-value{font-size:17px;font-weight:800;color:#1a1a2e;}
        .kpi-value.green{color:#16a34a;} .kpi-value.blue{color:#2563eb;} .kpi-value.amber{color:#d97706;} .kpi-value.red{color:#dc2626;} .kpi-value.purple{color:#7c3aed;}
        .rpt-table-wrap{border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;}
        .rpt-table{width:100%;border-collapse:collapse;font-size:13px;}
        .rpt-table thead tr{background:#e8edf5;}
        .rpt-table thead th{padding:11px 14px;color:#1a1a2e;font-weight:700;text-align:center;font-size:12px;letter-spacing:0.5px;border-bottom:2px solid #1a1a2e;}
        .rpt-table tbody tr{border-bottom:1px solid #f0f2f8;transition:background .1s;}
        .rpt-table tbody tr:nth-child(even){background:#fafbff;}
        .rpt-table tbody tr:hover{background:#eef2ff;}
        .rpt-table tbody td{padding:10px 14px;text-align:center;color:#374151;}
        .rpt-table tfoot td{padding:11px 14px;background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #1a1a2e;color:#1a1a2e;font-size:13px;}
        .profit-cell{color:#16a34a;font-weight:700;}
        .inv-badge{background:#eef2ff;color:#4338ca;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;font-family:monospace;}
        .rpt-empty{text-align:center;padding:60px 20px;color:#9ca3af;}
        .rpt-empty i{font-size:48px;display:block;margin-bottom:12px;opacity:.4;}
        @media print{.no-print{display:none!important;}}
      `}</style>

      <div className="rpt-wrap">
        {/* Top bar */}
        <div className="rpt-topbar">
          <h2><i className="fa fa-bar-chart" style={{ marginRight: 10 }} />Sales Report</h2>
          <span>Generated: {today}</span>
        </div>

        {/* Filter form */}
        <div className="rpt-form-area no-print">
          <div className="rpt-form-row">
            <div className="rpt-field">
              <label>Start Date</label>
              <input type="date" className="rpt-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="rpt-field">
              <label>End Date</label>
              <input type="date" className="rpt-input" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
            <button className="rpt-btn rpt-btn-primary" onClick={e => { e.preventDefault(); handleSubmit(e as any) }} disabled={loading}>
              {loading ? <><i className="fa fa-spinner fa-spin" /> Generating…</> : <><i className="fa fa-search" style={{ marginRight: 6 }} />Generate</>}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        {report.length > 0 && (
          <div className="rpt-actions no-print">
            <button className="rpt-btn rpt-btn-print" onClick={printReport}>
              <i className="fa fa-print" style={{ marginRight: 6 }} />Print
            </button>
            <PDFDownloadLink
              document={<SalesReportPDF startDate={startDate} endDate={endDate} report={report} totals={{ totalCost, totalRevenue: totalSelling, totalProfit, totalGrand }} />}
              fileName={`sales-report-${startDate}-to-${endDate}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <button className="rpt-btn rpt-btn-pdf">
                  {pdfLoading ? 'Preparing…' : <><i className="fa fa-file-pdf-o" style={{ marginRight: 6 }} />Download PDF</>}
                </button>
              )}
            </PDFDownloadLink>
            <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>
              {report.length} transaction{report.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {startDate} → {endDate}
            </span>
          </div>
        )}

        <div className="rpt-body">
          {report.length === 0 ? (
            <div className="rpt-empty">
              <i className="fa fa-bar-chart" />
              {loading ? 'Loading…' : 'Select a date range and click Generate to view the report.'}
            </div>
          ) : (
            <div id="rpt-print">
              {/* Print header (visible only when printing) */}
              <div className="rpt-header" style={{ display: 'none' }} id="print-header-sales">
                <h1>{company || 'Sales Report'}</h1>
                <p>Sales Report &nbsp;|&nbsp; {startDate} to {endDate} &nbsp;|&nbsp; Generated: {today}</p>
              </div>
              <style>{`@media print { #print-header-sales { display: block !important; } }`}</style>

              {/* KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card"><div className="kpi-label">Total Sales</div><div className="kpi-value blue">{fmt(totalGrand)}</div></div>
                <div className="kpi-card green"><div className="kpi-label">Net Profit</div><div className="kpi-value green">{fmt(totalProfit)}</div></div>
                <div className="kpi-card purple"><div className="kpi-label">Profit Margin</div><div className="kpi-value purple">{profitMargin}%</div></div>
                <div className="kpi-card amber"><div className="kpi-label">Cost of Goods</div><div className="kpi-value amber">{fmt(totalCost)}</div></div>
                <div className="kpi-card"><div className="kpi-label">Total Discount</div><div className="kpi-value">{fmt(totalDisc)}</div></div>
                <div className="kpi-card red"><div className="kpi-label">Total Tax</div><div className="kpi-value red">{fmt(totalTax)}</div></div>
              </div>

              {/* Table */}
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Invoice No</th><th>Date</th>
                      <th>Cost</th><th>Selling</th><th>Tax</th><th>Discount</th><th>Grand Total</th><th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((row, i) => (
                      <tr key={row.id}>
                        <td style={{ color: '#9ca3af', fontSize: 11 }}>{i + 1}</td>
                        <td><span className="inv-badge">{row.invoiceNo ?? '—'}</span></td>
                        <td>{new Date(row.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>{row.buyingCost.toFixed(2)}</td>
                        <td>{row.sellingCost.toFixed(2)}</td>
                        <td>{row.tax.toFixed(2)}</td>
                        <td>{row.discount.toFixed(2)}</td>
                        <td style={{ fontWeight: 700 }}>{row.grandTotal.toFixed(2)}</td>
                        <td className="profit-cell">{row.profit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>TOTALS ({report.length} records)</td>
                      <td>{totalCost.toFixed(2)}</td>
                      <td>{totalSelling.toFixed(2)}</td>
                      <td>{totalTax.toFixed(2)}</td>
                      <td>{totalDisc.toFixed(2)}</td>
                      <td>{totalGrand.toFixed(2)}</td>
                      <td style={{ color: '#16a34a' }}>{totalProfit.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
