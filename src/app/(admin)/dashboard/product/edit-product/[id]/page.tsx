'use client'
import EditProduct from '@/components/Product/EditProduct'
import { useParams } from 'next/navigation'
import React from 'react'

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <EditProduct productId={id} />  {/* <--- use productId */}
    </div>
  );
}
