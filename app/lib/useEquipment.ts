"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabase";

const EQUIPMENT_EVENT = "sevel:equipment-changed";
const EQUIPMENT_KEY = "sevel_equipment";

type EquipmentCache = {
  equipmentAccess: string[];
  gymType: string | null;
};

export function useEquipment() {
  const { user } = useAuth();
  const [equipmentAccess, setEquipmentAccess] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(EQUIPMENT_KEY);
        if (cached) return (JSON.parse(cached) as EquipmentCache).equipmentAccess ?? [];
      } catch {}
    }
    return [];
  });
  const [gymType, setGymType] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(EQUIPMENT_KEY);
        if (cached) return (JSON.parse(cached) as EquipmentCache).gymType ?? null;
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("equipment_access, gym_type")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const ea: string[] = data?.equipment_access ?? [];
        const gt: string | null = data?.gym_type ?? null;
        setEquipmentAccess(ea);
        setGymType(gt);
        try {
          localStorage.setItem(EQUIPMENT_KEY, JSON.stringify({ equipmentAccess: ea, gymType: gt }));
        } catch {}
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    function onChanged(e: Event) {
      const detail = (e as CustomEvent).detail as EquipmentCache;
      setEquipmentAccess(detail.equipmentAccess);
      setGymType(detail.gymType);
    }
    window.addEventListener(EQUIPMENT_EVENT, onChanged);
    return () => window.removeEventListener(EQUIPMENT_EVENT, onChanged);
  }, []);

  return { equipmentAccess, gymType, loading };
}

export function broadcastEquipmentChange(equipmentAccess: string[], gymType: string | null) {
  const payload: EquipmentCache = { equipmentAccess, gymType };
  try {
    localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(payload));
  } catch {}
  window.dispatchEvent(new CustomEvent(EQUIPMENT_EVENT, { detail: payload }));
}
