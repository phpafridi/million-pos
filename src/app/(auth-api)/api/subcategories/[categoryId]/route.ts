import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";
import { sharedOrOwnWhere } from "@/lib/syncSettings";

export const dynamic = "force-dynamic";

// Do NOT over-type `context`. Just let TS infer it.
export async function GET(
  req: Request,
  { params }: { params: any }   // 👈 loose typing here
) {
  const id = Number(params.categoryId);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const scope = await getShopScope();
    const subcategories = await prisma.tbl_subcategory.findMany({
      where: { category_id: id, ...sharedOrOwnWhere(scope) },
    });

    return NextResponse.json({ success: true, data: subcategories });
  } catch (error) {
    console.error("❌ Error fetching subcategories:", error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch subcategories: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
