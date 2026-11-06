'use server'

import { buildSalesRows, SalesRow } from '@/lib/salesRows'

// Amounts are NET of refunds — see src/lib/salesRows.ts.
export type SalesReportRow = SalesRow

export default async function FetchSalesReport(
  startDate: string,
  endDate: string
): Promise<SalesReportRow[]> {
  return buildSalesRows(startDate, endDate)
}
