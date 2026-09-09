import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";
import { seedShopDefaults } from "@/lib/seedShopDefaults";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await getShopScope();
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type"); // "warehouse" | "franchise" | null (all)

    const where: any = scope.isSuperAdmin ? {} : { shop_id: scope.shopId ?? -1 };
    if (typeFilter === "warehouse") where.is_warehouse = true;
    if (typeFilter === "franchise") where.is_warehouse = false;

    // Everyone can see the list of shops (needed for dropdowns like "assign
    // user to shop"), but only super admins get the full management view;
    // regular users are limited to their own shop for safety.
    const shops = await prisma.tbl_shop.findMany({
      where,
      orderBy: { shop_id: "asc" },
    });

    return NextResponse.json({ success: true, data: shops });
  } catch (error) {
    console.error("Error fetching shops:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch shops: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only the CEO/head-office account can register a new franchise" }, { status: 403 });
    }

    const body = await req.json();
    const shop_name = String(body.shop_name || "").trim();
    const shop_code = String(body.shop_code || "").trim().toUpperCase().replace(/\s+/g, "-");
    const address = body.address ? String(body.address) : null;
    const phone = body.phone ? String(body.phone) : null;
    const email = body.email ? String(body.email) : null;
    const is_warehouse = Boolean(body.is_warehouse);

    if (!shop_name || !shop_code) {
      return NextResponse.json({ success: false, error: "shop_name and shop_code are required" }, { status: 400 });
    }

    const existing = await prisma.tbl_shop.findUnique({ where: { shop_code } });
    if (existing) {
      return NextResponse.json({ success: false, error: "A shop with this code already exists" }, { status: 409 });
    }

    // Derive a URL-safe login slug from the shop code (e.g. "BARA-01" -> "bara01"),
    // falling back to appending a number if that slug is somehow already taken.
    let baseSlug = shop_code.toLowerCase().replace(/[^a-z0-9]+/g, "");
    let login_slug = baseSlug;
    let suffix = 1;
    while (await prisma.tbl_shop.findUnique({ where: { login_slug } })) {
      login_slug = `${baseSlug}${++suffix}`;
    }

    const shop = await prisma.tbl_shop.create({
      data: { shop_name, shop_code, address, phone, email, login_slug, is_warehouse },
    });

    // New franchise inherits every existing product's default pricing (0)
    // so it shows up in their inventory immediately at qty 0 — they only
    // need to set price and receive stock, never re-create the product.
    const products = await prisma.tbl_product.findMany({ select: { product_id: true } });
    if (products.length > 0) {
      await prisma.tbl_inventory.createMany({
        data: products.map((p) => ({ product_id: p.product_id, shop_id: shop.shop_id, product_quantity: 0 })),
      });
      await prisma.tbl_product_price.createMany({
        data: products.map((p) => ({ product_id: p.product_id, shop_id: shop.shop_id, buying_price: 0, selling_price: 0 })),
      });
    }

    // Every franchise starts with its own walk-in customer, wholesale
    // supplier, and (shared, platform-wide) a "No Tax" rule and "nil"
    // category so they can add products/make a sale immediately without
    // first having to set these up manually.
    await seedShopDefaults(prisma, shop.shop_id);

    // Auto-create the shop's owner login with full, unrestricted access
    // (no granular user_roles rows = every menu shows, same as a
    // franchise/warehouse owner should have from day one) — instead of
    // leaving Head Office to build this account by hand afterward via Add
    // Employee, where it's easy to miss a checkbox and end up with a
    // login that's silently missing something like Manage Purchase.
    const ownerEmail = `${login_slug}@${is_warehouse ? 'warehouse' : 'shop'}.local`;
    const ownerPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);
    await prisma.user.create({
      data: {
        name: `${shop_name} Owner`,
        email: ownerEmail,
        password: hashedPassword,
        flag: '1', // shop admin — full access within their own shop
        shop_id: shop.shop_id,
        is_super_admin: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: shop,
      owner_login: { email: ownerEmail, password: ownerPassword },
    });
  } catch (error) {
    console.error("Error creating shop:", error);
    return NextResponse.json({ success: false, error: `Failed to register franchise: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
