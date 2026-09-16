"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { useSex } from "../lib/useSex";
import { useModules } from "../lib/useModules";
import { getTrainPills, getTrackPills, getSocialPills, getYouPills } from "../lib/navPills";
import type { NavPill } from "./ui/sub-nav-pills";

type NavItem = { icon: any; label: string; href: string };

function pillsToNavItems(pills: NavPill[]): NavItem[] {
  return pills.map((p) => ({ icon: p.icon, label: p.label.charAt(0) + p.label.slice(1).toLowerCase(), href: p.key }));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { sex } = useSex();
  const { enabledKeys } = useModules();
  const isFemale = sex === "female";

  const sections = [
    { label: "HUB", items: [{ icon: LayoutDashboard, label: "Hub", href: "/" }] as NavItem[] },
    { label: "TRAIN", items: pillsToNavItems(getTrainPills(enabledKeys)) },
    { label: "TRACK", items: pillsToNavItems(getTrackPills(enabledKeys)) },
    { label: "SOCIAL", items: pillsToNavItems(getSocialPills(enabledKeys)) },
    { label: "YOU", items: pillsToNavItems(getYouPills(enabledKeys)) },
  ];

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    const isCycle = item.href === "/cycle";
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono transition ${
          active
            ? `border-l-2 ${isCycle ? "text-pink-400" : "text-[rgb(var(--accent-rgb))]"}`
            : "text-[var(--fg-50)] hover:text-[var(--fg-80)]"
        }`}
        style={
          active
            ? {
                backgroundColor: isCycle ? "rgba(236,72,153,0.1)" : "rgb(var(--accent-rgb) / 0.1)",
                borderColor: isCycle ? "rgb(236,72,153)" : "rgb(var(--accent-rgb))",
              }
            : undefined
        }
      >
        <item.icon size={16} />
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r backdrop-blur-xl h-screen sticky top-0 z-20 p-5 shrink-0 overflow-y-auto" style={{ borderColor: "rgb(var(--accent-rgb) / 0.1)", background: "color-mix(in srgb, var(--bg-primary) 92%, transparent)" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 border flex items-center justify-center font-bold text-sm" style={{ borderColor: "rgb(var(--accent-rgb) / 0.4)", color: "rgb(var(--accent-rgb))" }}>S</div>
        <div>
          <p className="font-bold text-[var(--text-primary)] leading-tight">SEVEL</p>
          <p className="text-[9px] tracking-widest text-[var(--fg-40)]">YOUR TRAINING SYSTEM</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border rounded px-3 py-2 mb-6 text-xs font-mono" style={{
        borderColor: isFemale ? "rgba(236,72,153,0.2)" : "rgb(var(--accent-rgb) / 0.1)",
        color: isFemale ? "rgb(236,72,153)" : "rgb(var(--accent-rgb))",
      }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: isFemale ? "rgb(236,72,153)" : "rgb(var(--accent-rgb))" }} />
        {isFemale ? "♀ FEMALE MODE" : "♂ MALE MODE"}
      </div>

      <nav className="flex-1 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-[8px] font-mono tracking-[0.2em] text-[var(--fg-20)] mb-1.5 px-3">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-4 border-t text-xs font-mono text-[var(--fg-40)] mt-3" style={{ borderColor: "rgb(var(--accent-rgb) / 0.1)" }}>
        <p>PROTOCOL</p>
        <p className="text-[var(--text-primary)] font-bold text-sm">PHASE 01</p>
        <p className="text-[10px] mt-1">SEVEL / 1.1.0</p>
      </div>
    </aside>
  );
}
