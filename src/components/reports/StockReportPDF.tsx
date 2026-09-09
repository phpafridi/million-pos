'use client'
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

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

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
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
})

export default function StockReportPDF({
  products,
  grandTotal,
}: {
  products: Product[]
  grandTotal: number
}) {
  const getDisplayQuantity = (product: Product) => {
    const packetSize = product.packet_size
    const isMultiplePackets = packetSize > 0 && product.qty % packetSize === 0
    const displayQty = isMultiplePackets ? (product.qty / packetSize) : product.qty
    const displayUnit = isMultiplePackets ? 'packet' : (product.measurement_units || 'pcs')
    
    return { displayQty, displayUnit }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Stock Summary Report</Text>

        {/* Header Row */}
        <View style={styles.row}>
          <Text style={styles.headerCell}>Sl</Text>
          <Text style={styles.headerCell}>SKU</Text>
          <Text style={styles.headerCell}>Product</Text>
          <Text style={styles.headerCell}>Cost</Text>
          <Text style={styles.headerCell}>Qty</Text>
          <Text style={styles.headerCell}>Unit</Text>
          <Text style={styles.headerCell}>Stock Value</Text>
        </View>

        {/* Data Rows */}
        {products.map((p, i) => {
          const { displayQty, displayUnit } = getDisplayQuantity(p)
          
          return (
            <View style={styles.row} key={p.id}>
              <Text style={styles.cell}>{i + 1}</Text>
              <Text style={styles.cell}>{p.sku}</Text>
              <Text style={styles.cell}>{p.name}</Text>
              <Text style={styles.cell}>{p.cost.toFixed(2)}</Text>
              <Text style={styles.cell}>{displayQty}</Text>
              <Text style={styles.cell}>{displayUnit}</Text>
              <Text style={styles.cell}>{p.stockValue.toFixed(2)}</Text>
            </View>
          )
        })}

        {/* Grand Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalCell}>Grand Total</Text>
          <Text style={styles.totalValue}>{grandTotal.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  )
}