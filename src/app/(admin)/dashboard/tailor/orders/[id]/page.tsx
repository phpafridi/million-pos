import React from 'react'
import TailorOrderDetail from '@/components/Tailor/TailorOrderDetail'

export default async function TailorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <TailorOrderDetail tailorOrderId={Number(id)} />
    </>
  )
}
