'use client'
import React, { useState } from 'react';
import { deleteProductById } from '../actions/deleteProductById';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function ButtonDelete({ id, onSucess }: { id: number, onSucess: () => void; }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteProductById(id);
      toast.success('Product deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Delete failed.');
    }
  };

  return (
    <>
      <button className="btn btn-danger btn-xs" onClick={() => setIsDialogOpen(true)} title="Delete" data-toggle="tooltip" data-placement="top">
        <i className="fa fa-trash-o"></i>
      </button>

      <DeleteConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
