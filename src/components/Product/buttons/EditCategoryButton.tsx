'use client'
import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateCategoryById } from "../actions/updateCategoryById"

export default function EditCategoryButton({
  id,
  name,
  onSuccess,
}: {
  id: number
  name: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [categoryName, setCategoryName] = useState(name)
  const [loading, setLoading] = useState(false)

  const handleUpdate = async () => {
    if (!categoryName.trim()) {
      alert("Category name is required")
      return
    }

    setLoading(true)
    try {
      await updateCategoryById(id, categoryName)
      
      setOpen(false)
      onSuccess()
    } catch (error: any) {
      console.error("Error updating category:", error)
      alert(error.message || "Failed to update category")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Small edit button */}
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <i className="fa fa-edit"></i> Edit
      </Button>

      {/* Dialog Popup */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter category name"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
