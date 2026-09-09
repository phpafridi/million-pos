'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { PurchaseReportRow } from './actions/FetchPurchaseReport'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  headerCell: {
    flex: 1,
    padding: 4,
    backgroundColor: '#eee',
    fontWeight: 'bold',
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#000',
  },
  cell: {
    flex: 1,
    padding: 4,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#000',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#000',
    marginTop: 5,
  },
  totalCell: {
    flex: 6,
    padding: 4,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalValue: {
    flex: 1,
    padding: 4,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  totals: {
    marginTop: 10,
    textAlign: 'right',
    fontSize: 12,
  },
})

export default function PurchaseReportPDF({
  startDate,
  endDate,
  report,
  totals,
}: {
  startDate: string
  endDate: string
  report: PurchaseReportRow[]
  totals: { totalQty: number; totalAmount: number }
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Purchase Report</Text>
        <Text style={styles.subtitle}>
          From {startDate} To {endDate}
        </Text>

        {report.map((purchase) => (
          <View key={purchase.id} style={{ marginBottom: 15 }}>
            <Text
              style={{
                textAlign: 'center',
                marginBottom: 5,
                fontSize: 11,
              }}
            >
              Ref: {purchase.ref} | Supplier: {purchase.supplier} | Date:{' '}
              {purchase.date}
            </Text>

            {/* Header Row */}
            <View style={styles.row}>
              <Text style={styles.headerCell}>#</Text>
              <Text style={styles.headerCell}>Code</Text>
              <Text style={styles.headerCell}>Description</Text>
              <Text style={styles.headerCell}>Price</Text>
              <Text style={styles.headerCell}>Qty</Text>
              <Text style={styles.headerCell}>Unit</Text>
              <Text style={styles.headerCell}>Total</Text>
            </View>

            {/* Data Rows */}
            {purchase.items.map((item, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.cell}>{i + 1}</Text>
                <Text style={styles.cell}>{item.code}</Text>
                <Text style={styles.cell}>{item.name}</Text>
                <Text style={styles.cell}>{item.price.toFixed(2)}</Text>
                <Text style={styles.cell}>{item.qty}</Text>
                <Text style={styles.cell}>{item.unit}</Text>
                <Text style={styles.cell}>{item.total.toFixed(2)}</Text>
              </View>
            ))}

            {/* Grand Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalCell}>Grand Total</Text>
              <Text style={styles.totalValue}>{purchase.grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        ))}

        {/* Overall Totals */}
        <View style={styles.totals}>
          <Text>Total Qty: {totals.totalQty}</Text>
          <Text>Total Amount: {totals.totalAmount.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  )
}