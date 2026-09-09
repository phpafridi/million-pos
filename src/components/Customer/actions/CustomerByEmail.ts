'use server'

import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhere } from '@/lib/getShopScope';

export async function CustomerByEmail(email: string) {
    const scope = await getShopScope()

    const customer = await prisma.tbl_customer.findFirst({
        where: { email: decodeURIComponent(email), ...scopeWhere(scope) },
    });

    return customer;
}
