"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabase";
import type { Sex } from "./calorieEngine";

const SEX_EVENT = "sevel:sex-changed";
const SEX_KEY = "sevel_sex";

export function useSex() {
  const { user } = useAuth();
  const [sex, setSexState] = useState<Sex>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(SEX_KEY) as Sex) || "male";
    }
    return "male";
  });

  useEffect(() => {
    if (!user) return;
    const cached = localStorage.getItem(SEX_KEY) as Sex | null;
    if (cached) {
      setSexState(cached);
      return;
    }
    supabase.from("profiles").select("sex").eq("id", user.id).maybeSingle().then(({ data }) => {
      const s = (data?.sex as Sex) || "male";
      setSexState(s);
      localStorage.setItem(SEX_KEY, s);
    });
  }, [user]);

  useEffect(() => {
    function onSexChanged(e: Event) {
      const newSex = (e as CustomEvent).detail as Sex;
      setSexState(newSex);
    }
    window.addEventListener(SEX_EVENT, onSexChanged);
    return () => window.removeEventListener(SEX_EVENT, onSexChanged);
  }, []);

  const setSex = useCallback((newSex: Sex) => {
    setSexState(newSex);
    localStorage.setItem(SEX_KEY, newSex);
    window.dispatchEvent(new CustomEvent(SEX_EVENT, { detail: newSex }));
  }, []);

  return { sex, setSex };
}

export function broadcastSexChange(sex: Sex) {
  localStorage.setItem(SEX_KEY, sex);
  window.dispatchEvent(new CustomEvent(SEX_EVENT, { detail: sex }));
}
