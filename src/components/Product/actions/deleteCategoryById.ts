'use server';

import { prisma } from '@/lib/prisma';
import { getShopScope } from '@/lib/getShopScope';
import { assertCanModifyRecord } from '@/lib/syncSettings';

export async function deleteCategoryById(id: number) {

    const category = await prisma.tbl_category.findUnique({
        where: { category_id : id },
    });

    if (!category) {
        throw new Error('Category not found');
    }

    const scope = await getShopScope();
    assertCanModifyRecord(scope, category.shop_id);

    await prisma.tbl_category.delete({
        where: { category_id: id },
    });

    

}
