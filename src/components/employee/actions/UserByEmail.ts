'use server'

import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhere } from '@/lib/getShopScope';

export async function UserByEmail(email: string) {

    const scope = await getShopScope();
    const user = await prisma.user.findFirst({
        where: { email: decodeURIComponent(email), ...scopeWhere(scope) },
        include: {
            user_roles: true
        }
    });

    return user;

}