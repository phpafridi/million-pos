import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const shop = await prisma.tbl_shop.findUnique({
      where: { login_slug: slug },
      select: { shop_id: true, shop_name: true, is_active: true },
    });
    if (!shop) {
      return NextResponse.json({ success: false, error: "No franchise found for this login link" }, { status: 404 });
    }

    // This shop's own logo if it has one, otherwise fall back to Head
    // Office's shared logo — same resolution as the dashboard header, just
    // done here since nobody is logged in yet on this page.
    const ownProfile = await prisma.tbl_business_profile.findFirst({ where: { shop_id: shop.shop_id } });
    const hqProfile = ownProfile?.logo ? null : await prisma.tbl_business_profile.findFirst({ where: { shop_id: 1 } });
    const logo = ownProfile?.logo || hqProfile?.logo || null;

    return NextResponse.json({ success: true, data: { ...shop, logo } });
  } catch (error) {
    console.error("Error looking up shop by slug:", error);
    return NextResponse.json({ success: false, error: `Failed to look up franchise: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
