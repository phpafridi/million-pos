'use client'

// Orders saved while the internet is down. Stored in IndexedDB (not
// localStorage) so it survives restarts/power cuts and can hold photo Files.

export type QueueKind = 'sale' | 'purchase' | 'tailor'

export type QueueItem = {
  key: string
  kind: QueueKind
  label: string
  createdAt: number
  userId: string
  payload: any
  photos?: File[]
  status: 'pending' | 'failed'
  error?: string
  attempts: number
  // Steps already completed on the server (tailor orders are multi-step), so a
  // retry resumes instead of repeating them.
  progress?: { customerId?: number; orderId?: number; orderNumber?: string; photosDone?: boolean }
}

const DB = 'invexa-offline'
const STORE = 'queue'
export const QUEUE_EVENT = 'invexa-queue-changed'

export function newClientKey(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch { /* fall through */ }
  const r = () => Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${r()}-${r()}-${r()}`.slice(0, 40)
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode)
      const req = fn(t.objectStore(STORE))
      t.oncomplete = () => resolve(req.result)
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
    })
  } finally {
    db.close()
  }
}

function notify() {
  try { window.dispatchEvent(new Event(QUEUE_EVENT)) } catch { /* ignore */ }
}

export async function queueAll(): Promise<QueueItem[]> {
  try {
    const items = await tx<QueueItem[]>('readonly', s => s.getAll())
    return items.sort((a, b) => a.createdAt - b.createdAt)
  } catch { return [] }
}

export async function queuePut(item: QueueItem): Promise<void> {
  await tx('readwrite', s => s.put(item))
  notify()
}

export async function queueDelete(key: string): Promise<void> {
  await tx('readwrite', s => s.delete(key))
  notify()
}

/** Save a new order. Throws if the browser can't store it (caller must then keep the form). */
export async function enqueue(
  item: Omit<QueueItem, 'createdAt' | 'status' | 'attempts'>,
): Promise<void> {
  await queuePut({ ...item, createdAt: Date.now(), status: 'pending', attempts: 0 })
}
