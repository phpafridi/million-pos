import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";
import { sharedOrOwnWhere, shopIdForNewRecord } from "@/lib/syncSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scope = await getShopScope();
    const units = await prisma.tbl_measurement_unit.findMany({
      where: { is_active: true, ...sharedOrOwnWhere(scope) },
      orderBy: { sort_order: "asc" },
    });

    return NextResponse.json({ success: true, data: units });
  } catch (error) {
    console.error("Error fetching measurement units:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch measurement units: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const scope = await getShopScope();
    const shop_id = await shopIdForNewRecord('measurement_units', scope, scope.shopId ?? 1);

    const body = await req.json();
    const unit_code = String(body.unit_code || "").trim().toLowerCase().replace(/\s+/g, "_");
    const unit_label = String(body.unit_label || "").trim();
    const is_packet_based = Boolean(body.is_packet_based);
    const sort_order = Number(body.sort_order) || 0;

    if (!unit_code || !unit_label) {
      return NextResponse.json({ success: false, error: "unit_code and unit_label are required" }, { status: 400 });
    }

    // unit_code is only unique per shop_id (shared units use shop_id =
    // NULL) — Prisma's compound-key findUnique type requires a non-null
    // shop_id (since multiple NULL rows don't violate a unique index at
    // the DB level, so it can't be used as a guaranteed-unique lookup).
    const existing = shop_id !== null
      ? await prisma.tbl_measurement_unit.findUnique({
          where: { shop_id_unit_code: { shop_id, unit_code } },
        })
      : await prisma.tbl_measurement_unit.findFirst({
          where: { shop_id: null, unit_code },
        });
    if (existing) {
      return NextResponse.json({ success: false, error: "A measurement unit with this code already exists" }, { status: 409 });
    }

    const unit = await prisma.tbl_measurement_unit.create({
      data: { shop_id, unit_code, unit_label, is_packet_based, sort_order },
    });

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error("Error creating measurement unit:", error);
    return NextResponse.json({ success: false, error: `Failed to create measurement unit: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
