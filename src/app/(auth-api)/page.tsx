'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCompanyName, getCompanyLogo } from '../../components/OrderProcess/actions/FetchCompanyDetails'

// Deliberately no login form here, and no signIn import at all — this
// page has zero ability to submit credentials anywhere, by design. Every
// account (Head Office, every franchise, every warehouse) logs in
// through its own dedicated /login/[slug] route instead. Removing the
// form here removes an entire class of attack (credential stuffing,
// brute force) against a single, publicly-guessable, unauthenticated
// entry point — there's simply nothing here to attack.
export default function Home() {
    const [companyName, setCompanyName] = useState("");
    const [companyLogo, setCompanyLogo] = useState("");
    const [headOfficeSlug, setHeadOfficeSlug] = useState("head-office");

    useEffect(() => {
        const load = async () => {
            const name = await getCompanyName();
            if (name) setCompanyName(name);
            const logo = await getCompanyLogo();
            if (logo) setCompanyLogo(logo);

            // Only used to build a link forward — this page still can't
            // submit any credentials itself.
            try {
                const res = await fetch('/api/theme-settings')
                const json = await res.json()
                const setting = json.success ? json.data.find((s: any) => s.setting_key === 'head_office_login_slug') : null
                if (setting?.setting_value) setHeadOfficeSlug(setting.setting_value)
            } catch {
                // keep the default slug
            }
        }
        load();
    }, [])

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            {companyLogo && (
                <img
                    src={`/api/uploads/${encodeURIComponent(companyLogo)}`}
                    alt=""
                    style={{ maxHeight: 90, maxWidth: '60%', objectFit: 'contain', display: 'block', margin: '0 auto 16px' }}
                    onError={() => setCompanyLogo('')}
                />
            )}
            <h1 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>{companyName}</h1>
            <p style={{ color: '#8a90a3', fontSize: 15, marginBottom: 20 }}>Welcome</p>
            
        </div>
    );
}
