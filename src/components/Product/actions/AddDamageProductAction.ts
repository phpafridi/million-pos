'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'

export async function AddDamageProductAction(formData: FormData) {
    try {
        const product_id = Number(formData.get('product_id'))
        const qty = Number(formData.get('qty'))
        const note = (formData.get('note') as string) || ''
        const decrease = formData.get('decrease') === '1'

        if (!product_id || !qty) {
            return { success: false, message: 'Missing required fields' }
        }

        // ✅ Fetch full product details
        const product = await prisma.tbl_product.findUnique({
            where: { product_id },
            include: { subcategory: { include: { category: true } } }, // if relations exist
        })

        if (!product) {
            return { success: false, message: 'Product not found' }
        }

        const scope = await getShopScope()
        const shop_id = scopeShopIdForWrite(scope)

        // ✅ build damage product entry
        const damageProduct = await prisma.tbl_damage_product.create({
            data: {
                product_id,
                shop_id,
                product_code: product.product_code, // must be String in both schemas
                product_name: product.product_name,
                category: product.subcategory?.category?.category_name || 'Unknown',
                qty: Number(qty), // Convert to number
                note,
                decrease: decrease ? 1 : 0,
                date: new Date().toISOString(), // or format as needed
            },
        })

        // ✅ decrease stock if requested
        if (decrease) {
            const inventory = await prisma.tbl_inventory.findFirst({
                where: { product_id, shop_id },
            })

            if (!inventory) {
                throw new Error("Inventory not found")
            }

            // Convert both values to numbers before calculation
            const currentQuantity = Number(inventory.product_quantity)
            const newQuantity = currentQuantity - Number(qty)
            
            await prisma.tbl_inventory.update({
                where: { inventory_id: inventory.inventory_id },
                data: { 
                    product_quantity: newQuantity 
                },
            })
        }

        await logActivity({
            action: 'damage.record',
            entityType: 'damage_product',
            entityId: damageProduct.damage_product_id,
            description: `Damage/write-off recorded for "${product.product_name}" (${product.product_code}) — qty ${qty}${decrease ? ', stock decreased' : ''}${note ? `: ${note}` : ''}`,
            shopIdOverride: shop_id,
        })

        return { success: true, data: damageProduct }
    } catch (error: any) {
        console.error(error)
        return { success: false, message: error.message }
    }
}