'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Envelope<T> = { v: 1; savedAt: number; data: T }

function read<T>(key: string): Envelope<T> | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.v === 1 && parsed.data !== undefined ? parsed : null
  } catch { return null }
}
function write<T>(key: string, data: T) {
  try { window.localStorage.setItem(key, JSON.stringify({ v: 1, savedAt: Date.now(), data })) } catch { /* storage full/blocked */ }
}
function remove(key: string) {
  try { window.localStorage.removeItem(key) } catch { /* ignore */ }
}

/**
 * Auto-saves an in-progress form to this browser and offers it back after a
 * restart/crash. Nothing is restored silently: if a saved draft exists, it
 * is exposed as `pending` and the user chooses Resume or Discard.
 *
 *  key     – unique per form + user + shop (null = not ready yet)
 *  value   – the draftable state (must be JSON-serialisable)
 *  isEmpty – true when there is nothing worth saving (removes the draft)
 */
export function useDraft<T>(key: string | null, value: T, isEmpty: boolean) {
  const [pending, setPending] = useState<Envelope<T> | null>(null)
  const [decided, setDecided] = useState(false)
  const latest = useRef({ value, isEmpty })
  latest.current = { value, isEmpty }

  // Look for an existing draft whenever the key changes.
  useEffect(() => {
    if (!key) return
    const d = read<T>(key)
    setPending(d)
    setDecided(!d)
  }, [key])

  // Debounced auto-save — paused while the Resume/Discard prompt is open so
  // a fresh empty form can't overwrite the draft before the user chooses.
  useEffect(() => {
    if (!key || !decided) return
    const t = setTimeout(() => {
      if (isEmpty) remove(key); else write(key, value)
    }, 400)
    return () => clearTimeout(t)
  }, [key, decided, value, isEmpty])

  // Flush immediately if the tab is closed / PC is shutting down.
  useEffect(() => {
    if (!key || !decided) return
    const flush = () => {
      const { value: v, isEmpty: e } = latest.current
      if (e) remove(key); else write(key, v)
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [key, decided])

  const resume = useCallback((): T | null => {
    const d = pending
    setPending(null)
    setDecided(true)
    return d ? d.data : null
  }, [pending])

  const discard = useCallback(() => {
    if (key) remove(key)
    setPending(null)
    setDecided(true)
  }, [key])

  /** Call after a successful save of the real order. */
  const clear = useCallback(() => { if (key) remove(key) }, [key])

  return { pending: pending ? { savedAt: pending.savedAt } : null, resume, discard, clear }
}
