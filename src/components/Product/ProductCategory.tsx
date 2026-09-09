'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchCategory } from './actions/FetchCategory'
import { AddCategory } from './actions/AddCategory'
import EditCategoryButton from './buttons/EditCategoryButton'
import CategoryDelete from './buttons/CategoryDelete'
import { hasPermission } from '@/lib/clientPermissions'
import { toast } from 'sonner'

type AddCate = {
  category_id: number,
  category_name: string,
  created_datetime: string | Date
}

export default function ManageCategory() {
  const { data: session } = useSession()
  const canEdit = hasPermission(session, 'action:manage-category')
  const canDelete = hasPermission(session, 'action:manage-category')
  const [categories, setCategories] = useState<AddCate[]>([])
  const [category_name, setCategoryName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const getCategory = async () => {
    try {
      setLoading(true)
      const data = await FetchCategory()
      setCategories(data)
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getCategory()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!category_name.trim()) {
      toast.error("Validation error", { description: "Category name is required." })
      return
    }

    const result = await AddCategory({ category_name })

    if (result.success) {
      toast.success("Category saved successfully!")
      setCategoryName("")
      getCategory()
    } else {
      console.error("Error:", result.error)
      toast.error("Failed to save category.", { description: "Please try again." })
    }
  }

  return (
    <div className="right-side text-center" style={{ minHeight: '945px' }}>
      {/* Page Header */}
      <section className="content-header">
        <ol className="breadcrumb text-center">
          <li><a href="#">Manage Category</a></li>
          <li><a href="#">Products</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content text-center">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title text-center">Manage Categories</h3>
                </div>

                {/* Form Section */}
                <div className="box-background text-center">
                  <form onSubmit={handleSubmit}>
                    <div className="row text-center">
                      <div className="col-md-6 col-sm-8 col-xs-12 col-md-offset-3">
                        <div className="form-group" style={{ marginBottom: "15px" }}>
                          <input
                            type="text"
                            required
                            name="category_name"
                            placeholder="Enter Category Name"
                            value={category_name}
                            onChange={(e) => setCategoryName(e.target.value)}
                            className="form-control text-center"
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{
                            padding: "8px 20px",
                            borderRadius: "6px",
                            fontWeight: 600
                          }}
                        >
                          Save Category
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
                {/* End Form Section */}
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="box-footer text-center">
            <div className="row">
              <div className="col-md-10 col-md-offset-1">
                <table
                  className="table table-bordered table-striped text-center"
                  style={{ margin: "0 auto" }}
                >
                  <thead>
                    <tr>
                      <th className="active text-center">SL</th>
                      <th className="active text-center">Category Name</th>
                      <th className="col-sm-2 active text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="text-center">
                          <strong>Loading categories...</strong>
                        </td>
                      </tr>
                    ) : categories.length > 0 ? (
                      categories.map((cate, index) => (
                        <tr key={cate.category_id} className="text-center">
                          <td>{index + 1}</td>
                          <td>{cate.category_name}</td>
                          <td>
                            {canEdit && (
                              <EditCategoryButton
                                id={cate.category_id}
                                name={cate.category_name}
                                onSuccess={() => {
                                  getCategory()
                                  toast.success("Category updated")
                                }}
                              />
                            )}{' '}
                            {canDelete && (
                              <CategoryDelete
                                id={cate.category_id}
                                onSucess={() => {
                                  getCategory()
                                  toast.success("Category deleted")
                                }}
                              />
                            )}
                            {!canEdit && !canDelete && <span className="text-muted"><i className="fa fa-lock"></i></span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="text-center">
                        <td colSpan={3}>
                          <strong>No categories found.</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* End Table Section */}
        </section>
      </div>
    </div>
  )
}
