'use server'

import { fetchActivityLog, type ActivityLogRow } from '@/lib/auditLog'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

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

/** Permanently deletes activity log entries — Head Office only. Optionally scoped to entries older than a cutoff date; with no cutoff, clears everything. */
export async function ClearActivityLog(olderThanDate?: string) {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) {
    throw new Error('Only Head Office can clear the activity log')
  }

  const where = olderThanDate ? { created_at: { lt: new Date(olderThanDate) } } : {}
  const result = await prisma.tbl_activity_log.deleteMany({ where })
  return { deleted: result.count }
}
