'use server'

import { prisma } from "@/lib/prisma";
import { getShopScope, scopeShopIdForWrite } from "@/lib/getShopScope";
import { shopIdForNewRecord } from "@/lib/syncSettings";

type ResultType =
    | { success: true }
    | { success: false; error: string };

type AddCustomer = {
    customer_name: string,
    email: string,
    address: string,
    phone: string,
    discount : string
}
export async function AddCustomerData(formData: FormData): Promise<ResultType> {
    
    const customer_name = formData.get('customer_name') as string;
    const email = formData.get('email') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const discount = formData.get('discount') as string;

    const customer_code = Math.floor(Math.random() * 100001);
    const scope = await getShopScope();
    const shop_id = await shopIdForNewRecord('customers', scope, scopeShopIdForWrite(scope));

    const Customer = await prisma.tbl_customer.create({
        data : {
            customer_code,
            shop_id,
            customer_name,
            email,
            phone,
            address,
            discount
        }
    })

    return {success : true}

}
