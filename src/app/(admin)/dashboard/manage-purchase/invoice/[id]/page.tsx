'use client'
import ViewInvoice from '@/components/ManagePurchase/ViewInvoice';
import { useParams } from 'next/navigation'
import React from 'react'

export default function page() {
      const params = useParams();
      const id = params.id as string;
    return (
    <>
    
    <div className="right-side" style={{ minHeight: '945px' }}>
            <ViewInvoice id={id} />
    </div>
    
    </>
  )
}
