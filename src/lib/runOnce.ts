import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type Failure = { success: false; message: string; retryable?: boolean }

const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/
const STALE_MS = 10 * 60 * 1000

/**
 * Runs `fn` at most once per client key.
 *  - first call: runs fn; on success stores its result against the key
 *  - repeat call (retry after a dropped connection): returns the stored
 *    result with duplicate:true — the order is NOT created again
 *  - fn failing (success:false / throwing) releases the key so a retry can run
 * A key still "processing" means another attempt is in flight (or died
 * mid-way) — we refuse rather than risk a double order.
 */
export async function runOnce<T extends { success?: boolean }>(
  key: string | undefined,
  kind: string,
  fn: () => Promise<T>,
): Promise<T | Failure | (T & { duplicate: true })> {
  const fail = (message: string, retryable = false): Failure => ({ success: false, message, retryable })
  try {
    const session = await getServerSession(authOptions)
    const userId = String((session?.user as any)?.id ?? '')
    if (!userId) return fail('Your session has expired. Please log in again.')

    if (!key || !KEY_RE.test(key)) return await fn() // no/invalid key → behave exactly as before

    try {
      await prisma.tbl_client_submission.create({ data: { client_key: key, kind, user_id: userId } })
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e
      const existing = await prisma.tbl_client_submission.findUnique({ where: { client_key: key } })
      if (!existing || existing.user_id !== userId) return fail('This submission key is already used.')
      if (existing.status === 'done' && existing.result) {
        return { ...(existing.result as any), duplicate: true }
      }
      const age = Date.now() - existing.created_at.getTime()
      if (age > STALE_MS) {
        return fail('A previous attempt to save this was interrupted. Please check the order list before saving again.')
      }
      return fail('This is already being saved. Please wait a moment.', true)
    }

    let result: T
    try {
      result = await fn()
    } catch (err: any) {
      await prisma.tbl_client_submission.delete({ where: { client_key: key } }).catch(() => {})
      return fail(err?.message || 'Failed to save')
    }
    if (result && result.success === false) {
      await prisma.tbl_client_submission.delete({ where: { client_key: key } }).catch(() => {})
      return result
    }
    try {
      await prisma.tbl_client_submission.update({
        where: { client_key: key },
        data: { status: 'done', result: JSON.parse(JSON.stringify(result)) },
      })
    } catch (e) {
      console.error('runOnce: could not store result for', key, e) // order is saved; only retry-protection is affected
    }
    return result
  } catch (err: any) {
    console.error('runOnce error:', err?.message)
    return fail('Could not save right now. Please try again.', true)
  }
}
