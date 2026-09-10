'use server';
import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhereSingleShop } from '@/lib/getShopScope';
import { sharedOrOwnWhere } from '@/lib/syncSettings';

export async function FetchCustomerData(overrideShopId?: number) {
    const scope = await getShopScope();
    const effectiveScope = scope.isSuperAdmin && overrideShopId
        ? { ...scope, shopId: overrideShopId }
        : scope;
    const customers = await prisma.tbl_customer.findMany({
        where: sharedOrOwnWhere(effectiveScope),
        include: { _count: { select: { tailor_orders: true } } },
    });

    // Collapse customers that share the same email + phone + name down to
    // one entry — regardless of what caused the duplication (a shared
    // placeholder customer, genuine duplicate entry, etc.), the same
    // person shouldn't show up more than once in a picker/list. Keep
    // whichever duplicate has the lowest customer_id (the original).
    const seen = new Map<string, typeof customers[number]>();
    for (const c of customers) {
        const key = `${c.email?.toLowerCase() || ''}|${c.phone || ''}|${c.customer_name?.toLowerCase() || ''}`;
        const existing = seen.get(key);
        if (!existing || c.customer_id < existing.customer_id) {
            seen.set(key, c);
        }
    }

    return Array.from(seen.values());
}
