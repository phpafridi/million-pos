import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only the CEO/head-office account can edit franchises" }, { status: 403 });
    }

    const { id } = await params;
    const shop_id = Number(id);
    const body = await req.json();

    const data: { shop_name?: string; address?: string; phone?: string; email?: string; is_active?: boolean; is_warehouse?: boolean } = {};
    if (body.shop_name !== undefined) data.shop_name = String(body.shop_name);
    if (body.address !== undefined) data.address = String(body.address);
    if (body.phone !== undefined) data.phone = String(body.phone);
    if (body.email !== undefined) data.email = String(body.email);
    if (body.is_active !== undefined) data.is_active = Boolean(body.is_active);
    if (body.is_warehouse !== undefined) data.is_warehouse = Boolean(body.is_warehouse);

    const shop = await prisma.tbl_shop.update({ where: { shop_id }, data });

    return NextResponse.json({ success: true, data: shop });
  } catch (error) {
    console.error("Error updating shop:", error);
    return NextResponse.json({ success: false, error: `Failed to update franchise: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
