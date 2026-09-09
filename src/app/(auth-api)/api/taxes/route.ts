import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";
import { sharedOrOwnWhere } from "@/lib/syncSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scope = await getShopScope();
    const taxes = await prisma.tbl_tax.findMany({ where: sharedOrOwnWhere(scope) });

    return NextResponse.json({ success: true, data: taxes });
  } catch (error) {
    console.error("Error fetching taxes:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch taxes: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
