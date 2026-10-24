"use client"

import { SessionProvider } from "next-auth/react";
import { installSessionOfflineGuard } from "@/lib/sessionOfflineGuard";

// Runs at import time, i.e. before SessionProvider makes its first request.
installSessionOfflineGuard();

export function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
