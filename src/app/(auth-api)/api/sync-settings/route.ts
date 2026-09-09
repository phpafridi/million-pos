import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.tbl_sync_setting.findMany({ orderBy: { sync_setting_id: "asc" } });
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error fetching sync settings:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch sync settings: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only Head Office can change sync settings" }, { status: 403 });
    }

    const body = await req.json();
    const data_type = String(body.data_type || "");
    const is_synced = Boolean(body.is_synced);

    if (!data_type) {
      return NextResponse.json({ success: false, error: "data_type is required" }, { status: 400 });
    }

    const setting = await prisma.tbl_sync_setting.update({
      where: { data_type },
      data: { is_synced },
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error("Error updating sync setting:", error);
    return NextResponse.json({ success: false, error: `Failed to update sync setting: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
