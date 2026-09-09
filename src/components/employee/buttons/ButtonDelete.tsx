'use client'
import React, { useState } from 'react';
import { deleteUserById } from '@/components/employee/actions/DeleteUser';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ButtonDelete({ email, onSucess }: { email: string; onSucess: () => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteUserById(email);
      toast.success('User deleted!');
      onSucess();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Delete failed.');
    } finally {
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      {/* Original button design */}
      <button
        className="btn btn-danger btn-xs"
        onClick={() => setIsDialogOpen(true)}
        title="Delete"
        data-toggle="tooltip"
        data-placement="top"
      >
        <i className="fa fa-trash-o"></i>
      </button>

      {/* Confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
