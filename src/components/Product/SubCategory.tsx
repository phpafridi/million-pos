'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchCategory } from './actions/FetchCategory'
import { AddSubCategory } from './actions/AddSubCategory'
import { FetchSubCategory } from './actions/FetchSubCategory'
import EditSubCategoryButton from './buttons/EditSubCategoryButton'
import SubCategoryDelete from './buttons/SubCategoryDelete'
import { hasPermission } from '@/lib/clientPermissions'
import { toast } from 'sonner'

type Category = {
  category_id: number
  category_name: string
  created_datetime: string | Date
}

type SubCategoryType = {
  subcategory_id: number
  category_id: number
  subcategory_name: string
  created_datetime: string | Date
  category: {
    category_id: number
    category_name: string
  }
}

export default function SubCategory() {
  const { data: session } = useSession()
  const canEdit = hasPermission(session, 'action:manage-subcategory')
  const canDelete = hasPermission(session, 'action:manage-subcategory')
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubCategories] = useState<SubCategoryType[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [subCategoryName, setSubCategoryName] = useState("")
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false)
  const [loadingSubCategories, setLoadingSubCategories] = useState<boolean>(false)

  // Fetch categories
  const getCategory = async () => {
    try {
      setLoadingCategories(true)
      const data = await FetchCategory()
      setCategories(data)
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch categories")
    } finally {
      setLoadingCategories(false)
    }
  }

  // Fetch subcategories
  const getSubCategory = async () => {
    try {
      setLoadingSubCategories(true)
      const data = await FetchSubCategory()
      setSubCategories(data)
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch subcategories")
    } finally {
      setLoadingSubCategories(false)
    }
  }

  useEffect(() => {
    getCategory()
    getSubCategory()
  }, [])

  // Add subcategory
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCategory || !subCategoryName) {
      toast.error("Please fill all fields")
      return
    }

    const res = await AddSubCategory(Number(selectedCategory), subCategoryName)

    if (res.success) {
      toast.success("Subcategory added successfully!")
      setSubCategoryName("")
      setSelectedCategory("")
      getSubCategory()
    } else {
      toast.error(res.error || "Something went wrong")
    }
  }

  return (
    <section className="content text-center">
      <div className="row">
        <div className="col-md-12">

          <div className="box box-primary">
            <div className="box-header box-header-background with-border text-center">
              <h3 className="box-title">Product Sub Category</h3>
            </div>

            <div className="box-background text-center">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 col-sm-12 col-xs-12 col-md-offset-3">

                    {/* Category Dropdown */}
                    <div className="form-group">
                      <label>
                        Product Category <span className="required">*</span>
                      </label>
                      {loadingCategories ? (
                        <p><strong>Loading categories...</strong></p>
                      ) : (
                        <select
                          name="category_id"
                          className="form-control text-center"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.category_id} value={cat.category_id}>
                              {cat.category_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Subcategory Input */}
                    <div className="form-group">
                      <label>
                        Product Subcategory <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        name="subcategory_name"
                        placeholder="Subcategory"
                        className="form-control text-center"
                        value={subCategoryName}
                        onChange={(e) => setSubCategoryName(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn bg-navy btn-flat">
                      Save Subcategory
                    </button>
                    <br /><br />
                  </div>
                </div>
              </form>
            </div>

            {/* Table */}
            <div className="row">
              <div className="col-md-10 col-md-offset-1">
                <table className="table table-bordered table-striped text-center" id="dataTables-example">
                  <thead>
                    <tr>
                      <th className="col-sm-1 active text-center">SL</th>
                      <th className="active text-center">Category</th>
                      <th className="active text-center">Sub Category</th>
                      <th className="col-sm-2 active text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSubCategories ? (
                      <tr>
                        <td colSpan={4}><strong>Loading subcategories...</strong></td>
                      </tr>
                    ) : subcategories.length > 0 ? (
                      subcategories.map((sub, index) => (
                        <tr key={sub.subcategory_id} className="text-center">
                          <td>{index + 1}</td>
                          <td>{sub.category?.category_name ?? "—"}</td>
                          <td>{sub.subcategory_name}</td>
                          <td>
                            {canEdit && (
                              <EditSubCategoryButton
                                id={sub.subcategory_id}
                                name={sub.subcategory_name}
                                categoryId={sub.category?.category_id ?? 0}
                                categories={categories}
                                onSuccess={getSubCategory}
                              />
                            )}{' '}
                            {canDelete && (
                              <SubCategoryDelete
                                id={sub.subcategory_id}
                                onSucess={() => { getSubCategory(); toast.success('Subcategory deleted') }}
                              />
                            )}
                            {!canEdit && !canDelete && <span className="text-muted"><i className="fa fa-lock"></i></span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center">
                          <strong>No subcategories found.</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
