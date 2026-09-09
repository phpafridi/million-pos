'use server';
import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhere } from '@/lib/getShopScope';

export default async function FetchDamageProducts() {
    const scope = await getShopScope();
    const DamageProducts = await prisma.tbl_damage_product.findMany({
        where: scopeWhere(scope),
        include: {
            product: {
                select: {
                    packet_size: true,
                    measurement_units: true
                }
            }
        }
    });
    
    return DamageProducts.map(item => ({
        ...item,
        packet_size: item.product?.packet_size ?? 0,
        measurement_units: item.product?.measurement_units || 'pcs'
    }));
}