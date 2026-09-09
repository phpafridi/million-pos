'use client'
import React, { useState } from 'react'
import { EditSubCategory } from '../actions/EditSubCategory'
import { toast } from 'sonner'

type Props = {
  id: number
  name: string
  categoryId: number
  categories: { category_id: number; category_name: string }[]
  onSuccess: () => void
}

export default function EditSubCategoryButton({ id, name, categoryId, categories, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [subcategoryName, setSubcategoryName] = useState(name)
  const [selectedCategory, setSelectedCategory] = useState(categoryId)

  const handleSave = async () => {
    if (!subcategoryName.trim()) {
      toast.error("Subcategory name is required")
      return
    }

    const res = await EditSubCategory(id, subcategoryName, selectedCategory)

    if (res.success) {
      toast.success("Subcategory updated successfully")
      setOpen(false)
      onSuccess()
    } else {
      toast.error("Update failed", { description: res.error })
    }
  }

  return (
    <>
      <button
        className="btn btn-warning btn-xs"
        onClick={() => setOpen(true)}
      >
        <i className="fa fa-edit"></i>
      </button>

      {open && (
        <div className="modal fade in" style={{ display: 'block' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setOpen(false)}>
                  &times;
                </button>
                <h4 className="modal-title">Edit Subcategory</h4>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-control"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(Number(e.target.value))}
                  >
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subcategory Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={subcategoryName}
                    onChange={(e) => setSubcategoryName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-default" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
