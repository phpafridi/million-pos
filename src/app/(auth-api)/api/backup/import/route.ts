import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tables = (body.tables || {}) as Record<string, Record<string, unknown>[]>;

    if (Object.keys(tables).length === 0) {
      return NextResponse.json({ success: false, error: "Backup file has no table data" }, { status: 400 });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=0`);

        for (const [tableName, rows] of Object.entries(tables)) {
          await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${tableName}\``);
          if (!rows || rows.length === 0) continue;

          const columns = Object.keys(rows[0]);
          const colList = columns.map((c) => `\`${c}\``).join(", ");
          const placeholders = columns.map(() => "?").join(", ");

          for (const row of rows) {
            const values = columns.map((c) => row[c]);
            await tx.$executeRawUnsafe(
              `INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`,
              ...values
            );
          }
        }

        await tx.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=1`);
      },
      { timeout: 120000, maxWait: 10000 }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Backup import failed:", error);
    return NextResponse.json({ success: false, error: "Backup import failed. No changes may have been applied — check the file and try again." }, { status: 500 });
  }
}
