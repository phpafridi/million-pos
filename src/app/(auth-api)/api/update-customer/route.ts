
import { prisma } from "@/lib/prisma";
import { getShopScope } from "@/lib/getShopScope";
import { sharedOrOwnWhere, assertCanModifyRecord } from "@/lib/syncSettings";


import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {

  const data = await request.formData();

  const customer_code = data.get('customer_code') as string;
  const customer_name = data.get('customer_name') as string;
  const email = data.get('email') as string;
  const phone = data.get('phone') as string;
  const discount = data.get('discount') as string;
  const address = data.get('address') as string;

  // if (!file || !name || !email || !password1) {
  //   return NextResponse.json({ success: false })
  // }

  try {
    const scope = await getShopScope();
    const existing = await prisma.tbl_customer.findFirst({
      where: { email, ...sharedOrOwnWhere(scope) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found or belongs to another franchise" }, { status: 404 });
    }
    assertCanModifyRecord(scope, existing.shop_id);

    const update_customer = await prisma.tbl_customer.update({
      where: { customer_id: existing.customer_id },
      data: {
        customer_name,
        email,
        phone,
        address,
        discount
      }
    })

    if (update_customer) {

      return NextResponse.json({ msg: "Customer Updated" });
    }

  }
  catch (error: any) {
    return NextResponse.json({ error: `Failed to update customer: ${error?.message || error}` });
  }


}