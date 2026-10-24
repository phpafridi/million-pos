/** Today's date as YYYY-MM-DD in the COMPUTER'S local timezone (not UTC). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Turns the date picked in a form (YYYY-MM-DD) into a full timestamp: that
 * date + the current local time of day. Sending just "2026-10-24" made the
 * server store midnight UTC, which shows as 5:00 AM in Pakistan for every
 * record. Falls back to "now" for an empty/invalid value.
 */
export function dateWithCurrentTime(dateStr?: string | null, now: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr ?? '')
  if (!m) return now.toISOString()
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    now.getHours(), now.getMinutes(), now.getSeconds())
  return d.toISOString()
}
