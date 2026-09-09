import { NextResponse } from "next/server";
import { getShopScope } from "@/lib/getShopScope";
import { sendStatusEmail, sendStatusWhatsApp } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only Head Office can send a test notification" }, { status: 403 });
    }

    const body = await req.json();
    const channel = String(body.channel || "");
    const to = String(body.to || "").trim();

    if (!to) {
      return NextResponse.json({ success: false, error: "Enter a destination email or phone number first" }, { status: 400 });
    }

    if (channel === "email") {
      const result = await sendStatusEmail(to, "Test notification from Invexa", "This is a test message to confirm your SMTP settings are working correctly.");
      return NextResponse.json({ success: result.sent, error: result.error });
    }

    if (channel === "whatsapp") {
      const result = await sendStatusWhatsApp(to, "This is a test message to confirm your WhatsApp API settings are working correctly.");
      return NextResponse.json({ success: result.sent, error: result.error });
    }

    return NextResponse.json({ success: false, error: "Unknown channel" }, { status: 400 });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json({ success: false, error: `Failed to send test notification: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
