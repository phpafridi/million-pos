'use server' 
import { prisma } from "@/lib/prisma"
import { getShopScope } from "@/lib/getShopScope"
import { shopIdForNewRecord } from "@/lib/syncSettings"
export async function AddSubCategory(category_id: number, subcategory_name: string) {
    try {
        const scope = await getShopScope()
        const shop_id = await shopIdForNewRecord('categories', scope, scope.shopId ?? 1)

        const subCategory = await prisma.tbl_subcategory.create({
            data: {
                category_id,
                shop_id,
                subcategory_name,
                created_datetime: new Date(),
            },
        });

        return { success: true, category_id: subCategory.category_id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
