'use client'

import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Slim red bar across the top while the internet is unreachable. */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
        background: '#c62828', color: '#fff', textAlign: 'center',
        padding: '6px 12px', fontSize: 13, fontWeight: 600,
      }}
    >
      No internet connection — you can keep working. Orders you save now are kept on this computer and uploaded automatically when the internet returns.
    </div>
  )
}
