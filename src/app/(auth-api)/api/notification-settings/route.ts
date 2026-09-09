import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.tbl_notification_config.findUnique({ where: { config_id: 1 } });
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json({ success: false, error: `Failed to fetch notification settings: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const scope = await getShopScope();
    if (!scope.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only Head Office can change notification settings" }, { status: 403 });
    }
    const body = await req.json();

    const config = await prisma.tbl_notification_config.upsert({
      where: { config_id: 1 },
      update: {
        notify_email_enabled: Boolean(body.notify_email_enabled),
        notify_whatsapp_enabled: Boolean(body.notify_whatsapp_enabled),
        smtp_host: body.smtp_host || null,
        smtp_port: body.smtp_port ? Number(body.smtp_port) : 587,
        smtp_secure: Boolean(body.smtp_secure),
        smtp_user: body.smtp_user || null,
        smtp_password: body.smtp_password || null,
        smtp_from_email: body.smtp_from_email || null,
        smtp_from_name: body.smtp_from_name || null,
        whatsapp_api_url: body.whatsapp_api_url || null,
        whatsapp_api_token: body.whatsapp_api_token || null,
      },
      create: {
        config_id: 1,
        notify_email_enabled: Boolean(body.notify_email_enabled),
        notify_whatsapp_enabled: Boolean(body.notify_whatsapp_enabled),
        smtp_host: body.smtp_host || null,
        smtp_port: body.smtp_port ? Number(body.smtp_port) : 587,
        smtp_secure: Boolean(body.smtp_secure),
        smtp_user: body.smtp_user || null,
        smtp_password: body.smtp_password || null,
        smtp_from_email: body.smtp_from_email || null,
        smtp_from_name: body.smtp_from_name || null,
        whatsapp_api_url: body.whatsapp_api_url || null,
        whatsapp_api_token: body.whatsapp_api_token || null,
      },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json({ success: false, error: `Failed to update notification settings: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
