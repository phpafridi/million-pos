'use client'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/**
 * A confirmation dialog for destructive actions that requires the user to
 * type a specific word (default "delete") before the actual delete button
 * becomes clickable — an extra safety layer beyond just clicking Cancel/
 * Delete, for actions that can't be undone.
 */
export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirm Delete',
  description,
  onConfirm,
  confirmWord = 'delete',
  confirmLabel = 'Delete',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description: React.ReactNode
  onConfirm: () => void | Promise<void>
  confirmWord?: string
  confirmLabel?: string
}) {
  const [typed, setTyped] = useState('')
  const [confirming, setConfirming] = useState(false)
  const canConfirm = typed.trim().toLowerCase() === confirmWord.toLowerCase()

  const handleOpenChange = (next: boolean) => {
    if (!next) setTyped('')
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm()
    } finally {
      setConfirming(false)
      setTyped('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>
            Type <strong>{confirmWord}</strong> to confirm
          </label>
          <input
            type="text"
            className="form-control"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmWord}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) handleConfirm() }}
          />
        </div>
        <DialogFooter className="flex justify-end gap-2" style={{ marginTop: 12 }}>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={!canConfirm || confirming} onClick={handleConfirm}>
            {confirming ? 'Deleting...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
