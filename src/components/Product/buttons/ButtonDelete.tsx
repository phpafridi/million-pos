'use client'
import React from 'react';
import { deleteProductById } from '../actions/deleteProductById';

export default function ButtonDelete({ id , onSucess }: { id: number, onSucess: () => void; }) {
  const handleDelete = async () => {
    try {
      await deleteProductById(id);
      alert('Product Deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Delete failed.');
    }
  };

    return (
        <>
            <button className="btn btn-danger btn-xs" onClick={handleDelete} title="Delete" data-toggle="tooltip" data-placement="top"><i className="fa fa-trash-o"></i></button>
        </>
    )
}
