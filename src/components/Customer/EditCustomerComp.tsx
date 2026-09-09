'use client'
import React, { useEffect, useState } from 'react'

import { useRouter } from "next/navigation"
import { CustomerByEmail } from './actions/CustomerByEmail';

type Customer = {
    customer_name: string, 
    customer_code : number,
    email: string, 
    phone: string, 
    discount: string, 
    address: string 
}

export default function EditCustomerComp({email}:any) {
    const router = useRouter();

    const [form, setForm] = useState({ customer_name: '',customer_code : 0 , email: '', phone: '', discount: '', address: '' });
    const [response, setResponse] = useState<any>(null);

    useEffect(() => {
        const fetchCustomer = async () => {
                           
            const customer: Customer | null = await CustomerByEmail(email);
                    if (customer) {
                setForm({
                    customer_name: customer.customer_name ?? '',
                    customer_code: customer.customer_code ?? 0,
                    email: customer.email ?? '',
                    phone: customer.phone ?? '0',
                    discount: customer.discount ?? '',
                    address : customer.address ?? ''
                });
            }

            

        };
        
        
       
        fetchCustomer();
        

    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleChangeArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        

        const formData = new FormData();
        formData.append('customer_name', form.customer_name);
        formData.append('customer_code', String(form.customer_code));
        formData.append('email', form.email);
        formData.append('phone', form.phone);
        formData.append('discount', form.discount);
        formData.append('address', form.address);

        
        const res = await fetch('/api/update-customer', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        setResponse(data);
        if (data?.error) {
            setResponse(data.error);
        } else {
            router.push("/dashboard/customer/manage-customer/"); // or wherever
        }

    }

    return (
        <>

            <section className="content">
                <div className="row">
                    <div className="col-md-12">

                        <div className="box box-primary">
                            <div className="box-header box-header-background with-border">
                                <h3 className="box-title ">Edit Customer</h3>
                            </div>


                            <form onSubmit={handleSubmit} method="post">

                                <div className="row">

                                    <div className="col-md-8 col-sm-12 col-xs-12">

                                        <div className="box-body">


                                            <div className="form-group">
                                                <label >Customer Name <span className="required">*</span></label>
                                                <input type="text" name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="Customer Name"

                                                    className="form-control" />
                                            </div>

                                            <div className="form-group">
                                                <label >Email <span
                                                    className="required">*</span></label>
                                                <input type="text" placeholder="Email" name="email" value={form.email} onChange={handleChange}

                                                    className="form-control" />
                                            </div>

                                            <div className="form-group">
                                                <label>Phone</label>
                                                <input type="text" placeholder="Phone" name="phone" value={form.phone} onChange={handleChange}
                                                    className="form-control" />
                                                <div style={{ color: "#E13300" }} id="phone_result"></div>
                                            </div>

                                            <div className="form-group">
                                                <label >Discount %</label>
                                                <input type="text" placeholder="Discount" name="discount" value={form.discount} onChange={handleChange}

                                                    className="form-control" />
                                            </div>

                                            <div className="form-group">
                                                <label >Address <span className="required">*</span></label>
                                                <textarea name="address" className="form-control autogrow" value={form.address} onChange={handleChangeArea}
                                                    placeholder="Address" rows={5}></textarea>

                                            </div>


                                        </div>

                                    </div>
                                </div>

                                <input type="hidden" name="customer_code"
                                />
                                <input type="hidden" name="customer_id" id="customer_id" />

                                <div className="box-footer">
                                    <button type="submit" id="customer_btn" className="btn bg-navy btn-flat">Save Customer
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>

                </div>

            </section>

        </>
    )
}
