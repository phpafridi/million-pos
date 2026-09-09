'use server'
import { prisma } from "@/lib/prisma"
import { getShopScope } from "@/lib/getShopScope"
import { shopIdForNewRecord } from "@/lib/syncSettings"

type AddCategory = {
    category_name: string,

}


export async function AddCategory({ category_name }: AddCategory) {
    try {
        const scope = await getShopScope()
        const shop_id = await shopIdForNewRecord('categories', scope, scope.shopId ?? 1)

        const Category = await prisma.tbl_category.create({
            data: {
                category_name,
                shop_id,
                created_datetime: new Date(),
            }
        })

        return { success: true, category_id: Category.category_id }; // ✅ plain object
    } catch (error: any) {
        return { success: false, error: error.message };
    }



}
