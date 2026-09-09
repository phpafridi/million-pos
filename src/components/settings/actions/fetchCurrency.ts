'use server'
import { prisma } from "@/lib/prisma";

export async function fetchCurrency() {
    const localisation = await prisma.tbl_localization.findFirst();
    return localisation ? { currency: localisation.currency } : null;
}
