'use client'
import React, { useState } from 'react';
import { deleteCategoryById } from '../actions/deleteCategoryById';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function DeleteCategoryButton({ id, onSucess }: { id: number, onSucess: () => void; }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteCategoryById(id);
      toast.success('Category deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting Category:', error);
      toast.error('Delete failed.');
    }
  };

  return (
    <>
      <button className="btn btn-danger btn-xs" onClick={() => setIsDialogOpen(true)} title="Delete" data-toggle="tooltip" data-placement="top"><i className="fa fa-trash-o"></i></button>

      <DeleteConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        description="Are you sure you want to delete this category? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  )
}
