'use client'

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

type OrderDetail = {
  product_name: string
  product_quantity: number
  selling_price: number
  sub_total: number
  measurement_units: string
  packet_size: number
  attributes?: { attribute_name: string; attribute_value: string }[]
}

type OrderData = {
  order_no: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  sales_person: string
  tax: number
  datetime: string
  order_status: number
  details: OrderDetail[]
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
  total: { marginTop: 10, fontSize: 14, fontWeight: 'bold' }
})

function InvoiceDoc({ order }: { order: OrderData }) {
  const getDisplayQuantity = (detail: OrderDetail) => {
    const packetSize = detail.packet_size
    const isMultiplePackets = packetSize > 0 && detail.product_quantity % packetSize === 0
    const displayQty = isMultiplePackets ? (detail.product_quantity / packetSize) : detail.product_quantity
    const displayUnit = isMultiplePackets ? 'packet' : detail.measurement_units
    
    return { displayQty, displayUnit }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}> #{order.order_no}</Text>
        <View style={styles.section}>
          {/* <Text>Customer: {order.customer_name}</Text>
          <Text>Phone: {order.customer_phone}</Text>
          <Text>Email: {order.customer_email}</Text>
          <Text>Address: {order.customer_address}</Text> */}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Product</Text>
            <Text style={styles.colRight}>Qty</Text>
            <Text style={styles.colRight}>Unit</Text>
            <Text style={styles.colRight}>Price</Text>
            <Text style={styles.colRight}>Subtotal</Text>
          </View>

          {order.details.map((d, i) => {
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
                <Text style={styles.colRight}>{d.selling_price.toFixed(2)}</Text>
                <Text style={styles.colRight}>{d.sub_total.toFixed(2)}</Text>
              </View>
            )
          })}
        </View>

        <Text style={styles.total}>Grand Total: {order.grand_total.toFixed(2)}</Text>
      </Page>
    </Document>
  )
}

export default function InvoicePDF({ order }: { order: OrderData }) {
  return (
    <PDFDownloadLink
      document={<InvoiceDoc order={order} />}
      fileName={`invoice-${order.order_no}.pdf`}
    >
      {({ loading }) => (loading ? 'Preparing PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  )
}