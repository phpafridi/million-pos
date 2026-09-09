import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables: { table_name: string }[] = await prisma.$queryRawUnsafe(
      `SELECT TABLE_NAME as table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
    );

    const backup: Record<string, unknown[]> = {};
    for (const t of tables) {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM \`${t.table_name}\``);
      backup[t.table_name] = rows as unknown[];
    }

    const payload = JSON.stringify(
      { created_at: new Date().toISOString(), tables: backup },
      (_key, value) => (typeof value === "bigint" ? value.toString() : value)
    );

    return new NextResponse(payload, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    return NextResponse.json({ success: false, error: "Backup export failed" }, { status: 500 });
  }
}
