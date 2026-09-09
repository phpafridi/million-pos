'use server'
import { prisma } from "@/lib/prisma";

interface LocalSetting {
  Currency: string;
}

type LocalisationResult =
  | string
  | { success: true; localization_id: number }
  | { success: false; error: string };

export async function AddLocalisation({ Currency }: LocalSetting): Promise<LocalisationResult> {
  try {
    // Use upsert: if a record exists (id=1), update it; otherwise, create it
    const localisation = await prisma.tbl_localization.upsert({
      where: { localization_id: 1 }, // adjust according to your table unique identifier
      update: {
        currency: Currency,
      },
      create: {
        currency: Currency,
        
      },
    });

    return { success: true, localization_id: localisation.localization_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
