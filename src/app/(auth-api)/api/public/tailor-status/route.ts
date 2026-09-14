import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  in_process: "In Process",
  ready: "Ready for Pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Public status-lookup endpoint for an external website: a customer logs
 * in there with their email, that site calls this with the same email,
 * and gets back any tailor orders on file for them here — so they can
 * show "your order is ready" without needing a login on this system.
 *
 * Protected by a shared API key (set TAILOR_STATUS_API_KEY in .env) since
 * this is publicly reachable and returns customer order data — without
 * a key, anyone could look up any email's order status.
 *
 * Usage: GET /api/public/tailor-status?email=customer@example.com
 *    or: GET /api/public/tailor-status?phone=03001234567
 *    or both — email is tried first, phone is used as a fallback if no
 *    customer is found by email (a tailor order might have been created
 *    with a different or no email, but the phone number is more likely
 *    to match what's on file here).
 * Header: x-api-key: <TAILOR_STATUS_API_KEY>
 */
export async function GET(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = process.env.TAILOR_STATUS_API_KEY;

    if (!expectedKey) {
      return NextResponse.json(
        { success: false, error: "This endpoint is not configured yet. Set TAILOR_STATUS_API_KEY in the server's .env file." },
        { status: 503 }
      );
    }
    if (apiKey !== expectedKey) {
      return NextResponse.json({ success: false, error: "Invalid or missing API key" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase();
    const phone = searchParams.get("phone")?.trim();
    if (!email && !phone) {
      return NextResponse.json({ success: false, error: "Provide an email and/or phone query parameter" }, { status: 400 });
    }

    let customer = null;
    if (email) {
      customer = await prisma.tbl_customer.findFirst({
        where: { email: { equals: email } },
        select: {
          customer_id: true,
          customer_name: true,
          phone: true,
        },
      });
    }
    if (!customer && phone) {
      customer = await prisma.tbl_customer.findFirst({
        where: { phone: { equals: phone } },
        select: {
          customer_id: true,
          customer_name: true,
          phone: true,
        },
      });
    }

    if (!customer) {
      return NextResponse.json({ success: true, found: false, orders: [] });
    }

    const orders = await prisma.tbl_tailor_order.findMany({
      where: { customer_id: customer.customer_id },
      orderBy: { order_date: "desc" },
      select: {
        order_number: true,
        garment_type: true,
        quantity: true,
        status: true,
        order_date: true,
        promised_date: true,
        ready_date: true,
        delivered_date: true,
        price: true,
        advance_paid: true,
        shop: { select: { shop_name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      found: true,
      customer: {
        name: customer.customer_name,
        phone: customer.phone,
      },
      orders: orders.map((o) => ({
        order_number: o.order_number,
        franchise: o.shop.shop_name,
        garment_type: o.garment_type,
        quantity: o.quantity,
        status: o.status,
        status_label: STATUS_LABELS[o.status] || o.status,
        order_date: o.order_date.toISOString(),
        promised_date: o.promised_date ? o.promised_date.toISOString() : null,
        ready_date: o.ready_date ? o.ready_date.toISOString() : null,
        delivered_date: o.delivered_date ? o.delivered_date.toISOString() : null,
        total_price: Number(o.price),
        advance_paid: Number(o.advance_paid),
        balance_due: Number(o.price) - Number(o.advance_paid),
      })),
    });
  } catch (error) {
    console.error("Error in public tailor-status lookup:", error);
    return NextResponse.json(
      { success: false, error: `Failed to look up status: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
