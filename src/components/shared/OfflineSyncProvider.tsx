'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { queueAll, queuePut, queueDelete, QueueItem, QUEUE_EVENT } from '@/lib/offlineQueue'
import { syncQueue } from '@/lib/offlineSync'

const KIND_LABEL: Record<string, string> = { sale: 'Sale', purchase: 'Purchase', tailor: 'Tailor order' }

/**
 * Mounted once in the dashboard layout. Uploads orders that were saved while
 * offline as soon as the internet is back, and shows what is waiting.
 */
export default function OfflineSyncProvider() {
  const { data: session } = useSession()
  const userId = session?.user ? String((session.user as any).id ?? '') : ''
  const online = useOnlineStatus()
  const [items, setItems] = useState<QueueItem[]>([])
  const [syncing, setSyncing] = useState(false)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    setItems((await queueAll()).filter(i => i.userId === userId))
  }, [userId])

  const runSync = useCallback(async () => {
    if (!userId) return
    setSyncing(true)
    try { await syncQueue(userId) } finally { setSyncing(false); refresh() }
  }, [userId, refresh])

  useEffect(() => {
    if (!userId) return
    refresh()
    window.addEventListener(QUEUE_EVENT, refresh)
    return () => window.removeEventListener(QUEUE_EVENT, refresh)
  }, [userId, refresh])

  const hasPending = items.some(i => i.status === 'pending')

  // Sync when online and something is waiting — immediately, on queue change, and every 30 s.
  useEffect(() => {
    if (!online || !userId || !hasPending) return
    runSync()
    const id = setInterval(runSync, 30000)
    return () => clearInterval(id)
  }, [online, userId, hasPending, runSync, items.length])

  if (items.length === 0) return null
  const failedCount = items.filter(i => i.status === 'failed').length

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 99998, maxWidth: 360, fontSize: 13 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'block', marginLeft: 'auto', border: 'none', borderRadius: 20, padding: '8px 14px',
          background: failedCount ? '#c62828' : '#f57c00', color: '#fff', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,.3)',
        }}
      >
        {syncing ? '⏳ Uploading…' : failedCount ? `⚠ ${failedCount} need attention` : `🕒 ${items.length} waiting to upload`}
        {' '}({items.length})
      </button>
      {open && (
        <div style={{ background: '#fff', color: '#222', border: '1px solid #ccc', borderRadius: 6, marginTop: 6, padding: 8, boxShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Saved on this computer {online ? '— uploading automatically' : '— will upload when the internet returns'}
          </div>
          {items.map(it => (
            <div key={it.key} style={{ borderTop: '1px solid #eee', padding: '6px 0' }}>
              <div><b>{KIND_LABEL[it.kind]}</b> · {it.label}</div>
              <div style={{ color: '#777', fontSize: 11 }}>{new Date(it.createdAt).toLocaleString()}</div>
              {it.status === 'failed' ? (
                <>
                  <div style={{ color: '#c62828', margin: '3px 0' }}>{it.error}</div>
                  <button type="button" className="btn btn-xs btn-primary" style={{ marginRight: 6 }}
                    onClick={async () => { await queuePut({ ...it, status: 'pending', attempts: 0, error: undefined }) }}>
                    Retry
                  </button>
                  <button type="button" className="btn btn-xs btn-default"
                    onClick={async () => {
                      if (window.confirm('Discard this order? It has NOT been saved to the system and will be lost.')) await queueDelete(it.key)
                    }}>
                    Discard
                  </button>
                </>
              ) : (
                <div style={{ color: '#f57c00' }}>Waiting to upload</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
