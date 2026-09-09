// SalesReportPDF.tsx
'use client'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { SalesReportRow } from './actions/FetchSalesReport'

type Props = {
  startDate: string
  endDate: string
  report: SalesReportRow[]
  totals: {
    totalCost: number
    totalRevenue: number
    totalProfit: number
    totalGrand: number
  }
}

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 12, fontFamily: 'Helvetica' },
  header: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
  tableHeader: { flexDirection: 'row', borderBottom: 1, marginBottom: 5 },
  tableRow: { flexDirection: 'row', marginBottom: 3 },
  col: { flex: 1, textAlign: 'center' },
  colSmall: { flex: 0.5, textAlign: 'center' },
  total: { marginTop: 10, fontSize: 13, fontWeight: 'bold' },
})

export default function SalesReportPDF({ startDate, endDate, report, totals }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>
          Sales Report ({startDate} → {endDate})
        </Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={styles.colSmall}>#</Text>
          <Text style={styles.col}>Invoice</Text>
          <Text style={styles.col}>Date</Text>
          <Text style={styles.col}>Buying</Text>
          <Text style={styles.col}>Selling</Text>
          <Text style={styles.col}>Tax</Text>
          <Text style={styles.col}>Discount</Text>
          <Text style={styles.col}>Grand</Text>
          <Text style={styles.col}>Profit</Text>
        </View>

        {/* Table rows */}
        {report.map((r, i) => (
          <View key={r.id} style={styles.tableRow}>
            <Text style={styles.colSmall}>{i + 1}</Text>
            <Text style={styles.col}>{r.invoiceNo ?? '-'}</Text>
            <Text style={styles.col}>{new Date(r.invoiceDate).toLocaleDateString()}</Text>
            <Text style={styles.col}>{r.buyingCost.toFixed(2)}</Text>
            <Text style={styles.col}>{r.sellingCost.toFixed(2)}</Text>
            <Text style={styles.col}>{r.tax.toFixed(2)}</Text>
            <Text style={styles.col}>{r.discount.toFixed(2)}</Text>
            <Text style={styles.col}>{r.grandTotal.toFixed(2)}</Text>
            <Text style={styles.col}>{r.profit.toFixed(2)}</Text>
          </View>
        ))}

        {/* Totals */}
        <Text style={styles.total}>
          Buying: {totals.totalCost.toFixed(2)} | Selling: {totals.totalRevenue.toFixed(2)} | 
          Grand: {totals.totalGrand.toFixed(2)} | Profit: {totals.totalProfit.toFixed(2)}
        </Text>
      </Page>
    </Document>
  )
}
