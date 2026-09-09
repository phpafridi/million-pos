'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'


export async function FetchSubCategory() {
    const scope = await getShopScope()
    const Subcategories = await prisma.tbl_subcategory.findMany({
        where: sharedOrOwnWhere(scope),
        include : {
           category : true,
        }
    });
    return Subcategories;

}
