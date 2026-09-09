'use client'
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { SalesReportRow } from './actions/FetchSalesReport'

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
  },
  headerRow: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  cell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    borderRightStyle: 'solid',
    padding: 4,
    textAlign: 'center',
  },
  smallCell: {
    flex: 0.5,
  },
  noBorderRight: {
    borderRightWidth: 0,
  },
})

type Props = {
  startDate: string
  endDate: string
  report: SalesReportRow[] // Change to SalesReportRow
}

export default function SalesSummaryPDF({ startDate, endDate, report }: Props) {
  const totalCost = report.reduce((s, r) => s + r.buyingCost, 0)
  const totalRevenue = report.reduce((s, r) => s + r.sellingCost, 0)
  const totalProfit = report.reduce((s, r) => s + r.profit, 0)
  const totalGrand = report.reduce((s, r) => s + r.grandTotal, 0)
  const totalTax = report.reduce((s, r) => s + r.tax, 0)
  const totalDiscount = report.reduce((s, r) => s + r.discount, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Sales Summary Report ({startDate} to {endDate})
        </Text>

        {/* Header Row */}
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.smallCell]}>Sl</Text>
          <Text style={styles.cell}>Invoice Date</Text>
          <Text style={styles.cell}>Invoice No</Text>
          <Text style={styles.cell}>Buying</Text>
          <Text style={styles.cell}>Selling</Text>
          <Text style={styles.cell}>Tax</Text>
          <Text style={styles.cell}>Discount</Text>
          <Text style={styles.cell}>Grand Total</Text>
          <Text style={[styles.cell, styles.noBorderRight]}>Profit</Text>
        </View>

        {/* Data Rows */}
        {report.map((row, i) => (
          <View style={styles.row} key={row.id}>
            <Text style={[styles.cell, styles.smallCell]}>{i + 1}</Text>
            <Text style={styles.cell}>
              {row.invoiceDate.toLocaleDateString()}
            </Text>
            <Text style={styles.cell}>{row.invoiceNo || '-'}</Text>
            <Text style={styles.cell}>{row.buyingCost.toFixed(2)}</Text>
            <Text style={styles.cell}>{row.sellingCost.toFixed(2)}</Text>
            <Text style={styles.cell}>{row.tax.toFixed(2)}</Text>
            <Text style={styles.cell}>{row.discount.toFixed(2)}</Text>
            <Text style={styles.cell}>{row.grandTotal.toFixed(2)}</Text>
            <Text style={[styles.cell, styles.noBorderRight]}>
              {row.profit.toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, { flex: 2.5 }]}>Totals</Text>
          <Text style={styles.cell}>{totalCost.toFixed(2)}</Text>
          <Text style={styles.cell}>{totalRevenue.toFixed(2)}</Text>
          <Text style={styles.cell}>{totalTax.toFixed(2)}</Text>
          <Text style={styles.cell}>{totalDiscount.toFixed(2)}</Text>
          <Text style={styles.cell}>{totalGrand.toFixed(2)}</Text>
          <Text style={[styles.cell, styles.noBorderRight]}>
            {totalProfit.toFixed(2)}
          </Text>
        </View>
      </Page>
    </Document>
  )
}