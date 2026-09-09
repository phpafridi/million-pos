'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite } from '@/lib/getShopScope'
import { shopIdForNewRecord } from '@/lib/syncSettings'

export async function AddSupplier(formData: FormData) {
  const company_name = formData.get('company_name') as string
  const supplier_name = formData.get('supplier_name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  const share_with_warehouses = formData.get('share_with_warehouses') === 'true'

  try {
    const scope = await getShopScope()

    // Warehouses get an extra choice on top of the usual sync setting:
    // share this supplier with every other warehouse (not franchises),
    // instead of keeping it private to just this one warehouse.
    let shop_id: number | null
    let warehouse_only = false
    if (scope.isWarehouse && share_with_warehouses) {
      shop_id = null
      warehouse_only = true
    } else {
      shop_id = await shopIdForNewRecord('suppliers', scope, scopeShopIdForWrite(scope))
    }

    await prisma.tbl_supplier.create({
      data: {
        shop_id,
        warehouse_only,
        company_name,
        supplier_name,
        email,
        phone,
        address,
      },
    })

    return {
      success: true,
      message: '🎉 Supplier added successfully!',
    }
  } catch (error: any) {
    console.error('Error adding supplier:', error)
    return {
      success: false,
      message: '❌ Failed to add supplier: ' + (error?.message ?? 'Unknown error'),
    }
  }
}
