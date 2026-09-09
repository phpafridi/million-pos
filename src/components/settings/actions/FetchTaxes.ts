'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'

export type Tax = {
  tax_id: number
  tax_title: string
  tax_rate: number  // Should be number, not Decimal
  tax_type: number
}

export async function FetchTaxes(): Promise<Tax[]> {
  try {
    const scope = await getShopScope()
    const taxes = await prisma.tbl_tax.findMany({
      where: sharedOrOwnWhere(scope),
      orderBy: {
        tax_id: 'desc',
      },
    })

    // Convert Decimal to number
    return taxes.map((tax) => ({
      tax_id: tax.tax_id,
      tax_title: tax.tax_title,
      tax_rate: Number(tax.tax_rate), // Convert Decimal to number
      tax_type: tax.tax_type,
    }))
  } catch (error) {
    console.error('Error fetching taxes:', error)
    return []
  }
}