import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";
import { sharedOrOwnWhere } from "@/lib/syncSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scope = await getShopScope();
    const categories = await prisma.tbl_category.findMany({ where: sharedOrOwnWhere(scope) });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return NextResponse.json({ success: false, error: `Failed to load categories: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
