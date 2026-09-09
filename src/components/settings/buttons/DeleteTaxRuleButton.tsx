'use client'
import React from 'react';
import { deleteTaxRuleId } from '../actions/DeleteTaxRuleId';

export default function DeleteTaxRuleButton({ id , onSucess }: { id: number, onSucess: () => void; }) {
  const handleDelete = async () => {
    try {
      await deleteTaxRuleId(id);
      alert('Tax deleted!');
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

