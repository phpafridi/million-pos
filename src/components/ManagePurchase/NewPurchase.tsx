'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import FetchProducts from '../Product/actions/FetchProduct'
import { FetchSuppliers } from '../ManagePurchase/actions/FetchSupplier'
import { SaveBatchPurchase, BatchItem } from '../ManagePurchase/actions/SaveBatchPurchase'
import { FetchProductBatches, ProductBatch } from '../OrderProcess/actions/FetchProductBatches'
import { toast } from 'sonner'
import { useNotifications } from '../store/useNotifications'
import SearchableSelect from '../shared/SearchableSelect'

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  product_id: number
  product_code: string
  product_name: string
  inventory: number
  buying_price: number
  selling_price: number
  barcode: string
  measurement_units: string
  packet_size: number
  attributes?: { attribute_name: string; attribute_value: string }[]
}

type Supplier = {
  supplier_id: number
  supplier_name: string
}

type CartItem = {
  product: Product
  qty: number
  buying_price: number
  selling_price: number
  expiry_date: string
  manufacture_date: string
  unitType: 'pcs' | 'packet'
  batch_number: string
  is_existing_batch: boolean  // true = adding stock to existing batch
  damaged_qty: number // arrived already damaged, doesn't enter sellable stock
}

// ─── Shortcut Hints ───────────────────────────────────────────────────────────

