import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Why this exists: getShopScope() never rejects anyone — with no session it
// just returns shopId null / isSuperAdmin false, and scopeWhere() treats
// shopId null as "all shops". The middleware only covers "/" and
// "/dashboard/*", not "/api/*". So an API route that only *calls*
// getShopScope() is NOT actually protected — anonymous requests reach it.
// Routes that must be private call one of these first and return the result
// if it isn't null:
//
//   const denied = await rejectIfNotLoggedIn()
//   if (denied) return denied

async function currentUser() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { is_super_admin?: boolean; is_active?: boolean } | undefined
  // A disabled account is treated as logged out, matching what the
  // middleware does for dashboard pages.
  if (!session?.user || user?.is_active === false) return null
  return user ?? {}
}

/** 401 response if nobody (or a disabled account) is logged in, otherwise null. */
export async function rejectIfNotLoggedIn(): Promise<NextResponse | null> {
  const user = await currentUser()
  return user ? null : NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 })
}

/** 401 if not logged in, 403 if logged in but not Head Office, otherwise null. */
export async function rejectIfNotHeadOffice(): Promise<NextResponse | null> {
  const user = await currentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 })
  if (!user.is_super_admin) return NextResponse.json({ success: false, error: 'Head Office access required.' }, { status: 403 })
  return null
}
