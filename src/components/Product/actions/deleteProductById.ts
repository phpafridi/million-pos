'use server';

import { prisma } from '@/lib/prisma';
import { getShopScope } from '@/lib/getShopScope';
import { assertCanModifyRecord } from '@/lib/syncSettings';

export async function deleteProductById(id: number) {

    const product = await prisma.tbl_product.findUnique({
        where: { product_id: id },
    });

    if (!product) {
        throw new Error('Product not found');
    }

    const scope = await getShopScope();
    assertCanModifyRecord(scope, product.shop_id);

    await prisma.tbl_product.delete({
        where: { product_id: id },
    });

    

}