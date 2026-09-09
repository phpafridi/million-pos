import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getShopScope, scopeWhereSingleShop } from "@/lib/getShopScope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scope = await getShopScope();
    const shopFilter = scopeWhereSingleShop(scope);

    // ── 1. Product-level expiry (existing logic) ──────────────────────────
    const productsWithExpiration = await prisma.tbl_product.findMany({
      where: { has_expiration: true, expiration_date: { not: null } },
      include: { inventories: { where: shopFilter } },
    });

    const expiringProducts = productsWithExpiration.filter((product) => {
      if (!product.expiration_date) return false;
      const daysUntil = Math.ceil(
        (new Date(product.expiration_date).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const alertDays = product.days_before_expiry_alert || 30;
      return daysUntil > 0 && daysUntil <= alertDays;
    });

    const expiredProducts = productsWithExpiration.filter((product) => {
      if (!product.expiration_date) return false;
      return new Date(product.expiration_date) < today;
    });

    // ── 2. Batch-level expiry (NEW) ───────────────────────────────────────
    const batches: any[] = await prisma.$queryRaw`
      SELECT
        b.batch_id,
        b.batch_number,
        b.product_id,
        b.product_name,
        b.product_code,
        CAST(b.qty_remaining AS DOUBLE) AS qty_remaining,
        b.expiry_date,
        p.days_before_expiry_alert
      FROM tbl_purchase_batch b
      JOIN tbl_product p ON p.product_id = b.product_id
      WHERE b.is_active = true
        AND b.qty_remaining > 0
        AND b.expiry_date IS NOT NULL
        AND b.shop_id = ${shopFilter.shop_id}
      ORDER BY b.expiry_date ASC
    `;

    const expiringBatches: any[] = [];
    const expiredBatches: any[] = [];

    for (const batch of batches) {
      const expDate = new Date(batch.expiry_date);
      expDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const alertDays = Number(batch.days_before_expiry_alert) || 30;

      if (daysUntil <= 0) {
        expiredBatches.push({
          batch_id: Number(batch.batch_id),
          batch_number: batch.batch_number,
          product_id: Number(batch.product_id),
          product_name: batch.product_name,
          product_code: batch.product_code,
          qty_remaining: Number(batch.qty_remaining),
          expiry_date: expDate.toISOString().slice(0, 10),
          days_remaining: daysUntil,
          is_expired: true,
        });
      } else if (daysUntil <= alertDays) {
        expiringBatches.push({
          batch_id: Number(batch.batch_id),
          batch_number: batch.batch_number,
          product_id: Number(batch.product_id),
          product_name: batch.product_name,
          product_code: batch.product_code,
          qty_remaining: Number(batch.qty_remaining),
          expiry_date: expDate.toISOString().slice(0, 10),
          days_remaining: daysUntil,
          is_expired: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        expiring:        expiringProducts,
        expired:         expiredProducts,
        expiringBatches,
        expiredBatches,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to fetch expiry alerts: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
