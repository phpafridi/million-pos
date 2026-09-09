'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { fetchCurrency } from "../settings/actions/fetchCurrency";
import { ProductById as ServerProductById } from './actions/ProductById'
import SearchableSelect from "../shared/SearchableSelect";

type TierPriceKey = 'quantity_above' | 'selling_price_tier';
type ProductAttributeKey = 'attribute_name' | 'value';
type Category = { category_id: number; category_name: string; created_datetime: Date };
type Subcategory = { subcategory_id: string; subcategory_name: string };
type Tax = { tax_id: number; tax_title: string; tax_rate: number; tax_type: number };
type MeasurementUnit = { unit_id: number; unit_code: string; unit_label: string; is_packet_based: boolean };

type Props = { productId: string }

export default function EditProduct({ productId }: Props) {
  const router = useRouter()
  const [Currency, setCurrency] = useState('Rs')

  const [loading, setLoading] = useState(false)        // saving product
  const [loadingData, setLoadingData] = useState(true) // fetching dropdowns

  const initialForm = {
    product_code: '', product_name: '', sku: '', product_note: '', category_id: '', subcategory_id: '', tax_id: '', image: '', buying_price: '',
    selling_price: '', start_date: '', end_date: '', special_offer_price: '', product_quantity: '', notify_bellow_quantity: '',
    tag: '', measurement_units: '', packet_size: '',
    // ADDED: Expiration date fields
    expiration_date: '', has_expiration: false, days_before_expiry_alert: '30'
  };

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [measurementUnits, setMeasurementUnits] = useState<MeasurementUnit[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [tierPrices, setTierPrices] = useState<{ quantity_above: string, selling_price_tier: string }[]>([]);
  const [productAttribute, setProductAttribute] = useState<{ attribute_name: string; value: string }[]>([]);

  // Fetch initial dropdowns and currency
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);

        const [currencyData, taxRes, categoryRes, unitRes] = await Promise.all([
          fetchCurrency(),
          fetch("/api/taxes"),
          fetch("/api/categories"),
          fetch("/api/measurement-units")
        ]);

        if (currencyData?.currency) setCurrency(currencyData.currency);

        const taxJson = await taxRes.json();
        if (taxJson.success) setTaxes(taxJson.data);

        const catJson = await categoryRes.json();
        if (catJson.success) setCategories(catJson.data);

        const unitJson = await unitRes.json();
        if (unitJson.success) setMeasurementUnits(unitJson.data);
      } catch (err) {
        console.error("Failed to fetch form data", err);
        toast.error("Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!form.category_id) return;
    const fetchSubcategories = async () => {
      try {
        setLoadingData(true);
        const res = await fetch(`/api/subcategories/${form.category_id}`);
        const data = await res.json();
        if (data.success) setSubcategories(data.data);
      } catch (err) {
        console.error("Failed to fetch subcategories", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchSubcategories();
  }, [form.category_id]);

  // Load product data for editing
  useEffect(() => {
    if (!productId) return;
    const loadProduct = async () => {
      try {
        setLoadingData(true);
        // call server action you provided
        const product: any = await ServerProductById(productId)
        if (!product) {
          toast.error("Product not found");
          return;
        }

        // fill main form fields exactly as AddProduct naming
        setForm({
          product_code: product.product_code || '',
          product_name: product.product_name || '',
          sku: (product as any).sku || '',
          product_note: product.product_note || '',
          category_id: product.subcategory?.category?.category_id?.toString() || '',
          subcategory_id: product.subcategory?.subcategory_id?.toString() || '',
          tax_id: product.tax?.tax_id?.toString() || '',
          image: '',
          buying_price: product.prices?.[0]?.buying_price?.toString() || '',
          selling_price: product.prices?.[0]?.selling_price?.toString() || '',
          start_date: product.special_offers?.[0]?.start_date ? new Date(product.special_offers[0].start_date).toISOString().split('T')[0] : '',
          end_date: product.special_offers?.[0]?.end_date ? new Date(product.special_offers[0].end_date).toISOString().split('T')[0] : '',
          special_offer_price: product.special_offers?.[0]?.offer_price?.toString() || '',
          product_quantity: product.inventories?.[0]?.product_quantity?.toString() || '',
          notify_bellow_quantity: product.inventories?.[0]?.notify_quantity?.toString() || '',
          tag: product.tags?.map((t: any) => t.tag).join(',') || '',
          measurement_units: product.measurement_units || '',
          packet_size: product.packet_size !== null && product.packet_size !== undefined ? String(product.packet_size) : '',
          // ADDED: Expiration date fields
          has_expiration: product.has_expiration || false,
          expiration_date: product.expiration_date ? new Date(product.expiration_date).toISOString().split('T')[0] : '',
          days_before_expiry_alert: product.days_before_expiry_alert?.toString() || '30'
        });

        // tier prices
        setTierPrices(
          (product.tier_prices || []).map((t: any) => ({
            quantity_above: (t.quantity_above ?? '').toString(),
            selling_price_tier: (t.tier_price ?? '').toString()
          }))
        );

        // attributes
        setProductAttribute(
          (product.attributes || []).map((a: any) => ({
            attribute_name: a.attribute_name ?? '',
            value: a.attribute_value ?? ''
          }))
        );

        // existing image preview - prefer images relation if present
        if (product.images && product.images.length > 0) {
          setExistingImagePath(product.images[0].image_path || null);
        } else if (product.barcode_path) {
          setExistingImagePath(product.barcode_path || null);
        } else {
          setExistingImagePath(null);
        }

        // load subcategories for selected category
        if (product.subcategory?.category?.category_id) {
          try {
            const res = await fetch(`/api/subcategories/${product.subcategory.category.category_id}`);
            const json = await res.json();
            if (json.success) setSubcategories(json.data);
          } catch (err) {
            // ignore
          }
        }
      } catch (err) {
        console.error("Failed to load product", err);
        toast.error("Failed to load product data");
      } finally {
        setLoadingData(false);
      }
    };
    loadProduct();
  }, [productId]);

  // Handlers (kept identical to AddProduct)
  const handleChangeSelectCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "category_id") setForm(prev => ({ ...prev, subcategory_id: "" }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({ 
      ...form, 
      [name]: type === 'checkbox' ? checked : value 
    });
  }

  const handleChangeTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // === FIXED: measurement unit logic ===
  // When user selects a different measurement unit:
  // - If value !== "pieces", clear packet_size in state so we don't send an empty string later.
  // - If value === "pieces", leave packet_size as-is (user can edit or keep previous if loaded).
  const handleChangeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "measurement_units") {
      const isPacketBased = measurementUnits.find(u => u.unit_code === value)?.is_packet_based
      if (!isPacketBased) {
        // clear the packet_size because unit is not packet-based
        setForm(prev => ({ ...prev, measurement_units: value, packet_size: "" }));
      } else {
        // show input again (packet_size remains whatever is in state - loaded value or empty)
        setForm(prev => ({ ...prev, measurement_units: value }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setExistingImagePath(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Product Attributes
  const handleAddAttribute = () => setProductAttribute([...productAttribute, { attribute_name: '', value: '' }]);
  const handleAttributeChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.name as ProductAttributeKey;
    setProductAttribute(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: e.target.value };
      return updated;
    });
  };
  const handleRemoveAttribute = (index: number) => setProductAttribute(productAttribute.filter((_, i) => i !== index));

  // Tier Prices
  const handleAddTire = () => setTierPrices([...tierPrices, { quantity_above: '', selling_price_tier: '' }]);
  const handleTierChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.name as TierPriceKey;
    setTierPrices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: e.target.value };
      return updated;
    });
  };
  const handleRemoveTire = (index: number) => setTierPrices(tierPrices.filter((_, i) => i !== index));

  // Submit (update) — same shape as AddProduct submission but POST to update endpoint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();

      // Append all fields from state except packet_size we handle conditionally below
      Object.entries(form).forEach(([key, value]) => {
        if (key === "packet_size") return; // skip for now
        if (key === 'has_expiration') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, value as string);
        }
      });

      // Append packet_size ONLY if measurement_units === "pieces" and packet_size is non-empty
      if (form.measurement_units === "pieces") {
        if (form.packet_size !== '' && form.packet_size !== null && form.packet_size !== undefined) {
          formData.append("packet_size", form.packet_size as string);
        } else {
          // if pieces selected but user left packet_size empty, append empty string to let backend decide
          // OR you can choose to not append at all. We'll append empty so backend can treat it as empty.
          formData.append("packet_size", "");
        }
      } else {
        // when unit isn't pieces, do NOT append packet_size at all — backend should set it to null
        // (your backend logic should handle absence of packet_size accordingly)
      }

      if (imageFile) formData.append("file", imageFile);

      tierPrices.forEach((tier, i) => {
        formData.append(`tierPrices[${i}][quantity_above]`, tier.quantity_above);
        formData.append(`tierPrices[${i}][selling_price_tier]`, tier.selling_price_tier);
      });
      productAttribute.forEach((attr, i) => {
        formData.append(`productAttribute[${i}][attribute_name]`, attr.attribute_name);
        formData.append(`productAttribute[${i}][value]`, attr.value);
      });

      const res = await fetch(`/api/update-product/${productId}`, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        toast.success("Product updated successfully!");
        router.push('/dashboard/product/manage-product');
      } else {
        toast.error(data.error || "Failed to update product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <section className="content text-center">
        <i className="fa fa-spinner fa-spin fa-2x" /> <p>Loading form data...</p>
      </section>
    )
  }

  return (
    <section className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Edit Product</h3>
            </div>

            <form role="form" id="editProductForm" onSubmit={handleSubmit}>
              <ul id="tabs" className="nav nav-tabs" data-tabs="tabs">
                <li className="active"><a href="#general" data-toggle="tab">General</a></li>
                <li><a href="#price" data-toggle="tab">Price</a></li>
                <li><a href="#inventory" data-toggle="tab">Inventory</a></li>
                <li><a href="#attribute" data-toggle="tab">Attribute & Tag</a></li>
              </ul>

              <div className="row">
                <div className="col-md-6 col-sm-12 col-xs-12 col-md-offset-3">
                  <div id="my-tab-content" className="tab-content">

                    {/* GENERAL TAB */}
                    <div className="tab-pane active" id="general">
                      <div className="form-group">
                        <label>Product Code *</label>
                        <input type="text" name="product_code" value={form.product_code} onChange={handleChange} required className="form-control" />
                      </div>
                      <div className="form-group">
                        <label>Product Name *</label>
                        <input type="text" name="product_name" value={form.product_name} onChange={handleChange} required className="form-control" />
                      </div>
                      <div className="form-group">
                        <label>SKU <small style={{ fontWeight: 400 }}>(optional, separate from product code/barcode)</small></label>
                        <input type="text" name="sku" value={form.sku} onChange={handleChange} className="form-control" />
                      </div>
                      <div className="form-group">
                        <label>Product Note</label>
                        <textarea name="product_note" value={form.product_note} onChange={handleChangeTextArea} className="form-control" />
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <SearchableSelect
                          className="form-control"
                          placeholder="Select Category"
                          value={String(form.category_id)}
                          onChange={(v) => setForm(prev => ({ ...prev, category_id: v, subcategory_id: '' }))}
                          options={categories.map(cat => ({ value: String(cat.category_id), label: cat.category_name }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Subcategory</label>
                        <SearchableSelect
                          className="form-control"
                          placeholder="Select Subcategory"
                          value={String(form.subcategory_id)}
                          onChange={(v) => setForm(prev => ({ ...prev, subcategory_id: v }))}
                          options={subcategories.map(sub => ({ value: String(sub.subcategory_id), label: sub.subcategory_name }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Tax *</label>
                        <SearchableSelect
                          className="form-control"
                          placeholder="Select Tax"
                          value={String(form.tax_id)}
                          onChange={(v) => setForm(prev => ({ ...prev, tax_id: v }))}
                          options={taxes.map(tax => ({
                            value: String(tax.tax_id),
                            label: `${tax.tax_title} - ${tax.tax_rate} ${tax.tax_type === 1 ? 'Percentage (%)' : `Fixed (${Currency})`}`,
                          }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Product Image</label>
                        <input type="file" accept="image/*" onChange={handleImage} />
                        {existingImagePath && (
                          <div style={{ marginTop: 8 }}>
                            <small>Current image preview:</small>
                            <div>
                              <img src={existingImagePath} alt="product" style={{ maxWidth: 120, maxHeight: 120, marginTop: 6 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PRICE TAB */}
                    <div className="tab-pane" id="price">
                      <div className="alert alert-info" style={{ fontSize: 12, padding: '8px 12px', marginBottom: 14 }}>
                        <i className="fa fa-info-circle" />{' '}
                        <strong>Default Prices:</strong> These are the baseline prices for the POS.
                        Each <strong>Batch Purchase</strong> can set its own buying &amp; selling price which will update these defaults.
                      </div>
                      <div className="form-group">
                        <label>Buying Price * <small className="text-muted">(default / fallback)</small></label>
                        <div className="input-group">
                          <span className="input-group-addon">{Currency}</span>
                          {/* CHANGED: Added step="0.01" for decimal support */}
                          <input type="number" step="0.01" name="buying_price" value={form.buying_price} onChange={handleChange} required className="form-control" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Selling Price * <small className="text-muted">(default / fallback)</small></label>
                        <div className="input-group">
                          <span className="input-group-addon">{Currency}</span>
                          {/* CHANGED: Added step="0.01" for decimal support */}
                          <input type="number" step="0.01" name="selling_price" value={form.selling_price} onChange={handleChange} required className="form-control" />
                        </div>
                      </div>
                      <h5>Special Offer</h5>
                      <div className="form-group">
                        <label>Start Date</label>
                        <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className="form-control" />
                      </div>
                      <div className="form-group">
                        <label>End Date</label>
                        <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className="form-control" />
                      </div>
                      <div className="form-group">
                        <label>Special Offer Price</label>
                        <div className="input-group">
                          <span className="input-group-addon">{Currency}</span>
                          {/* CHANGED: Added step="0.01" for decimal support */}
                          <input type="number" step="0.01" name="special_offer_price" value={form.special_offer_price} onChange={handleChange} className="form-control" />
                        </div>
                      </div>

                      {/* Tier Prices Section - Uncommented if needed */}
                      {/* <h5>Tier Price</h5>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Quantity Above</th>
                            <th>Selling Price ({Currency})</th>
                            <th><button className="btn btn-info" onClick={(e) => { e.preventDefault(); handleAddTire(); }}>Add</button></th>
                          </tr>
                        </thead>
                        <tbody>
                          {tierPrices.map((tier, i) => (
                            <tr key={i}>
                              <td><input type="number" step="0.01" name="quantity_above" value={tier.quantity_above} onChange={e => handleTierChange(i, e)} className="form-control" /></td>
                              <td><input type="number" step="0.01" name="selling_price_tier" value={tier.selling_price_tier} onChange={e => handleTierChange(i, e)} className="form-control" /></td>
                              <td>
                                {i === 0 ? null : <button className="btn btn-danger" onClick={e => { e.preventDefault(); handleRemoveTire(i); }}>Remove</button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table> */}

                    </div>

                    {/* INVENTORY TAB */}
                    <div className="tab-pane" id="inventory">
                      <div className="form-group">
                        <label>Product Quantity</label>
                        {/* CHANGED: Added step="0.01" for decimal support */}
                        <input type="number" step="0.01" name="product_quantity" value={form.product_quantity} onChange={handleChange} className="form-control" />
                      </div>
                      <div className="form-group">
                        <label>Notify Below Quantity</label>
                        {/* CHANGED: Added step="0.01" for decimal support */}
                        <input type="number" step="0.01" name="notify_bellow_quantity" value={form.notify_bellow_quantity} onChange={handleChange} className="form-control" />
                      </div>
                      
                      {/* ADDED: Expiration Date Section */}
                      <h5>Expiration Date Settings</h5>
                      <div className="form-group">
                        <div className="checkbox">
                          <label>
                            <input 
                              type="checkbox" 
                              name="has_expiration" 
                              checked={form.has_expiration} 
                              onChange={handleChange}
                            /> This product expires
                          </label>
                        </div>
                      </div>
                      
                      {form.has_expiration && (
                        <>
                          <div className="form-group">
                            <label>Expiration Date</label>
                            <input 
                              type="date" 
                              name="expiration_date" 
                              value={form.expiration_date} 
                              onChange={handleChange} 
                              className="form-control" 
                            />
                          </div>
                          <div className="form-group">
                            <label>Alert Before Expiry (Days)</label>
                            <input 
                              type="number" 
                              name="days_before_expiry_alert" 
                              value={form.days_before_expiry_alert} 
                              onChange={handleChange} 
                              className="form-control" 
                              min="1"
                              max="365"
                              placeholder="Default: 30 days"
                            />
                          </div>
                        </>
                      )}

                      <div className="form-group">
                        <label>Measurement Units</label>
                        <SearchableSelect
                          className="form-control"
                          placeholder="Select Measurement Units"
                          value={form.measurement_units}
                          onChange={(v) => {
                            const isPacketBased = measurementUnits.find(u => u.unit_code === v)?.is_packet_based
                            if (!isPacketBased) {
                              setForm(prev => ({ ...prev, measurement_units: v, packet_size: '' }))
                            } else {
                              setForm(prev => ({ ...prev, measurement_units: v }))
                            }
                          }}
                          options={measurementUnits.map(u => ({ value: u.unit_code, label: u.unit_label }))}
                        />
                      </div>

                      {measurementUnits.find(u => u.unit_code === form.measurement_units)?.is_packet_based && (
                        <div className="form-group">
                          <label>How many pieces in one packet?</label>
                          {/* CHANGED: Added step="0.01" for decimal support */}
                          <input
                            type="number"
                            step="0.01"
                            name="packet_size"
                            value={form.packet_size}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g. 7"
                          />
                        </div>
                      )}
                    </div>

                    {/* ATTRIBUTE TAB */}
                    <div className="tab-pane" id="attribute">
                      <h5>Product Attributes</h5>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Attribute</th>
                            <th>Value</th>
                            <th><button className="btn btn-info" onClick={e => { e.preventDefault(); handleAddAttribute(); }}>Add</button></th>
                          </tr>
                        </thead>
                        <tbody>
                          {productAttribute.map((attr, i) => (
                            <tr key={i}>
                              <td><input type="text" name="attribute_name" value={attr.attribute_name} onChange={e => handleAttributeChange(i, e)} className="form-control" /></td>
                              <td><input type="text" name="value" value={attr.value} onChange={e => handleAttributeChange(i, e)} className="form-control" /></td>
                              <td>{i === 0 ? null : <button className="btn btn-danger" onClick={e => { e.preventDefault(); handleRemoveAttribute(i); }}>Remove</button>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <h5>Product Tag</h5>
                      <input type="text" name="tag" value={form.tag} onChange={handleChange} className="form-control" />
                    </div>

                  </div>
                </div>
              </div>

              <div className="box-footer">
                <button type="submit" className="btn bg-navy btn-flat col-md-offset-3" disabled={loading}>
                  {loading ? <><i className="fa fa-spinner fa-spin" /> Saving...</> : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}