'use client'

import ViewInvoice from '@/components/OrderProcess/ViewInvoice'
import { useParams, useSearchParams } from 'next/navigation'

import React from 'react'

export default function Page() {
  const params = useParams()
  const searchP = useSearchParams();
  const id = params.id as string
  const isOrder = searchP.get("isOrder") === 'true'

  return <ViewInvoice id={id} isOrder={isOrder} />
}
