'use client'
import { create } from 'zustand'
import { fetchLowStock } from '../Product/actions/FetchLowStock'
import { fetchPendingOrders } from '../Product/actions/FetchPendingOrders'

type Product = {
  id: number
  name: string
  qty: number
  unit: string
  notifyQty: number | null
  isLowStock: boolean
}

type Order = {
  id: number
  customer_name: string
  order_date: string
}

type ExpiryProduct = {
  id: number
  name: string
  expiry_date: string
  days_remaining: number
  stock_quantity: number
  is_expired: boolean
}

type ExpiryBatch = {
  batch_id: number
  batch_number: string
  product_id: number
  product_name: string
  product_code: string
  qty_remaining: number
  expiry_date: string
  days_remaining: number
  is_expired: boolean
}

type NotificationState = {
  lowStockProducts: Product[]
  pendingOrders: Order[]
  expiringProducts: ExpiryProduct[]
  expiredProducts: ExpiryProduct[]
  expiringBatches: ExpiryBatch[]
  expiredBatches: ExpiryBatch[]
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  refreshLowStock: () => Promise<void>
  refreshPendingOrders: () => Promise<void>
  refreshExpiryAlerts: () => Promise<void>
}

export const useNotifications = create<NotificationState>((set, get) => ({
  lowStockProducts: [],
  pendingOrders: [],
  expiringProducts: [],
  expiredProducts: [],
  expiringBatches: [],
  expiredBatches: [],
  sidebarCollapsed: false,

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    set({ sidebarCollapsed: next })
    // Apply to body immediately
    if (typeof document !== 'undefined') {
      if (next) {
        document.body.classList.add('sidebar-collapse')
      } else {
        document.body.classList.remove('sidebar-collapse')
      }
      // Persist across page navigations
      localStorage.setItem('sidebarCollapsed', next ? '1' : '0')
    }
  },

  refreshLowStock: async () => {
    const data = await fetchLowStock()
    set({ lowStockProducts: data })
  },

  refreshPendingOrders: async () => {
    const data = await fetchPendingOrders()
    set({ pendingOrders: data })
  },

  refreshExpiryAlerts: async () => {
    try {
      const res = await fetch('/api/alerts/expiry')
      const data = await res.json()

      if (data.success) {
        const today = new Date()

        const formatProduct = (product: any, isExpired: boolean = false): ExpiryProduct => {
          const expiryDate = product.expiration_date ? new Date(product.expiration_date) : null
          const days_remaining = expiryDate
            ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            : 0
          return {
            id: product.product_id,
            name: product.product_name,
            expiry_date: expiryDate ? expiryDate.toLocaleDateString() : 'N/A',
            days_remaining: isExpired ? 0 : Math.max(0, days_remaining),
            stock_quantity: product.inventories?.[0]?.product_quantity
              ? Number(product.inventories[0].product_quantity)
              : 0,
            is_expired: isExpired,
          }
        }

        set({
          expiringProducts:  data.data.expiring       ? data.data.expiring.map((p: any) => formatProduct(p, false)) : [],
          expiredProducts:   data.data.expired        ? data.data.expired.map((p: any) => formatProduct(p, true))  : [],
          expiringBatches:   data.data.expiringBatches || [],
          expiredBatches:    data.data.expiredBatches  || [],
        })
      } else {
        console.error('Failed to fetch expiry alerts:', data.error)
        set({ expiringProducts: [], expiredProducts: [], expiringBatches: [], expiredBatches: [] })
      }
    } catch (error) {
      console.error('Failed to fetch expiry alerts:', error)
      set({ expiringProducts: [], expiredProducts: [], expiringBatches: [], expiredBatches: [] })
    }
  },
}))
