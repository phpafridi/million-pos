'use server'

import { runOnce } from '@/lib/runOnce'
import { toFriendlyError } from '@/lib/friendlyError'
import { AddOrder } from '@/components/OrderProcess/actions/AddOrder'
import { SaveBatchPurchase } from '@/components/ManagePurchase/actions/SaveBatchPurchase'
import { AddOrUpdateTailorCustomer, AddTailorOrder } from '@/components/Tailor/actions/TailorActions'

// Thin wrappers used by the forms AND the offline sync. Each one is safe to
// call again with the same key — see runOnce. They always RETURN a result
// (never throw), because Next hides thrown messages in production.

export async function SubmitSaleOnce(payload: Parameters<typeof AddOrder>[0], key: string) {
  return runOnce(key, 'sale', () => AddOrder(payload))
}

export async function SubmitPurchaseOnce(payload: Parameters<typeof SaveBatchPurchase>[0], key: string) {
  return runOnce(key, 'purchase', () => SaveBatchPurchase(payload))
}

export async function SubmitTailorCustomerOnce(data: Parameters<typeof AddOrUpdateTailorCustomer>[0], key: string) {
  return runOnce(key, 'tailor_customer', async () => {
    try {
      const customer = await AddOrUpdateTailorCustomer(data)
      return { success: true as const, customer }
    } catch (e) {
      return { success: false as const, message: toFriendlyError(e) }
    }
  })
}

export async function SubmitTailorOrderOnce(data: Parameters<typeof AddTailorOrder>[0], key: string) {
  return runOnce(key, 'tailor_order', async () => {
    try {
      const order = await AddTailorOrder(data)
      return { success: true as const, order }
    } catch (e) {
      return { success: false as const, message: toFriendlyError(e) }
    }
  })
}
