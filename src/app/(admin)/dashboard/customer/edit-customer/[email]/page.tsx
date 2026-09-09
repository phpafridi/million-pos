'use client'

import EditCustomerComp from '@/components/Customer/EditCustomerComp';
import { useParams } from 'next/navigation';

export default function EditCustomer() {

const params = useParams();



  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <EditCustomerComp email={params.email} />
    </div>
  );
}
