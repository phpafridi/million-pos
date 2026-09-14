'use server';

import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhere, canManageUsers } from '@/lib/getShopScope';
import { logActivity } from '@/lib/auditLog';

/**
 * Disables or re-enables an employee account, replacing what used to be
 * a permanent delete. A disabled account can't log in (checked in
 * auth.ts), but the record and every action it's ever taken (audit log,
 * sales, orders) stays intact — deleting the row outright would have
 * either broken those historical references or silently orphaned them.
 */
export async function toggleUserActive(email: string, isActive: boolean) {
  const scope = await getShopScope();
  if (!canManageUsers(scope)) {
    throw new Error('Only a franchise admin or Head Office can disable staff accounts');
  }

  const user = await prisma.user.findFirst({
    where: { email, ...scopeWhere(scope) },
  });

  if (!user) {
    throw new Error('User not found or belongs to another franchise');
  }

  await prisma.user.update({
    where: { email },
    data: { is_active: isActive },
  });

  await logActivity({
    action: isActive ? 'user.enable' : 'user.disable',
    entityType: 'user',
    entityId: user.id,
    description: `Staff account ${isActive ? 'enabled' : 'disabled'}: ${user.name} (${user.email})`,
    shopIdOverride: user.shop_id ?? undefined,
  });
}
