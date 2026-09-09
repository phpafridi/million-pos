import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get("group");
    const options = await prisma.tbl_tailor_style_option.findMany({
      where: { is_active: true, ...(group ? { option_group: group } : {}) },
      orderBy: [{ option_group: "asc" }, { sort_order: "asc" }],
    });
    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error("Error fetching tailor style options:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch tailor style options: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only Head Office can manage tailor style options" }, { status: 403 });
    }
    const body = await request.json();
    const { option_group, option_value, option_label, sort_order } = body;
    if (!option_group || !option_value || !option_label) {
      return NextResponse.json({ success: false, error: "option_group, option_value, and option_label are required" }, { status: 400 });
    }
    const created = await prisma.tbl_tailor_style_option.create({
      data: {
        option_group,
        option_value: String(option_value).toLowerCase().replace(/\s+/g, "_"),
        option_label,
        sort_order: sort_order ?? 0,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("Error creating tailor style option:", error);
    return NextResponse.json({ success: false, error: `Failed to create tailor style option: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
