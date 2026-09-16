"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { applyAccent } from "../lib/theme";

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-sunken)] flex items-center justify-center text-[var(--fg-40)] text-sm font-mono">
                Loading...
            </div>
        );
    }
    if (!user) return null;
    return <>{children}</>;
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        applyAccent(localStorage.getItem("sevel_accent"));
    }, []);

    return (
        <AuthProvider>
            <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
    );
}
