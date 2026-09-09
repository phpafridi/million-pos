'use client'

import { DeleteCustomer } from "../actions/DeleteCustomer";

export default function DeleteCustomerButton({ customerCode , onSucess }: { customerCode: number, onSucess: () => void; }) {

      const handleDelete = async () => {
        try {
          await DeleteCustomer(customerCode);
          alert('User deleted!');
          onSucess();
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Delete failed.');
        }
      };

  return (
          <>
              <button onClick={handleDelete} className="btn btn-xs btn-danger" ><i className="glyphicon glyphicon-trash"></i></button>
          </>
  )
}
