'use server'
import { prisma } from "@/lib/prisma";
import { getShopScope, scopeWhereSingleShop } from "@/lib/getShopScope";

export async function GetBusinessProfile() {
  const scope = await getShopScope();
  const profile = await prisma.tbl_business_profile.findFirst({
    where: scopeWhereSingleShop(scope),
  });
  return profile;
}