'use server';
import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhereSingleShop } from '@/lib/getShopScope';
import { sharedOrOwnWhere } from '@/lib/syncSettings';

export default async function FetchProduct(overrideShopId?: number) {
  const scope = await getShopScope();
  // POS/purchase screens need exactly one shop's stock+price per product.
  // A super admin defaults to Head Office but can pass an override (from
  // a shop-switcher control) to view/act as a specific franchise instead.
  const effectiveScope = scope.isSuperAdmin && overrideShopId
    ? { ...scope, shopId: overrideShopId }
    : scope;
  const shopFilter = scopeWhereSingleShop(effectiveScope);

  const products = await prisma.tbl_product.findMany({
    // Shared products (shop_id null) plus this shop's own private ones —
    // never another shop's private products, even for Head Office.
    where: sharedOrOwnWhere(effectiveScope),
    include: {
      inventories: { where: shopFilter },
      prices: { where: shopFilter },
      special_offers: { where: shopFilter },
      tier_prices: { where: shopFilter },
      tax: true,
      attributes: true,
    }
  });
  
  return products.map(product => ({
    ...product,
    packet_size: product.packet_size ? Number(product.packet_size) : 0,
    inventories: product.inventories.map((inv) => ({
      ...inv,
      product_quantity: Number(inv.product_quantity),
      notify_quantity: inv.notify_quantity != null ? Number(inv.notify_quantity) : null,
    })),
    prices: product.prices.map((p) => ({
      ...p,
      buying_price: Number(p.buying_price),
      selling_price: Number(p.selling_price),
    })),
    special_offers: product.special_offers.map((o) => ({
      ...o,
      offer_price: o.offer_price != null ? Number(o.offer_price) : null,
    })),
    tier_prices: product.tier_prices.map((t) => ({
      ...t,
      tier_price: Number(t.tier_price),
      quantity_above: Number(t.quantity_above),
    })),
    tax: product.tax ? { ...product.tax, tax_rate: Number(product.tax.tax_rate) } : null,
  }));
}