import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getShopScope } from "@/lib/getShopScope";
import { assertCanModifyRecord } from "@/lib/syncSettings";

// force context to any to bypass Next.js ParamCheck issue
export async function POST(
  req: NextRequest,
  context: any
): Promise<NextResponse> {
  const productId = Number(context.params?.id);
  const body = await req.json();
  const currentStatus = Number(body.status);

  try {
    const existing = await prisma.tbl_product.findUnique({ where: { product_id: productId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }
    const scope = await getShopScope();
    assertCanModifyRecord(scope, existing.shop_id);

    const updatedProduct = await prisma.tbl_product.update({
      where: { product_id: productId },
      data: { status: currentStatus === 1 ? 0 : 1 },
    });

    return NextResponse.json({
      success: true,
      status: updatedProduct.status,
    });
  } catch (error) {
    console.error("Error updating product status:", error);
    return NextResponse.json(
      { success: false, error: `Failed to update status: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
