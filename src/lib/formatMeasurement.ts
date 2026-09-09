/**
 * Displays a decimal measurement the way it was actually entered —
 * e.g. 12.5 -> "12 1/2", 20.9 -> "20 9/10", 20.1667 -> "20 1/6" —
 * instead of forcing everything into eighths (which mangled anything
 * that wasn't a clean half/quarter/eighth, like tenths or sixths).
 *
 * Searches denominators 2 through 16 (covers standard tailoring
 * fractions) plus 10 (covers decimal-style entry like "9/10") for the
 * simplest fraction that reproduces the value almost exactly, instead
 * of always rounding to the nearest eighth regardless of what was
 * actually typed.
 */
export function formatAsFraction(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? Number(value) : value
  if (isNaN(num)) return String(value)

  const whole = Math.trunc(num)
  const fractional = Math.abs(num - whole)

  if (fractional < 0.005) {
    return String(whole)
  }

  const denominators = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16]
  let best: { num: number; den: number; error: number } | null = null

  for (const den of denominators) {
    const n = Math.round(fractional * den)
    if (n === 0 || n === den) continue // rounds to whole, not a fraction
    const error = Math.abs(fractional - n / den)
    if (!best || error < best.error - 1e-9 || (Math.abs(error - best.error) < 1e-9 && den < best.den)) {
      best = { num: n, den, error }
    }
  }

  if (!best || best.error > 0.02) {
    // No clean fraction found within tolerance — show the raw decimal
    // rather than silently picking an inaccurate one.
    return num.toFixed(2).replace(/\.?0+$/, '') || String(num)
  }

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(best.num, best.den)
  const n = best.num / divisor
  const d = best.den / divisor

  const sign = num < 0 ? '-' : ''
  return whole === 0 ? `${sign}${n}/${d}` : `${whole} ${n}/${d}`
}
