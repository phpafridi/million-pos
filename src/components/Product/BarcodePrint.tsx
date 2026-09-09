'use client'
import React, { useEffect, useState } from 'react'
import Barcode from './modal/BarCode'
import QrCode from './modal/QrCode'
import FetchProduct from './actions/FetchProduct';

type Product = {
  product_id: number;
  product_code: string | null;
  product_name: string;
  measurement_units: string | null;
  sku?: string | null;
};

export default function BarcodePrint() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [labelType, setLabelType] = useState<'barcode' | 'qr'>('barcode');

  const getProducts = async () => {
    setLoading(true);
    const data = await FetchProduct();
    setProducts(data);
    setLoading(false);
  };

  const clearTray = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSelectedProduct(null);
  };

  const printBarcode = () => {
    const printContents = document.getElementById("printableArea")?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open("", "_blank", "width=600,height=400");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin: 20px; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    getProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    );
    setFilteredProducts(showAll ? filtered : filtered.slice(0, 30));
  }, [search, products, showAll]);

  return (
    <section className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="portlet">
            <div className="portlet-heading">
              <h3 className="portlet-title text-dark text-uppercase">
                Product Barcode Print
              </h3>
              <div className="pull-right">
                <h1 className="portlet-title text-dark text-uppercase">
                  <a href="#" style={{ fontSize: "25px" }}>
                    <strong><i className="fa fa-times" aria-hidden="true"></i></strong>
                  </a>
                </h1>
              </div>
            </div>
            <div id="portlet2" className="panel-collapse collapse in">
              <div className="portlet-body">
                <div className="row">

                  {/* Left: Product Table */}
                  <div className="col-md-5 col-sm-12">
                    <div className="mb-4 flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-control flex-grow px-4 py-2 border rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAll(!showAll)}
                        className="px-4 py-2 rounded text-white"
                      >
                        {showAll ? 'Show 30' : 'Show All'}
                      </button>
                    </div>

                    <table className="table table-bordered table-hover purchase-products">
                      <thead>
                        <tr>
                          <th className="active">#</th>
                          <th className="active">Product Code</th>
                          <th className="active">SKU</th>
                          <th className="active">Product Name</th>
                          <th className="active">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="text-center">
                              <strong>Loading products...</strong>
                            </td>
                          </tr>
                        ) : filteredProducts.length > 0 ? (
                          filteredProducts.map((product, index) => (
                            <tr key={product.product_id}>
                              <td>{index + 1}</td>
                              <td>{product.product_code}</td>
                              <td>{product.sku || '—'}</td>
                              <td><small>{product.product_name}</small></td>
                              <td>
                                <button
                                  type="button"
                                  className="btn bg-navy btn-xs"
                                  onClick={() => setSelectedProduct(product.product_code)}
                                >
                                  <i className="glyphicon glyphicon-barcode"></i> Code
                                </button>
                                {product.sku && (
                                  <button
                                    type="button"
                                    className="btn btn-default btn-xs"
                                    style={{ marginLeft: 4 }}
                                    onClick={() => setSelectedProduct(product.sku!)}
                                  >
                                    SKU
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center">
                              No products found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Right: Print Preview */}
                  <div className="col-md-7 col-sm-12">
                    <div className="box box-info">
                      <div className="box-header box-header-background-light with-border flex justify-between items-center">
                        <h3 className="box-title">Print Label</h3>
                      </div>
                      <div className="box-body">
                        <div className="btn-group" style={{ marginBottom: 12 }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${labelType === 'barcode' ? 'bg-navy' : 'btn-default'}`}
                            onClick={() => setLabelType('barcode')}
                          >
                            <i className="glyphicon glyphicon-barcode"></i> Barcode
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${labelType === 'qr' ? 'bg-navy' : 'btn-default'}`}
                            onClick={() => setLabelType('qr')}
                          >
                            <i className="glyphicon glyphicon-qrcode"></i> QR Code
                          </button>
                        </div>
                        {selectedProduct && (
                          <button
                            onClick={printBarcode}
                            className="btn btn-default"
                          >
                            Print
                          </button>
                        )}
                        {selectedProduct && (
                          <button
                            onClick={clearTray}
                            className="btn btn-default mt-2"
                          >
                            Clear Print Tray
                          </button>
                        )}
                        <div id="printableArea">
                          <div className="row">
                            <div className="col-sm-3 text-center" style={{ margin: "20px 0px 20px 5px" }}>
                              {selectedProduct ? (
                                labelType === 'qr' ? (
                                  <QrCode value={selectedProduct} />
                                ) : (
                                  <Barcode value={selectedProduct} format="CODE128" />
                                )
                              ) : (
                                <p>No product selected</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
