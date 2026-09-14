'use client'
import React, { useState } from 'react';
import { deleteSubCategoryById } from '../actions/deleteSubCategoryById';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function SubCategoryDelete({ id, onSucess }: { id: number, onSucess: () => void; }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteSubCategoryById(id);
      toast.success('Sub-category deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting SubCategory:', error);
      toast.error('Delete failed.');
    }
  };

  return (
    <>
      <button className="btn btn-danger btn-xs" onClick={() => setIsDialogOpen(true)} title="Delete" data-toggle="tooltip" data-placement="top"><i className="fa fa-trash-o"></i></button>

      <DeleteConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        description="Are you sure you want to delete this sub-category? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  )
}
