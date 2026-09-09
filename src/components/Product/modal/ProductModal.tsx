import React from "react";

type Props = {
  product: any;
  onClose: () => void;
};

export default function ProductModal({ product, onClose }: Props) {
  return (
          <div className="container-fluid">
        <section className="content">

    
    <div
      className="z-[9999]"
      style={{ backgroundColor: "rgba(0,0,0,0.0)" }}
    >
      <div className="modal-dialog modal-lg bg-white rounded shadow-lg">
        <div className="modal-content p-4">
          {/* Header */}
          <div className="modal-header flex justify-between items-center border-b pb-2">
            <h4 className="text-lg font-bold">{product.product_name}</h4>
            <button onClick={onClose} className="text-gray-600 hover:text-black">
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="modal-body mt-3">
            <table className="table table-bordered w-full">
              <tbody>
                <tr>
                  <td>Product Code</td>
                  <td>{product.product_code}</td>
                </tr>
                <tr>
                  <td>Status</td>
                  <td>{product.status === 1 ? "Active" : "Inactive"}</td>
                </tr>
                <tr>
                  <td>Tax</td>
                  <td>{product.tax_id}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="modal-footer flex justify-end border-t pt-2">
            <button onClick={onClose} className="btn btn-default">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    </section>
    </div>
  );
}
