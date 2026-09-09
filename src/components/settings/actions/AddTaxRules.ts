'use server'
import { prisma } from "@/lib/prisma"
import { getShopScope } from "@/lib/getShopScope"
import { shopIdForNewRecord } from "@/lib/syncSettings"

type AddTax = {
    title: string,
    rate: number,
    taxType: number
}


export async function AddTaxRules({ title, rate, taxType }: AddTax) {
    try {
        const scope = await getShopScope()
        const shop_id = await shopIdForNewRecord('tax_rules', scope, scope.shopId ?? 1)

        const TaxRule = await prisma.tbl_tax.create({
            data: {
                shop_id,
                tax_title: title,
                tax_rate: rate,
                tax_type: taxType
            }
        })

        return { success: true, tax_id: TaxRule.tax_id }; // ✅ plain object
    } catch (error: any) {
        return { success: false, error: error.message };
    }



}
