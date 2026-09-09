'use client';
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { getCompanyName, getCompanyLogo } from "@/components/OrderProcess/actions/FetchCompanyDetails";

export default function FranchiseLogin() {
    const params = useParams();
    const slug = String(params.slug || "");

    const [error, setError] = useState("");
    const [shopName, setShopName] = useState("");
    const [shopLogo, setShopLogo] = useState("");
    const [isHeadOffice, setIsHeadOffice] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const check = async () => {
            try {
                // Check the configurable Head Office slug first (Settings →
                // Theme Settings → "Head Office Login URL Slug") before
                // assuming this is meant to be a franchise's slug.
                const themeRes = await fetch('/api/theme-settings')
                const themeJson = await themeRes.json()
                const hqSlugSetting = themeJson.success
                    ? themeJson.data.find((s: any) => s.setting_key === 'head_office_login_slug')
                    : null
                const hqSlug = hqSlugSetting?.setting_value || 'head-office'

                if (slug === hqSlug) {
                    setIsHeadOffice(true)
                    // Head Office's branding comes from the shared company
                    // profile (shop_id=1), same source as the main site
                    // header — not the by-slug franchise lookup, which
                    // matches on tbl_shop.login_slug and wouldn't find
                    // Head Office (it doesn't have one).
                    try {
                        const name = await getCompanyName()
                        const logo = await getCompanyLogo()
                        if (name) setShopName(name)
                        if (logo) setShopLogo(logo)
                    } catch {
                        // Branding is optional here — login still works without it
                    }
                    setChecking(false)
                    return
                }

                const res = await fetch(`/api/shops/by-slug/${slug}`)
                const json = await res.json()
                if (json.success) {
                    setShopName(json.data.shop_name)
                    if (json.data.logo) setShopLogo(json.data.logo)
                } else {
                    setNotFound(true)
                }
            } catch {
                setNotFound(true)
            } finally {
                setChecking(false)
            }
        }
        check()
    }, [slug]);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.target as HTMLFormElement);
        const email = formData.get('email');
        const password = formData.get('password');

        const res = await signIn("credentials", {
            redirect: false,
            email,
            password,
            // Head Office logins don't pass shopSlug at all — Head Office
            // accounts are already exempt from the franchise-membership
            // check, and passing it here would incorrectly try to match
            // this slug against a real tbl_shop row that doesn't exist.
            ...(isHeadOffice ? {} : { shopSlug: slug }),
        });

        if (res?.error) {
            // NextAuth passes through the message thrown inside authorize()
            // (e.g. the rate-limit message) as res.error — show that
            // directly when it's not just the generic "CredentialsSignin"
            // code, so someone actually sees "too many attempts" instead
            // of a misleading "wrong password".
            const isGenericCode = !res.error || res.error === "CredentialsSignin";
            const msg = isGenericCode
                ? (isHeadOffice
                    ? "Invalid email/password, or this account isn't a Head Office admin."
                    : "Invalid email/password, or this account doesn't belong to this franchise.")
                : res.error;
            setError(msg);
            toast.error(msg);
            setLoading(false);
        } else {
            toast.success("Login successful 🎉");
            router.push("/dashboard");
        }
    };

    if (checking) {
        return <div className="text-center" style={{ marginTop: 100, color: '#8a90a3' }}>Loading...</div>;
    }

    if (notFound) {
        return (
            <div className="login-box">
                <div className="login-box-body text-center">
                    <p>No franchise found for this login link.</p>
                    <a href="/">Go to the main login page</a>
                </div>
            </div>
        );
    }

    return (
        <div className="">
            {error && (
                <div className="alert alert-danger text-center"> {error} </div>
            )}

            <div className="login-box">
                <div className="login-logo animated fadeInDown" data-animation="fadeInDown">
                    {shopLogo && (
                        <img
                            src={`/api/uploads/${encodeURIComponent(shopLogo)}`}
                            alt=""
                            style={{ maxHeight: 70, maxWidth: '80%', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }}
                            onError={() => setShopLogo('')}
                        />
                    )}
                    <a href="#"><b>{shopName}</b></a>
                    <div style={{ fontSize: 12, color: '#8a90a3', fontWeight: 400, marginTop: 4 }}>
                        {isHeadOffice ? 'Head Office Login' : 'Franchise Login'}
                    </div>
                </div>
                <div className="login-box-body  animated fadeInUp" data-animation="fadeInUp">
                    <form onSubmit={handleLogin}>
                        <div className="form-group has-feedback">
                            <input type="text" name="email" className="form-control" placeholder="Email" required />
                            <span className="glyphicon glyphicon-envelope form-control-feedback"></span>
                        </div>
                        <div className="form-group has-feedback">
                            <input type="password" name="password" className="form-control" placeholder="Password" required />
                            <span className="glyphicon glyphicon-lock form-control-feedback"></span>
                        </div>
                        <div className="form-group has-feedback">
                            <button
                                type="submit"
                                className="btn bg-orange btn-block btn-flat"
                                disabled={loading}
                            >
                                {loading ? "Processing..." : "Login"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
