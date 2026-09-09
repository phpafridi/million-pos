'use server';

import { prisma } from '@/lib/prisma';
import { getShopScope } from '@/lib/getShopScope';
import { assertCanModifyRecord } from '@/lib/syncSettings';

export async function deleteTaxRuleId(id: number) {

    const tax = await prisma.tbl_tax.findUnique({
        where: { tax_id : id },
    });

    if (!tax) {
        throw new Error('Tax not found');
    }

    const scope = await getShopScope();
    assertCanModifyRecord(scope, tax.shop_id);

    await prisma.tbl_tax.delete({
        where: { tax_id: id },
    });

    

}
