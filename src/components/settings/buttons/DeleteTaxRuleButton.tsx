'use client'
import React, { useState } from 'react';
import { deleteTaxRuleId } from '../actions/DeleteTaxRuleId';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function DeleteTaxRuleButton({ id, onSucess }: { id: number, onSucess: () => void; }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteTaxRuleId(id);
      toast.success('Tax rule deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting tax rule:', error);
      toast.error('Delete failed.');
    }
  };

  return (
    <>
      <button className="btn btn-danger btn-xs" onClick={() => setIsDialogOpen(true)} title="Delete" data-toggle="tooltip" data-placement="top"><i className="fa fa-trash-o"></i></button>

      <DeleteConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        description="Are you sure you want to delete this tax rule? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  )
}
