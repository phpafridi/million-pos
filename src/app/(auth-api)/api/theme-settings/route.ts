import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.tbl_theme_setting.findMany({
      orderBy: [{ category: "asc" }, { setting_key: "asc" }],
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error fetching theme settings:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch theme settings: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

// Bulk update: body = { updates: [{ setting_key, setting_value }, ...] }
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updates = Array.isArray(body.updates) ? body.updates : [];

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No updates provided" }, { status: 400 });
    }

    await Promise.all(
      updates.map((u: { setting_key: string; setting_value: string }) =>
        prisma.tbl_theme_setting.update({
          where: { setting_key: u.setting_key },
          data: { setting_value: u.setting_value },
        })
      )
    );

    const settings = await prisma.tbl_theme_setting.findMany({
      orderBy: [{ category: "asc" }, { setting_key: "asc" }],
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error updating theme settings:", error);
    return NextResponse.json({ success: false, error: `Failed to update theme settings: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
