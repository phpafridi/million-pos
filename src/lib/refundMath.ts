// Pure helper — safe to import in browser components (no database code).

export function paidShare(grandTotal: number, subTotal: number): number {
  if (!(subTotal > 0) || !(grandTotal >= 0)) return 1
  return Math.min(1, grandTotal / subTotal)
}
