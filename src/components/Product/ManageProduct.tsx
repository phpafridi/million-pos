'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import FetchProducts from './actions/FetchProduct'
import Link from 'next/link'
import ProductModal from './modal/ProductModal'
import { hasPermission } from '@/lib/clientPermissions'

type Inventory = {
  inventory_id: number
  product_id: number
  product_quantity: number
  notify_quantity: number | null
}

type Product = {
  product_id: number
  product_code: string | null
  product_name: string
  product_note: string | null
  measurement_units: string | null
  status: number | null
  subcategory_id: number | null
  barcode_path: string | null
  barcode: string | null
  tax_id: number | null
  packet_size: number
  inventories: Inventory[]
}

// Helper function to convert Decimal fields to numbers
const convertProductToNumberTypes = (product: any): Product => {
  return {
    product_id: product.product_id,
    product_code: product.product_code,
    product_name: product.product_name,
    product_note: product.product_note,
    measurement_units: product.measurement_units,
    status: product.status,
    subcategory_id: product.subcategory_id,
    barcode_path: product.barcode_path,
    barcode: product.barcode,
    tax_id: product.tax_id,
    packet_size: Number(product.packet_size) || 0, // Convert Decimal to number
    inventories: (product.inventories || []).map((inv: any) => ({
      inventory_id: inv.inventory_id,
      product_id: inv.product_id,
      product_quantity: Number(inv.product_quantity) || 0, // Convert Decimal to number
      notify_quantity: inv.notify_quantity ? Number(inv.notify_quantity) : null, // Convert Decimal to number
    }))
  }
}

export default function ManageProduct() {
  const { data: session } = useSession()
  const canEdit = hasPermission(session, 'action:edit-product')
  const canDelete = hasPermission(session, 'action:delete-product')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [showAll, setShowAll] = useState(false)

  const getDisplayQuantity = (product: Product) => {
    const totalQty = product.inventories.reduce((sum, inv) => sum + inv.product_quantity, 0)
    const packetSize = product.packet_size
    const isMultiplePackets = packetSize > 0 && totalQty % packetSize === 0
    const displayQty = isMultiplePackets ? (totalQty / packetSize) : totalQty
    const displayUnit = isMultiplePackets ? 'packet' : (product.measurement_units || 'pcs')
    
    return { displayQty, displayUnit }
  }

  const getProducts = async () => {
    const data = await FetchProducts()
    // Convert all Decimal fields to numbers
    const convertedData = data.map(convertProductToNumberTypes)
    setProducts(convertedData)
    setFilteredProducts(convertedData)
    setLoading(false)
  }

  useEffect(() => {
    getProducts()
  }, [])

  useEffect(() => {
    const lowerSearch = search.toLowerCase()
    setFilteredProducts(
      products.filter(
        (p) =>
          p.product_name.toLowerCase().includes(lowerSearch) ||
          (p.product_code ?? '').toLowerCase().includes(lowerSearch)
      )
    )
    setCurrentPage(1)
  }, [search, products])

  const toggleStatus = async (product: Product) => {
    try {
      const res = await fetch(`/api/status/${product.product_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: product.status }),
      })
      const data = await res.json()
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.product_id === product.product_id ? { ...p, status: data.status } : p
          )
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = showAll
    ? filteredProducts
    : filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <>
      <section className="content-header">
        <ol className="breadcrumb">
          <li><a href="#">Employee List</a></li>
          <li><a href="#">Employee Management</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border d-flex justify-between items-center">
                  <h3 className="box-title">Manage Products</h3>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Search by name or code..."
                      className="form-control"
                      style={{ maxWidth: '300px' }}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                      className={`btn ${showAll ? 'btn-primary' : 'btn-default'}`}
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? 'Paginate' : 'Show All'}
                    </button>
                  </div>
                </div>

                <div className="box-body">
                  <table className="table table-bordered table-striped text-center">
                    <thead>
                      <tr>
                        <th className="text-center">SL</th>
                        <th className="text-center">Product Code</th>
                        <th className="text-center">Product Name</th>
                        <th className="text-center">Status</th>
                        
                        <th className="text-center">Stock</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="text-center">
                            <strong>Loading products...</strong>
                          </td>
                        </tr>
                      ) : paginatedProducts.length > 0 ? (
                        paginatedProducts.map((product, index) => {
                          const { displayQty, displayUnit } = getDisplayQuantity(product)
                          
                          return (
                            <tr key={product.product_id}>
                              <td className="text-center">
                                {(currentPage - 1) * itemsPerPage + (index + 1)}
                              </td>
                              <td className="text-center">{product.product_code}</td>
                              <td className="text-center">{product.product_name}</td>
                              <td
                                className={`text-center font-bold ${
                                  product.status === 1 ? 'text-green-600' : 'text-red-600'
                                } ${canDelete ? 'cursor-pointer' : ''}`}
                                onClick={() => canDelete && toggleStatus(product)}
                                title={canDelete ? undefined : 'No permission to activate/deactivate products'}
                              >
                                {product.status === 1 ? 'Active' : 'Inactive'}
                                {!canDelete && <i className="fa fa-lock" style={{ marginLeft: 6, fontSize: 11 }}></i>}
                              </td>
                              
                              <td className="text-center">
                                {displayQty} {displayUnit}
                              </td>
                              <td className="text-center">
                                {canEdit ? (
                                  <Link href={`/dashboard/product/edit-product/${product.product_id}`}>
                                    <button className="btn bg-navy btn-xs">
                                      <i className="glyphicon glyphicon-edit"></i>
                                    </button>
                                  </Link>
                                ) : (
                                  <button className="btn btn-default btn-xs" disabled title="No permission to edit products">
                                    <i className="glyphicon glyphicon-lock"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center">
                            No products found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {!loading && !showAll && filteredProducts.length > itemsPerPage && (
                    <div className="flex justify-center items-center mt-6 gap-3">
                      <button
                        className="btn btn-sm btn-default"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, idx) => (
                        <button
                          key={idx + 1}
                          className={`btn btn-sm ${
                            currentPage === idx + 1 ? 'btn-primary' : 'btn-default'
                          }`}
                          onClick={() => setCurrentPage(idx + 1)}
                        >
                          {idx + 1}
                        </button>
                      ))}

                      <button
                        className="btn btn-sm btn-default"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  )
}