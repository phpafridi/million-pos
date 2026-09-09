'use server'

import { prisma } from '@/lib/prisma';
import { getShopScope } from '@/lib/getShopScope';
import { sharedOrOwnWhere, assertCanModifyRecord } from '@/lib/syncSettings';

export async function DeleteCustomer(CustomerCode: number) {
    try {
        const scope = await getShopScope()
        const customer = await prisma.tbl_customer.findFirst({
            where: { customer_code: CustomerCode, ...sharedOrOwnWhere(scope) },
        });

        if (!customer) {
            return { success: false, error: 'Customer not found or belongs to another franchise' };
        }
        assertCanModifyRecord(scope, customer.shop_id)

        await prisma.tbl_customer.delete({
            where: { customer_code: CustomerCode },
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
