import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { getShopScope, scopeWhere, canManageUsers } from "@/lib/getShopScope";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();

    const file = data.get("file") as File | null;
    const name = data.get("name") as string;
    const old_email = data.get("old_email") as string; // original email
    const email = data.get("email") as string;
    const password1 = data.get("password") as string;
    const user_type = data.get("user_type") as string;
    const menus = JSON.parse(data.get("menus") as string) as string[];

    // Handle file upload if provided
    let imageName: string | null = null;
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const path = join(process.cwd(), "uploads", file.name);
      await writeFile(path, buffer);
      imageName = file.name;
    }

    // Hash password only if provided
    const hashedPassword = password1 ? await bcrypt.hash(password1, 10) : undefined;

    const scope = await getShopScope();
    if (!canManageUsers(scope)) {
      return NextResponse.json({ error: "Only a franchise admin or Head Office can update staff accounts" }, { status: 403 });
    }
    const targetUser = await prisma.user.findFirst({
      where: { email: old_email, ...scopeWhere(scope) },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found or belongs to another franchise" }, { status: 404 });
    }

    // Update user
    const update_user = await prisma.user.update({
      where: { email : old_email },
      data: {
        name,
        email,
        ...(hashedPassword && { password: hashedPassword }),
        ...(imageName && { image: imageName }),
        flag: user_type,
      },
    });

    if (!update_user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Admin (flag=1) accounts always have full, unconditional access — no
    // granular role rows at all. Clean up any leftover rows from when this
    // account might have been a restricted staff member before being
    // promoted, so the data stays correct even for code that reads
    // user_roles directly instead of going through the flag='1' bypass.
    await prisma.user_role.deleteMany({ where: { email } });

    if (update_user.flag === "1") {
      return NextResponse.json({ msg: "Admin Updated" });
    }

    // Insert new roles
    if (menus.length > 0) {
      await prisma.user_role.createMany({
        data: menus.map((menu) => ({
          email,
          menu_name: menu,
        })),
      });
    }

    return NextResponse.json({ msg: "User Updated" });
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: `Failed to update user: ${error?.message || error}` }, { status: 500 });
  }
}
