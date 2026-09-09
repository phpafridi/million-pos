'use client'
import React from 'react';
import { deleteSubCategoryById } from '../actions/deleteSubCategoryById';

export default function SubCategoryDelete({ id , onSucess }: { id: number, onSucess: () => void; }) {
  const handleDelete = async () => {
    try {
        
      await deleteSubCategoryById(id);
      alert('SubCategory deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting SubCategory:', error);
      alert('Delete Sub Category failed.');
    }
  };

    return (
        <>
            <button className="btn btn-danger btn-xs" onClick={handleDelete} title="Delete" data-toggle="tooltip" data-placement="top"><i className="fa fa-trash-o"></i></button>
        </>
    )
}

