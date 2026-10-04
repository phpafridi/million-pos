import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/clientPermissions'

/**
 * Server-side version of the "does this user have this permission" check.
 *
 * Why this exists: the employee permission checkboxes (e.g. "View Order
 * Detail") have so far only hidden buttons in the browser — nothing on the
 * server re-checks them, and the middleware no longer checks page paths. So
 * anyone logged in could call the underlying action directly. Anything that
 * changes stock or money should call this first.
 *
 * It reuses hasPermission() itself rather than re-implementing the rules, so
 * the button and the server can never drift apart (Head Office blocked for
 * 'edit', franchise admins allowed, employees need the checkbox, etc.).
 */
export async function sessionHasPermission(
  value: string,
  kind: 'view' | 'edit' | 'admin' = 'edit'
): Promise<boolean> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return false
  // A disabled account is treated as logged out, same as the middleware.
  if ((session.user as { is_active?: boolean }).is_active === false) return false
  return hasPermission(session, value, kind)
}
