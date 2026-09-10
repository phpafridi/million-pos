import React from 'react'
import GrnDetail from '@/components/Warehouse/GrnDetail'

export default async function GrnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <GrnDetail grnId={Number(id)} />
    </>
  )
}
