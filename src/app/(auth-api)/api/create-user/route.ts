import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getShopScope, canManageUsers } from "@/lib/getShopScope";
import { logActivity } from "@/lib/auditLog";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const user_type = formData.get("user_type") as string;
    const menus = JSON.parse(formData.get("menus") as string || "[]") as string[];

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const scope = await getShopScope();
    if (!canManageUsers(scope)) {
      return NextResponse.json({ error: "Only a franchise admin or Head Office can create staff accounts" }, { status: 403 });
    }
    const requestedShopId = formData.get("shop_id") ? Number(formData.get("shop_id")) : null;
    const requestedSuperAdmin = formData.get("is_super_admin") === "true";

    // A shop-level admin can only create staff for their own shop and can
    // never grant the CEO/super-admin flag. Only an existing super admin
    // can register another super admin or assign someone to a different shop.
    const shop_id = scope.isSuperAdmin ? requestedShopId : (scope.shopId ?? requestedShopId);
    const is_super_admin = scope.isSuperAdmin ? requestedSuperAdmin : false;

    // Save image or use default
    let imageName: string;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      imageName = file.name;
      await writeFile(join(process.cwd(), "uploads", imageName), buffer);
    } else {
      // ✅ fallback to default picture
      imageName = "user.jpg";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        flag: user_type,
        image: imageName, // either uploaded filename OR default
        shop_id,
        is_super_admin,
      },
    });

    // Save roles for normal user
    if (menus.length > 0 && user_type === "0") {
      const uniqueMenus = Array.from(new Set(menus));
      const rolesData = uniqueMenus.map((menu) => ({
        email: user.email,
        menu_name: menu,
      }));
      await prisma.user_role.createMany({ data: rolesData });
    }

    await logActivity({
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      description: `Staff account created: ${user.name} (${user.email}), role: ${is_super_admin ? 'Head Office' : user_type === '1' ? 'Franchise Admin' : 'Staff'}`,
      shopIdOverride: shop_id ?? undefined,
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: `Failed to create user: ${err?.message || err}` }, { status: 500 });
  }
}
