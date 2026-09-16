"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabase";

const UNIT_KEY = "sevel_unit";
const UNIT_EVENT = "sevel:unit-changed";

export type WeightUnit = "kg" | "lbs";

export function useUnits() {
  const { user } = useAuth();
  const [unit, setUnitState] = useState<WeightUnit>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(UNIT_KEY);
      return stored === "imperial" ? "lbs" : "kg";
    }
    return "kg";
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("unit_preference").eq("id", user.id).maybeSingle().then(({ data }) => {
      const u: WeightUnit = data?.unit_preference === "imperial" ? "lbs" : "kg";
      setUnitState(u);
      localStorage.setItem(UNIT_KEY, data?.unit_preference ?? "metric");
    });
  }, [user]);

  useEffect(() => {
    function onChanged(e: Event) {
      const pref = (e as CustomEvent).detail as string;
      setUnitState(pref === "imperial" ? "lbs" : "kg");
    }
    window.addEventListener(UNIT_EVENT, onChanged);
    return () => window.removeEventListener(UNIT_EVENT, onChanged);
  }, []);

  return unit;
}

export function broadcastUnitChange(pref: "metric" | "imperial") {
  localStorage.setItem(UNIT_KEY, pref);
  window.dispatchEvent(new CustomEvent(UNIT_EVENT, { detail: pref }));
}
