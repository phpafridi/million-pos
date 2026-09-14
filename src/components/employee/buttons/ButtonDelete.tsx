'use client'
import React, { useState } from 'react';
import { toggleUserActive } from '@/components/employee/actions/ToggleUserActive';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Was a permanent delete — now disables/re-enables the account instead,
 * preserving the record and its history rather than erasing it. Kept the
 * filename/component name (ButtonDelete) since it's imported in several
 * places and a rename would be a larger, riskier change than necessary.
 */
export default function ButtonDelete({ email, isActive, onSucess }: { email: string; isActive: boolean; onSucess: () => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const targetActive = !isActive; // what we're toggling TO

  const handleToggle = async () => {
    try {
      await toggleUserActive(email, targetActive);
      toast.success(targetActive ? 'Account enabled' : 'Account disabled');
      onSucess();
    } catch (error: any) {
      console.error('Error toggling account status:', error);
      toast.error(error.message || 'Failed to update account status.');
    } finally {
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <button
        className={`btn btn-xs ${isActive ? 'btn-danger' : 'btn-success'}`}
        onClick={() => setIsDialogOpen(true)}
        title={isActive ? 'Disable account' : 'Enable account'}
        data-toggle="tooltip"
        data-placement="top"
      >
        <i className={`fa ${isActive ? 'fa-ban' : 'fa-check'}`}></i>
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isActive ? 'Disable Account' : 'Enable Account'}</DialogTitle>
            <DialogDescription>
              {isActive
                ? 'This account will no longer be able to log in. Their history (sales, orders, activity log) stays intact and this can be reversed anytime.'
                : 'This account will be able to log in again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant={isActive ? 'destructive' : 'default'} onClick={handleToggle}>
              {isActive ? 'Disable' : 'Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
