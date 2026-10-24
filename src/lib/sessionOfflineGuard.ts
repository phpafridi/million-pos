/**
 * next-auth's browser client re-checks /api/auth/session on tab focus. When the
 * internet is down that request fails, and next-auth then sets the session to
 * null — which would make the POS think the cashier logged out (so offline
 * orders could not be saved). This keeps the last good session response and
 * serves it ONLY when the network request itself fails. A real "not logged in"
 * answer from the server ({}), or a successful refresh, always wins.
 */
const KEY = 'invexa:last-session'
const SESSION_URL = /\/api\/auth\/session(\?|$)/

export function installSessionOfflineGuard(): void {
  if (typeof window === 'undefined') return
  const w = window as any
  if (w.__invexaSessionGuard) return
  w.__invexaSessionGuard = true
  const orig = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (!SESSION_URL.test(url)) return orig(input, init)
    try {
      const res = await orig(input, init)
      try {
        if (res.ok) {
          const text = (await res.clone().text()).trim()
          if (!text || text === '{}' || text === 'null') sessionStorage.removeItem(KEY)
          else sessionStorage.setItem(KEY, text)
        }
      } catch { /* storage unavailable */ }
      return res
    } catch (err) {
      let cached: string | null = null
      try { cached = sessionStorage.getItem(KEY) } catch { /* ignore */ }
      if (cached) {
        return new Response(cached, { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      throw err
    }
  }
}
