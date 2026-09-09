'use server';

import { prisma } from '@/lib/prisma';
import { getShopScope } from '@/lib/getShopScope';
import { assertCanModifyRecord } from '@/lib/syncSettings';

export async function deleteSubCategoryById(id: number) {

    const subcategory = await prisma.tbl_subcategory.findUnique({
        where: { subcategory_id : id },
    });

    if (!subcategory) {
        throw new Error('Category not found');
    }

    const scope = await getShopScope();
    assertCanModifyRecord(scope, subcategory.shop_id);

    await prisma.tbl_subcategory.delete({
        where: { subcategory_id: id },
    });

    

}