const SHORTCUTS = [
  { key: 'F2',          desc: 'Focus product search' },
  { key: 'F3',          desc: 'Focus supplier select' },
  { key: 'F12 / Ctrl+↵', desc: 'Save purchase' },
  { key: 'Esc',         desc: 'Clear search' },
  { key: '↑ ↓',         desc: 'Navigate cart rows' },
  { key: 'Tab / Enter', desc: 'Edit qty of selected row' },
  { key: '+ / −',       desc: 'Qty +1 / −1 on row' },
  { key: 'Del',         desc: 'Remove selected row' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewPurchase() {
  const { refreshLowStock, refreshExpiryAlerts } = useNotifications()
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  const isWarehouseShop = Boolean((session?.user as any)?.is_warehouse)
  const [shops, setShops] = useState<{ shop_id: number; shop_name: string; shop_code: string }[]>([])
  const [activeShopId, setActiveShopId] = useState<number | undefined>(undefined)

  const [products, setProducts]           = useState<Product[]>([])
  const [suppliers, setSuppliers]         = useState<Supplier[]>([])
  const [cart, setCart]                   = useState<CartItem[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [searchTerm, setSearchTerm]       = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [selectedCartRow, setSelectedCartRow] = useState(-1)
  const [addAsPiece, setAddAsPiece]       = useState(false)
  const [purchaseDate, setPurchaseDate]   = useState(new Date().toISOString().slice(0, 10))
  const [purchaseRef, setPurchaseRef]     = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading]             = useState(false)
  const [showHints, setShowHints]         = useState(false)
  const [editPriceRow, setEditPriceRow]   = useState<{ id: number; field: 'buying_price' | 'selling_price' } | null>(null)
  // Batch picker for existing batches
  const [batchPickerProduct, setBatchPickerProduct]   = useState<Product | null>(null)
  const [existingBatches, setExistingBatches]         = useState<ProductBatch[]>([])
  const [batchHighlightedIdx, setBatchHighlightedIdx] = useState(-1) // -1 = "New Batch" option

  const searchRef   = useRef<HTMLInputElement>(null)
  const supplierRef = useRef<HTMLSelectElement>(null)
  const submitRef   = useRef<HTMLButtonElement>(null)
  const qtyRefs     = useRef<Record<number, HTMLInputElement | null>>({})

  const today = new Date().toISOString().slice(0, 10)
  const toDec = (v: any) => parseFloat(Number(v).toFixed(1))

  // ── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSuperAdmin) return
    fetch('/api/shops').then(r => r.json()).then(json => { if (json.success) setShops(json.data) })
  }, [isSuperAdmin])

  useEffect(() => {
    FetchProducts(activeShopId).then(res => {
      setProducts((res || []).map((p: any) => ({
        product_id:       p.product_id,
        product_code:     p.product_code,
        product_name:     p.product_name,
        inventory:        Number(p.inventories?.[0]?.product_quantity) || 0,
        buying_price:     Number(p.prices?.[0]?.buying_price)  || 0,
        selling_price:    Number(p.prices?.[0]?.selling_price) || 0,
        barcode:          p.barcode || p.product_code,
        measurement_units: p.measurement_units || '',
        packet_size:      Number(p.packet_size) || 0,
        attributes:       (p.attributes || []).map((a: any) => ({ attribute_name: a.attribute_name, attribute_value: a.attribute_value })),
      })))
    })
    FetchSuppliers(activeShopId).then(res => setSuppliers(res || []))
    searchRef.current?.focus()
  }, [activeShopId])

  // ── Search results ────────────────────────────────────────────────────────

  useEffect(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) { setSearchResults([]); setHighlightedIdx(-1); return }
    const res = products.filter(p =>
      p.barcode.toLowerCase() === s ||
      p.product_code.toLowerCase().includes(s) ||
      p.product_name.toLowerCase().includes(s)
    ).slice(0, 12)
    setSearchResults(res)
    setHighlightedIdx(res.length === 1 ? 0 : -1)
  }, [searchTerm, products])

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const addNewBatchToCart = useCallback((product: Product, batchNum?: string) => {
    const hasPacket = product.packet_size > 0
    const unitType  = hasPacket && !addAsPiece ? 'packet' : 'pcs'
    const qtyToAdd  = unitType === 'packet' ? product.packet_size : 1

    setCart(prev => {
      const exists = prev.find(c => c.product.product_id === product.product_id)
      if (exists) {
        if (exists.unitType === unitType) {
          return prev.map(c => c.product.product_id === product.product_id
            ? { ...c, qty: toDec(c.qty + qtyToAdd) } : c)
        }
        return prev.map(c => c.product.product_id === product.product_id
          ? { ...c, qty: qtyToAdd, unitType } : c)
      }
      return [...prev, {
        product, qty: qtyToAdd,
        buying_price: product.buying_price,
        selling_price: product.selling_price,
        expiry_date: '', manufacture_date: '', unitType,
        batch_number: batchNum || `BN-${product.product_code}-${new Date().toISOString().slice(0,10)}`,
        is_existing_batch: false,
        damaged_qty: 0,
      }]
    })
    setSelectedCartRow(cart.length)
    setSearchTerm('')
    setSearchResults([])
    searchRef.current?.focus()
    toast.success(`${product.product_name} added`)
  }, [addAsPiece, cart.length])

  const addToCart = useCallback(async (product: Product) => {
    // If already in cart — just increment
    const alreadyInCart = cart.find(c => c.product.product_id === product.product_id)
    if (alreadyInCart) {
      addNewBatchToCart(product)
      return
    }
    // Fetch existing batches to offer the choice
    const batches = await FetchProductBatches(product.product_id)
    const active = batches.filter(b => b.qty_remaining >= 0) // include even 0-qty for top-up
    if (active.length > 0) {
      // Has existing batches — show picker with option to add new or top-up existing
      setBatchPickerProduct(product)
      setExistingBatches(active)
      return
    }
    // No existing batches — add as fresh new batch directly
    addNewBatchToCart(product)
  }, [cart, addNewBatchToCart])

  // Guard against double-add — prevents Enter firing both global handler and input onKeyDown
  const isAddingRef = useRef(false)
  const safeAddToCart = useCallback(async (product: Product) => {
    if (isAddingRef.current) return
    isAddingRef.current = true
    await addToCart(product)
    setTimeout(() => { isAddingRef.current = false }, 300)
  }, [addToCart])

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(c => c.product.product_id !== id))
    setSelectedCartRow(r => Math.max(0, r - 1))
  }

  const updateCart = (id: number, field: keyof CartItem, value: any) => {
    setCart(prev => prev.map(c => {
      if (c.product.product_id !== id) return c
      if (field === 'qty') {
        const q = c.unitType === 'packet' && c.product.packet_size
          ? toDec(value * c.product.packet_size)
          : toDec(value)
        return { ...c, qty: q }
      }
      return { ...c, [field]: value }
    }))
  }

  const grandTotal = cart.reduce((s, i) => s + i.qty * i.buying_price, 0)

  // ── Keyboard handler ──────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag     = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      const inInput = tag === 'input' || tag === 'select' || tag === 'textarea'

      // ── Batch picker modal keyboard nav ─────────────────────────────────
      if (batchPickerProduct) {
        const total = existingBatches.length
        if (e.key === 'Escape') {
          e.preventDefault()
          setBatchPickerProduct(null); setExistingBatches([]); setBatchHighlightedIdx(-1)
          searchRef.current?.focus()
          return
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setBatchHighlightedIdx(i => i < total - 1 ? i + 1 : -1)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setBatchHighlightedIdx(i => i > -1 ? i - 1 : total - 1)
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (batchHighlightedIdx === -1) {
            // New Batch selected
            addNewBatchToCart(batchPickerProduct)
            setBatchPickerProduct(null); setExistingBatches([]); setBatchHighlightedIdx(-1)
          } else if (batchHighlightedIdx >= 0 && batchHighlightedIdx < total) {
            const batch = existingBatches[batchHighlightedIdx]
            const hasPacket = batchPickerProduct.packet_size > 0
            const unitType  = hasPacket && !addAsPiece ? 'packet' : 'pcs'
            const qtyToAdd  = unitType === 'packet' ? batchPickerProduct.packet_size : 1
            setCart(prev => {
              const exists = prev.find(c => c.product.product_id === batchPickerProduct.product_id)
              if (exists) return prev.map(c => c.product.product_id === batchPickerProduct.product_id
                ? { ...c, qty: toDec(c.qty + qtyToAdd) } : c)
              return [...prev, {
                product: batchPickerProduct, qty: qtyToAdd,
                buying_price: batch.buying_price, selling_price: batch.selling_price,
                expiry_date: batch.expiry_date || '', manufacture_date: batch.manufacture_date || '',
                unitType, batch_number: batch.batch_number, is_existing_batch: true, damaged_qty: 0,
              }]
            })
            setSelectedCartRow(cart.length)
            setSearchTerm(''); setSearchResults([])
            searchRef.current?.focus()
            toast.success(`Added to batch ${batch.batch_number}`)
            setBatchPickerProduct(null); setExistingBatches([]); setBatchHighlightedIdx(-1)
          }
          return
        }
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault()
          addNewBatchToCart(batchPickerProduct)
          setBatchPickerProduct(null); setExistingBatches([]); setBatchHighlightedIdx(-1)
          return
        }
        return // swallow all other keys while picker open
      }

      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); return }
      if (e.key === 'F3') { e.preventDefault(); supplierRef.current?.focus(); return }
      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) { e.preventDefault(); submitRef.current?.click(); return }
      if (e.key === 'Escape') { setSearchTerm(''); searchRef.current?.focus(); return }

      if (!inInput && cart.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCartRow(r => Math.min(r + 1, cart.length - 1)); return }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedCartRow(r => Math.max(r - 1, 0)); return }
        if ((e.key === 'Tab' || e.key === 'Enter') && selectedCartRow >= 0) {
          const item = cart[selectedCartRow]
          const el = qtyRefs.current[item.product.product_id]
          if (el) { e.preventDefault(); el.focus(); el.select(); return }
        }
        if (e.key === 'Delete' && selectedCartRow >= 0) {
          e.preventDefault(); removeFromCart(cart[selectedCartRow].product.product_id); return
        }
        if ((e.key === '+' || e.key === '=') && selectedCartRow >= 0) {
          e.preventDefault()
          const item = cart[selectedCartRow]
          const ps   = item.unitType === 'packet' && item.product.packet_size ? item.product.packet_size : 1
          updateCart(item.product.product_id, 'qty', item.qty / (ps || 1) + 1)
          return
        }
        if (e.key === '-' && selectedCartRow >= 0) {
          e.preventDefault()
          const item = cart[selectedCartRow]
          const ps   = item.unitType === 'packet' && item.product.packet_size ? item.product.packet_size : 1
          const newDisplayQty = item.qty / (ps || 1) - 1
          if (newDisplayQty <= 0) removeFromCart(item.product.product_id)
          else updateCart(item.product.product_id, 'qty', newDisplayQty)
          return
        }
      }

      if (document.activeElement === searchRef.current && searchResults.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, searchResults.length - 1)); return }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)); return }
        if (e.key === 'Enter' && highlightedIdx >= 0) { e.preventDefault(); safeAddToCart(searchResults[highlightedIdx]); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cart, selectedCartRow, searchResults, highlightedIdx, addToCart, batchPickerProduct, existingBatches, batchHighlightedIdx, addAsPiece, addNewBatchToCart])

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier) { toast.error('Please select a supplier'); return }
    if (cart.length === 0)  { toast.error('Cart is empty'); return }
    for (const item of cart) {
      if (item.selling_price <= 0) { toast.error(`Set selling price for ${item.product.product_name}`); return }
    }
    setLoading(true)
    const res = await SaveBatchPurchase({
      supplier_id:    Number(selectedSupplier),
      purchase_ref:   purchaseRef,
      payment_method: paymentMethod,
      shop_id_override: activeShopId,
      purchase_date:  purchaseDate,
      cart: cart.map(item => ({
        product_id:        item.product.product_id,
        qty:               toDec(item.qty),
        buying_price:      Number(item.buying_price),
        selling_price:     Number(item.selling_price),
        expiry_date:       item.expiry_date      || undefined,
        manufacture_date:  item.manufacture_date || undefined,
        batch_number:      item.batch_number     || undefined,
        is_existing_batch: item.is_existing_batch,
        damaged_qty:       item.damaged_qty || 0,
      } as BatchItem)),
    })
    setLoading(false)
    if (res.success) {
      toast.success(res.message)
      setCart([]); setPurchaseRef(''); setSelectedSupplier('')
      setPurchaseDate(new Date().toISOString().slice(0, 10))
      setSelectedCartRow(-1)
      searchRef.current?.focus()
      // Refresh notifications — new stock may fix low-stock alerts
      // and new batches may have expiry dates to track
      await refreshLowStock()
      await refreshExpiryAlerts()
    } else {
      toast.error(res.message)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* ── POS Purchase Layout ── */
        .pur-root{display:flex;height:calc(100vh - 60px);overflow:hidden;background:var(--purchase-bg, #f5f6fa);font-family:'Segoe UI',system-ui,sans-serif;}
        .pur-left{width:52%;display:flex;flex-direction:column;border-right:1px solid #e5e7eb;overflow:hidden;}
        .pur-right{width:48%;display:flex;flex-direction:column;overflow:hidden;background:var(--purchase-panel-bg, #ffffff);}

        /* Top bars */
        .pur-topbar{background:var(--purchase-topbar-bg, #ffffff);padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e5e7eb;flex-shrink:0;}
        .pur-topbar-title{color:var(--purchase-accent, #6366f1);font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;}
        .pur-right-topbar{background:var(--purchase-topbar-bg, #ffffff);padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e5e7eb;flex-shrink:0;}

        /* Search */
        .pur-search-wrap{position:relative;flex:1;}
        .pur-search{width:100%;background:#ffffff;border:2px solid #d1d5db;color:#1a1d29;padding:8px 14px 8px 36px;border-radius:8px;font-size:14px;outline:none;transition:border .15s;}
        .pur-search:focus{border-color:var(--purchase-accent, #6366f1);box-shadow:0 0 0 3px rgba(99,102,241,.1);}
        .pur-search::placeholder{color:#9ca3af;}
        .pur-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:14px;}
        .pur-search-kbd{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:#f3f4f6;color:#6366f1;font-size:10px;padding:1px 5px;border-radius:3px;border:1px solid #d1d5db;font-family:monospace;pointer-events:none;}
        .pur-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#ffffff;border:1px solid #d1d5db;border-radius:8px;z-index:200;max-height:280px;overflow-y:auto;box-shadow:0 8px 32px rgba(20,20,43,.15);}
        .pur-drop-item{display:flex;align-items:center;padding:8px 12px;cursor:pointer;border-bottom:1px solid #f3f4f6;gap:10px;transition:background .1s;}
        .pur-drop-item:last-child{border-bottom:none;}
        .pur-drop-item:hover,.pur-drop-item.active{background:#eef0ff;}
        .pur-drop-item .dcode{color:#8a90a3;font-size:11px;font-family:monospace;min-width:70px;}
        .pur-drop-item .dname{color:#1a1d29;font-size:13px;flex:1;}
        .pur-drop-item .dstock{color:#6366f1;font-size:11px;min-width:60px;text-align:right;}
        .pur-drop-item .dprice{color:#b8860b;font-size:12px;font-weight:700;min-width:70px;text-align:right;}

        /* Cart */
        .pur-cart-head{display:grid;grid-template-columns:18px minmax(80px,1fr) 58px 64px 64px 100px 110px 56px 22px;gap:3px;padding:6px 10px;background:#f5f6fa;color:#8a90a3;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;flex-shrink:0;}
        .pur-cart-area{flex:1;overflow-y:auto;}
        .pur-cart-row{display:grid;grid-template-columns:18px minmax(80px,1fr) 58px 64px 64px 100px 110px 56px 22px;gap:3px;padding:4px 10px;border-bottom:1px solid #f3f4f6;align-items:center;cursor:pointer;transition:background .1s;}
        .pur-cart-row:hover{background:#f9fafb;}
        .pur-cart-row.selected{background:#eef0ff;border-left:3px solid var(--purchase-accent, #6366f1);}
        .pur-cell{font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .pur-cell.name{color:#1a1d29;font-size:12px;}
        .pur-cell.total{color:#b8860b;font-weight:700;font-size:12px;text-align:right;}
        .pur-num{width:100%;background:#ffffff;border:1px solid #d1d5db;color:#1a1d29;padding:2px 4px;border-radius:4px;font-size:10px;text-align:center;outline:none;box-sizing:border-box;}
        .pur-num:focus{border-color:#6366f1;}
        .pur-date-input{width:100%;background:#ffffff;border:1px solid #d1d5db;color:#1a1d29;padding:2px 3px;border-radius:4px;font-size:9px;outline:none;box-sizing:border-box;}
        .pur-date-input:focus{border-color:#6366f1;}
        .pur-del{background:none;border:none;color:#d9403a;cursor:pointer;font-size:13px;padding:2px;border-radius:3px;}
        .pur-del:hover{background:#fdecea;color:#c0392b;}
        .pur-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:#c3c9d6;padding:40px;}
        .pur-empty i{font-size:48px;margin-bottom:10px;}
        .pur-empty p{font-size:12px;text-align:center;color:#8a90a3;}
        .pur-cart-footer{padding:7px 14px;background:#f5f6fa;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;flex-shrink:0;}

        /* Right panel */
        .pur-section{padding:10px 14px;border-bottom:1px solid #e5e7eb;flex-shrink:0;}
        .pur-section-title{font-size:9px;color:#8a90a3;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px;}
        .pur-section-title::after{content:'';flex:1;height:1px;background:#e5e7eb;}
        .pur-control{width:100%;background:#ffffff;border:1.5px solid #d1d5db;color:#1a1d29;padding:7px 10px;border-radius:6px;font-size:13px;outline:none;appearance:none;}
        .pur-control:focus{border-color:#6366f1;}
        .pur-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .pur-field label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:4px;}
        .pur-pm-btns{display:flex;gap:6px;flex-wrap:wrap;}
        .pur-pm-btn{flex:1;min-width:64px;padding:7px 4px;background:#f9fafb;border:1.5px solid #d1d5db;color:#6b7280;font-size:11px;border-radius:6px;cursor:pointer;text-align:center;transition:all .12s;}
        .pur-pm-btn:hover{border-color:#6366f1;color:#6366f1;}
        .pur-pm-btn.active{background:#eef0ff;border-color:#6366f1;color:#6366f1;font-weight:700;}
        .pur-total-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;}
        .pur-total-label{font-size:11px;color:#8a90a3;}
        .pur-total-value{font-size:12px;color:#4b5563;font-weight:600;}
        .pur-grand{font-size:22px;color:#1a1d29;font-weight:800;}
        .pur-submit{width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#4f46e5);border:none;color:#fff;font-size:15px;font-weight:700;letter-spacing:2px;border-radius:8px;cursor:pointer;transition:all .15s;text-transform:uppercase;}
        .pur-submit:hover:not(:disabled){background:linear-gradient(135deg,#7477f5,#6366f1);transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,.3);}
        .pur-submit:disabled{opacity:.45;cursor:not-allowed;transform:none;}
        .pur-kbd{display:inline-block;background:#f3f4f6;color:#b8860b;border:1px solid #d1d5db;border-radius:3px;font-size:9px;padding:1px 4px;font-family:monospace;margin-left:4px;vertical-align:middle;}
        .pur-hint-btn{background:#f3f4f6;border:1px solid #d1d5db;color:#8a90a3;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-family:monospace;}
        .pur-hint-btn:hover{color:#6366f1;}
        .expiry-warn{color:#b45309;font-size:9px;margin-top:1px;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#f3f4f6;}
        ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px;}
        @media print{.no-print{display:none!important;}}
      `}</style>

      <div className="pur-root">

        {/* ══════════ LEFT — Product Search + Cart ══════════ */}
        <div className="pur-left">

          {/* Top bar */}
          <div className="pur-topbar">
            <span className="pur-topbar-title">
              <i className="fa fa-truck" style={{ marginRight: 6 }} />New Purchase
            </span>
            <Link
              href="/dashboard/settings/theme-settings"
              title="Change this page's colors (Settings → Theme Settings → Purchase Page)"
              style={{ color: 'var(--purchase-accent, #6366f1)', fontSize: 16, marginRight: 10, opacity: 0.85 }}
            >
              <i className="fa fa-paint-brush" />
            </Link>
            {isSuperAdmin && (
              <div style={{ width: 200 }}>
                <SearchableSelect
                  value={activeShopId ? String(activeShopId) : ''}
                  onChange={(v) => setActiveShopId(v ? Number(v) : undefined)}
                  className="form-control"
                  placeholder="Head Office (default)"
                  options={shops.filter(s => !s.shop_code.includes('HEAD-OFFICE')).map(s => ({ value: String(s.shop_id), label: s.shop_name }))}
                />
              </div>
            )}
            <div className="pur-search-wrap">
              <i className="fa fa-barcode pur-search-icon" />
              <input
                ref={searchRef}
                type="text"
                className="pur-search"
                placeholder="Scan barcode or search product name / code…"
                value={searchTerm}
                autoComplete="off"
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  // Only handle Escape here — Enter/ArrowUp/Down handled by global keydown
                  if (e.key === 'Escape') { setSearchTerm(''); searchRef.current?.focus() }
                }}
              />
              <span className="pur-search-kbd">F2</span>
              {searchResults.length > 0 && (
                <div className="pur-dropdown">
                  {searchResults.map((p, i) => (
                    <div
                      key={p.product_id}
                      className={`pur-drop-item ${i === highlightedIdx ? 'active' : ''}`}
                      onClick={() => safeAddToCart(p)}
                      onMouseEnter={() => setHighlightedIdx(i)}
                    >
                      <span className="dcode">{p.product_code}</span>
                      <span className="dname">
                        {p.product_name}
                        {p.attributes && p.attributes.length > 0 && (
                          <span style={{ display: 'block', color: '#22c55e', fontSize: 10 }}>
                            {p.attributes.map((a: any) => `${a.attribute_name}: ${a.attribute_value}`).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span className="dstock">{p.inventory.toFixed(1)} {p.measurement_units}</span>
                      <span className="dprice">Buy: {p.buying_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Piece / Packet toggle */}
            <button
              type="button"
              title={addAsPiece ? 'Adding as pieces — click to switch to packets' : 'Adding as packets — click to switch to pieces'}
              onClick={() => setAddAsPiece(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                background: addAsPiece ? '#eef0ff' : '#0d3322',
                border: `1px solid ${addAsPiece ? '#6366f1' : '#4ade80'}`,
                borderRadius: 5, padding: '3px 9px', fontSize: 10,
                color: addAsPiece ? '#6b7280' : '#4ade80',
                fontWeight: 700, whiteSpace: 'nowrap',
                userSelect: 'none', transition: 'all .15s',
              }}
            >
              {addAsPiece ? '🔢 pcs' : '📦 pkt'}
            </button>

            <button className="pur-hint-btn" type="button" onClick={() => setShowHints(v => !v)}>
              {showHints ? '✕ hints' : '? hints'}
            </button>
          </div>

          {/* Cart column headers */}
          <div className="pur-cart-head">
            <span>#</span>
            <span>Product</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            <span style={{ textAlign: 'center' }}>Buy</span>
            <span style={{ textAlign: 'center' }}>Sell</span>
            <span style={{ textAlign: 'center' }}>Batch No</span>
            <span style={{ textAlign: 'center' }}>Mfg / Expiry</span>
            <span style={{ textAlign: 'right' }}>Total</span>
            <span />
          </div>

          {/* Cart rows */}
          <div className="pur-cart-area">
            {cart.length === 0 ? (
              <div className="pur-empty">
                <i className="fa fa-truck" />
                <p>Cart is empty<br /><span>Search a product or scan a barcode to add it</span></p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isPacket  = item.unitType === 'packet' && item.product.packet_size > 0
                const displayQty  = isPacket ? toDec(item.qty / item.product.packet_size) : toDec(item.qty)
                const displayUnit = isPacket ? 'pkt' : (item.product.measurement_units || 'pcs')
                const expiryWarn  = item.expiry_date && new Date(item.expiry_date) < new Date(new Date().setMonth(new Date().getMonth() + 3))

                return (
                  <div
                    key={item.product.product_id}
                    className={`pur-cart-row ${selectedCartRow === idx ? 'selected' : ''}`}
                    onClick={() => setSelectedCartRow(idx)}
                   
                  >
                    {/* # */}
                    <span className="pur-cell" style={{ color: '#6366f1', fontSize: 10 }}>{idx + 1}</span>

                    {/* Name */}
                    <span className="pur-cell name">
                      <div style={{ fontSize: 11 }}>{item.product.product_name}</div>
                      {isPacket && (
                        <div style={{ color: '#8a90a3', fontSize: 9 }}>
                          {item.product.packet_size} {item.product.measurement_units}/pkt
                        </div>
                      )}
                      {item.product.attributes && item.product.attributes.length > 0 && (
                        <div style={{ color: '#1a9c5c', fontSize: 9 }}>
                          {item.product.attributes.map((a, ai) => `${a.attribute_name}: ${a.attribute_value}`).join(' · ')}
                        </div>
                      )}
                      {isWarehouseShop && (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <span style={{ color: '#d9403a', fontSize: 9 }}>Damaged on arrival:</span>
                          <input
                            type="number"
                            min={0}
                            max={item.qty}
                            step={1}
                            value={item.damaged_qty || 0}
                            onChange={e => updateCart(item.product.product_id, 'damaged_qty', Math.min(parseFloat(e.target.value) || 0, item.qty))}
                            style={{ width: 44, fontSize: 9, padding: '1px 3px', border: '1px solid #f0b4b0', borderRadius: 3 }}
                          />
                        </div>
                      )}
                    </span>

                    {/* Qty */}
                    <span className="pur-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <input
                          type="number"
                          className="pur-num"
                          value={displayQty}
                          min={0.1} step={1}
                          ref={el => { qtyRefs.current[item.product.product_id] = el }}
                          onFocus={() => setSelectedCartRow(idx)}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateCart(item.product.product_id, 'qty', parseFloat(e.target.value) || 0.1)}
                          onKeyDown={e => { if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); searchRef.current?.focus() } }}
                          style={{ width: '100%', maxWidth: 52 }}
                        />
                        <span style={{ color: '#8a90a3', fontSize: 9, textAlign: 'center' }}>{displayUnit}</span>
                      </div>
                    </span>

                    {/* Buy Price */}
                    <span className="pur-cell" style={{ textAlign: 'center' }}>
                      {editPriceRow?.id === item.product.product_id && editPriceRow?.field === 'buying_price' ? (
                        <input
                          type="number" className="pur-num" defaultValue={item.buying_price.toFixed(2)}
                          step={0.01} autoFocus style={{ width: '100%' }}
                          onClick={e => e.stopPropagation()}
                          onBlur={e  => { updateCart(item.product.product_id, 'buying_price',  parseFloat(e.target.value) || item.buying_price);  setEditPriceRow(null) }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { updateCart(item.product.product_id, 'buying_price',  parseFloat((e.target as HTMLInputElement).value) || item.buying_price);  setEditPriceRow(null) } }}
                        />
                      ) : (
                        <span
                          title="Click to edit"
                          onClick={e => { e.stopPropagation(); setEditPriceRow({ id: item.product.product_id, field: 'buying_price' }) }}
                          style={{ cursor: 'pointer', borderBottom: '1px dashed #6366f1', padding: '0 2px', fontSize: 11, color: '#b45309' }}
                        >{item.buying_price.toFixed(2)}</span>
                      )}
                    </span>

                    {/* Sell Price */}
                    <span className="pur-cell" style={{ textAlign: 'center' }}>
                      {editPriceRow?.id === item.product.product_id && editPriceRow?.field === 'selling_price' ? (
                        <input
                          type="number" className="pur-num" defaultValue={item.selling_price.toFixed(2)}
                          step={0.01} autoFocus style={{ width: '100%' }}
                          onClick={e => e.stopPropagation()}
                          onBlur={e  => { updateCart(item.product.product_id, 'selling_price', parseFloat(e.target.value) || item.selling_price); setEditPriceRow(null) }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { updateCart(item.product.product_id, 'selling_price', parseFloat((e.target as HTMLInputElement).value) || item.selling_price); setEditPriceRow(null) } }}
                        />
                      ) : (
                        <span
                          title="Click to edit"
                          onClick={e => { e.stopPropagation(); setEditPriceRow({ id: item.product.product_id, field: 'selling_price' }) }}
                          style={{ cursor: 'pointer', borderBottom: '1px dashed #6366f1', padding: '0 2px', fontSize: 11, color: '#1a9c5c' }}
                        >{item.selling_price.toFixed(2)}</span>
                      )}
                    </span>

                    {/* Batch No */}
                    <span className="pur-cell" style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        className="pur-date-input"
                        value={item.batch_number}
                        placeholder="Batch No"
                        onClick={e => e.stopPropagation()}
                        onFocus={() => setSelectedCartRow(idx)}
                        onChange={e => updateCart(item.product.product_id, 'batch_number', e.target.value)}
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: 9, letterSpacing: 0.3 }}
                        title="Edit batch number"
                      />
                    </span>

                    {/* Mfg + Expiry Dates — stacked in one cell */}
                    <span className="pur-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 8, color: '#8a90a3', minWidth: 20 }}>Mfg</span>
                          <input
                            type="date" className="pur-date-input" value={item.manufacture_date}
                            max={today} onClick={e => e.stopPropagation()}
                            onChange={e => updateCart(item.product.product_id, 'manufacture_date', e.target.value)}
                            style={{ flex: 1, fontSize: 9 }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 8, color: expiryWarn ? '#f59e0b' : '#8a90a3', minWidth: 20 }}>Exp</span>
                          <input
                            type="date" className="pur-date-input" value={item.expiry_date}
                            min={today} onClick={e => e.stopPropagation()}
                            onChange={e => updateCart(item.product.product_id, 'expiry_date', e.target.value)}
                            style={{ flex: 1, fontSize: 9, borderColor: expiryWarn ? '#f59e0b' : undefined }}
                          />
                        </div>
                        {expiryWarn && <div className="expiry-warn">⚠ Expires soon</div>}
                      </div>
                    </span>

                    {/* Row Total */}
                    <span className="pur-cell total">{(item.qty * item.buying_price).toFixed(2)}</span>

                    {/* Delete */}
                    <button className="pur-del" type="button" title="Remove (Del)"
                      onClick={e => { e.stopPropagation(); removeFromCart(item.product.product_id) }}>
                      <i className="fa fa-times" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Cart footer */}
          {cart.length > 0 && (
            <div className="pur-cart-footer">
              <span style={{ color: '#8a90a3', fontSize: 11 }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
              <button
                type="button"
                onClick={() => { setCart([]); setSelectedCartRow(-1) }}
                style={{ marginLeft: 'auto', background: '#fdecea', border: '1px solid #f5c6c0', color: '#ef4444', padding: '3px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}
              >
                <i className="fa fa-trash" /> Clear
              </button>
              <span style={{ color: '#6366f1', fontSize: 10 }}>
                <span className="pur-kbd">↑↓</span> nav
                <span className="pur-kbd" style={{ marginLeft: 4 }}>Tab</span> qty
                <span className="pur-kbd" style={{ marginLeft: 4 }}>+/−</span> qty±1
                <span className="pur-kbd" style={{ marginLeft: 4 }}>Del</span> remove
              </span>
            </div>
          )}
        </div>

        {/* ══════════ RIGHT — Order Details + Submit ══════════ */}
        <div className="pur-right">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="pur-right-topbar">
              <span style={{ color: '#1a9c5c', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>
                <i className="fa fa-clipboard" style={{ marginRight: 8 }} />Purchase Details
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* Supplier */}
              <div className="pur-section">
                <div className="pur-section-title">Supplier <span className="pur-kbd">F3</span></div>
                <select
                  ref={supplierRef}
                  className="pur-control"
                  value={selectedSupplier}
                  onChange={e => setSelectedSupplier(e.target.value)}
                  required
                >
                  <option value="">Select Supplier…</option>
                  {suppliers.map(s => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                  ))}
                </select>
              </div>

              {/* Date + Ref */}
              <div className="pur-section">
                <div className="pur-grid-2">
                  <div className="pur-field">
                    <label>Purchase Date</label>
                    <input type="date" className="pur-control" value={purchaseDate} max={today}
                      onChange={e => setPurchaseDate(e.target.value)} />
                  </div>
                  <div className="pur-field">
                    <label>Reference / PO No</label>
                    <input type="text" className="pur-control" value={purchaseRef} placeholder="Optional"
                      onChange={e => setPurchaseRef(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="pur-section">
                <div className="pur-section-title">Payment Method</div>
                <div className="pur-pm-btns">
                  {[
                    { val: 'cash',   icon: 'fa-money',       label: 'Cash'   },
                    { val: 'cheque', icon: 'fa-file-text-o', label: 'Cheque' },
                    { val: 'card',   icon: 'fa-credit-card', label: 'Card'   },
                  ].map(pm => (
                    <button
                      key={pm.val}
                      type="button"
                      className={`pur-pm-btn ${paymentMethod === pm.val ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(pm.val)}
                    >
                      <i className={`fa ${pm.icon}`} style={{ display: 'block', fontSize: 16, marginBottom: 2 }} />
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="pur-section">
                <div className="pur-section-title">Order Summary</div>
                <div className="pur-total-row">
                  <span className="pur-total-label">Items</span>
                  <span className="pur-total-value">{cart.length}</span>
                </div>
                <div className="pur-total-row">
                  <span className="pur-total-label">Total Units</span>
                  <span className="pur-total-value">{cart.reduce((s, i) => s + i.qty, 0).toFixed(1)}</span>
                </div>
                <div className="pur-total-row" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#1a9c5c', fontWeight: 700, fontSize: 14 }}>Grand Total</span>
                  <span className="pur-grand">{grandTotal.toFixed(2)}</span>
                </div>

                {/* Per-product margin preview */}
                {cart.length > 0 && (
                  <div style={{ marginTop: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ color: '#8a90a3', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
                      Margin Preview
                    </div>
                    {cart.map(item => {
                      const margin = item.selling_price > 0
                        ? (((item.selling_price - item.buying_price) / item.selling_price) * 100).toFixed(1)
                        : '0.0'
                      const marginNum = parseFloat(margin)
                      return (
                        <div key={item.product.product_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                          <span style={{ color: '#6a9a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                            {item.product.product_name}
                          </span>
                          <span style={{ color: marginNum >= 20 ? '#4ade80' : marginNum >= 10 ? '#fbbf24' : '#ef4444', fontWeight: 700 }}>
                            {margin}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
              {(!selectedSupplier || cart.length === 0) && (
                <div style={{ color: '#8a90a3', fontSize: 11, textAlign: 'center', marginBottom: 6 }}>
                  <i className="fa fa-info-circle" style={{ marginRight: 4 }} />
                  {!selectedSupplier ? 'Select a supplier to enable save' : 'Add products to enable save'}
                </div>
              )}
              <button
                type="submit"
                ref={submitRef}
                disabled={loading || !selectedSupplier || cart.length === 0}
                className="pur-submit"
              >
                {loading
                  ? <><i className="fa fa-spinner fa-spin" /> Saving…</>
                  : <><i className="fa fa-check" /> Save Batch Purchase <span className="pur-kbd" style={{ fontSize: 10, marginLeft: 6 }}>F12</span></>
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Keyboard hints panel */}
      {/* ── Existing Batch Picker Modal ── */}
      {batchPickerProduct && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(20,20,43,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => { setBatchPickerProduct(null); setExistingBatches([]) }}
        >
          <div
            style={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:12, padding:24, minWidth:500, maxWidth:620, width:'95%', boxShadow:'0 16px 48px rgba(20,20,43,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ color:'#8a90a3', fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:3 }}>Add Stock</div>
                <div style={{ color:'#1a1d29', fontSize:15, fontWeight:700 }}>{batchPickerProduct.product_name}</div>
              </div>
              <button type="button" onClick={() => { setBatchPickerProduct(null); setExistingBatches([]) }}
                style={{ background:'none', border:'none', color:'#8a90a3', fontSize:20, cursor:'pointer' }}>×</button>
            </div>

            {/* Option 1 — New Batch */}
            <div
              onClick={() => { addNewBatchToCart(batchPickerProduct); setBatchPickerProduct(null); setExistingBatches([]); setBatchHighlightedIdx(-1) }}
              onMouseEnter={() => setBatchHighlightedIdx(-1)}
              style={{
                background: batchHighlightedIdx === -1 ? '#eef0ff' : '#f9fafb',
                border: batchHighlightedIdx === -1 ? '2px solid #6366f1' : '2px solid #e5e7eb',
                borderRadius:8, padding:'12px 16px', cursor:'pointer', marginBottom:12, transition:'all .12s',
                display:'flex', alignItems:'flex-start', gap:10,
              }}
            >
              {batchHighlightedIdx === -1 && <i className="fa fa-check-circle" style={{ color:'#6366f1', fontSize:16, marginTop:2 }} />}
              <div>
                <div style={{ color: batchHighlightedIdx === -1 ? '#4338ca' : '#1a1d29', fontWeight:700, fontSize:13, marginBottom:3 }}>
                  <i className="fa fa-plus-circle" style={{ marginRight:6 }} />Create New Batch
                  <span style={{ marginLeft:8, background:'#fff', color:'#6366f1', border:'1px solid #6366f1', borderRadius:3, fontSize:9, padding:'1px 5px', fontFamily:'monospace' }}>N</span>
                </div>
                <div style={{ color:'#6b7280', fontSize:11 }}>
                  Auto-generate a new batch number — for new stock from a different delivery
                </div>
              </div>
            </div>

            {/* Option 2 — Add to Existing Batches */}
            {existingBatches.length > 0 && (
              <>
                <div style={{ color:'#8a90a3', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                  — or add stock to an existing batch —
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
                  {existingBatches.map((batch, bIdx) => {
                    const isExpired      = batch.is_expired
                    const isExpiringSoon = batch.is_expiring_soon
                    const isHighlighted  = batchHighlightedIdx === bIdx
                    const borderColor    = isHighlighted ? '#6366f1' : isExpired ? '#f87171' : isExpiringSoon ? '#f59e0b' : '#e5e7eb'
                    const statusColor    = isExpired ? '#d9403a' : isExpiringSoon ? '#b45309' : '#1a9c5c'
                    const statusLabel    = isExpired ? 'EXPIRED' : isExpiringSoon ? `${batch.days_until_expiry}d left` : 'Good'
                    return (
                      <div
                        key={batch.batch_id}
                        onMouseEnter={() => setBatchHighlightedIdx(bIdx)}
                        onClick={() => {
                          const hasPacket = batchPickerProduct.packet_size > 0
                          const unitType  = hasPacket && !addAsPiece ? 'packet' : 'pcs'
                          const qtyToAdd  = unitType === 'packet' ? batchPickerProduct.packet_size : 1
                          setCart(prev => {
                            const exists = prev.find(c => c.product.product_id === batchPickerProduct.product_id)
                            if (exists) return prev.map(c => c.product.product_id === batchPickerProduct.product_id
                              ? { ...c, qty: toDec(c.qty + qtyToAdd) } : c)
                            return [...prev, {
                              product: batchPickerProduct, qty: qtyToAdd,
                              buying_price: batch.buying_price,
                              selling_price: batch.selling_price,
                              expiry_date: batch.expiry_date || '',
                              manufacture_date: batch.manufacture_date || '',
                              unitType, batch_number: batch.batch_number,
                              is_existing_batch: true,
                              damaged_qty: 0,
                            }]
                          })
                          setSelectedCartRow(cart.length)
                          setSearchTerm(''); setSearchResults([])
                          searchRef.current?.focus()
                          toast.success(`Added to batch ${batch.batch_number}`)
                          setBatchPickerProduct(null); setExistingBatches([]); setBatchHighlightedIdx(-1)
                        }}
                        style={{
                          background: isHighlighted ? '#eef0ff' : '#ffffff',
                          border: `2px solid ${borderColor}`, borderRadius:8, padding:'10px 14px', cursor:'pointer', transition:'all .12s',
                          display:'flex', alignItems:'center', gap:10,
                        }}
                      >
                        {isHighlighted && <i className="fa fa-check-circle" style={{ color:'#6366f1', fontSize:15 }} />}
                        <div style={{ flex: 1, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <div style={{ fontFamily:'monospace', fontSize:12, color: isHighlighted ? '#4338ca' : '#1a1d29', fontWeight:700, marginBottom:3 }}>{batch.batch_number}</div>
                            <div style={{ fontSize:11, color:'#6b7280', display:'flex', gap:12 }}>
                              <span>Stock: <strong style={{ color:'#1a1d29' }}>{batch.qty_remaining}</strong></span>
                              <span>Buy: <strong style={{ color:'#b45309' }}>{batch.buying_price.toFixed(2)}</strong></span>
                              <span>Sell: <strong style={{ color:'#1a9c5c' }}>{batch.selling_price.toFixed(2)}</strong></span>
                              {batch.expiry_date && <span>Exp: <strong style={{ color:'#1a1d29' }}>{batch.expiry_date}</strong></span>}
                            </div>
                          </div>
                          <span style={{ color:statusColor, border:`1px solid ${statusColor}`, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div style={{ marginTop:12, color:'#8a90a3', fontSize:11, textAlign:'center', display:'flex', justifyContent:'center', gap:14 }}>
              <span><span style={{ background:'#f3f4f6', color:'#6366f1', border:'1px solid #d1d5db', borderRadius:3, fontSize:9, padding:'1px 5px', fontFamily:'monospace' }}>↑↓</span> navigate</span>
              <span><span style={{ background:'#f3f4f6', color:'#6366f1', border:'1px solid #d1d5db', borderRadius:3, fontSize:9, padding:'1px 5px', fontFamily:'monospace' }}>↵</span> select</span>
              <span><span style={{ background:'#f3f4f6', color:'#6366f1', border:'1px solid #d1d5db', borderRadius:3, fontSize:9, padding:'1px 5px', fontFamily:'monospace' }}>N</span> new batch</span>
              <span><span style={{ background:'#f3f4f6', color:'#6366f1', border:'1px solid #d1d5db', borderRadius:3, fontSize:9, padding:'1px 5px', fontFamily:'monospace' }}>Esc</span> cancel</span>
            </div>
          </div>
        </div>
      )}

      {showHints && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9000,
          background: '#ffffff', color: '#1a1d29', borderRadius: 10,
          padding: '12px 16px', boxShadow: '0 8px 32px rgba(20,20,43,0.2)',
          fontSize: 12, minWidth: 230, border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontWeight: 700, color: '#6366f1', marginBottom: 8, fontSize: 12, letterSpacing: 1 }}>
            ⌨ KEYBOARD SHORTCUTS
          </div>
          {SHORTCUTS.map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
              <span style={{ background: '#f3f4f6', padding: '1px 7px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, color: '#6366f1', border: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>
                {s.key}
              </span>
              <span style={{ color: '#6a9a7a', fontSize: 11 }}>{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
