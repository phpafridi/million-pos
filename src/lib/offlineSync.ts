'use client'

import { toast } from 'sonner'
import { queueAll, queuePut, queueDelete, QueueItem } from '@/lib/offlineQueue'
import {
  SubmitSaleOnce, SubmitPurchaseOnce, SubmitTailorCustomerOnce, SubmitTailorOrderOnce,
} from '@/lib/offlineSubmit'
import { UploadEntityPhotos } from '@/lib/entityPhotos'

const MAX_ATTEMPTS = 10
let running = false

type Outcome = 'done' | 'failed' | 'retry-later'

async function fail(item: QueueItem, message: string): Promise<Outcome> {
  await queuePut({ ...item, status: 'failed', error: message })
  return 'failed'
}

async function networkBlip(item: QueueItem): Promise<Outcome> {
  const attempts = item.attempts + 1
  if (attempts >= MAX_ATTEMPTS) {
    await queuePut({ ...item, attempts, status: 'failed', error: 'Could not reach the server after several tries. Press Retry, or check with support.' })
    return 'failed'
  }
  await queuePut({ ...item, attempts })
  return 'retry-later'
}

async function syncOne(item: QueueItem): Promise<Outcome> {
  try {
    if (item.kind === 'sale') {
      const res: any = await SubmitSaleOnce(item.payload, item.key)
      if (res.success) {
        await queueDelete(item.key)
        toast.success(`Offline sale saved${res.order?.order_number ? ` as ${res.order.order_number}` : ''}`)
        return 'done'
      }
      return res.retryable ? networkBlip(item) : fail(item, res.message || 'Could not save this sale')
    }

    if (item.kind === 'purchase') {
      const res: any = await SubmitPurchaseOnce(item.payload, item.key)
      if (res.success) {
        await queueDelete(item.key)
        toast.success(res.message || 'Offline purchase saved')
        return 'done'
      }
      return res.retryable ? networkBlip(item) : fail(item, res.message || 'Could not save this purchase')
    }

    // tailor: customer → order → photos, each step resumable
    let progress = { ...(item.progress ?? {}) }
    const persist = async () => { item = { ...item, progress }; await queuePut(item) }

    if (!progress.customerId) {
      const c: any = await SubmitTailorCustomerOnce(item.payload.customer, `${item.key}-c`)
      if (!c.success) return c.retryable ? networkBlip(item) : fail(item, c.message || 'Could not save the customer')
      progress.customerId = Number(c.customer.tailor_customer_id)
      await persist()
    }
    if (!progress.orderId) {
      const o: any = await SubmitTailorOrderOnce({ ...item.payload.order, tailor_customer_id: progress.customerId! }, item.key)
      if (!o.success) return o.retryable ? networkBlip(item) : fail(item, o.message || 'Could not save the tailor order')
      progress.orderId = Number(o.order.tailor_order_id)
      progress.orderNumber = o.order.order_number
      await persist()
    }
    if (item.photos && item.photos.length > 0 && !progress.photosDone) {
      const up = await UploadEntityPhotos('tailor_order', progress.orderId!, item.photos, item.payload.order.taken_by)
      if (up.success) { progress.photosDone = true; await persist() }
      else toast.error(`Tailor order ${progress.orderNumber} saved, but photos were not uploaded: ${up.error}`)
    }
    await queueDelete(item.key)
    toast.success(`Offline tailor order saved${progress.orderNumber ? ` as ${progress.orderNumber}` : ''}`)
    return 'done'
  } catch {
    // The request itself failed (connection dropped / server unreachable) —
    // keep the item, it will be retried with the SAME key, so it cannot duplicate.
    return networkBlip(item)
  }
}

/** Uploads this user's waiting orders, oldest first. Safe to call repeatedly. */
export async function syncQueue(userId: string): Promise<{ done: number; failed: number }> {
  if (running) return { done: 0, failed: 0 }
  running = true
  let done = 0, failed = 0
  try {
    const run = async () => {
      const items = (await queueAll()).filter(i => i.userId === userId && i.status === 'pending')
      for (const item of items) {
        const out = await syncOne(item)
        if (out === 'done') done++
        else if (out === 'failed') failed++
        else break // network trouble → stop, try again later, keep order
      }
    }
    const locks = (navigator as any).locks
    if (locks?.request) {
      await locks.request('invexa-offline-sync', { ifAvailable: true }, async (lock: any) => { if (lock) await run() })
    } else {
      await run()
    }
  } finally {
    running = false
  }
  return { done, failed }
}
