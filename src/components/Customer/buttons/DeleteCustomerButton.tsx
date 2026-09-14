'use client'

import React, { useState } from 'react';
import { DeleteCustomer } from "../actions/DeleteCustomer";
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function DeleteCustomerButton({ customerCode, onSucess }: { customerCode: number, onSucess: () => void; }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await DeleteCustomer(customerCode);
      toast.success('Customer deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Delete failed.');
    }
  };

  return (
    <>
      <button onClick={() => setIsDialogOpen(true)} className="btn btn-xs btn-danger"><i className="glyphicon glyphicon-trash"></i></button>

      <DeleteConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        description="Are you sure you want to delete this customer? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  )
}
