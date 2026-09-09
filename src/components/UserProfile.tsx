'use client';
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getCompanyName, getCompanyLogo } from "./OrderProcess/actions/FetchCompanyDetails";

export default function UserProfile() {
    const { data: session } = useSession();
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState('');

    useEffect(() => {
        getCompanyName().then((n) => { if (n) setCompanyName(n) });
        getCompanyLogo().then((l) => { if (l) setCompanyLogo(l) });
    }, []);

    const hasRealImage = session?.user?.image && session.user.image !== 'default.jpg';
    const initials = (session?.user?.name || '?').trim().slice(0, 2).toUpperCase();

    return (
        <>
            <div className="user-panel">
                <div className="pull-left image">
                    {session && (
                        hasRealImage ? (
                            <img
                                src={`/api/uploads/${encodeURIComponent(session.user.image!)}`}
                                alt="User Image"
                                className="img-circle"
                            />
                        ) : (
                            <div
                                className="img-circle"
                                style={{
                                    width: 45, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#4f46e5', color: '#fff', fontSize: 16, fontWeight: 700,
                                }}
                            >
                                {initials}
                            </div>
                        )
                    )}
                </div>
                <div className="pull-left info" style={{ paddingTop: '15px' }}>
                    <p>{session?.user?.name}</p>
                    {companyName && (
                        <p style={{ fontSize: 11, opacity: 0.75, marginTop: -4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {companyLogo && (
                                <img
                                    src={`/api/uploads/${encodeURIComponent(companyLogo)}`}
                                    alt=""
                                    style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: 2 }}
                                    onError={() => setCompanyLogo('')}
                                />
                            )}
                            {companyName}
                        </p>
                    )}
                </div>
            </div>
        </>
    )
}
