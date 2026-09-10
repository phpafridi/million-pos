'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import FetchProducts from '../Product/actions/FetchProduct'
import { FetchCustomerData } from '../Customer/actions/FetchCustomerData'
import { FindCustomerByCardNumber } from '../Customer/actions/LoyaltyActions'
import { AddOrder } from '../OrderProcess/actions/AddOrder'
import { useSession } from 'next-auth/react'
import { useNotifications } from '../store/useNotifications'
import { toast } from 'sonner'
import PrintReceipt from '../Print/PrintReceipt'
import { fetchCurrency } from '../settings/actions/fetchCurrency'
import SearchableSelect from '../shared/SearchableSelect'
import { FetchProductBatches, ProductBatch } from './actions/FetchProductBatches'

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  product_id: number
  product_code: string
  product_name: string
  inventory: number
  price: number
  measurement_unit: string
  barcode: string
  sku: string
  packet_size: number
  special_offers: { offer_price: number; start_date: string; end_date: string }[]
  tier_prices: { quantity_above: number; tier_price: number }[]
  tax_rate: number
  tax_type: number | null
  tax_title: string
  status: number
  attributes?: { attribute_name: string; attribute_value: string }[]
}

type Customer = {
  customer_id: number
  customer_name: string
  discount: number
  is_gold_member?: boolean
  loyalty_points?: number
  card_number?: string
}

type PriceType = 'base' | 'special' | 'tier' | 'custom' | 'batch'

type CartItem = {
  product: Product
  qty: number
  price: number
  priceType: PriceType
  taxAmount: number
  batch?: ProductBatch
  sellInPcs: boolean   // true = sell by individual piece even if product has packet_size
}

// ─── Keyboard Shortcut Hint Panel ─────────────────────────────────────────────

const shortcuts = [
  { key: 'F2', desc: 'Focus scanner/search' },
  { key: 'F4', desc: 'Focus paid amount' },
  { key: 'F6', desc: 'Select customer' },
  { key: 'F8', desc: 'Toggle discount' },
  { key: 'F12 / Ctrl+↵', desc: 'Complete sale' },
  { key: 'Esc', desc: 'Clear search' },
  { key: '↑ ↓', desc: 'Navigate cart rows' },
  { key: 'Tab / Enter', desc: 'Edit qty of selected row' },
  { key: '+ / -', desc: 'Qty +1 / -1 on selected row' },
  { key: 'Del', desc: 'Remove selected row' },
]

function ShortcutHints({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9000,
      background: '#1a1a2e', color: '#e0e0e0',
      borderRadius: 10, padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      fontSize: 12, minWidth: 230,
      border: '1px solid #333',
    }}>
      <div style={{ fontWeight: 700, color: '#7ec8e3', marginBottom: 8, fontSize: 13, letterSpacing: 1 }}>
        ⌨ KEYBOARD SHORTCUTS
      </div>
      {shortcuts.map(s => (
        <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
          <span style={{
            background: '#2d2d44', padding: '1px 7px', borderRadius: 4,
            fontFamily: 'monospace', fontSize: 11, color: '#ffd700',
            border: '1px solid #444', whiteSpace: 'nowrap',
          }}>{s.key}</span>
          <span style={{ color: '#ccc', fontSize: 11 }}>{s.desc}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, borderTop: '1px solid #333', paddingTop: 6, color: '#888', fontSize: 10 }}>
        Press <span style={{ color: '#ffd700', fontFamily: 'monospace' }}>?</span> to toggle this panel
      </div>
    </div>
  )
}

// ─── Price badge ──────────────────────────────────────────────────────────────

