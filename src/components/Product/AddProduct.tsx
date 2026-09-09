'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from "next/navigation";
import { fetchCurrency } from "../settings/actions/fetchCurrency";
import { toast } from "sonner";
import SearchableSelect from "../shared/SearchableSelect";

type TierPriceKey = 'quantity_above' | 'selling_price_tier';
type ProductAttribute = 'attribute_name' | 'value';
type Category = { category_id: number; category_name: string; created_datetime: Date };
type Subcategory = { subcategory_id: string; subcategory_name: string };
type Tax = { tax_id: number; tax_title: string; tax_rate: number; tax_type: number };
type MeasurementUnit = { unit_id: number; unit_code: string; unit_label: string; is_packet_based: boolean };

export default function AddProduct() {
    const router = useRouter();
    const [Currency, setCurrency] = useState('Rs');

    const [loading, setLoading] = useState(false)        // saving product
    const [loadingData, setLoadingData] = useState(true) // fetching dropdowns
    const [isCheckingCode, setIsCheckingCode] = useState(false)
    const [codeError, setCodeError] = useState('')

    const initialForm = {
        product_code: '', product_name: '', sku: '', product_note: '', category_id: '', subcategory_id: '1', tax_id: '', image: '', buying_price: '',
        selling_price: '', start_date: '', end_date: '', special_offer_price: '', product_quantity: '', notify_bellow_quantity: '',
        tag: '', measurement_units: '', packet_size: '',
        // ADDED: Expiration date fields
        expiration_date: '', has_expiration: false, days_before_expiry_alert: '30'
    };

    const [form, setForm] = useState(initialForm);
    const [categories, setCategories] = useState<Category[]>([]);
    
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [measurementUnits, setMeasurementUnits] = useState<MeasurementUnit[]>([]);
    const [image, setImage] = useState<File | null>(null);
    const [tierPrices, setTierPrices] = useState<{ quantity_above: string, selling_price_tier: string }[]>([]);
    const [productAttribute, setProductAttribute] = useState<{ attribute_name: string; value: string }[]>([]);

    // Function to check product code duplication
    const checkProductCode = useCallback(async (productCode: string): Promise<boolean> => {
        if (!productCode.trim()) return false
        
        try {
            const res = await fetch(`/api/check-product-code?code=${encodeURIComponent(productCode)}`)
            if (!res.ok) return false
            
            const data = await res.json()
            return data.exists || false
        } catch (err) {
            console.error('Error checking product code:', err)
            return false
        }
    }, [])

    // Fetch initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingData(true);

                const [currencyData, taxRes, categoryRes, unitRes] = await Promise.all([
                    fetchCurrency(),
                    fetch("/api/taxes", { cache: "no-store" }),
                    fetch("/api/categories", { cache: "no-store" }),
                    fetch("/api/measurement-units", { cache: "no-store" })
                ]);

                if (currencyData?.currency) setCurrency(currencyData.currency);

                const taxJson = await taxRes.json();
                if (taxJson.success) { setTaxes(taxJson.data); if (taxJson.data?.length > 0) setForm(prev => ({ ...prev, tax_id: String(taxJson.data[0].tax_id) })); }

                const catJson = await categoryRes.json();
                if (catJson.success) { setCategories(catJson.data); if (catJson.data?.length > 0) setForm(prev => ({ ...prev, category_id: String(catJson.data[0].category_id) })); }

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
    

    // Real-time product code validation
    useEffect(() => {
        const validateProductCode = async () => {
            if (!form.product_code || form.product_code.trim().length < 1) {
                setCodeError('')
                return
            }
            
            setIsCheckingCode(true)
            try {
                const isDuplicate = await checkProductCode(form.product_code)
                if (isDuplicate) {
                    setCodeError(`❌ Product code "${form.product_code}" already exists!`)
                } else {
                    setCodeError('')
                }
            } catch (err) {
                console.error('Validation error:', err)
                setCodeError('Error checking product code')
            } finally {
                setIsCheckingCode(false)
            }
        }
        
        // Debounce the validation (wait 500ms after user stops typing)
        const timeoutId = setTimeout(validateProductCode, 500)
        return () => clearTimeout(timeoutId)
    }, [form.product_code, checkProductCode])

    // Handlers
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

    const handleChangeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setImage(e.target.files[0]);
    };

    // Product Attributes
    const handleAddAttribute = () => setProductAttribute([...productAttribute, { attribute_name: '', value: '' }]);
    const handleAttributeChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const key = e.target.name as ProductAttribute;
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

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent double-submit immediately
        if (loading) return;
        setLoading(true);

        try {
            // Validate product code
            if (!form.product_code.trim()) {
                toast.error('Product code is required!')
                setLoading(false);
                return
            }

            // Check for duplicate product code before submitting
            const isDuplicate = await checkProductCode(form.product_code)
            if (isDuplicate) {
                toast.error(`Cannot save: Product code "${form.product_code}" already exists!`)
                setLoading(false);
                return
            }

            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (key === 'has_expiration') {
                    formData.append(key, value ? 'true' : 'false');
                } else {
                    formData.append(key, value as string);
                }
            });
            if (image) formData.append("file", image);

            tierPrices.forEach((tier, i) => {
                formData.append(`tierPrices[${i}][quantity_above]`, tier.quantity_above);
                formData.append(`tierPrices[${i}][selling_price_tier]`, tier.selling_price_tier);
            });
            productAttribute.forEach((attr, i) => {
                formData.append(`productAttributes[${i}][attribute_name]`, attr.attribute_name);
                formData.append(`productAttributes[${i}][value]`, attr.value);
            });

            const res = await fetch('/api/add-product', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                toast.success("Product added successfully!");
                setForm(initialForm);
                setImage(null);
                setTierPrices([]);
                setProductAttribute([]);
    
                setCodeError(''); // Clear any error messages
            } else {
                toast.error(data.error || "Failed to add product");
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong!");
        } finally {
            setLoading(false);
        }
    }

    // Loader for fetching data
    if (loadingData) {
        return (
            <section className="content text-center">
                <i className="fa fa-spinner fa-spin fa-2x" /> <p>Loading form data...</p>
            </section>
        )
    }

    return (
        <section className="content">
            <style>{`
                .ap-root { max-width: 860px; margin: 0 auto; }
                .ap-card { background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,.08); margin-bottom: 16px; overflow: hidden; }
                .ap-card-header { background: linear-gradient(135deg,#1a2a4a,#243460); padding: 12px 18px; display: flex; align-items: center; gap: 8px; }
                .ap-card-header h4 { color: #fff; margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
                .ap-card-header .ap-num { background: rgba(255,255,255,.15); color: #fff; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
                .ap-body { padding: 18px; }
                .ap-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                .ap-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
                .ap-field { display: flex; flex-direction: column; gap: 4px; }
                .ap-field label { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .6px; }
                .ap-field label .req { color: #dc2626; margin-left: 2px; }
                .ap-field label .hint { font-size: 10px; color: #9ca3af; font-weight: 400; text-transform: none; letter-spacing: 0; margin-left: 5px; }
                .ap-input { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 7px; padding: 8px 11px; font-size: 13px; color: #111827; outline: none; transition: border .15s; background: #fff; }
                .ap-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
                .ap-input.error { border-color: #dc2626; }
                .ap-input.ok { border-color: #16a34a; }
                .ap-select { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 7px; padding: 8px 11px; font-size: 13px; color: #111827; outline: none; background: #fff; appearance: none; }
                .ap-select:focus { border-color: #3b82f6; }
                .ap-textarea { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 7px; padding: 8px 11px; font-size: 13px; color: #111827; outline: none; resize: vertical; min-height: 60px; }
                .ap-textarea:focus { border-color: #3b82f6; }
                .ap-prefix { display: flex; }
                .ap-prefix .ap-addon { background: #f3f4f6; border: 1.5px solid #e5e7eb; border-right: none; border-radius: 7px 0 0 7px; padding: 8px 10px; font-size: 13px; color: #6b7280; font-weight: 600; white-space: nowrap; }
                .ap-prefix .ap-input { border-radius: 0 7px 7px 0; }
                .ap-code-msg { font-size: 11px; margin-top: 3px; display: flex; align-items: center; gap: 4px; }
                .ap-code-msg.ok { color: #16a34a; }
                .ap-code-msg.err { color: #dc2626; }
                .ap-code-msg.checking { color: #2563eb; }
                .ap-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .ap-toggle input { width: 15px; height: 15px; accent-color: #3b82f6; cursor: pointer; }
                .ap-toggle span { font-size: 13px; color: #374151; }
                .ap-tier-row { display: grid; grid-template-columns: 1fr 1fr 36px; gap: 8px; align-items: center; margin-bottom: 8px; }
                .ap-attr-row { display: grid; grid-template-columns: 1fr 1fr 36px; gap: 8px; align-items: center; margin-bottom: 8px; }
                .ap-btn-add { background: #eff6ff; border: 1.5px dashed #3b82f6; color: #3b82f6; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 4px; transition: all .12s; }
                .ap-btn-add:hover { background: #dbeafe; }
                .ap-btn-rm { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
                .ap-submit { background: linear-gradient(135deg,#1d4ed8,#1e40af); color: #fff; border: none; border-radius: 8px; padding: 12px 32px; font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: .5px; transition: all .15s; min-width: 160px; }
                .ap-submit:hover:not(:disabled) { background: linear-gradient(135deg,#2563eb,#1d4ed8); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(29,78,216,.3); }
                .ap-submit:disabled { opacity: .5; cursor: not-allowed; transform: none; }
                .ap-footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; }
                .ap-footer-hint { font-size: 11px; color: #9ca3af; }
                .ap-divider { height: 1px; background: #f3f4f6; margin: 14px 0; }
                .ap-info { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 7px; padding: 9px 13px; font-size: 12px; color: #1e40af; margin-bottom: 12px; }
            `}</style>

            <div className="ap-root">
                <form onSubmit={handleSubmit}>

                    {/* ── Card 1: Identity ── */}
                    <div className="ap-card">
                        <div className="ap-card-header">
                            <span className="ap-num">1</span>
                            <h4><i className="fa fa-tag" style={{ marginRight: 6 }} />Product Identity</h4>
                        </div>
                        <div className="ap-body">
                            <div className="ap-grid-2">
                                <div className="ap-field">
                                    <label>Product Code <span className="req">*</span></label>
                                    <input
                                        type="text" name="product_code" autoFocus
                                        value={form.product_code} onChange={handleChange} required
                                        className={`ap-input ${codeError ? 'error' : form.product_code && !isCheckingCode ? 'ok' : ''}`}
                                        placeholder="e.g. PROD-001"
                                    />
                                    {isCheckingCode && <span className="ap-code-msg checking"><i className="fa fa-spinner fa-spin" /> Checking…</span>}
                                    {codeError && <span className="ap-code-msg err"><i className="fa fa-times" /> {codeError}</span>}
                                    {!codeError && form.product_code && !isCheckingCode && <span className="ap-code-msg ok"><i className="fa fa-check" /> Available</span>}
                                </div>
                                <div className="ap-field">
                                    <label>Product Name <span className="req">*</span></label>
                                    <input type="text" name="product_name" value={form.product_name} onChange={handleChange} required className="ap-input" placeholder="e.g. Coca Cola 500ml" />
                                </div>
                            </div>

                            <div className="ap-grid-2" style={{ marginTop: 14 }}>
                                <div className="ap-field">
                                    <label>SKU <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional, separate from product code/barcode)</span></label>
                                    <input type="text" name="sku" value={form.sku} onChange={handleChange} className="ap-input" placeholder="e.g. SKU-00123" />
                                </div>
                            </div>

                            <div className="ap-grid-2" style={{ marginTop: 14 }}>
                                <div className="ap-field">
                                    <label>Category <span className="req">*</span></label>
                                    <SearchableSelect
                                        className="ap-select"
                                        placeholder="Select category…"
                                        value={String(form.category_id)}
                                        onChange={(v) => setForm(prev => ({ ...prev, category_id: v, subcategory_id: '' }))}
                                        options={categories.map(cat => ({ value: String(cat.category_id), label: cat.category_name }))}
                                    />
                                </div>
                                <div className="ap-field">
                                    <label>Tax <span className="req">*</span></label>
                                    <SearchableSelect
                                        className="ap-select"
                                        placeholder="Select tax…"
                                        value={String(form.tax_id)}
                                        onChange={(v) => setForm(prev => ({ ...prev, tax_id: v }))}
                                        options={taxes.map(tax => ({
                                            value: String(tax.tax_id),
                                            label: `${tax.tax_title} — ${tax.tax_rate}${tax.tax_type === 1 ? '%' : ` ${Currency}`}`,
                                        }))}
                                    />
                                </div>
                            </div>

                            <div className="ap-field" style={{ marginTop: 14 }}>
                                <label>Note <span className="hint">(optional)</span></label>
                                <textarea name="product_note" value={form.product_note} onChange={handleChangeTextArea} className="ap-textarea" placeholder="Short description or note…" />
                            </div>
                        </div>
                    </div>

                    {/* ── Card 2: Pricing ── */}
                    <div className="ap-card">
                        <div className="ap-card-header">
                            <span className="ap-num">2</span>
                            <h4><i className="fa fa-money" style={{ marginRight: 6 }} />Pricing</h4>
                        </div>
                        <div className="ap-body">
                            <div className="ap-info">
                                <i className="fa fa-info-circle" style={{ marginRight: 5 }} />
                                These are <strong>default / fallback</strong> prices. Batch purchases can override per-batch.
                            </div>
                            <div className="ap-grid-2">
                                <div className="ap-field">
                                    <label>Buying Price <span className="req">*</span></label>
                                    <div className="ap-prefix">
                                        <span className="ap-addon">{Currency}</span>
                                        <input type="number" step="0.01" name="buying_price" value={form.buying_price} onChange={handleChange} required className="ap-input" placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="ap-field">
                                    <label>Selling Price <span className="req">*</span></label>
                                    <div className="ap-prefix">
                                        <span className="ap-addon">{Currency}</span>
                                        <input type="number" step="0.01" name="selling_price" value={form.selling_price} onChange={handleChange} required className="ap-input" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>

                            <div className="ap-divider" />

                            {/* Special Offer — collapsed by default */}
                            <details>
                                <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, userSelect: 'none', marginBottom: 10 }}>
                                    ▸ Special Offer Price <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                                </summary>
                                <div className="ap-grid-3" style={{ marginTop: 10 }}>
                                    <div className="ap-field">
                                        <label>Offer Price</label>
                                        <div className="ap-prefix">
                                            <span className="ap-addon">{Currency}</span>
                                            <input type="number" step="0.01" name="special_offer_price" value={form.special_offer_price} onChange={handleChange} className="ap-input" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="ap-field">
                                        <label>Start Date</label>
                                        <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className="ap-input" />
                                    </div>
                                    <div className="ap-field">
                                        <label>End Date</label>
                                        <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className="ap-input" />
                                    </div>
                                </div>
                            </details>

                            {/* Tier Prices */}
                            <details style={{ marginTop: 6 }}>
                                <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, userSelect: 'none', marginBottom: 10 }}>
                                    ▸ Tier / Bulk Prices <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — different price for larger qty)</span>
                                </summary>
                                <div style={{ marginTop: 10 }}>
                                    {tierPrices.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Min Qty</span>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Tier Price</span>
                                            <span />
                                        </div>
                                    )}
                                    {tierPrices.map((tier, i) => (
                                        <div key={i} className="ap-tier-row">
                                            <input type="number" name="quantity_above" value={tier.quantity_above} onChange={e => handleTierChange(i, e)} className="ap-input" placeholder="e.g. 10" />
                                            <input type="number" name="selling_price_tier" step="0.01" value={tier.selling_price_tier} onChange={e => handleTierChange(i, e)} className="ap-input" placeholder="0.00" />
                                            <button type="button" className="ap-btn-rm" onClick={() => handleRemoveTire(i)}><i className="fa fa-times" /></button>
                                        </div>
                                    ))}
                                    <button type="button" className="ap-btn-add" onClick={handleAddTire}>
                                        <i className="fa fa-plus" style={{ marginRight: 5 }} />Add Tier Price
                                    </button>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* ── Card 3: Stock & Units ── */}
                    <div className="ap-card">
                        <div className="ap-card-header">
                            <span className="ap-num">3</span>
                            <h4><i className="fa fa-cubes" style={{ marginRight: 6 }} />Stock & Units</h4>
                        </div>
                        <div className="ap-body">
                            <div className="ap-grid-3">
                                <div className="ap-field">
                                    <label>Opening Stock</label>
                                    <input type="number" step="0.01" name="product_quantity" value={form.product_quantity} onChange={handleChange} className="ap-input" placeholder="0" />
                                </div>
                                <div className="ap-field">
                                    <label>Low Stock Alert Below</label>
                                    <input type="number" step="0.01" name="notify_bellow_quantity" value={form.notify_bellow_quantity} onChange={handleChange} className="ap-input" placeholder="e.g. 5" />
                                </div>
                                <div className="ap-field">
                                    <label>
                                        Measurement Unit <span className="req">*</span>
                                        <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6, fontSize: 11 }}>
                                            ({measurementUnits.length} loaded)
                                        </span>
                                    </label>
                                    <SearchableSelect
                                        className="ap-select"
                                        placeholder="Select unit…"
                                        value={form.measurement_units}
                                        onChange={(v) => setForm(prev => ({ ...prev, measurement_units: v }))}
                                        options={measurementUnits.map(u => ({ value: u.unit_code, label: u.unit_label }))}
                                    />
                                </div>
                            </div>

                            {measurementUnits.find(u => u.unit_code === form.measurement_units)?.is_packet_based && (
                                <div className="ap-field" style={{ marginTop: 12, maxWidth: 220 }}>
                                    <label>Pieces per Packet <span className="req">*</span></label>
                                    <input type="number" step="1" name="packet_size" value={form.packet_size} onChange={handleChange} className="ap-input" placeholder="e.g. 12" />
                                </div>
                            )}

                            <div className="ap-divider" />

                            <label className="ap-toggle">
                                <input type="checkbox" name="has_expiration" checked={form.has_expiration} onChange={handleChange} />
                                <span>This product has an expiry date</span>
                            </label>

                            {form.has_expiration && (
                                <div className="ap-grid-2" style={{ marginTop: 12 }}>
                                    <div className="ap-field">
                                        <label>Expiry Date</label>
                                        <input type="date" name="expiration_date" value={form.expiration_date} onChange={handleChange} className="ap-input" />
                                    </div>
                                    <div className="ap-field">
                                        <label>Alert Days Before Expiry</label>
                                        <input type="number" name="days_before_expiry_alert" value={form.days_before_expiry_alert} onChange={handleChange} className="ap-input" min="1" max="365" placeholder="30" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Card 4: Image & Tag (optional, collapsed) ── */}
                    <div className="ap-card">
                        <div className="ap-card-header">
                            <span className="ap-num">4</span>
                            <h4><i className="fa fa-image" style={{ marginRight: 6 }} />Image, Tag & Attributes <span style={{ fontWeight: 400, fontSize: 10, opacity: .7, marginLeft: 6 }}>(optional)</span></h4>
                        </div>
                        <div className="ap-body">
                            <div className="ap-grid-2">
                                <div className="ap-field">
                                    <label>Product Image</label>
                                    <input type="file" accept="image/*" onChange={handleImage} className="ap-input" style={{ padding: '5px 8px' }} />
                                </div>
                                <div className="ap-field">
                                    <label>Tag</label>
                                    <input type="text" name="tag" value={form.tag} onChange={handleChange} className="ap-input" placeholder="e.g. beverage, cold-drink" />
                                </div>
                            </div>

                            {/* Attributes */}
                            <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Attributes</div>
                                {productAttribute.map((attr, i) => (
                                    <div key={i} className="ap-attr-row">
                                        <input type="text" name="attribute_name" value={attr.attribute_name} onChange={e => handleAttributeChange(i, e)} className="ap-input" placeholder="Attribute name" />
                                        <input type="text" name="value" value={attr.value} onChange={e => handleAttributeChange(i, e)} className="ap-input" placeholder="Value" />
                                        <button type="button" className="ap-btn-rm" onClick={() => handleRemoveAttribute(i)}><i className="fa fa-times" /></button>
                                    </div>
                                ))}
                                <button type="button" className="ap-btn-add" onClick={handleAddAttribute}>
                                    <i className="fa fa-plus" style={{ marginRight: 5 }} />Add Attribute
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="ap-card">
                        <div className="ap-footer">
                            <span className="ap-footer-hint">
                                <i className="fa fa-keyboard-o" style={{ marginRight: 5 }} />
                                Tab through fields · Ctrl+Enter to save
                            </span>
                            <button
                                type="submit"
                                className="ap-submit"
                                disabled={loading || isCheckingCode || !!codeError}
                            >
                                {loading
                                    ? <><i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />Saving…</>
                                    : isCheckingCode
                                    ? <><i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />Checking…</>
                                    : <><i className="fa fa-check" style={{ marginRight: 6 }} />Save Product</>
                                }
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </section>
    )
}
