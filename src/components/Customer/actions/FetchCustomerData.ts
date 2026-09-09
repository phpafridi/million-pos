'use server';
import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhereSingleShop } from '@/lib/getShopScope';
import { sharedOrOwnWhere } from '@/lib/syncSettings';

export async function FetchCustomerData(overrideShopId?: number) {
    const scope = await getShopScope();
    const effectiveScope = scope.isSuperAdmin && overrideShopId
        ? { ...scope, shopId: overrideShopId }
        : scope;
    const customers = prisma.tbl_customer.findMany({ where: sharedOrOwnWhere(effectiveScope) });
    return customers;
}
