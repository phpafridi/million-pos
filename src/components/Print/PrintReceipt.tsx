'use client'

import React, { useEffect, useState } from "react"
import { fetchCurrency } from "../settings/actions/fetchCurrency"
import { Br, Cut, Line, Printer, Text, Row, render, Image } from "react-thermal-printer"
import { getCompanyLogo, getCompanyName, getCompanyAddress, getCompanyPhone } from '../OrderProcess/actions/FetchCompanyDetails'
// @ts-ignore
import qz from "qz-tray"
import { toast } from "sonner"

type CartItem = {
  product_name: string
  qty: number
  price: number
  taxAmount?: number
  packet_size?: number
  measurement_units?: string
  attributes?: { attribute_name: string; attribute_value: string }[]
}

type Customer = {
  customer_name: string
}

type PrintReceiptProps = {
  printerName?: string
  customer: Customer
  cart: CartItem[]
  subtotal: number
  discount: number
  grandTotal: number
  paidAmount: number
  changeAmount: number
  orderNo?: number | string
  orderDate?: string | Date
  salesPerson?: string
  loyaltyPointsEarned?: number
  loyaltyPointsRedeemed?: number
  loyaltyPointsBalance?: number
}

type PrinterLayout = {
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

const defaultLayout: PrinterLayout = {
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

export default function PrintReceipt({
  printerName,
  customer,
  cart,
  subtotal,
  discount,
  grandTotal,
  paidAmount,
  changeAmount,
  orderNo,
  orderDate,
  salesPerson,
  loyaltyPointsEarned,
  loyaltyPointsRedeemed,
  loyaltyPointsBalance,
}: PrintReceiptProps) {
  const [currency, setCurrency] = useState<string>("")
  const [companyLogo, setCompanyLogo] = useState<string>("")
  const [companyName, setCompanyName] = useState<string>("")
  const [companyAddress, setCompanyAddress] = useState<string>("")
  const [companyPhone, setCompanyPhone] = useState<string>("")
  const [resolvedPrinterName, setResolvedPrinterName] = useState<string>(printerName || "POS-80-Series")
  const settingsReadyRef = React.useRef(false)
  const [layout, setLayout] = useState<PrinterLayout>(defaultLayout)
  const [paperWidthMm, setPaperWidthMm] = useState<number>(80)

  const getDisplayQuantity = (item: CartItem) => {
    const packetSize = item.packet_size ?? 0
    const isMultiplePackets = packetSize > 0 && item.qty % packetSize === 0
    const displayQty = isMultiplePackets ? (item.qty / packetSize) : item.qty
    const displayUnit = isMultiplePackets ? 'packet' : (item.measurement_units || 'pcs')
    
    return { displayQty, displayUnit }
  }

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const cur = await fetchCurrency()
        if (typeof cur === "string") {
          setCurrency(cur)
        } else if (cur && typeof cur === "object" && "currency" in cur) {
          setCurrency(cur.currency)
        } else {
          setCurrency("Rs")
        }
      } catch (err) {
        console.error("Failed to load currency:", err)
        setCurrency("Rs")
      }
    }

    const loadCompanyDetails = async () => {
      try {
        const logo = await getCompanyLogo()
        const name = await getCompanyName()
        const address = await getCompanyAddress()
        const phone = await getCompanyPhone()
        setCompanyName(name || "")
        setCompanyAddress(address || "")
        setCompanyPhone(phone || "")

        // Verify the logo file genuinely loads before trusting it for
        // print — a broken/stale file reference (deleted or moved logo)
        // should just mean no logo on the receipt, not risk the whole
        // print pipeline failing on an image that can't actually load.
        if (logo) {
          const testImg = new window.Image()
          testImg.onload = () => setCompanyLogo(logo)
          testImg.onerror = () => setCompanyLogo("")
          testImg.src = `/api/uploads/${encodeURIComponent(logo)}`
        } else {
          setCompanyLogo("")
        }
      } catch (err) {
        console.error("Failed to load company details:", err)
      }
    }

    loadCurrency()
    loadCompanyDetails()

    const loadPrinterSettings = async () => {
      try {
        const res = await fetch('/api/printer-settings')
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const candidates = json.data.filter((p: { applies_to: string }) => p.applies_to === 'receipt' || p.applies_to === 'all')
          const chosen = candidates.find((p: { is_default: boolean }) => p.is_default) || candidates[0] || json.data[0]
          if (chosen) {
            if (!printerName) setResolvedPrinterName(chosen.printer_name)
            setPaperWidthMm(chosen.paper_width_mm || 80)
            try {
              const parsedLayout = JSON.parse(chosen.layout_json)
              setLayout({ ...defaultLayout, ...parsedLayout })
            } catch {
              // keep default layout if layout_json is malformed
            }
          }
        }
      } catch (err) {
        console.error("Failed to load printer settings:", err)
      } finally {
        settingsReadyRef.current = true
      }
    }
    loadPrinterSettings()
  }, [printerName])

  const printReceipt = async () => {
    // Wait for the printer settings fetch to actually finish before
    // proceeding — without this, a print triggered very soon after mount
    // (like tailor orders, which auto-print immediately on creation)
    // could fire before resolvedPrinterName had been updated from its
    // hardcoded default, silently trying to print to a printer name
    // that doesn't match what's actually configured. Capped at 3s so a
    // failed settings fetch doesn't block printing forever — falls back
    // to the default name instead.
    const waitStart = Date.now()
    while (!settingsReadyRef.current && Date.now() - waitStart < 3000) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    const charsPerLine = paperWidthMm >= 80 ? 42 : 32
    // The fontSize setting existed in printer config but was never actually
    // applied anywhere in the render below — wire it up for real now.
    const largeText = layout.fontSize === 'large'
    const receipt = (
      <Printer type="epson" width={charsPerLine}>
        {/* Optional header text from printer settings */}
        {layout.headerText && (
          <>
            <Text align="center" bold={true} size={largeText ? { width: 2, height: 2 } : undefined}>{layout.headerText}</Text>
            <Br />
          </>
        )}

        {/* ✅ Company Logo centered */}
        {layout.showLogo && companyLogo && (
          <>
            <Image
              src={`/api/uploads/${encodeURIComponent(companyLogo ?? "default.jpg")}`}
              align="center"
              reader={async (elem) => {
                const src: string = elem.props.src
                return new Promise((resolve, reject) => {
                  try {
                    const img = new window.Image()
                    img.crossOrigin = "anonymous"
                    img.onload = () => {
                      try {
                        const baseWidth = paperWidthMm >= 80 ? 384 : 280 // scale to actual paper width, not always 80mm
                        const sizeMultiplier = layout.logoSize === 'large' ? 0.9 : layout.logoSize === 'small' ? 0.4 : 0.65
                        const targetWidth = Math.round(baseWidth * sizeMultiplier)
                        const scale = Math.min(1, targetWidth / img.width)
                        const drawWidth = Math.round(img.width * scale)
                        const drawHeight = Math.round(img.height * scale)

                        const canvas = document.createElement("canvas")
                        canvas.width = targetWidth
                        canvas.height = drawHeight

                        const ctx = canvas.getContext("2d")
                        if (!ctx) {
                          reject(new Error("Canvas context not available"))
                          return
                        }

                        ctx.fillStyle = "#FFFFFF"
                        ctx.fillRect(0, 0, canvas.width, canvas.height)

                        // center horizontally
                        const x = Math.round((canvas.width - drawWidth) / 2)
                        ctx.drawImage(img, x, 0, drawWidth, drawHeight)

                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

                        resolve({
                          width: imageData.width,
                          height: imageData.height,
                          data: new Uint8Array(imageData.data.buffer),
                        })
                      } catch (innerErr) {
                        reject(innerErr)
                      }
                    }
                    img.onerror = (e) => reject(new Error("Failed to load image: " + String(e)))
                    img.src = src
                  } catch (err) {
                    reject(err)
                  }
                })
              }}
            />
            <Br />
          </>
        )}

        {/* ✅ Company Name */}
        {companyName && (
          <>
            <Text align="center" bold={true}>{companyName}</Text>
            <Br />
          </>
        )}

        {/* Business address/phone — previously a config toggle that had no effect */}
        {layout.showBusinessAddress && (companyAddress || companyPhone) && (
          <>
            {companyAddress && <Text align="center" size={{ width: 1, height: 1 }}>{companyAddress}</Text>}
            {companyPhone && <Text align="center" size={{ width: 1, height: 1 }}>{companyPhone}</Text>}
            <Br />
          </>
        )}

        <Text size={{ width: 2, height: 2 }}>
          {currency}{paidAmount.toFixed(2)}
        </Text>
        {paidAmount >= grandTotal ? (
          <Text bold={true}>Payment Complete</Text>
        ) : (
          <>
            <Text bold={true}>Partial Payment</Text>
            <Text bold={true}>Balance Due: {currency}{(grandTotal - paidAmount).toFixed(2)}</Text>
          </>
        )}
        <Br />
        <Line />
        {layout.showOrderNumber && orderNo !== undefined && (
          <Row left="Order #" right={String(orderNo)} />
        )}
        {layout.showDateTime && (
          <Row left="Date" right={new Date(orderDate || Date.now()).toLocaleString()} />
        )}
        <Row left="Customer" right={customer.customer_name} />
        {layout.showCashier && salesPerson && (
          <Row left="Cashier" right={salesPerson} />
        )}
        <Row left="Order Total" right={`${currency}${grandTotal.toFixed(2)}`} />
        <Row left="Paid" right={`${currency}${paidAmount.toFixed(2)}`} />
        {paidAmount >= grandTotal ? (
          <Row left="Change" right={`${currency}${changeAmount.toFixed(2)}`} />
        ) : (
          <Row left="Balance Due" right={`${currency}${(grandTotal - paidAmount).toFixed(2)}`} />
        )}
        <Line />

        {cart.map((item, idx) => {
          const { displayQty, displayUnit } = getDisplayQuantity(item)
          const attrText = (item.attributes || []).map(a => `${a.attribute_name}: ${a.attribute_value}`).join(', ')
          const skuText = (item as any).sku

          return (
            <React.Fragment key={idx}>
              <Row
                left={`${item.product_name} x${displayQty} ${displayUnit}`}
                right={`${currency}${(item.price * item.qty + (item.taxAmount ?? 0)).toFixed(2)}`}
              />
              {layout.showSku && skuText && <Text size={{ width: 1, height: 1 }}>  SKU: {skuText}</Text>}
              {layout.showAttributes && attrText && <Text size={{ width: 1, height: 1 }}>  {attrText}</Text>}
            </React.Fragment>
          )
        })}

        <Br />
        <Line />
        <Row left="Subtotal" right={`${currency}${subtotal.toFixed(2)}`} />
        <Row left="Discount" right={`- ${currency}${discount.toFixed(2)}`} />
        {layout.showTaxBreakdown && (
          <Row left="Tax" right={`${currency}${cart.reduce((sum, i) => sum + (i.taxAmount ?? 0), 0).toFixed(2)}`} />
        )}
        <Row left="Grand Total" right={`${currency}${grandTotal.toFixed(2)}`} />
        <Line />

        {(loyaltyPointsEarned || loyaltyPointsRedeemed) ? (
          <>
            <Br />
            {loyaltyPointsRedeemed ? <Row left="Points Redeemed" right={`-${loyaltyPointsRedeemed}`} /> : null}
            {loyaltyPointsEarned ? <Row left="Points Earned" right={`+${loyaltyPointsEarned}`} /> : null}
            {loyaltyPointsBalance !== undefined ? <Row left="Points Balance" right={String(loyaltyPointsBalance)} /> : null}
            <Line />
          </>
        ) : null}

        <Br />
        <Text align="center" size={largeText ? { width: 2, height: 2 } : undefined}>{layout.footerText}</Text>
        {layout.showBarcode && orderNo !== undefined && (
          <>
            <Br />
            <Text align="center" bold={true} size={{ width: 2, height: 1 }}>#{orderNo}</Text>
          </>
        )}
        <Cut />
      </Printer>
    )

    const data: Uint8Array = await render(receipt)
    const base64Data = btoa(String.fromCharCode(...data))

    try {
      await qz.websocket.connect()
      const printer = await qz.printers.find(resolvedPrinterName)
      await qz.print(qz.configs.create(printer), [
        { type: "raw", format: "base64", data: base64Data }
      ])
      console.log("Print successful")
    } catch (err: any) {
      console.error("Printing failed", err)
      const msg = String(err?.message || err || '')
      if (msg.toLowerCase().includes('unable to establish connection') || msg.toLowerCase().includes('websocket')) {
        toast.error('Cannot reach QZ Tray — make sure it\'s installed and running on this computer.')
      } else if (msg.toLowerCase().includes('printer') && (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('undefined'))) {
        toast.error(`Printer "${resolvedPrinterName}" not found — check the printer name in Printer Settings matches exactly what's registered on this computer.`)
      } else {
        toast.error(`Print failed: ${msg || 'unknown error'}`)
      }
    } finally {
      qz.websocket.disconnect()
    }
  }

  return (
    <button onClick={printReceipt} style={{ display: "none" }} id="hiddenPrintBtn">
      Print
    </button>
  )
}