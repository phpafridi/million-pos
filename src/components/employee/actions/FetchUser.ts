'use server';
import { prisma } from '@/lib/prisma';
import { getShopScope, scopeWhere } from '@/lib/getShopScope';

export default async function FetchUser() {
  const scope = await getShopScope();
  const users = await prisma.user.findMany({ where: scopeWhere(scope) });
  return users;
}