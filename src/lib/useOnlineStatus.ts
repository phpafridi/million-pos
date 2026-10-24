'use client'

import { useEffect, useState } from 'react'

/**
 * True internet reachability, not just "network cable plugged in".
 * navigator.onLine only notices a lost Wi-Fi/LAN link; it stays true when
 * the router is connected but the ISP is down — the common case here. So
 * we also ping our own server periodically and treat a failure/timeout as
 * offline.
 */
export function useOnlineStatus(pollMs = 15000): boolean {
  const [online, setOnline] = useState(true) // true on first render → no hydration mismatch

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (!cancelled) setOnline(false)
        return
      }
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 5000)
      try {
        const res = await fetch('/api/ping', { cache: 'no-store', signal: ctrl.signal })
        if (!cancelled) setOnline(res.ok)
      } catch {
        if (!cancelled) setOnline(false)
      } finally {
        clearTimeout(timer)
      }
    }

    const goOffline = () => setOnline(false)
    const goOnline = () => { check() }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    const id = setInterval(() => { if (!document.hidden) check() }, pollMs)
    check()

    return () => {
      cancelled = true
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      clearInterval(id)
    }
  }, [pollMs])

  return online
}
