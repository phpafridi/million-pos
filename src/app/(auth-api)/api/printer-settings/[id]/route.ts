import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const printer_id = Number(id);
    const body = await req.json();

    const existing = await prisma.tbl_printer_setting.findUnique({ where: { printer_id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Printer setting not found" }, { status: 404 });
    }
    const scope = await getShopScope();
    if (!scope.isSuperAdmin && scope.shopId !== existing.shop_id) {
      return NextResponse.json({ success: false, error: "This printer setting belongs to a different franchise" }, { status: 403 });
    }

    const data: {
      printer_name?: string;
      paper_width_mm?: number;
      applies_to?: string;
      is_default?: boolean;
      layout_json?: string;
    } = {};

    if (body.printer_name !== undefined) data.printer_name = String(body.printer_name).trim();
    if (body.paper_width_mm !== undefined) data.paper_width_mm = Number(body.paper_width_mm);
    if (body.applies_to !== undefined) data.applies_to = String(body.applies_to);
    if (body.layout !== undefined) data.layout_json = JSON.stringify(body.layout);

    if (body.is_default) {
      // Only un-default this shop's OTHER printers — not every franchise's.
      await prisma.tbl_printer_setting.updateMany({ where: { shop_id: existing.shop_id }, data: { is_default: false } });
      data.is_default = true;
    }

    const printer = await prisma.tbl_printer_setting.update({
      where: { printer_id },
      data,
    });

    return NextResponse.json({ success: true, data: printer });
  } catch (error) {
    console.error("Error updating printer setting:", error);
    return NextResponse.json({ success: false, error: `Failed to update printer setting: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const printer_id = Number(id);

    const existing = await prisma.tbl_printer_setting.findUnique({ where: { printer_id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Printer setting not found" }, { status: 404 });
    }
    const scope = await getShopScope();
    if (!scope.isSuperAdmin && scope.shopId !== existing.shop_id) {
      return NextResponse.json({ success: false, error: "This printer setting belongs to a different franchise" }, { status: 403 });
    }

    await prisma.tbl_printer_setting.delete({ where: { printer_id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting printer setting:", error);
    return NextResponse.json({ success: false, error: `Failed to delete printer setting: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
