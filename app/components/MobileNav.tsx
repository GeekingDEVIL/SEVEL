"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, TrendingUp, Users, User } from "lucide-react";
import { motion, useAnimation } from "framer-motion";
import { useSex } from "../lib/useSex";
import { useModules } from "../lib/useModules";
import { getAllRoutes } from "../lib/navPills";

function TabIcon({ icon: Icon, active, onClick }: { icon: any; active: boolean; onClick?: () => void }) {
  const controls = useAnimation();

  function handleTap() {
    controls.start({
      y: [0, -6, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.35, ease: "easeOut" },
    });
    onClick?.();
  }

  return (
    <motion.div animate={controls} onTap={handleTap} className="relative">
      <Icon size={20} />
      {active && (
        <motion.div
          layoutId="tab-dot"
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[rgb(var(--accent-rgb))]"
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      )}
    </motion.div>
  );
}

export default function MobileNav() {
  const pathname = usePathname();
  const { sex } = useSex();
  const { enabledKeys } = useModules();
  const routes = getAllRoutes(enabledKeys);

  const tabs = [
    { icon: LayoutDashboard, label: "Hub", href: "/", match: ["/"] },
    { icon: Dumbbell, label: "Train", href: "/schedule", match: ["/workout", "/train", "/schedule", ...routes.train] },
    { icon: TrendingUp, label: "Track", href: "/track", match: ["/track", ...routes.track] },
    { icon: Users, label: "Social", href: "/social", match: ["/social", ...routes.social] },
    { icon: User, label: "You", href: "/you", match: ["/you", ...routes.you] },
  ];

  const isFemale = sex === "female";
  const modeColor = isFemale ? "rgb(236,72,153)" : "rgb(96,165,250)";
  const modeGlow = isFemale ? "rgba(236,72,153,0.15)" : "rgba(96,165,250,0.15)";
  const modeSymbol = isFemale ? "♀" : "♂";

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl" style={{ borderTop: `1.5px solid ${modeColor}40`, background: "color-mix(in srgb, var(--bg-primary) 92%, transparent)" }}>
      <div className="absolute inset-x-0 top-0 h-8 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${modeGlow}, transparent)` }} />
      <div className="flex items-center justify-around py-2 relative">
        {tabs.map((item) => {
          const active = item.match.includes(pathname);
          return (
            <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 px-3 py-1.5 ${active ? "text-[rgb(var(--accent-rgb))]" : "text-[var(--fg-40)]"}`}>
              <TabIcon icon={item.icon} active={active} />
              <span className="text-[9px] font-mono tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div
        className="absolute -top-3.5 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono font-semibold tracking-widest uppercase"
        style={{
          background: `linear-gradient(135deg, ${isFemale ? "rgba(236,72,153,0.2)" : "rgba(96,165,250,0.2)"}, ${isFemale ? "rgba(190,24,93,0.15)" : "rgba(59,130,246,0.15)"})`,
          border: `1px solid ${modeColor}50`,
          color: modeColor,
          boxShadow: `0 0 12px ${isFemale ? "rgba(236,72,153,0.25)" : "rgba(96,165,250,0.25)"}`,
          backdropFilter: "blur(8px)",
        }}
      >
        <span className="text-sm leading-none">{modeSymbol}</span>
        <span>{sex}</span>
      </div>
    </nav>
  );
}
