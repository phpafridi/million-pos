'use client'
import React from 'react';
import { deleteCategoryById } from '../actions/deleteCategoryById';


export default function DeleteCategoryButton({ id , onSucess }: { id: number, onSucess: () => void; }) {
  const handleDelete = async () => {
    try {
      await deleteCategoryById(id);
      alert('Category deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting Category:', error);
      alert('Delete failed.');
    }
  };

    return (
        <>
            <button className="btn btn-danger btn-xs" onClick={handleDelete} title="Delete" data-toggle="tooltip" data-placement="top"><i className="fa fa-trash-o"></i></button>
        </>
    )
}

