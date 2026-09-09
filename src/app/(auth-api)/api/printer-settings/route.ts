import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope, scopeWhere, scopeShopIdForWrite } from "@/lib/getShopScope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scope = await getShopScope();
    const printers = await prisma.tbl_printer_setting.findMany({
      where: scopeWhere(scope),
      orderBy: { printer_id: "asc" },
    });

    return NextResponse.json({ success: true, data: printers });
  } catch (error) {
    console.error("Error fetching printer settings:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch printer settings: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const scope = await getShopScope();
    const shop_id = scopeShopIdForWrite(scope);

    const body = await req.json();
    const printer_name = String(body.printer_name || "").trim();
    const paper_width_mm = Number(body.paper_width_mm) || 80;
    const applies_to = String(body.applies_to || "all");
    const layout = body.layout || {};
    const is_default = Boolean(body.is_default);

    if (!printer_name) {
      return NextResponse.json({ success: false, error: "printer_name is required" }, { status: 400 });
    }

    if (is_default) {
      // only one default printer at a time, per shop — not across every franchise
      await prisma.tbl_printer_setting.updateMany({ where: { shop_id }, data: { is_default: false } });
    }

    const printer = await prisma.tbl_printer_setting.create({
      data: {
        shop_id,
        printer_name,
        paper_width_mm,
        applies_to,
        is_default,
        layout_json: JSON.stringify(layout),
      },
    });

    return NextResponse.json({ success: true, data: printer });
  } catch (error) {
    console.error("Error creating printer setting:", error);
    return NextResponse.json({ success: false, error: `Failed to create printer setting: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
