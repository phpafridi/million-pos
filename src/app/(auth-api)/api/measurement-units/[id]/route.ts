import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";
import { assertCanModifyRecord } from "@/lib/syncSettings";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const unit_id = Number(id);
    const body = await req.json();

    const existing = await prisma.tbl_measurement_unit.findUnique({ where: { unit_id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Measurement unit not found" }, { status: 404 });
    }
    const scope = await getShopScope();
    assertCanModifyRecord(scope, existing.shop_id);

    const data: {
      unit_label?: string;
      is_packet_based?: boolean;
      sort_order?: number;
      is_active?: boolean;
    } = {};

    if (body.unit_label !== undefined) data.unit_label = String(body.unit_label).trim();
    if (body.is_packet_based !== undefined) data.is_packet_based = Boolean(body.is_packet_based);
    if (body.sort_order !== undefined) data.sort_order = Number(body.sort_order);
    if (body.is_active !== undefined) data.is_active = Boolean(body.is_active);

    const unit = await prisma.tbl_measurement_unit.update({
      where: { unit_id },
      data,
    });

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error("Error updating measurement unit:", error);
    return NextResponse.json({ success: false, error: `Failed to update measurement unit: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const unit_id = Number(id);

    const existing = await prisma.tbl_measurement_unit.findUnique({ where: { unit_id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Measurement unit not found" }, { status: 404 });
    }
    const scope = await getShopScope();
    assertCanModifyRecord(scope, existing.shop_id);

    // Soft delete: products already using this unit keep working, it just
    // disappears from the "add product" dropdown going forward.
    const unit = await prisma.tbl_measurement_unit.update({
      where: { unit_id },
      data: { is_active: false },
    });

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error("Error deleting measurement unit:", error);
    return NextResponse.json({ success: false, error: `Failed to delete measurement unit: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