function PriceBadge({ type }: { type: PriceType }) {
  const map: Record<PriceType, [string, string]> = {
    base:    ['BASE',    '#6c757d'],
    special: ['OFFER',   '#e67e22'],
    tier:    ['TIER',    '#27ae60'],
    custom:  ['CUSTOM',  '#3498db'],
    batch:   ['BATCH',   '#8b5cf6'],
  }
  const [label, color] = map[type]
  return (
    <span style={{
      background: color, color: '#fff', fontSize: 9, fontWeight: 700,
      padding: '1px 5px', borderRadius: 3, letterSpacing: 0.5,
    }}>{label}</span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewSale() {
  const { data: session } = useSession()
  const { refreshLowStock, refreshPendingOrders } = useNotifications()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  const [shops, setShops] = useState<{ shop_id: number; shop_name: string; shop_code: string }[]>([])
  const [activeShopId, setActiveShopId] = useState<number | undefined>(undefined)

  const [products, setProducts]         = useState<Product[]>([])
  const [customers, setCustomers]       = useState<Customer[]>([])
  const [cart, setCart]                 = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>({ customer_id: 0, customer_name: 'Walking Client', discount: 0 })
  const [cardScanInput, setCardScanInput] = useState('')
  const [receiptSnapshot, setReceiptSnapshot] = useState<{
    customer: any
    cart: any[]
    subtotal: number
    discount: number
    grandTotal: number
    paidAmount: number
    changeAmount: number
    orderNo?: number | string
    orderDate?: string | Date
    loyaltyPointsEarned?: number
    loyaltyPointsRedeemed?: number
    loyaltyPointsBalance?: number
  } | null>(null)
  const [pendingPrint, setPendingPrint] = useState(false)
  const [cardVerified, setCardVerified] = useState(false)
  const [searchTerm, setSearchTerm]     = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [selectedCartRow, setSelectedCartRow] = useState(-1)
  const [paidAmount, setPaidAmount]     = useState<number | ''>('')
  const [customDiscount, setCustomDiscount] = useState(0)
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(false)
  const [pointsToRedeem, setPointsToRedeem] = useState(0)
  const [redeemValuePerPoint, setRedeemValuePerPoint] = useState(1)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true)
  const [processWithoutPayment, setProcessWithoutPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [saleRef, setSaleRef]           = useState('')
  const [saleDate, setSaleDate]         = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [currency, setCurrency]         = useState('Rs')
  const [showHints, setShowHints]       = useState(false)
  const [editPriceId, setEditPriceId]   = useState<number | null>(null)

  // Batch picker state
  const [batchPickerProduct, setBatchPickerProduct] = useState<Product | null>(null)
  const [batchPickerList, setBatchPickerList]       = useState<ProductBatch[]>([])
  const [batchMode, setBatchMode]                   = useState(false) // off by default — auto-select first batch

  const searchRef     = useRef<HTMLInputElement>(null)
  const paidRef       = useRef<HTMLInputElement>(null)
  const customerRef   = useRef<HTMLInputElement>(null)
  const discountRef   = useRef<HTMLInputElement>(null)
  const submitBtnRef  = useRef<HTMLButtonElement>(null)
  const dropdownRef   = useRef<HTMLDivElement>(null)
  const qtyRefs       = useRef<Record<number, HTMLInputElement | null>>({})

  // ── helpers ──────────────────────────────────────────────────────────────

  const n = (v: any): number => {
    if (v === null || v === undefined) return 0
    const num = typeof v === 'object' && typeof v.toNumber === 'function' ? v.toNumber() : parseFloat(String(v))
    return isNaN(num) ? 0 : num
  }

  // Normalise measurement_units — DB stores 'pieces' for packet products, display as 'pcs'
  const normUnit = (unit: string) => unit === 'pieces' ? 'pcs' : (unit || 'pcs')

  // Get display qty/unit for a product — respects packet_size
  const getDisplayQty = (qty: number, packetSize: number, unit: string) => {
    if (packetSize > 0 && qty % packetSize === 0) {
      return { dQty: qty / packetSize, dUnit: 'pkt' }
    }
    return { dQty: qty, dUnit: normUnit(unit) }
  }

  const calcTax = (p: Product, price: number, qty: number) => {
    if (!p.tax_type || !p.tax_rate) return 0
    return p.tax_type === 1 ? (price * qty * p.tax_rate) / 100 : p.tax_rate * qty
  }

  const getPrice = (p: Product, qty: number): { price: number; type: Exclude<PriceType, 'custom'> } => {
    const now = new Date()
    const tier = [...(p.tier_prices || [])].sort((a, b) => b.quantity_above - a.quantity_above).find(t => qty >= t.quantity_above)
    if (tier) return { price: tier.tier_price, type: 'tier' }
    const offer = p.special_offers?.find(o => now >= new Date(o.start_date) && now <= new Date(o.end_date))
    if (offer) return { price: offer.offer_price, type: 'special' }
    return { price: p.price, type: 'base' }
  }

  // ── load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSuperAdmin) return
    fetch('/api/shops').then(r => r.json()).then(json => { if (json.success) setShops(json.data) })
  }, [isSuperAdmin])

  useEffect(() => {
    FetchProducts(activeShopId).then(res => {
      setProducts((res || []).map((p: any) => ({
        product_id:   p.product_id,
        product_code: p.product_code,
        product_name: p.product_name,
        status:       p.status,
        inventory:    n(p.inventories?.[0]?.product_quantity ?? 0),
        price:        n(p.prices?.[0]?.selling_price ?? 0),
        measurement_unit: p.measurement_units === 'pieces' ? 'pcs' : (p.measurement_units ?? 'pcs'),
        packet_size:  n(p.packet_size ?? 0),
        barcode:      p.barcode || p.product_code,
        sku:          p.sku || "",
        special_offers: (p.special_offers || []).map((o: any) => ({ offer_price: n(o.offer_price), start_date: o.start_date, end_date: o.end_date })),
        tier_prices:  (p.tier_prices || []).map((t: any) => ({ quantity_above: n(t.quantity_above), tier_price: n(t.tier_price) })),
        tax_rate:     n(p.tax?.tax_rate ?? 0),
        tax_type:     p.tax?.tax_type ?? null,
        tax_title:    p.tax?.tax_title ?? '',
        attributes:   (p.attributes || []).map((a: any) => ({ attribute_name: a.attribute_name, attribute_value: a.attribute_value })),
      })))
    })
    FetchCustomerData(activeShopId).then(res => {
      const mapped = (res || []).map((c: any) => ({ customer_id: c.customer_id, customer_name: c.customer_name, discount: n(c.discount || '0'), is_gold_member: Boolean(c.is_gold_member), loyalty_points: Number(c.loyalty_points || 0) }))
      setCustomers(mapped)
      // Default to the shop's real seeded "walkin" customer (every shop
      // has one) rather than just assuming it's first in the list —
      // this is what fixes the old "customer_id foreign key" crash,
      // since walkin is now always a real row, never a fake id.
      const walkin = mapped.find((c: any) => c.customer_name?.toLowerCase() === 'walkin')
      if (walkin) {
        setSelectedCustomer(walkin)
      } else if (mapped.length > 0) {
        console.error('No shared "walkin" customer found — falling back to an arbitrary customer. This indicates a data problem; contact Head Office.')
        toast.error('No default walk-in customer found — please select a customer manually or contact Head Office')
        setSelectedCustomer(mapped[0])
      }
    })
    fetchCurrency().then(d => { if (d?.currency) setCurrency(d.currency) })
    import('@/lib/loyaltyConfig').then(({ getLoyaltyConfig }) => {
      getLoyaltyConfig().then(cfg => {
        setRedeemValuePerPoint(cfg.redeemValuePerPoint)
        setLoyaltyEnabled(cfg.enabled)
      })
    })
    searchRef.current?.focus()
  }, [activeShopId])

  // ── search logic ──────────────────────────────────────────────────────────

  useEffect(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) { setSearchResults([]); setHighlightedIdx(-1); return }

    // Filter the already-loaded product list locally — no network call
    // here. This used to re-fetch the entire product catalog from the
    // server on every keystroke, which on a slow connection could take
    // seconds, meaning a barcode scanner's near-instant Enter keypress
    // would arrive before the search had actually finished and get
    // silently dropped. Filtering in memory is effectively instant
    // regardless of connection speed.
    const res2 = products.filter(p =>
      p.barcode.toLowerCase() === s ||
      (p.sku && p.sku.toLowerCase() === s) ||
      p.product_code.toLowerCase().includes(s) ||
      p.product_name.toLowerCase().includes(s)
    ).slice(0, 12)
    setSearchResults(res2)
    setHighlightedIdx(res2.length === 1 ? 0 : -1)
  }, [searchTerm, products])

  // ── cart helpers ──────────────────────────────────────────────────────────

  // addToCartWithBatch — called after batch is chosen or when only 0-1 batches exist
  const addToCartWithBatch = useCallback((product: Product, batch: ProductBatch | null) => {
    const priceToUse = batch ? batch.selling_price : getPrice(product, 1).price
    const priceType: PriceType = batch ? 'batch' : getPrice(product, 1).type

    setCart(prev => {
      const exists = prev.find(c => c.product.product_id === product.product_id)
      const maxQty = batch
        ? Math.min(batch.qty_remaining, product.inventory)
        : product.inventory

      // Use existing sellInPcs preference if already in cart, else default to pcs mode
      const sellInPcs = exists ? exists.sellInPcs : true
      const ps = product.packet_size > 0 ? product.packet_size : 1
      const step = (product.packet_size > 0 && !sellInPcs) ? ps : 1

      if (exists) {
        const newQty = exists.qty + step
        if (newQty > maxQty) {
          const displayMax = (!sellInPcs && product.packet_size > 0)
            ? `${Math.floor(maxQty / ps)} pkt`
            : `${maxQty} ${normUnit(product.measurement_unit)}`
          toast.error(`Only ${displayMax} available${batch ? ' in this batch' : ''}`)
          return prev
        }
        return prev.map(c => c.product.product_id === product.product_id
          ? { ...c, qty: newQty, taxAmount: calcTax(product, c.price, newQty) } : c)
      }

      if (maxQty < 0.1) {
        toast.error(`${batch ? 'Batch' : 'Product'} is out of stock`)
        return prev
      }
      const initialQty = Math.min(step, maxQty)
      return [...prev, {
        product, qty: initialQty, price: priceToUse,
        priceType, taxAmount: calcTax(product, priceToUse, initialQty),
        batch: batch || undefined,
        sellInPcs: true,  // always start in pcs mode — user can toggle to packet
      }]
    })
    setSelectedCartRow(cart.length)
    setSearchTerm('')
    setSearchResults([])
    searchRef.current?.focus()
  }, [cart.length, getPrice])

  const addToCart = useCallback(async (product: Product) => {
    if (product.status === 0) { toast.error('Product is inactive'); return }

    // Already in cart → just increment qty, no fetch needed
    const alreadyInCart = cart.find(c => c.product.product_id === product.product_id)
    if (alreadyInCart) {
      addToCartWithBatch(product, alreadyInCart.batch || null)
      return
    }

    if (product.inventory < 0.1) { toast.error('Out of stock'); return }

    // Fetch active, non-expired batches
    const batches = await FetchProductBatches(product.product_id, activeShopId)
    const activeBatches = batches.filter(b => !b.is_expired && b.qty_remaining > 0)

    if (activeBatches.length > 1 && batchMode) {
      // Only show picker when batchMode is ON and multiple batches exist
      setBatchPickerProduct(product)
      setBatchPickerList(activeBatches)
      return
    }

    // batchMode OFF or only 1 batch — auto-select the first (oldest/soonest-expiring) batch silently
    const batch = activeBatches[0] || null
    // Only warn if expiring within 30 days (not 90 — less noisy)
    if (batch?.expiry_date) {
      const daysLeft = batch.days_until_expiry ?? 0
      if (daysLeft > 0 && daysLeft <= 30) {
        toast.warning(`⚠ ${product.product_name} batch expires in ${daysLeft} days`)
      }
    }
    addToCartWithBatch(product, batch)
  }, [cart, addToCartWithBatch, batchMode])

  // Guard against double-add (e.g. Enter fires both global handler and dropdown onClick)
  const isAddingRef = useRef(false)

  // Fires the actual print AFTER receiptSnapshot has genuinely propagated
  // through a re-render — clicking the hidden print button synchronously
  // right after calling setReceiptSnapshot used to read stale/undefined
  // data (or worse, data already wiped by the cart-clearing that follows
  // in the same synchronous block), since React state updates aren't
  // applied synchronously.
  useEffect(() => {
    if (pendingPrint && receiptSnapshot) {
      document.getElementById('hiddenPrintBtn')?.click()
      setPendingPrint(false)
    }
  }, [pendingPrint, receiptSnapshot])

  const safeAddToCart = useCallback(async (product: Product) => {
    if (isAddingRef.current) return
    isAddingRef.current = true
    await addToCart(product)
    setTimeout(() => { isAddingRef.current = false }, 300)
  }, [addToCart])

  const updateQty = (id: number, qty: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.product_id !== id) return c
      const q = Math.max(0.1, qty)
      const maxQty = c.batch
        ? Math.min(c.batch.qty_remaining, c.product.inventory)
        : c.product.inventory
      if (q > maxQty) {
        const ps = c.product.packet_size
        const inPcsMode = !ps || c.sellInPcs
        const displayMax = inPcsMode ? `${maxQty} ${normUnit(c.product.measurement_unit)}` : `${Math.floor(maxQty / ps)} pkt`
        toast.error(`Only ${displayMax} available${c.batch ? ' in this batch' : ''}`)
        return c
      }
      if (c.priceType === 'custom') return { ...c, qty: q, taxAmount: calcTax(c.product, c.price, q) }
      const { price, type } = getPrice(c.product, q)
      return { ...c, qty: q, price, priceType: type, taxAmount: calcTax(c.product, price, q) }
    }))
  }

  const updatePrice = (id: number, price: number) => {
    setCart(prev => prev.map(c => c.product.product_id === id
      ? { ...c, price, priceType: 'custom', taxAmount: calcTax(c.product, price, c.qty) } : c))
  }

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(c => c.product.product_id !== id))
    setSelectedCartRow(r => Math.max(0, r - 1))
  }

  const clearCart = () => { setCart([]); setSelectedCartRow(-1); setEditPriceId(null) }

  // ── totals ────────────────────────────────────────────────────────────────

  const subtotal       = cart.reduce((s, i) => s + i.price * i.qty + i.taxAmount, 0)
  const custDiscount   = selectedCustomer?.discount ?? 0

  useEffect(() => {
    setPointsToRedeem(0)
  }, [selectedCustomer?.customer_id])
  const redeemDiscount = pointsToRedeem * redeemValuePerPoint
  const discountAmt    = Math.min(subtotal * custDiscount / 100 + (isDiscountEnabled ? customDiscount : 0) + redeemDiscount, subtotal)
  const grandTotal     = subtotal - discountAmt
  const paid           = n(paidAmount)
  const change         = processWithoutPayment ? 0 : paid - grandTotal
  // Submit is disabled when: loading, cart empty, OR (not pending + not processWithoutPayment + paid < grandTotal)
  const paidInsufficient = !processWithoutPayment && paymentMethod !== 'pending' && (paidAmount === '' || paid < grandTotal)
  const submitDisabled = loading || cart.length === 0 || paidInsufficient

  // ── keyboard handler ──────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      const inInput = tag === 'input' || tag === 'select' || tag === 'textarea'

      // Toggle hint panel — only when not clicking the hints button itself
      if (e.key === '?' && !inInput && document.activeElement?.getAttribute('title') !== 'Toggle keyboard shortcuts (?)') {
        setShowHints(v => !v); return
      }

      // F2 — focus scanner
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); return }
      // F4 — focus paid
      if (e.key === 'F4') { e.preventDefault(); paidRef.current?.focus(); paidRef.current?.select(); return }
      // F6 — focus the card scan input
      if (e.key === 'F6') { e.preventDefault(); customerRef.current?.focus(); return }
      // F8 — toggle discount
      if (e.key === 'F8') { e.preventDefault(); setIsDiscountEnabled(v => !v); setTimeout(() => discountRef.current?.focus(), 50); return }
      // F12 or Ctrl+Enter — submit
      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) { e.preventDefault(); submitBtnRef.current?.click(); return }
      // Esc — clear search
      if (e.key === 'Escape') { setSearchTerm(''); searchRef.current?.focus(); return }

      // Cart navigation (only when not in any input)
      if (!inInput && cart.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCartRow(r => Math.min(r + 1, cart.length - 1)); return }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedCartRow(r => Math.max(r - 1, 0)); return }
        // Tab or Enter on selected row → focus that row's qty input
        if ((e.key === 'Tab' || e.key === 'Enter') && selectedCartRow >= 0) {
          const item = cart[selectedCartRow]
          const qtyInput = qtyRefs.current[item.product.product_id]
          if (qtyInput) { e.preventDefault(); qtyInput.focus(); qtyInput.select(); return }
        }
        if (e.key === 'Delete' && selectedCartRow >= 0) {
          e.preventDefault(); removeFromCart(cart[selectedCartRow].product.product_id); return
        }
        if ((e.key === '+' || e.key === '=') && selectedCartRow >= 0) {
          e.preventDefault()
          const item = cart[selectedCartRow]
          const step = (item.product.packet_size > 0 && !item.sellInPcs) ? item.product.packet_size : 1
          updateQty(item.product.product_id, item.qty + step); return
        }
        if (e.key === '-' && selectedCartRow >= 0) {
          e.preventDefault()
          const item = cart[selectedCartRow]
          const step = (item.product.packet_size > 0 && !item.sellInPcs) ? item.product.packet_size : 1
          if (item.qty <= step) removeFromCart(item.product.product_id)
          else updateQty(item.product.product_id, item.qty - step)
          return
        }
      }

      // Search dropdown nav
      if (document.activeElement === searchRef.current && searchResults.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, searchResults.length - 1)); return }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)); return }
        if (e.key === 'Enter' && highlightedIdx >= 0) { e.preventDefault(); safeAddToCart(searchResults[highlightedIdx]); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cart, selectedCartRow, searchResults, highlightedIdx, addToCart, safeAddToCart])

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (cart.length === 0) { setError('Cart is empty'); return }
    for (const item of cart) {
      if (isNaN(item.qty) || item.qty <= 0) { setError(`Invalid qty for ${item.product.product_name}`); return }
    }
    if (!processWithoutPayment && paid < grandTotal) { setError('Paid amount is less than grand total'); return }

    setLoading(true)
    try {
      const res = await AddOrder({
        sales_person: session?.user?.name || session?.user?.email || 'Staff',
        customer_id: selectedCustomer?.customer_id ?? 0,
        points_redeemed: pointsToRedeem,
        sale_ref: saleRef || `WalkIn-${Date.now()}`,
        payment_method: paymentMethod as any,
        paid_amount: processWithoutPayment ? 0 : paid,
        discount: discountAmt,
        sale_date: saleDate,
        shop_id_override: activeShopId,
        cart: cart.map(item => ({
          product_id: item.product.product_id,
          qty: parseFloat(item.qty.toFixed(1)),
          price: parseFloat(item.price.toFixed(2)),
          tax_amount: parseFloat(item.taxAmount.toFixed(2)),
        })),
      })
      if (res.success) {
        toast.success(
          res.loyalty_points_awarded
            ? `✅ Sale completed — +${res.loyalty_points_awarded} loyalty points earned`
            : '✅ Sale completed'
        )
        setReceiptSnapshot({
          customer: selectedCustomer ?? { customer_name: 'Walking Client' },
          cart: cart.map(c => ({
            product_name: c.product.product_name,
            qty: c.qty,
            price: c.price,
            taxAmount: c.taxAmount,
            packet_size: c.product.packet_size,
            measurement_units: c.product.measurement_unit,
            attributes: c.product.attributes,
          })),
          subtotal,
          discount: discountAmt,
          grandTotal,
          paidAmount: processWithoutPayment ? 0 : paid,
          changeAmount: change,
          orderNo: res.order?.order_number ?? res.order?.order_no,
          orderDate: res.order?.order_date,
          loyaltyPointsEarned: res.loyalty_points_awarded || 0,
          loyaltyPointsRedeemed: res.loyalty_points_redeemed || 0,
          loyaltyPointsBalance: selectedCustomer?.is_gold_member
            ? (selectedCustomer.loyalty_points || 0) - (res.loyalty_points_redeemed || 0) + (res.loyalty_points_awarded || 0)
            : undefined,
        })
        setPendingPrint(true)
        clearCart()
        setCustomDiscount(0)
        setPointsToRedeem(0)
        setCardVerified(false)
        setPaidAmount('')
        // Explicitly reset to walkin, not just the verification flag —
        // otherwise a stale verified customer_id could silently carry
        // over to the next sale even though the display shows "Walking
        // Client" again.
        const walkinReset = customers.find((c) => c.customer_name?.toLowerCase() === 'walkin')
        setSelectedCustomer(walkinReset ?? { customer_id: 0, customer_name: 'Walking Client', discount: 0 })
        setProcessWithoutPayment(false)
        setSaleRef('')
        await refreshLowStock()
        await refreshPendingOrders()
        searchRef.current?.focus()
      } else {
        throw new Error(res.message)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save order')
      toast.error('Failed to save order')
    } finally {
      setLoading(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      {/* ── Global POS Styles ── */}
      <style>{`
        .pos-root { display:flex; height:calc(100vh - 60px); overflow:hidden; background:var(--pos-bg, #f5f6fa); font-family:'Segoe UI',system-ui,sans-serif; }
        .pos-left  { width:55%; display:flex; flex-direction:column; border-right:1px solid #e5e7eb; overflow:hidden; }
        .pos-right { width:45%; display:flex; flex-direction:column; overflow:hidden; background:var(--pos-panel-bg, #ffffff); }
        .pos-topbar { background:var(--pos-topbar-bg, #ffffff); padding:8px 14px; display:flex; align-items:center; gap:10px; border-bottom:1px solid #e5e7eb; flex-shrink:0; }
        .pos-topbar-title { color:var(--pos-accent, #6366f1); font-size:13px; font-weight:700; letter-spacing:2px; text-transform:uppercase; }
        .pos-search-wrap { position:relative; flex:1; }
        .pos-search { width:100%; background:#ffffff; border:2px solid #d1d5db; color:#1a1d29; padding:9px 14px 9px 38px; border-radius:8px; font-size:15px; outline:none; transition:border-color .15s; }
        .pos-search:focus { border-color:var(--pos-accent, #6366f1); box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
        .pos-search::placeholder { color:#9ca3af; }
        .pos-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9ca3af; font-size:15px; }
        .pos-search-kbd { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:#f3f4f6; color:#6366f1; font-size:10px; padding:2px 6px; border-radius:4px; border:1px solid #d1d5db; font-family:monospace; pointer-events:none; }
        .pos-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#ffffff; border:1px solid #d1d5db; border-radius:8px; z-index:200; max-height:320px; overflow-y:auto; box-shadow:0 8px 32px rgba(20,20,43,0.15); }
        .pos-dropdown-item { display:flex; align-items:center; padding:9px 14px; cursor:pointer; border-bottom:1px solid #f3f4f6; transition:background .1s; gap:10px; }
        .pos-dropdown-item:last-child { border-bottom:none; }
        .pos-dropdown-item:hover,.pos-dropdown-item.active { background:#eef0ff; }
        .pos-dropdown-item .pname { color:#1a1d29; font-size:13px; font-weight:500; flex:1; }
        .pos-dropdown-item .pcode { color:#8a90a3; font-size:11px; font-family:monospace; }
        .pos-dropdown-item .pstock { font-size:11px; color:#6366f1; min-width:60px; text-align:right; }
        .pos-dropdown-item .pprice { font-size:12px; color:#1a9c5c; font-weight:600; min-width:70px; text-align:right; }
        .pos-cart-area { flex:1; overflow-y:auto; }
        .pos-cart-head { display:grid; grid-template-columns:28px 1fr 68px 100px 90px 70px 28px; gap:2px; padding:7px 10px; background:#f5f6fa; color:#8a90a3; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid #e5e7eb; flex-shrink:0; }
        .pos-cart-row { display:grid; grid-template-columns:28px 1fr 68px 100px 90px 70px 28px; gap:2px; padding:5px 10px; border-bottom:1px solid #f3f4f6; align-items:center; cursor:pointer; transition:background .1s; }
        .pos-cart-row:hover { background:#f9fafb; }
        .pos-cart-row.selected { background:#eef0ff; border-left:3px solid var(--pos-accent, #6366f1); }
        .pos-cart-row.selected td { color:#1a1d29; }
        .pos-num-input { width:100%; background:#ffffff; border:1px solid #d1d5db; color:#1a1d29; padding:3px 6px; border-radius:4px; font-size:13px; text-align:center; outline:none; }
        .pos-num-input:focus { border-color:#6366f1; }
        .pos-cell { font-size:12px; color:#4b5563; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pos-cell.name { color:#1a1d29; font-size:12px; }
        .pos-cell.total { color:#1a9c5c; font-weight:600; font-size:13px; }
        .pos-cell.unit { color:#8a90a3; font-size:11px; }
        .pos-del-btn { background:none; border:none; color:#d9403a; cursor:pointer; font-size:14px; padding:2px; border-radius:3px; transition:background .1s; }
        .pos-del-btn:hover { background:#fdecea; color:#c0392b; }
        .pos-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; color:#c3c9d6; padding:40px; }
        .pos-empty i { font-size:52px; margin-bottom:12px; }
        .pos-empty p { font-size:13px; text-align:center; }
        .pos-right-section { padding:12px 14px; border-bottom:1px solid #e5e7eb; flex-shrink:0; }
        .pos-label { font-size:10px; color:#8a90a3; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px; font-weight:700; }
        .pos-value { color:#1a1d29; font-size:15px; font-weight:600; }
        .pos-control { width:100%; background:#ffffff; border:1px solid #d1d5db; color:#1a1d29; padding:7px 11px; border-radius:6px; font-size:13px; outline:none; }
        .pos-control:focus { border-color:#6366f1; }
        .pos-select { appearance:none; }
        .pos-total-grid { display:grid; grid-template-columns:1fr auto; gap:3px 12px; padding:0; }
        .pos-total-label { font-size:12px; color:#8a90a3; }
        .pos-total-value { font-size:12px; color:#4b5563; text-align:right; }
        .pos-grand { font-size:18px; color:#1a1d29; font-weight:700; }
        .pos-change-pos { color:#1a9c5c; font-weight:700; font-size:15px; }
        .pos-change-neg { color:#d9403a; font-weight:700; font-size:15px; }
        .pos-paid-big { background:#ffffff; border:2px solid #d1d5db; color:#1a1d29; padding:8px 12px; border-radius:8px; font-size:22px; font-weight:700; width:100%; outline:none; text-align:center; }
        .pos-paid-big:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
        .pos-quick-btn { background:#eef0ff; border:1px solid #c7ccf5; color:#6366f1; padding:5px 10px; border-radius:5px; font-size:11px; cursor:pointer; transition:all .1s; }
        .pos-quick-btn:hover { background:#6366f1; color:#fff; }
        .pos-submit { width:100%; padding:14px; background:linear-gradient(135deg,#6366f1,#4f46e5); border:none; color:#fff; font-size:16px; font-weight:700; letter-spacing:2px; border-radius:8px; cursor:pointer; transition:all .15s; text-transform:uppercase; }
        .pos-submit:hover:not(:disabled) { background:linear-gradient(135deg,#7477f5,#6366f1); transform:translateY(-1px); box-shadow:0 4px 16px rgba(99,102,241,.35); }
        .pos-submit:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .pos-submit.pending { background:linear-gradient(135deg,#8e44ad,#6c3483); }
        .pos-kbd { display:inline-block; background:#f3f4f6; color:#b8860b; border:1px solid #d1d5db; border-radius:3px; font-size:9px; padding:1px 4px; font-family:monospace; margin-left:4px; vertical-align:middle; }
        .pos-section-title { font-size:10px; color:#8a90a3; text-transform:uppercase; letter-spacing:1.5px; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
        .pos-section-title::after { content:''; flex:1; height:1px; background:#e5e7eb; }
        .pos-payment-btns { display:flex; gap:6px; flex-wrap:wrap; }
        .pm-btn { flex:1; min-width:60px; padding:6px 4px; background:#f9fafb; border:1px solid #d1d5db; color:#6b7280; font-size:11px; border-radius:5px; cursor:pointer; text-align:center; transition:all .12s; }
        .pm-btn:hover { border-color:#6366f1; color:#6366f1; }
        .pm-btn.active { background:#eef0ff; border-color:#6366f1; color:#6366f1; font-weight:700; }
        .pos-hint-toggle { background:#f3f4f6; border:1px solid #d1d5db; color:#8a90a3; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer; font-family:monospace; }
        .pos-hint-toggle:hover { color:#6366f1; }
        .pos-customer-row { display:flex; gap:8px; align-items:center; }
        .pos-gold-badge { background:#b8860b; color:#fff; font-size:9px; padding:1px 6px; border-radius:3px; font-weight:700; letter-spacing:1px; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#f3f4f6; }
        ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:2px; }
      `}</style>

      <div className="pos-root">

        {/* ══════════════════ LEFT: Product Search + Cart ══════════════════ */}
        <div className="pos-left">

          {/* Top bar */}
          <div className="pos-topbar">
            <span className="pos-topbar-title">
              <i className="fa fa-cash-register" style={{ marginRight: 6 }} />
              Point of Sale
            </span>
            <Link
              href="/dashboard/settings/theme-settings"
              title="Change this page's colors (Settings → Theme Settings → POS Page)"
              style={{ color: 'var(--pos-accent, #6366f1)', fontSize: 16, marginRight: 10, opacity: 0.85 }}
            >
              <i className="fa fa-paint-brush" />
            </Link>
            {isSuperAdmin && (
              <div style={{ width: 200, marginRight: 12 }}>
                <SearchableSelect
                  value={activeShopId ? String(activeShopId) : ''}
                  onChange={(v) => setActiveShopId(v ? Number(v) : undefined)}
                  className="form-control"
                  placeholder="Head Office (default)"
                  options={shops.filter(s => !s.shop_code.includes('HEAD-OFFICE')).map(s => ({ value: String(s.shop_id), label: s.shop_name }))}
                />
              </div>
            )}
            <div className="pos-search-wrap" ref={dropdownRef}>
              <i className="fa fa-barcode pos-search-icon" />
              <input
                ref={searchRef}
                type="text"
                className="pos-search"
                placeholder="Scan barcode or type product name / code…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoComplete="off"
                onKeyDown={e => {
                  // Only handle Escape here — Enter/ArrowUp/Down handled by global keydown
                  if (e.key === 'Escape') { setSearchTerm(''); setSearchResults([]); }
                }}
              />
              <span className="pos-search-kbd">F2</span>
              {searchResults.length > 0 && (
                <div className="pos-dropdown">
                  {searchResults.map((p, i) => (
                    <div
                      key={p.product_id}
                      className={`pos-dropdown-item ${i === highlightedIdx ? 'active' : ''}`}
                      onClick={() => safeAddToCart(p)}
                      onMouseEnter={() => setHighlightedIdx(i)}
                    >
                      <span className="pcode">{p.product_code}</span>
                      <span className="pname">
                        {p.product_name}
                        {p.attributes && p.attributes.length > 0 && (
                          <span style={{ display: 'block', color: '#22c55e', fontSize: 10 }}>
                            {p.attributes.map((a: any) => `${a.attribute_name}: ${a.attribute_value}`).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span className="pstock">
                        {p.packet_size > 0
                          ? `${Math.floor(p.inventory / p.packet_size)} pkt (${p.inventory} pcs)`
                          : `${p.inventory.toFixed(1)} ${normUnit(p.measurement_unit)}`
                        }
                      </span>
                      <span className="pprice">{currency} {p.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="pos-hint-toggle"
              onClick={e => { e.stopPropagation(); setShowHints(v => !v) }}
              title="Toggle keyboard shortcuts (?)"
            >
              {showHints ? '✕ hints' : '? hints'}
            </button>

            {/* Batch mode toggle */}
            <label
              title={batchMode ? 'Batch mode ON — picker shows when multiple batches exist' : 'Batch mode OFF — auto-selects first batch (fastest)'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                background: batchMode ? '#1a2a10' : '#1a1a2e',
                border: `1px solid ${batchMode ? '#4ade80' : '#2a4a7f'}`,
                borderRadius: 5, padding: '3px 8px', fontSize: 10,
                color: batchMode ? '#4ade80' : '#4a6080',
                userSelect: 'none', transition: 'all .15s',
              }}
            >
              <input
                type="checkbox"
                checked={batchMode}
                onChange={e => setBatchMode(e.target.checked)}
                style={{ width: 12, height: 12, accentColor: '#4ade80', cursor: 'pointer' }}
              />
              🗂 Batch
            </label>
          </div>

          {/* Cart header */}
          <div className="pos-cart-head">
            <span>#</span>
            <span>Product</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            <span style={{ textAlign: 'center' }}>Unit Price</span>
            <span style={{ textAlign: 'center' }}>Tax</span>
            <span style={{ textAlign: 'right' }}>Total</span>
            <span></span>
          </div>

          {/* Cart rows */}
          <div className="pos-cart-area">
            {cart.length === 0 ? (
              <div className="pos-empty">
                <i className="fa fa-shopping-basket" />
                <p>Cart is empty<br /><span style={{ color: '#3a5070' }}>Scan a barcode or search a product to add it</span></p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={item.product.product_id}
                  className={`pos-cart-row ${selectedCartRow === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedCartRow(idx)}
                >
                  {/* # */}
                  <span className="pos-cell" style={{ color: '#4a6080', fontSize: 11 }}>{idx + 1}</span>

                  {/* Name + badge */}
                  <span className="pos-cell name">
                    <div>{item.product.product_name}</div>
                    {item.product.attributes && item.product.attributes.length > 0 && (
                      <div style={{ color: '#22c55e', fontSize: 9, marginTop: 1 }}>
                        {item.product.attributes.map((a) => `${a.attribute_name}: ${a.attribute_value}`).join(' · ')}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <PriceBadge type={item.priceType} />
                      {item.batch && (
                        <span style={{
                          fontSize: 9, fontFamily: 'monospace',
                          background: item.batch.is_expiring_soon ? '#2d1a00' : '#1a1a30',
                          color: item.batch.is_expiring_soon ? '#f59e0b' : '#8b5cf6',
                          padding: '1px 5px', borderRadius: 3,
                          border: `1px solid ${item.batch.is_expiring_soon ? '#92400e' : '#4c1d95'}`,
                        }}>
                          {item.batch.batch_number.split('-').slice(-1)[0]}
                          {item.batch.expiry_date ? ` · exp ${item.batch.expiry_date}` : ''}
                          {item.batch.is_expiring_soon && ` ⚠ ${item.batch.days_until_expiry}d`}
                        </span>
                      )}
                    </div>
                  </span>

                  {/* Qty — pkt/pcs toggle for packet products */}
                  <span className="pos-cell">
                    {(() => {
                      const ps = item.product.packet_size
                      const isPacketProduct = ps > 0
                      const inPcsMode = !isPacketProduct || item.sellInPcs
                      const displayQty  = inPcsMode ? item.qty : item.qty / ps
                      const displayUnit = inPcsMode ? normUnit(item.product.measurement_unit) : 'pkt'
                      const step        = 1
                      const minVal      = inPcsMode ? 0.1 : 1
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <input
                            type="number"
                            className="pos-num-input"
                            value={Number(displayQty.toFixed(inPcsMode ? 1 : 0))}
                            min={minVal}
                            step={step}
                            ref={el => { qtyRefs.current[item.product.product_id] = el }}
                            onClick={e => e.stopPropagation()}
                            onFocus={() => setSelectedCartRow(idx)}
                            onChange={e => {
                              const v = parseFloat(e.target.value) || minVal
                              updateQty(item.product.product_id, inPcsMode ? v : v * ps)
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Escape') { e.preventDefault(); (e.target as HTMLInputElement).blur(); searchRef.current?.focus() }
                            }}
                            style={{ width: 54 }}
                          />
                          {isPacketProduct ? (
                            /* Toggle pkt / pcs for packet products */
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                setCart(prev => prev.map(c => {
                                  if (c.product.product_id !== item.product.product_id) return c
                                  const switching = !c.sellInPcs
                                  // Convert qty: if switching to pcs mode keep raw pieces, pkt mode round to nearest packet
                                  const newQty = switching ? c.qty : Math.round(c.qty / ps) * ps || ps
                                  return { ...c, sellInPcs: switching, qty: newQty, taxAmount: calcTax(c.product, c.price, newQty) }
                                }))
                              }}
                              title={item.sellInPcs ? 'Switch to packets' : 'Switch to pieces'}
                              style={{
                                background: item.sellInPcs ? '#1a3a5a' : '#0d2a1e',
                                border: `1px solid ${item.sellInPcs ? '#3b82f6' : '#4ade80'}`,
                                color: item.sellInPcs ? '#7ec8e3' : '#4ade80',
                                borderRadius: 4, fontSize: 9, padding: '1px 5px',
                                cursor: 'pointer', fontWeight: 700, letterSpacing: .3,
                              }}
                            >
                              {item.sellInPcs ? 'pcs' : 'pkt'}
                            </button>
                          ) : (
                            <span style={{ fontSize: 9, color: '#4a6080' }}>{displayUnit}</span>
                          )}
                          {isPacketProduct && !item.sellInPcs && (
                            <span style={{ fontSize: 8, color: '#1a9c5c' }}>{item.qty} pcs</span>
                          )}
                        </div>
                      )
                    })()}
                  </span>

                  {/* Price */}
                  <span className="pos-cell" style={{ textAlign: 'center' }}>
                    {editPriceId === item.product.product_id ? (
                      <input
                        type="number"
                        className="pos-num-input"
                        defaultValue={item.price.toFixed(2)}
                        step={0.01}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onBlur={e => { updatePrice(item.product.product_id, parseFloat(e.target.value) || item.price); setEditPriceId(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') { updatePrice(item.product.product_id, parseFloat((e.target as HTMLInputElement).value) || item.price); setEditPriceId(null) } }}
                        style={{ width: 80 }}
                      />
                    ) : (
                      <span
                        onClick={e => { e.stopPropagation(); setEditPriceId(item.product.product_id) }}
                        title="Click to edit price"
                        style={{ cursor: 'pointer', borderBottom: '1px dashed #6366f1', padding: '0 2px' }}
                      >
                        {item.price.toFixed(2)}
                      </span>
                    )}
                  </span>

                  {/* Tax */}
                  <span className="pos-cell" style={{ textAlign: 'center', color: item.taxAmount > 0 ? '#e67e22' : '#3a5070', fontSize: 11 }}>
                    {item.taxAmount > 0 ? `+${item.taxAmount.toFixed(2)}` : '—'}
                  </span>

                  {/* Total */}
                  <span className="pos-cell total" style={{ textAlign: 'right' }}>
                    {(item.price * item.qty + item.taxAmount).toFixed(2)}
                  </span>

                  {/* Delete */}
                  <button className="pos-del-btn" onClick={e => { e.stopPropagation(); removeFromCart(item.product.product_id) }} title="Remove (Del)">
                    <i className="fa fa-times" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart footer toolbar */}
          {cart.length > 0 && (
            <div style={{ padding: '8px 14px', background: '#ffffff', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ color: '#8a90a3', fontSize: 11 }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
              <button
                type="button"
                onClick={clearCart}
                style={{ marginLeft: 'auto', background: '#2d1515', border: '1px solid #7f2020', color: '#e74c3c', padding: '4px 12px', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}
              >
                <i className="fa fa-trash" /> Clear Cart
              </button>
              <span style={{ color: '#4a6080', fontSize: 10 }}>
                <span className="pos-kbd">↑↓</span> nav <span className="pos-kbd">+/-</span> qty <span className="pos-kbd">Del</span> remove
              </span>
            </div>
          )}
        </div>

        {/* ══════════════════ RIGHT: Order Summary + Payment ══════════════════ */}
        <div className="pos-right">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── Customer ── */}
              <div className="pos-right-section">
                <div className="pos-section-title">Customer</div>
                <div className="pos-customer-row">
                  <div style={{
                    flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 11px', fontSize: 13,
                    background: cardVerified ? '#eefbf1' : '#f9fafb', color: cardVerified ? '#1a7a3c' : '#6b7280',
                  }}>
                    {cardVerified && selectedCustomer?.customer_id
                      ? <><i className="fa fa-check-circle" style={{ marginRight: 6 }}></i>{selectedCustomer.customer_name}</>
                      : 'Walking Client'}
                  </div>
                  <input
                    ref={customerRef}
                    type="text"
                    placeholder="Scan member card…"
                    value={cardScanInput}
                    onChange={e => setCardScanInput(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key !== 'Enter' || !cardScanInput.trim()) return
                      e.preventDefault()
                      try {
                        const found = await FindCustomerByCardNumber(cardScanInput.trim())
                        if (found) {
                          setSelectedCustomer({ customer_id: found.customer_id, customer_name: found.customer_name, discount: Number(found.discount) || 0, is_gold_member: found.is_gold_member, loyalty_points: found.loyalty_points, card_number: found.card_number || undefined })
                          setCardVerified(true)
                          toast.success(`${found.customer_name} selected${found.is_gold_member ? ` — ${found.loyalty_points} pts` : ''}`)
                        } else {
                          toast.error('No customer found for that card')
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'This card could not be used')
                      }
                      setCardScanInput('')
                    }}
                    className="pos-control"
                    style={{ width: 180, fontSize: 12 }}
                  />
                  {cardVerified && selectedCustomer?.customer_id > 0 && (
                    <button
                      type="button"
                      className="btn btn-xs btn-default"
                      onClick={() => {
                        const walkinCustomer = customers.find((c) => c.customer_name?.toLowerCase() === 'walkin')
                        setSelectedCustomer(walkinCustomer ?? { customer_id: 0, customer_name: 'Walking Client', discount: 0 })
                        setCardVerified(false)
                      }}
                      title="Clear and return to Walking Client"
                    >
                      <i className="fa fa-times"></i>
                    </button>
                  )}
                </div>
                {cardVerified && selectedCustomer?.card_number && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa fa-id-card"></i>
                    Card: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedCustomer.card_number}</span>
                  </div>
                )}
              </div>

              {/* ── Date + Ref ── */}
              <div className="pos-right-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div className="pos-label">Sale Date</div>
                  <input type="date" className="pos-control" value={saleDate} onChange={e => setSaleDate(e.target.value)} max={today} />
                </div>
                <div>
                  <div className="pos-label">Reference</div>
                  <input type="text" className="pos-control" value={saleRef} onChange={e => setSaleRef(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              {/* ── Totals ── */}
              <div className="pos-right-section">
                <div className="pos-section-title">Totals</div>
                <div className="pos-total-grid">
                  <span className="pos-total-label">Subtotal</span>
                  <span className="pos-total-value">{currency} {subtotal.toFixed(2)}</span>

                  {custDiscount > 0 && (
                    <>
                      <span className="pos-total-label">Customer Discount</span>
                      <span className="pos-total-value" style={{ color: '#27ae60' }}>— {currency} {(subtotal * custDiscount / 100).toFixed(2)} ({custDiscount}%)</span>
                    </>
                  )}

                  <span className="pos-total-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={isDiscountEnabled}
                      onChange={e => { setIsDiscountEnabled(e.target.checked); if (!e.target.checked) setCustomDiscount(0) }}
                      style={{ width: 12, height: 12 }}
                    />
                    Manual Discount
                    <span className="pos-kbd">F8</span>
                  </span>
                  <span className="pos-total-value">
                    {isDiscountEnabled ? (
                      <input
                        ref={discountRef}
                        type="number"
                        min={0}
                        step={0.01}
                        className="pos-num-input"
                        style={{ width: 80 }}
                        value={customDiscount}
                        onChange={e => setCustomDiscount(n(e.target.value))}
                      />
                    ) : <span style={{ color: '#3a5070' }}>—</span>}
                  </span>

                  {loyaltyEnabled && !cardVerified && selectedCustomer?.is_gold_member && (selectedCustomer?.loyalty_points || 0) > 0 && (
                    <span className="pos-total-value" style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                      Scan their member card to redeem points — selecting by name alone isn't enough to verify they're actually here.
                    </span>
                  )}

                  {loyaltyEnabled && cardVerified && selectedCustomer?.is_gold_member && (selectedCustomer?.loyalty_points || 0) > 0 && (
                    <>
                      <span className="pos-total-label">
                        Redeem Points <span style={{ opacity: 0.6 }}>({selectedCustomer.loyalty_points} avail.)</span>
                      </span>
                      <span className="pos-total-value">
                        <input
                          type="number"
                          min={0}
                          max={Math.min(selectedCustomer.loyalty_points || 0, Math.floor(subtotal / (redeemValuePerPoint || 1)))}
                          step={1}
                          className="pos-num-input"
                          style={{ width: 80 }}
                          value={pointsToRedeem}
                          onChange={e => {
                            const maxRedeemable = Math.min(selectedCustomer.loyalty_points || 0, Math.floor(subtotal / (redeemValuePerPoint || 1)))
                            setPointsToRedeem(Math.max(0, Math.min(Number(e.target.value) || 0, maxRedeemable)))
                          }}
                        />
                        {pointsToRedeem > 0 && (
                          <div style={{ fontSize: 10, color: '#27ae60' }}>— {currency} {redeemDiscount.toFixed(2)} off</div>
                        )}
                      </span>
                    </>
                  )}

                  <span className="pos-total-label" style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>Grand Total</span>
                  <span className="pos-grand" style={{ marginTop: 6 }}>{currency} {grandTotal.toFixed(2)}</span>

                  {/* Change / Remaining — live feedback right under grand total */}
                  {grandTotal > 0 && paymentMethod !== 'pending' && !processWithoutPayment && (
                    <>
                      {paidAmount === '' || paid === 0 ? (
                        // Nothing entered yet — neutral prompt
                        <>
                          <span style={{ color: '#4a6080', fontSize: 11, marginTop: 8 }}>Change / Remaining</span>
                          <span style={{ color: '#4a6080', fontSize: 11, marginTop: 8, textAlign: 'right' }}>—</span>
                        </>
                      ) : paid < grandTotal ? (
                        // Short — show red remaining
                        <>
                          <span style={{ color: '#e74c3c', fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                            ↑ Remaining
                          </span>
                          <span style={{ color: '#e74c3c', fontSize: 16, fontWeight: 700, marginTop: 8, textAlign: 'right' }}>
                            {currency} {(grandTotal - paid).toFixed(2)}
                          </span>
                        </>
                      ) : paid === grandTotal ? (
                        // Exact
                        <>
                          <span style={{ color: '#2ecc71', fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                            ✓ Exact
                          </span>
                          <span style={{ color: '#2ecc71', fontSize: 14, fontWeight: 700, marginTop: 8, textAlign: 'right' }}>
                            No Change
                          </span>
                        </>
                      ) : (
                        // Overpaid — show green change
                        <>
                          <span style={{ color: '#2ecc71', fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                            ↓ Change
                          </span>
                          <span style={{ color: '#2ecc71', fontSize: 16, fontWeight: 700, marginTop: 8, textAlign: 'right' }}>
                            {currency} {(paid - grandTotal).toFixed(2)}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── Payment Method ── */}
              <div className="pos-right-section">
                <div className="pos-section-title">Payment Method</div>
                <div className="pos-payment-btns">
                  {[
                    { val: 'cash',       icon: 'fa-money', label: 'Cash' },
                    { val: 'card',       icon: 'fa-credit-card', label: 'Card' },
                    { val: 'easypaisa', icon: 'fa-mobile', label: 'Easypaisa' },
                    { val: 'cheque',    icon: 'fa-file-text', label: 'Cheque' },
                    { val: 'pending',   icon: 'fa-clock-o', label: 'Pending' },
                  ].map(pm => (
                    <button
                      key={pm.val}
                      type="button"
                      className={`pm-btn ${paymentMethod === pm.val ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod(pm.val); if (pm.val === 'pending') setProcessWithoutPayment(true) }}
                    >
                      <i className={`fa ${pm.icon}`} style={{ display: 'block', fontSize: 16, marginBottom: 2 }} />
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Paid Amount ── */}
              {paymentMethod !== 'pending' && (
                <div className="pos-right-section">
                  <div className="pos-section-title">
                    Amount Paid
                    <span className="pos-kbd">F4</span>
                  </div>
                  <input
                    ref={paidRef}
                    type="number"
                    className="pos-paid-big"
                    placeholder="0.00"
                    value={paidAmount}
                    min={0}
                    step={0.01}
                    onChange={e => setPaidAmount(n(e.target.value))}
                    onFocus={e => e.target.select()}
                  />
                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {[grandTotal, Math.ceil(grandTotal / 100) * 100, Math.ceil(grandTotal / 500) * 500, Math.ceil(grandTotal / 1000) * 1000]
                      .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                      .slice(0, 4)
                      .map(amt => (
                        <button
                          key={amt}
                          type="button"
                          className="pos-quick-btn"
                          onClick={() => setPaidAmount(amt)}
                        >
                          {currency} {amt.toFixed(0)}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {error && (
                <div style={{ margin: '0 14px 8px', background: '#2d0f0f', border: '1px solid #7f2020', borderRadius: 6, padding: '8px 12px', color: '#e74c3c', fontSize: 12 }}>
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: 6 }} />{error}
                </div>
              )}
            </div>

            {/* ── Submit ── */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
              {paidInsufficient && cart.length > 0 && (
                <div style={{ color: '#e74c3c', fontSize: 11, textAlign: 'center', marginBottom: 6, opacity: 0.8 }}>
                  <i className="fa fa-lock" style={{ marginRight: 4 }} />
                  Enter paid amount to enable sale
                </div>
              )}
              <button
                type="submit"
                ref={submitBtnRef}
                disabled={submitDisabled}
                className={`pos-submit ${paymentMethod === 'pending' ? 'pending' : ''}`}
              >
                {loading ? (
                  <><i className="fa fa-spinner fa-spin" /> Processing…</>
                ) : paymentMethod === 'pending' ? (
                  <><i className="fa fa-clock-o" /> Save Pending Order</>
                ) : (
                  <><i className="fa fa-check" /> Complete Sale <span className="pos-kbd" style={{ fontSize: 10, marginLeft: 6 }}>F12</span></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Shortcut hints panel */}
      <ShortcutHints visible={showHints} />

      {/* ── Batch Picker Modal ── */}
      {batchPickerProduct && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => { setBatchPickerProduct(null); setBatchPickerList([]) }}
        >
          <div
            style={{
              background: '#12121e', border: '1px solid #2a4a7f', borderRadius: 12,
              padding: 24, minWidth: 480, maxWidth: 620, width: '95%',
              boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ color: '#7ec8e3', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                  Select Batch
                </div>
                <div style={{ color: '#e0e8f0', fontSize: 15, fontWeight: 700 }}>
                  {batchPickerProduct.product_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setBatchPickerProduct(null); setBatchPickerList([]) }}
                style={{ background: 'none', border: 'none', color: '#8a90a3', fontSize: 20, cursor: 'pointer' }}
              >×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {batchPickerList.map(batch => {
                const statusColor = batch.is_expiring_soon ? '#f59e0b' : '#2ecc71'
                const statusBg    = batch.is_expiring_soon ? '#2d1a00' : '#0a1f0a'
                const statusLabel = batch.is_expiring_soon
                  ? `⚠ Expires in ${batch.days_until_expiry} days`
                  : batch.expiry_date ? `✓ Good — exp ${batch.expiry_date}` : '✓ No expiry'

                return (
                  <div
                    key={batch.batch_id}
                    onClick={() => {
                      if (batch.is_expiring_soon) {
                        toast.warning(`⚠ Selling batch that expires in ${batch.days_until_expiry} days`)
                      }
                      addToCartWithBatch(batchPickerProduct, batch)
                      setBatchPickerProduct(null)
                      setBatchPickerList([])
                    }}
                    style={{
                      background: '#1a2438', border: '1px solid #2a3a50',
                      borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                      transition: 'all .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#7ec8e3')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a3a50')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#7ec8e3', marginBottom: 4 }}>
                          {batch.batch_number}
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                          <span style={{ color: '#8a90a3' }}>
                            Stock: <strong style={{ color: '#e0e8f0' }}>{batch.qty_remaining}</strong>
                          </span>
                          <span style={{ color: '#8a90a3' }}>
                            Buy: <strong style={{ color: '#ffd700' }}>{batch.buying_price.toFixed(2)}</strong>
                          </span>
                          <span style={{ color: '#8a90a3' }}>
                            Sell: <strong style={{ color: '#2ecc71' }}>{batch.selling_price.toFixed(2)}</strong>
                          </span>
                        </div>
                        {batch.manufacture_date && (
                          <div style={{ fontSize: 11, color: '#4a6080', marginTop: 3 }}>
                            Mfg: {batch.manufacture_date}
                          </div>
                        )}
                      </div>
                      <div style={{
                        background: statusBg, color: statusColor,
                        fontSize: 10, fontWeight: 700, padding: '3px 10px',
                        borderRadius: 20, border: `1px solid ${statusColor}`,
                        whiteSpace: 'nowrap', alignSelf: 'center',
                      }}>
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 12, color: '#4a6080', fontSize: 11, textAlign: 'center' }}>
              Click a batch to add to cart &nbsp;·&nbsp; Esc to cancel
            </div>
          </div>
        </div>
      )}

      {/* Hidden thermal print trigger */}
      <PrintReceipt
        customer={receiptSnapshot?.customer ?? { customer_name: 'Walking Client' }}
        cart={receiptSnapshot?.cart ?? []}
        subtotal={receiptSnapshot?.subtotal ?? 0}
        discount={receiptSnapshot?.discount ?? 0}
        grandTotal={receiptSnapshot?.grandTotal ?? 0}
        paidAmount={receiptSnapshot?.paidAmount ?? 0}
        changeAmount={receiptSnapshot?.changeAmount ?? 0}
        orderNo={receiptSnapshot?.orderNo}
        salesPerson={session?.user?.name || session?.user?.email || 'Staff'}
        orderDate={receiptSnapshot?.orderDate}
        loyaltyPointsEarned={receiptSnapshot?.loyaltyPointsEarned}
        loyaltyPointsRedeemed={receiptSnapshot?.loyaltyPointsRedeemed}
        loyaltyPointsBalance={receiptSnapshot?.loyaltyPointsBalance}
      />
    </>
  )
}