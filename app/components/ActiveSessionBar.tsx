"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Flame } from "lucide-react";

export default function ActiveSessionBar() {
    const pathname = usePathname();
    const [active, setActive] = useState(false);

    useEffect(() => {
        function check() {
            setActive(localStorage.getItem("sevel_active_session") === "true");
        }
        check();
        const id = setInterval(check, 2000);
        return () => clearInterval(id);
    }, [pathname]);

    if (!active || pathname === "/workout") return null;

    return (
        <Link
            href="/workout"
            className="block bg-orange-500/15 border-b border-orange-400/30 text-xs font-mono text-orange-300 text-center py-2 px-4 hover:bg-orange-500/20 transition"
        >
            <Flame size={12} className="inline -mt-0.5 mr-1.5" />
            WORKOUT IN PROGRESS — TAP TO RESUME
        </Link>
    );
}
