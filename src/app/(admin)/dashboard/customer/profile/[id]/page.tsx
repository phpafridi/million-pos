import React from 'react'
import CustomerProfile from '@/components/Customer/CustomerProfile'

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <CustomerProfile customerId={Number(id)} />
    </>
  )
}
