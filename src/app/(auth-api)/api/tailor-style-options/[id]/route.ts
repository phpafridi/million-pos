import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only Head Office can manage tailor style options" }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const option_label = String(body.option_label || "").trim();
    if (!option_label) {
      return NextResponse.json({ success: false, error: "Label is required" }, { status: 400 });
    }
    const updated = await prisma.tbl_tailor_style_option.update({
      where: { option_id: Number(id) },
      data: { option_label },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error renaming tailor style option:", error);
    return NextResponse.json({ success: false, error: `Failed to rename tailor style option: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only Head Office can manage tailor style options" }, { status: 403 });
    }
    const { id } = await context.params;
    await prisma.tbl_tailor_style_option.delete({ where: { option_id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tailor style option:", error);
    return NextResponse.json({ success: false, error: `Failed to delete tailor style option: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
