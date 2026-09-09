'use server'

import { fetchActivityLog, type ActivityLogRow } from '@/lib/auditLog'

export async function FetchActivityLog(filters: {
  shopId?: number
  action?: string
  userEmail?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<ActivityLogRow[]> {
  return fetchActivityLog(filters)
}
