'use client'

import EditForm from '@/components/employee/EditEmployee'
import { useParams } from 'next/navigation'

export default function EditPage() {
  const params = useParams()
  const emailParam = params.email

  // Handle string | string[] | undefined
  const email =
    typeof emailParam === 'string' ? emailParam : Array.isArray(emailParam) ? emailParam[0] : undefined

  if (!email) {
    return (
      <div className="text-center text-red-600 text-2xl">
        Email parameter is missing.
      </div>
    )
  }

  return <EditForm email={email} />
}
