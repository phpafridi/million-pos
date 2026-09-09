'use server';

import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhere, canManageUsers } from '@/lib/getShopScope';
import { logActivity } from '@/lib/auditLog';

export async function deleteUserById(email: string) {

    const scope = await getShopScope();
    if (!canManageUsers(scope)) {
        throw new Error('Only a franchise admin or Head Office can delete staff accounts');
    }

    const user = await prisma.user.findFirst({
        where: { email, ...scopeWhere(scope) },
    });

    if (!user) {
        throw new Error('User not found or belongs to another franchise');
    }

    await prisma.user.delete({
        where: { email: email },
    });

    await logActivity({
        action: 'user.delete',
        entityType: 'user',
        entityId: user.id,
        description: `Staff account deleted: ${user.name} (${user.email})`,
        shopIdOverride: user.shop_id ?? undefined,
    });

}