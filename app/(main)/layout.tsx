"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import ActiveSessionBar from "../components/ActiveSessionBar";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { applyAccent } from "../lib/theme";
import { useTheme } from "../lib/useTheme";

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
      <div className="min-h-screen bg-[var(--bg-sunken)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border border-[var(--border)] flex items-center justify-center font-bold text-sm text-[var(--text-muted)] rounded shimmer">S</div>
          <div className="h-1 w-24 rounded-full bg-[var(--border-subtle)] shimmer" />
        </div>
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  useTheme();
  useEffect(() => {
    applyAccent(localStorage.getItem("sevel_accent"));
  }, []);

  return (
    <AuthProvider>
      <AuthGuard>
        <ActiveSessionBar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-h-screen min-w-0 relative">
            <div className="page-ambient" />
            <div className="relative z-10">{children}</div>
          </main>
          <MobileNav />
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
