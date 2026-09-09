'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'

export async function FetchCategory() {
    const scope = await getShopScope()
    const categories = await prisma.tbl_category.findMany({
        where: sharedOrOwnWhere(scope),
    });
    return categories;

}
