import React from 'react'
import { UpdateSupplier, GetSupplier } from './actions/EditSupplier'

// Define props type
type EditSupplierProps = {
  id: string
}

// ✅ This is a server component
export default async function EditSupplier({ id }: EditSupplierProps) {
  const Sid = Number(id);

  // must await
  const supplier = await GetSupplier(Sid);

  if (!supplier) {
    return <p>Supplier not found</p>
  }

  return (
    <section className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Edit Supplier</h3>
            </div>

            {/* ✅ bind server action directly, no inline function */}
            <form action={UpdateSupplier.bind(null, supplier.supplier_id)} method="post">
              <div className="box-body">
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    defaultValue={supplier.company_name}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Supplier Name</label>
                  <input
                    type="text"
                    name="supplier_name"
                    defaultValue={supplier.supplier_name}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={supplier.email ?? ''}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={supplier.phone ?? ''}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    className="form-control"
                    rows={4}
                    defaultValue={supplier.address ?? ''}
                    required
                  />
                </div>
              </div>

              <div className="box-footer">
                <button type="submit" className="btn bg-navy btn-flat">
                  Update Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
