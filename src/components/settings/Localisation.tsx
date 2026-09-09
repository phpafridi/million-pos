'use client'

import { useState, useEffect } from "react"
import { AddLocalisation } from "./actions/AddLocalisation";
import { fetchCurrency } from "./actions/fetchCurrency"; // you need to implement this server action
import { toast } from 'sonner'


export default function Localisation() {
    const [Currency, setCurrency] = useState<string>('Rs');
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch existing currency on mount
    useEffect(() => {
        const loadCurrency = async () => {
            try {
                const data = await fetchCurrency(); // server action returning { currency: string }
                if (data?.currency) {
                    setCurrency(data.currency);
                }
            } catch (error: any) {
                toast.error("Failed to fetch currency: " + error.message);
            } finally {
                setLoading(false);
            }
        };
        loadCurrency();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await AddLocalisation({ Currency });

            if (typeof result === "string") {
                toast.error(result);
                return;
            }

            if (result.success) {
                toast.success("Currency saved successfully");
            } else {
                toast.error("Error saving currency: " + result.error);
            }
        } catch (error: any) {
            toast.error("Unexpected error: " + error.message);
        }
    }

    if (loading) return <div className="right-side">Loading...</div>;

    return (
        <div className="right-side" style={{ minHeight: '945px' }}>
            <section className="content">
                <div className="row form_wrap">
                    <div className="col-md-12">
                        <div className="box box-primary">
                            <div className="box-header box-header-background with-border">
                                <h3 className="box-title">Currency Settings</h3>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    <div className="col-md-8 col-sm-12 col-xs-12">
                                        <div className="box-body">
                                            <div className="form-group">
                                                <label>Currency</label>
                                                <input
                                                    type="text"
                                                    placeholder="Currency"
                                                    name="currency"
                                                    required
                                                    value={Currency}
                                                    onChange={(e) => setCurrency(e.target.value)}
                                                    className="form-control"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="box-footer">
                                    <button type="submit" className="btn bg-navy btn-flat">
                                        Save Currency
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Toast container */}
            
        </div>
    )
}
