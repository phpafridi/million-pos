'use client'

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

type PurchaseDetail = {
  product_name: string
  qty: number
  unit_price: number
  sub_total: number
  measurement_unit: string
  packet_size: number
  attributes?: { attribute_name: string; attribute_value: string }[]
}

type PurchaseData = {
  purchase_order_number: string
  supplier_name: string
  supplier_address: string
  supplier_phone: string
  supplier_email: string
  purchase_by: string
  datetime: string
  details: PurchaseDetail[]
  grand_total: number
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12, fontFamily: 'Helvetica' },
  header: { fontSize: 18, marginBottom: 10 },
  section: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', borderBottom: 1, marginBottom: 5 },
  tableRow: { flexDirection: 'row', marginBottom: 3 },
  col: { flex: 1, textAlign: 'left' },
  colRight: { flex: 1, textAlign: 'right' },
  total: { marginTop: 10, fontSize: 14, fontWeight: 'bold' },
})

function PurchaseInvoiceDoc({ purchase }: { purchase: PurchaseData }) {
  const getDisplayQuantity = (detail: PurchaseDetail) => {
    const packetSize = detail.packet_size
    const isMultiplePackets = packetSize > 0 && detail.qty % packetSize === 0
    const displayQty = isMultiplePackets ? (detail.qty / packetSize) : detail.qty
    const displayUnit = isMultiplePackets ? 'packet' : detail.measurement_unit
    
    return { displayQty, displayUnit }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Purchase Invoice #{purchase.purchase_order_number}</Text>
        {/* <View style={styles.section}>
          <Text>Supplier: {purchase.supplier_name}</Text>
          <Text>Phone: {purchase.supplier_phone}</Text>
          <Text>Email: {purchase.supplier_email}</Text>
          <Text>Address: {purchase.supplier_address}</Text>
        </View> */}

        <View style={styles.section}>
          <Text>Date: {purchase.datetime}</Text>
          {/* <Text>Purchase By: {purchase.purchase_by}</Text> */}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Product</Text>
            <Text style={styles.colRight}>Qty</Text>
            <Text style={styles.colRight}>Unit</Text>
            <Text style={styles.colRight}>Unit Price</Text>
            <Text style={styles.colRight}>Subtotal</Text>
          </View>

          {purchase.details.map((d, i) => {
            const { displayQty, displayUnit } = getDisplayQuantity(d)
            
            return (
              <View key={i} style={styles.tableRow}>
                <View style={styles.col}>
                  <Text>{d.product_name}</Text>
                  {d.attributes && d.attributes.length > 0 && (
                    <Text style={{ fontSize: 8, color: '#6b7280' }}>
                      {d.attributes.map(a => `${a.attribute_name}: ${a.attribute_value}`).join('  ')}
                    </Text>
                  )}
                </View>
                <Text style={styles.colRight}>{displayQty}</Text>
                <Text style={styles.colRight}>{displayUnit}</Text>
                <Text style={styles.colRight}>{d.unit_price.toFixed(2)}</Text>
                <Text style={styles.colRight}>{d.sub_total.toFixed(2)}</Text>
              </View>
            )
          })}
        </View>

        <Text style={styles.total}>Grand Total: {purchase.grand_total.toFixed(2)}</Text>
      </Page>
    </Document>
  )
}

export default function PurchaseInvoicePDF({ purchase }: { purchase: PurchaseData }) {
  return (
    <PDFDownloadLink
      document={<PurchaseInvoiceDoc purchase={purchase} />}
      fileName={`purchase-${purchase.purchase_order_number}.pdf`}
    >
      {({ loading }) => (loading ? 'Preparing PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  )
}