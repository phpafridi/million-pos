'use server'
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { getShopScope, scopeShopIdForWrite } from "@/lib/getShopScope";

type ResultType =
  | { success: true }
  | { success: false; error: string };

export async function AddBusinessProfile(formData: FormData): Promise<ResultType> {
  try {
    const company_name = formData.get('company_name') as string;
    const company_email = formData.get('company_email') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const logo_image = formData.get('file') as File | null;
    const favicon_image = formData.get('favicon_file') as File | null;
    const currency = "nill";

    if (!company_name || !company_email || !address || !phone) {
      return { success: false, error: "Missing required fields." };
    }

    let logoFileName: string | null = null;
    let faviconFileName: string | null = null;

    const uploadsDir = join(process.cwd(), "uploads");
    if ((logo_image || favicon_image) && !existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Handle file upload if provided
    if (logo_image) {
      const bytes = await logo_image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      logoFileName = `${Date.now()}-${logo_image.name}`;
      await writeFile(join(uploadsDir, logoFileName), buffer);
    }

    if (favicon_image) {
      const bytes = await favicon_image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      faviconFileName = `${Date.now()}-${favicon_image.name}`;
      await writeFile(join(uploadsDir, faviconFileName), buffer);
    }

    // Each shop has its own business profile (branding shown on its own
    // receipts/invoices), not a single global one.
    const scope = await getShopScope();
    const shop_id = scopeShopIdForWrite(scope);

    const existing = await prisma.tbl_business_profile.findFirst({ where: { shop_id } });

    if (existing) {
      await prisma.tbl_business_profile.update({
        where: { business_profile_id: existing.business_profile_id },
        data: {
          company_name,
          email: company_email,
          address,
          phone,
          currency,
          ...(logoFileName ? { logo: logoFileName } : {}), // only update if new file uploaded
          ...(faviconFileName ? { favicon: faviconFileName } : {}),
        },
      });
    } else {
      await prisma.tbl_business_profile.create({
        data: {
          shop_id,
          company_name,
          email: company_email,
          address,
          phone,
          currency,
          logo: logoFileName,
          favicon: faviconFileName,
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error saving business profile:", error);
    return { success: false, error: `Failed to save business profile: ${error?.message || error}` };
  }
}
