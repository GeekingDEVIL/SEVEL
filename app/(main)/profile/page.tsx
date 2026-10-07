"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { User, LogOut, Plus, Trash2, Check, Download, AlertTriangle, Eye, EyeOff, Target, Dumbbell, Shield, Globe, Camera, Pencil, X, Flame, Phone, Mail, ChevronDown, Building2, Home, Briefcase, ShieldCheck, Zap, Crown, Star, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthProvider";
import CubeLoader from "../../components/ui/cube-loader";
import CustomSelect from "../../components/CustomSelect";
import { staggerContainer, staggerItem } from "../../lib/motion";
import { GOAL_OPTIONS } from "../../lib/goals";
import { updateUserStats } from "../../lib/updateUserStats";
import { autoCompleteHabits } from "../../lib/habitAutoComplete";
import { shareProfileBadge } from "../../lib/shareCard";
import { ACCENT_PRESETS, DEFAULT_ACCENT, getAccentPreset, applyAccent, type AccentKey, type ThemeMode } from "../../lib/theme";
import { useTheme } from "../../lib/useTheme";
import { getFullCalorieSummary, ageFromDOB, type GoalType, type Sex, type ActivityLevel, type DietPreference, type CalorieSummary } from "../../lib/calorieEngine";
import { useSex, broadcastSexChange } from "../../lib/useSex";
import { broadcastUnitChange } from "../../lib/useUnits";
import { broadcastEquipmentChange } from "../../lib/useEquipment";
import { kgToUnit, weightInputToKg } from "../../lib/units";
import { rematerializeWeightTrend } from "../../lib/weightTrend";
import SwipeNav from "../../components/ui/swipe-nav";
import { getYouSections } from "../../lib/navPills";
import { useModules } from "../../lib/useModules";
import { computeLevel, getRank, getNextRank } from "../../lib/levelSystem";
import { MODULE_REGISTRY } from "../../lib/modules";

type ProfileData = {
    goal: string;
    height_cm: number | null;
    experience: string;
    training_frequency: number;
    date_of_birth: string | null;
    unit_preference: string;
    workout_time_pref: string | null;
    injury_notes: string | null;
    social_instagram: string | null;
    social_twitter: string | null;
    social_tiktok: string | null;
    social_whatsapp: string | null;
    social_snapchat: string | null;
    social_youtube: string | null;
    banner_preset: string;
    custom_banners: string[];
    profile_visibility: string;
    avatar_color: string;
    sex: Sex | null;
    activity_level: ActivityLevel;
};

type UserGoals = {
    id: string | null;
    goal_type: GoalType;
    target_weight_kg: number | null;
    target_date: string | null;
    rate_per_week_kg: number | null;
    workouts_per_week: number;
    preferred_days: string[];
    diet_preference: DietPreference;
    calorie_target_override: number | null;
    protein_target_g: number | null;
};

type TargetLift = {
    id: string;
    exercise_id: string;
    exercise_name: string;
    target_weight: number;
    achieved: boolean;
    achieved_at: string | null;
};

type Section = "stats" | "goals" | "training" | "appearance" | "privacy" | "data";

const AVATAR_COLORS = ["rgb(var(--accent-rgb))", "#34d399", "#a78bfa", "#f97316", "#ef4444", "#f59e0b", "#ec4899", "#6366f1"];

const BANNER_PRESETS: { key: string; label: string; bg: string }[] = [
    { key: "accent", label: "Accent", bg: "linear-gradient(135deg, rgb(var(--accent-rgb)/0.3) 0%, rgb(var(--accent-rgb)/0.05) 100%)" },
    { key: "ember", label: "Ember", bg: "linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c2d12 100%)" },
    { key: "ocean", label: "Ocean", bg: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #1e1b4b 100%)" },
    { key: "aurora", label: "Aurora", bg: "linear-gradient(135deg, #34d399 0%, #6366f1 50%, #a855f7 100%)" },
    { key: "sunset", label: "Sunset", bg: "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)" },
    { key: "midnight", label: "Midnight", bg: "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)" },
    { key: "crimson", label: "Crimson", bg: "linear-gradient(135deg, #ef4444 0%, #991b1b 50%, #450a0a 100%)" },
    { key: "forest", label: "Forest", bg: "linear-gradient(135deg, #22c55e 0%, #15803d 50%, #052e16 100%)" },
    { key: "neon", label: "Neon", bg: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 30%, #ec4899 60%, #f97316 100%)" },
    { key: "steel", label: "Steel", bg: "linear-gradient(135deg, #94a3b8 0%, #475569 50%, #1e293b 100%)" },
];

type StudioTab = "identity" | "socials" | "style";

const DEFAULT_PROFILE: ProfileData = {
    goal: "", height_cm: null, experience: "beginner",
    training_frequency: 5, date_of_birth: null, unit_preference: "metric",
    workout_time_pref: null, injury_notes: null, social_instagram: null,
    social_twitter: null, social_tiktok: null, social_whatsapp: null, social_snapchat: null, social_youtube: null, banner_preset: "accent", custom_banners: [], profile_visibility: "public", avatar_color: "rgb(var(--accent-rgb))",
    sex: null, activity_level: "moderate",
};

const DEFAULT_GOALS: UserGoals = {
    id: null, goal_type: "general_fitness", target_weight_kg: null,
    target_date: null, rate_per_week_kg: 0.5, workouts_per_week: 4,
    preferred_days: [], diet_preference: "balanced",
    calorie_target_override: null, protein_target_g: null,
};

const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
    { value: "lose_weight", label: "Lose Weight" },
    { value: "gain_muscle", label: "Gain Muscle" },
    { value: "body_recomp", label: "Body Recomposition" },
    { value: "maintain", label: "Maintain Weight" },
    { value: "general_fitness", label: "General Fitness" },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
    { value: "sedentary", label: "SEDENTARY", desc: "Desk job, little exercise" },
    { value: "light", label: "LIGHT", desc: "1-2 days/week" },
    { value: "moderate", label: "MODERATE", desc: "3-5 days/week" },
    { value: "active", label: "ACTIVE", desc: "6-7 days/week" },
    { value: "very_active", label: "VERY ACTIVE", desc: "Athlete / physical job" },
];

const DIET_OPTIONS: { value: DietPreference; label: string }[] = [
    { value: "balanced", label: "Balanced" },
    { value: "high_protein", label: "High Protein" },
    { value: "low_carb", label: "Low Carb" },
    { value: "keto", label: "Keto" },
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EQUIPMENT_LIST = [
    "Barbell", "Dumbbell", "Kettlebell", "Cable", "Machine",
    "Resistance Band", "Pull-up Bar", "Bench", "Squat Rack",
    "Smith Machine", "Dip Station", "EZ Curl Bar", "Leg Press",
    "Lat Pulldown", "Cable Crossover",
];

const GYM_PROFILES: { value: string; label: string; desc: string; equipment: string[] }[] = [
    { value: "commercial_gym", label: "Commercial Gym", desc: "Full access", equipment: [...EQUIPMENT_LIST] },
    { value: "home_gym", label: "Home Gym", desc: "Free weights + basics", equipment: ["Barbell", "Dumbbell", "Kettlebell", "Resistance Band", "Pull-up Bar", "Bench", "Squat Rack", "EZ Curl Bar"] },
    { value: "small_gym", label: "Small Gym", desc: "Limited machines", equipment: ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Machine", "Bench", "Squat Rack", "Pull-up Bar"] },
    { value: "traveling", label: "Traveling", desc: "Bodyweight + bands", equipment: ["Resistance Band"] },
];

export default function ProfilePage() {
    const { profile, user, refreshProfile } = useAuth();
    const router = useRouter();
    const { sex: hookSex } = useSex();
    const { enabledKeys } = useModules();
    const { mode: themeMode, setTheme: setThemeMode } = useTheme();
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [cropPos, setCropPos] = useState({ x: 0, y: 0, scale: 1 });
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const cropImgRef = useRef<HTMLImageElement | null>(null);
    const cropRef = useRef<{ pointers: Map<number, { x: number; y: number }>; origin: { x: number; y: number; scale: number }; initDist: number }>({
        pointers: new Map(), origin: { x: 0, y: 0, scale: 1 }, initDist: 0,
    });

    const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
    const [bannerCropPos, setBannerCropPos] = useState({ x: 0, y: 0, scale: 1 });
    const bannerCropCanvasRef = useRef<HTMLCanvasElement>(null);
    const bannerCropImgRef = useRef<HTMLImageElement | null>(null);
    const bannerCropRef = useRef<{ pointers: Map<number, { x: number; y: number }>; origin: { x: number; y: number; scale: number }; initDist: number }>({
        pointers: new Map(), origin: { x: 0, y: 0, scale: 1 }, initDist: 0,
    });
    const [bannerUploading, setBannerUploading] = useState(false);

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [studioTab, setStudioTab] = useState<StudioTab>("identity");
    const [editingSocial, setEditingSocial] = useState<string | null>(null);
    const [usernameInput, setUsernameInput] = useState("");
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [usernameSaving, setUsernameSaving] = useState(false);

    const [data, setData] = useState<ProfileData>(DEFAULT_PROFILE);
    const [targetLifts, setTargetLifts] = useState<TargetLift[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [section, setSection] = useState<Section | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialLoadRef = useRef(true);
    const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
    const [newLiftExercise, setNewLiftExercise] = useState("");
    const [newLiftWeight, setNewLiftWeight] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [latestWeight, setLatestWeight] = useState<number | null>(null);
    const [totalSessions, setTotalSessions] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [totalXp, setTotalXp] = useState(0);
    const [accent, setAccent] = useState<AccentKey>(DEFAULT_ACCENT);
    const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
    const [calorieSummary, setCalorieSummary] = useState<CalorieSummary | null>(null);
    const [weightInput, setWeightInput] = useState("");
    const [weightSaving, setWeightSaving] = useState(false);
    const [equipmentAccess, setEquipmentAccess] = useState<string[]>([]);
    const [activeGymProfile, setActiveGymProfile] = useState<string | null>(null);

    useEffect(() => {
        const storedAccent = localStorage.getItem("sevel_accent") as AccentKey | null;
        setAccent(getAccentPreset(storedAccent).key);
    }, []);

    function selectAccent(key: AccentKey) {
        setAccent(key);
        applyAccent(key);
        localStorage.setItem("sevel_accent", key);
    }

    const loadProfile = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const currentSex = hookSex;
        const [{ data: p }, { data: bs }] = await Promise.all([
            supabase
                .from("profiles")
                .select("unit_preference, injury_notes, social_instagram, social_twitter, social_tiktok, social_whatsapp, social_snapchat, social_youtube, banner_preset, custom_banners, profile_visibility, avatar_color, equipment_access, gym_type")
                .eq("id", user.id)
                .maybeSingle(),
            supabase
                .from("profile_body_stats")
                .select("height_cm, activity_level, goal, experience, training_frequency, workout_time_pref, date_of_birth")
                .eq("user_id", user.id)
                .eq("sex", currentSex)
                .maybeSingle(),
        ]);

        if (p) {
            setData({
                goal: bs?.goal ?? "",
                height_cm: bs?.height_cm ?? null,
                experience: bs?.experience ?? "beginner",
                training_frequency: bs?.training_frequency ?? 5,
                date_of_birth: bs?.date_of_birth ?? null,
                unit_preference: p.unit_preference ?? "metric",
                workout_time_pref: bs?.workout_time_pref ?? null,
                injury_notes: p.injury_notes,
                social_instagram: p.social_instagram,
                social_twitter: p.social_twitter,
                social_tiktok: p.social_tiktok,
                social_whatsapp: p.social_whatsapp,
                social_snapchat: p.social_snapchat,
                social_youtube: p.social_youtube,
                banner_preset: p.banner_preset ?? "accent",
                custom_banners: p.custom_banners ?? [],
                profile_visibility: p.profile_visibility ?? "public",
                avatar_color: p.avatar_color ?? "rgb(var(--accent-rgb))",
                sex: currentSex,
                activity_level: (bs?.activity_level as ActivityLevel) ?? "moderate",
            });
            setEquipmentAccess(p.equipment_access ?? []);
            setActiveGymProfile(p.gym_type ?? null);
        }
        const { data: g } = await supabase
            .from("user_goals")
            .select("id, goal_type, target_weight_kg, target_date, rate_per_week_kg, workouts_per_week, preferred_days, diet_preference, calorie_target_override, protein_target_g")
            .eq("user_id", user.id)
            .eq("sex", currentSex)
            .eq("is_active", true)
            .limit(1);

        if (g?.[0]) {
            setGoals({
                id: g[0].id,
                goal_type: g[0].goal_type as GoalType,
                target_weight_kg: g[0].target_weight_kg,
                target_date: g[0].target_date,
                rate_per_week_kg: g[0].rate_per_week_kg,
                workouts_per_week: g[0].workouts_per_week ?? 4,
                preferred_days: g[0].preferred_days ?? [],
                diet_preference: (g[0].diet_preference as DietPreference) ?? "balanced",
                calorie_target_override: g[0].calorie_target_override,
                protein_target_g: g[0].protein_target_g,
            });
        }

        // Target lifts
        const { data: lifts } = await supabase
            .from("target_lifts")
            .select("id, exercise_id, target_weight, achieved, achieved_at, exercises(name)")
            .eq("user_id", user.id)
            .order("created_at");
        setTargetLifts((lifts ?? []).map((l: any) => ({
            id: l.id, exercise_id: l.exercise_id, target_weight: l.target_weight,
            achieved: l.achieved, achieved_at: l.achieved_at,
            exercise_name: l.exercises?.name ?? "Unknown",
        })));

        // Exercises for dropdown
        const { data: exList } = await supabase.from("exercises").select("id, name").order("name").limit(500);
        setExercises(exList ?? []);

        // Latest body weight — show the raw last entry so it matches what was just logged
        const unitPref = p?.unit_preference ?? "metric";
        const loadUnit: "kg" | "lbs" = unitPref === "imperial" ? "lbs" : "kg";
        const { data: bw } = await supabase.from("body_weight_logs").select("weight").eq("user_id", user.id).eq("sex", currentSex).order("logged_at", { ascending: false }).limit(1);
        setLatestWeight(bw?.[0]?.weight ?? null);
        if (bw?.[0]?.weight != null) setWeightInput(String(kgToUnit(bw[0].weight, loadUnit)));

        // Refresh user_stats (self-heal if post-workout update failed)
        await updateUserStats(user.id).catch(() => {});

        // Summary stats
        const [{ data: sessions }, { data: statsRow }] = await Promise.all([
            supabase.from("workout_sessions").select("total_volume").eq("user_id", user.id).eq("status", "completed").eq("sex", currentSex),
            supabase.from("user_stats").select("total_xp").eq("user_id", user.id).eq("sex", currentSex).maybeSingle(),
        ]);
        setTotalSessions((sessions ?? []).length);
        setTotalVolume((sessions ?? []).reduce((s, r: any) => s + (Number(r.total_volume) || 0), 0));
        setTotalXp(statsRow?.total_xp ?? 0);

        setLoading(false);
    }, [user, hookSex]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    useEffect(() => {
        if (!user) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        initialLoadRef.current = true;
        const currentSex = hookSex;
        Promise.all([
            supabase.from("workout_sessions").select("total_volume").eq("user_id", user.id).eq("status", "completed").eq("sex", currentSex),
            supabase.from("profile_body_stats").select("height_cm, activity_level, goal, experience, training_frequency, workout_time_pref, date_of_birth").eq("user_id", user.id).eq("sex", currentSex).maybeSingle(),
            supabase.from("user_goals").select("id, goal_type, target_weight_kg, target_date, rate_per_week_kg, workouts_per_week, preferred_days, diet_preference, calorie_target_override, protein_target_g").eq("user_id", user.id).eq("sex", currentSex).eq("is_active", true).limit(1),
            supabase.from("body_weight_logs").select("weight").eq("user_id", user.id).eq("sex", currentSex).order("logged_at", { ascending: false }).limit(1),
            supabase.from("user_stats").select("total_xp").eq("user_id", user.id).eq("sex", currentSex).maybeSingle(),
        ]).then(([{ data: sessions }, { data: bs }, { data: goalRows }, { data: bw }, { data: xpRow }]) => {
            setTotalSessions((sessions ?? []).length);
            setTotalVolume((sessions ?? []).reduce((s, r: any) => s + (Number(r.total_volume) || 0), 0));
            setTotalXp(xpRow?.total_xp ?? 0);
            if (bs) {
                setData((prev) => ({
                    ...prev,
                    goal: bs.goal ?? "",
                    height_cm: bs.height_cm ?? null,
                    experience: bs.experience ?? "beginner",
                    training_frequency: bs.training_frequency ?? 5,
                    workout_time_pref: bs.workout_time_pref ?? null,
                    activity_level: (bs.activity_level as ActivityLevel) ?? "moderate",
                    date_of_birth: bs.date_of_birth ?? null,
                    sex: currentSex,
                }));
            } else {
                setData((prev) => ({
                    ...prev,
                    goal: "",
                    height_cm: null,
                    experience: "beginner",
                    training_frequency: 5,
                    workout_time_pref: null,
                    activity_level: "moderate" as ActivityLevel,
                    date_of_birth: null,
                    sex: currentSex,
                }));
            }
            if (goalRows?.[0]) {
                setGoals({
                    id: goalRows[0].id,
                    goal_type: goalRows[0].goal_type as GoalType,
                    target_weight_kg: goalRows[0].target_weight_kg,
                    target_date: goalRows[0].target_date,
                    rate_per_week_kg: goalRows[0].rate_per_week_kg,
                    workouts_per_week: goalRows[0].workouts_per_week ?? 4,
                    preferred_days: goalRows[0].preferred_days ?? [],
                    diet_preference: (goalRows[0].diet_preference as DietPreference) ?? "balanced",
                    calorie_target_override: goalRows[0].calorie_target_override,
                    protein_target_g: goalRows[0].protein_target_g,
                });
            } else {
                setGoals(DEFAULT_GOALS);
            }
            setLatestWeight(bw?.[0]?.weight ?? null);
            if (bw?.[0]?.weight != null) setWeightInput(String(kgToUnit(bw[0].weight, wUnit))); else setWeightInput("");
        });
    }, [user, hookSex]);

    function updateField(field: keyof ProfileData, value: any) {
        setData((prev) => ({ ...prev, [field]: value }));
        if (field === "sex" && (value === "male" || value === "female")) {
            broadcastSexChange(value as Sex);
            if (user) supabase.from("profiles").update({ sex: value }).eq("id", user.id);
        }
        if (field === "unit_preference" && (value === "metric" || value === "imperial")) {
            broadcastUnitChange(value);
        }
    }

    const debouncedSave = useCallback(async () => {
        if (!user) return;
        setSaving(true);
        const currentSex = hookSex;

        await Promise.all([
            supabase.from("profiles").update({
                unit_preference: data.unit_preference,
                injury_notes: data.injury_notes || null,
                social_instagram: data.social_instagram || null,
                social_twitter: data.social_twitter || null,
                social_tiktok: data.social_tiktok || null,
                social_whatsapp: data.social_whatsapp || null,
                social_snapchat: data.social_snapchat || null,
                social_youtube: data.social_youtube || null,
                banner_preset: data.banner_preset,
                custom_banners: data.custom_banners,
                profile_visibility: data.profile_visibility,
                avatar_color: data.avatar_color,
            }).eq("id", user.id),
            supabase.from("profile_body_stats").upsert({
                user_id: user.id,
                sex: currentSex,
                height_cm: data.height_cm,
                activity_level: data.activity_level,
                goal: data.goal || null,
                experience: data.experience,
                training_frequency: data.training_frequency,
                workout_time_pref: data.workout_time_pref || null,
                date_of_birth: data.date_of_birth || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,sex" }),
        ]);

        const goalPayload = {
            user_id: user.id,
            sex: currentSex,
            goal_type: goals.goal_type,
            target_weight_kg: goals.target_weight_kg,
            target_date: goals.target_date || null,
            rate_per_week_kg: goals.rate_per_week_kg,
            workouts_per_week: goals.workouts_per_week,
            preferred_days: goals.preferred_days,
            diet_preference: goals.diet_preference,
            calorie_target_override: goals.calorie_target_override,
            protein_target_g: goals.protein_target_g,
            is_active: true,
            updated_at: new Date().toISOString(),
        };
        if (goals.id) {
            await supabase.from("user_goals").update(goalPayload).eq("id", goals.id);
        } else {
            const { data: inserted } = await supabase.from("user_goals").insert(goalPayload).select("id").limit(1);
            if (inserted?.[0]) setGoals((prev) => ({ ...prev, id: inserted[0].id }));
        }

        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    }, [user, data, goals, hookSex]);

    useEffect(() => {
        if (initialLoadRef.current) {
            initialLoadRef.current = false;
            return;
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(debouncedSave, 1500);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [data, goals, debouncedSave]);

    async function logWeight() {
        if (!user || !weightInput) return;
        const raw = Number(weightInput);
        if (raw <= 0) return;
        const wKg = weightInputToKg(raw, wUnit);
        if (wKg === latestWeight) return;
        const currentSex = hookSex;
        setWeightSaving(true);
        const nowDate = new Date();
        await supabase.from("body_weight_logs").insert({ user_id: user.id, weight: wKg, context: "morning", date: `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`, sex: currentSex });
        await rematerializeWeightTrend(user.id, currentSex);
        autoCompleteHabits(user.id, "weight_logged").catch(() => {});
        setLatestWeight(wKg);
        setWeightSaving(false);
    }

    async function addTargetLift() {
        if (!user || !newLiftExercise || !newLiftWeight) return;
        await supabase.from("target_lifts").insert({
            user_id: user.id,
            exercise_id: newLiftExercise,
            target_weight: Number(newLiftWeight),
        });
        setNewLiftExercise("");
        setNewLiftWeight("");
        await loadProfile();
    }

    async function deleteTargetLift(id: string) {
        await supabase.from("target_lifts").delete().eq("id", id);
        setTargetLifts((prev) => prev.filter((l) => l.id !== id));
    }

    function csvField(v: any): string {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
    }

    async function exportData() {
        if (!user) return;

        const { data: sessions } = await supabase
            .from("workout_sessions")
            .select("id, date, title, duration_seconds, total_sets, total_volume, xp_earned, started_at, completed_at")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .eq("sex", hookSex)
            .order("date");

        if (!sessions?.length) { alert("No data to export."); return; }

        const sessionIds = sessions.map((s: any) => s.id);
        const { data: setLogs } = await supabase
            .from("exercise_set_logs")
            .select("workout_session_id, weight, reps, duration_seconds, distance, set_index, completed_at, exercises(name, body_segment)")
            .in("workout_session_id", sessionIds)
            .order("completed_at");

        const { data: weightLogs } = await supabase
            .from("body_weight_logs")
            .select("weight, logged_at, context")
            .eq("user_id", user.id)
            .eq("sex", hookSex)
            .order("logged_at");

        const sessionsSection = [
            "=== WORKOUT SESSIONS ===",
            "Date,Day,Title,Duration (min),Sets,Volume (kg),XP,Start Time,End Time",
            ...sessions.map((s: any) => {
                const day = new Date(s.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" });
                const start = s.started_at ? new Date(s.started_at).toLocaleTimeString() : "";
                const end = s.completed_at ? new Date(s.completed_at).toLocaleTimeString() : "";
                return [s.date, day, csvField(s.title || "Workout"), Math.round((s.duration_seconds || 0) / 60), s.total_sets, Math.round(Number(s.total_volume) || 0), s.xp_earned, start, end].join(",");
            }),
        ];

        const sessionDateById: Record<string, string> = {};
        sessions.forEach((s: any) => { sessionDateById[s.id] = s.date; });

        const setSection = [
            "=== SET-BY-SET LOG ===",
            "Date,Exercise,Muscle Group,Set #,Weight (kg),Reps,Duration (sec),Distance (km)",
            ...(setLogs ?? []).map((l: any) =>
                [sessionDateById[l.workout_session_id] ?? "", csvField(l.exercises?.name ?? "Unknown"), csvField(l.exercises?.body_segment ?? ""), l.set_index + 1, l.weight ?? "", l.reps ?? "", l.duration_seconds ?? "", l.distance ?? ""].join(",")
            ),
        ];

        const weightSection = [
            "=== BODY WEIGHT LOG ===",
            "Date,Time,Weight (kg),Context",
            ...(weightLogs ?? []).map((w: any) => {
                const d = new Date(w.logged_at);
                return [d.toLocaleDateString(), d.toLocaleTimeString(), w.weight, csvField(w.context ?? "")].join(",");
            }),
        ];

        const csv = [...sessionsSection, "", ...setSection, "", ...weightSection].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const _ed = new Date();
        a.download = `sevel-full-export-${_ed.getFullYear()}-${String(_ed.getMonth() + 1).padStart(2, "0")}-${String(_ed.getDate()).padStart(2, "0")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function deleteAccount() {
        if (!user) return;
        const uid = user.id;
        await supabase.from("notifications").delete().eq("user_id", uid);
        await supabase.from("achievements").delete().eq("user_id", uid);
        await supabase.from("target_lifts").delete().eq("user_id", uid);
        await supabase.from("exercise_goals").delete().eq("user_id", uid);
        await supabase.from("exercise_leaderboard").delete().eq("user_id", uid);
        await supabase.from("favorite_exercises").delete().eq("user_id", uid);
        await supabase.from("body_measurements").delete().eq("user_id", uid);
        await supabase.from("food_entries").delete().eq("user_id", uid);
        await supabase.from("daily_intake").delete().eq("user_id", uid);
        await supabase.from("my_foods").delete().eq("user_id", uid);
        await supabase.from("tdee_estimates").delete().eq("user_id", uid);
        await supabase.from("weight_trend").delete().eq("user_id", uid);
        await supabase.from("user_stats").delete().eq("user_id", uid);
        await supabase.from("body_weight_logs").delete().eq("user_id", uid);
        await supabase.from("exercise_set_logs").delete().eq("user_id", uid);
        await supabase.from("workout_sessions").delete().eq("user_id", uid);
        await supabase.from("scheduled_exercises").delete().eq("user_id", uid);
        await supabase.from("scheduled_days").delete().eq("user_id", uid);
        await supabase.from("workout_template_exercises").delete().eq("user_id", uid);
        await supabase.from("workout_templates").delete().eq("user_id", uid);
        await supabase.from("recurring_plans").delete().eq("user_id", uid);
        await supabase.from("user_goals").delete().eq("user_id", uid);
        await supabase.from("profile_body_stats").delete().eq("user_id", uid);
        await supabase.from("profiles").delete().eq("id", uid);
        await supabase.auth.signOut();
        router.push("/login");
    }

    function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !user) return;

        setAvatarError(null);
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            setAvatarError("Use a PNG, JPEG, or WEBP image.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError("Image must be under 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropSrc(reader.result as string);
            setCropPos({ x: 0, y: 0, scale: 1 });
        };
        reader.readAsDataURL(file);
    }

    async function handleCropConfirm() {
        if (!cropSrc || !user) return;
        const img = cropImgRef.current;
        if (!img) return;

        const canvas = cropCanvasRef.current;
        if (!canvas) return;
        const outSize = 512;
        canvas.width = outSize;
        canvas.height = outSize;
        const ctx = canvas.getContext("2d")!;

        ctx.clearRect(0, 0, outSize, outSize);
        ctx.beginPath();
        ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const { x, y, scale } = cropPos;
        const container = img.parentElement;
        if (!container) return;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const circleR = 130;

        const renderedW = containerW * scale;
        const renderedH = (containerW * img.naturalHeight / img.naturalWidth) * scale;

        const imgCenterX = containerW / 2 + x;
        const imgCenterY = containerH / 2 + y;

        const cropLeftInRendered = (containerW / 2 - circleR) - (imgCenterX - renderedW / 2);
        const cropTopInRendered = (containerH / 2 - circleR) - (imgCenterY - renderedH / 2);

        const sx = (cropLeftInRendered / renderedW) * img.naturalWidth;
        const sy = (cropTopInRendered / renderedH) * img.naturalHeight;
        const sSize = (circleR * 2 / renderedW) * img.naturalWidth;
        const sSizeH = (circleR * 2 / renderedH) * img.naturalHeight;

        ctx.drawImage(img, sx, sy, sSize, sSizeH, 0, 0, outSize, outSize);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setAvatarUploading(true);
            setCropSrc(null);

            const path = `${user.id}/avatar.png`;
            const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, cacheControl: "3600", contentType: "image/png" });
            if (uploadError) {
                setAvatarError("Upload failed. Try again.");
                setAvatarUploading(false);
                return;
            }

            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
            const bustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;
            await supabase.from("profiles").update({ avatar_url: bustedUrl }).eq("id", user.id);
            await refreshProfile();
            await updateUserStats(user.id);
            setAvatarUploading(false);
        }, "image/png");
    }

    function handleBannerSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !user) return;
        if (data.custom_banners.length >= 5) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return;
        if (file.size > 8 * 1024 * 1024) return;
        const reader = new FileReader();
        reader.onload = () => {
            setBannerCropSrc(reader.result as string);
            setBannerCropPos({ x: 0, y: 0, scale: 1 });
        };
        reader.readAsDataURL(file);
    }

    async function handleBannerCropConfirm() {
        if (!bannerCropSrc || !user) return;
        const img = bannerCropImgRef.current;
        if (!img) return;
        const canvas = bannerCropCanvasRef.current;
        if (!canvas) return;
        const outW = 1200;
        const outH = 400;
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, outW, outH);

        const { x, y, scale } = bannerCropPos;
        const container = img.parentElement;
        if (!container) return;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const cropW = containerW * 0.9;
        const cropH = cropW / 3;

        const renderedW = containerW * scale;
        const renderedH = (containerW * img.naturalHeight / img.naturalWidth) * scale;
        const imgCenterX = containerW / 2 + x;
        const imgCenterY = containerH / 2 + y;

        const cropLeftInRendered = (containerW / 2 - cropW / 2) - (imgCenterX - renderedW / 2);
        const cropTopInRendered = (containerH / 2 - cropH / 2) - (imgCenterY - renderedH / 2);

        const sx = (cropLeftInRendered / renderedW) * img.naturalWidth;
        const sy = (cropTopInRendered / renderedH) * img.naturalHeight;
        const sW = (cropW / renderedW) * img.naturalWidth;
        const sH = (cropH / renderedH) * img.naturalHeight;

        ctx.drawImage(img, sx, sy, sW, sH, 0, 0, outW, outH);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setBannerUploading(true);
            setBannerCropSrc(null);

            const idx = data.custom_banners.length;
            const path = `${user.id}/banner_${idx}_${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, cacheControl: "3600", contentType: "image/png" });
            if (uploadError) {
                setBannerUploading(false);
                return;
            }
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
            const bustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;
            const newBanners = [...data.custom_banners, bustedUrl];
            await supabase.from("profiles").update({ custom_banners: newBanners, banner_preset: `custom_${idx}` }).eq("id", user.id);
            setData((prev) => ({ ...prev, custom_banners: newBanners, banner_preset: `custom_${idx}` }));
            setBannerUploading(false);
        }, "image/png");
    }

    function removeCustomBanner(idx: number) {
        const newBanners = data.custom_banners.filter((_, i) => i !== idx);
        const currentIdx = data.banner_preset.startsWith("custom_") ? parseInt(data.banner_preset.split("_")[1]) : -1;
        let newPreset = data.banner_preset;
        if (currentIdx === idx) newPreset = "accent";
        else if (currentIdx > idx) newPreset = `custom_${currentIdx - 1}`;
        setData((prev) => ({ ...prev, custom_banners: newBanners, banner_preset: newPreset }));
    }

    function openProfileModal() {
        setUsernameInput(profile?.username ?? "");
        setUsernameError(null);
        setShowProfileModal(true);
    }

    async function saveUsername() {
        if (!user) return;
        const next = usernameInput.trim();
        if (!next) { setUsernameError("Username can't be empty."); return; }
        if (next === profile?.username) { return; }

        setUsernameSaving(true);
        setUsernameError(null);

        const { data: existing } = await supabase.from("profiles").select("id").eq("username", next).limit(1);
        if (existing?.length) {
            setUsernameError("username already exists");
            setUsernameSaving(false);
            return;
        }

        const { error } = await supabase.from("profiles").update({ username: next }).eq("id", user.id);
        if (error) {
            setUsernameError("Couldn't save. Try again.");
            setUsernameSaving(false);
            return;
        }

        await refreshProfile();
        await updateUserStats(user.id);
        setUsernameSaving(false);
    }

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    function updateGoal(field: keyof UserGoals, value: any) {
        setGoals((prev) => ({ ...prev, [field]: value }));
    }

    async function switchGymProfile(profileValue: string) {
        if (!user) return;
        const preset = GYM_PROFILES.find((p) => p.value === profileValue);
        if (!preset) return;
        const isAlreadyActive = activeGymProfile === profileValue;
        const nextProfile = isAlreadyActive ? null : profileValue;
        const nextEquipment = isAlreadyActive ? [] : preset.equipment;
        setActiveGymProfile(nextProfile);
        setEquipmentAccess(nextEquipment);
        broadcastEquipmentChange(nextEquipment, nextProfile);
        await supabase.from("profiles").update({ equipment_access: nextEquipment, gym_type: nextProfile }).eq("id", user.id);
    }

    async function toggleEquipment(item: string) {
        if (!user) return;
        const next = equipmentAccess.includes(item)
            ? equipmentAccess.filter((e) => e !== item)
            : [...equipmentAccess, item];
        setEquipmentAccess(next);
        setActiveGymProfile(null);
        broadcastEquipmentChange(next, null);
        await supabase.from("profiles").update({ equipment_access: next, gym_type: null }).eq("id", user.id);
    }

    const levelInfo = computeLevel(totalXp);
    const rank = getRank(levelInfo.level);
    const nextRank = getNextRank(levelInfo.level);
    const goalLabel = GOAL_TYPE_OPTIONS.find((o) => o.value === goals.goal_type)?.label;
    const RANK_ICONS: Record<string, any> = { INITIATE: Shield, IRON: Shield, BRONZE: ShieldCheck, SILVER: ShieldCheck, GOLD: Star, PLATINUM: Star, DIAMOND: Zap, MASTER: Zap, GRANDMASTER: Crown, LEGEND: Crown, MYTHIC: Crown, TRANSCENDENT: Crown };
    const RankIcon = RANK_ICONS[rank.name] ?? Shield;

    const profileCompletion = (() => {
        const fields: { key: string; label: string; done: boolean; section: Section }[] = [
            { key: "height", label: "Height", done: !!data.height_cm, section: "stats" },
            { key: "dob", label: "Date of birth", done: !!data.date_of_birth, section: "stats" },
            { key: "sex", label: "Sex", done: !!data.sex, section: "stats" },
            { key: "goal", label: "Training goal", done: !!data.goal, section: "goals" },
            { key: "goal_type", label: "Goal type", done: goals.goal_type !== "general_fitness", section: "goals" },
            { key: "experience", label: "Experience level", done: !!data.experience, section: "training" },
        ];
        const filled = fields.filter((f) => f.done).length;
        const missing = fields.filter((f) => !f.done);
        return { filled, total: fields.length, pct: Math.round((filled / fields.length) * 100), missing };
    })();

    const enabledOptional = enabledKeys.filter((k) => {
        const mod = MODULE_REGISTRY[k];
        return mod && !mod.core;
    });
    const isMetric = data.unit_preference === "metric";
    const weightUnit = isMetric ? "KG" : "LBS";
    const heightUnit = isMetric ? "CM" : "FT/IN";
    const wUnit: "kg" | "lbs" = isMetric ? "kg" : "lbs";
    const age = data.date_of_birth ? Math.floor((Date.now() - new Date(data.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    const bmi = data.height_cm && latestWeight ? Number((latestWeight / ((data.height_cm / 100) ** 2)).toFixed(1)) : null;
    const displayWeight = latestWeight !== null ? Number(kgToUnit(latestWeight, wUnit).toFixed(1)) : null;
    const displayTargetWeight = goals.target_weight_kg ? Number(kgToUnit(goals.target_weight_kg, wUnit).toFixed(1)) : null;
    const weightToGoal = displayTargetWeight && displayWeight ? Number((displayWeight - displayTargetWeight).toFixed(1)) : null;

    useEffect(() => {
        if (!latestWeight || !data.height_cm || !data.date_of_birth || !data.sex) {
            setCalorieSummary(null);
            return;
        }
        const summary = getFullCalorieSummary({
            weightKg: latestWeight,
            heightCm: data.height_cm,
            ageYears: ageFromDOB(data.date_of_birth),
            sex: data.sex,
            activity: data.activity_level,
            goalType: goals.goal_type,
            ratePerWeekKg: goals.rate_per_week_kg ?? undefined,
            diet: goals.diet_preference,
            calorieOverride: goals.calorie_target_override ?? undefined,
        });
        setCalorieSummary(summary);
    }, [latestWeight, data.height_cm, data.date_of_birth, data.sex, data.activity_level, goals.goal_type, goals.rate_per_week_kg, goals.diet_preference, goals.calorie_target_override]);

    const SECTIONS: { key: Section; label: string; desc: string; icon: any }[] = [
        { key: "stats", label: "Body Stats", desc: "Height, weight, BMI", icon: User },
        { key: "goals", label: "Goals & Nutrition", desc: "Targets, calories, macros", icon: Target },
        { key: "training", label: "Training Preferences", desc: "Experience, gym, equipment", icon: Dumbbell },
        { key: "appearance", label: "Appearance", desc: "Theme, accent, mode", icon: Shield },
        { key: "privacy", label: "Privacy & Visibility", desc: "Units, visibility", icon: EyeOff },
        { key: "data", label: "Data & Account", desc: "Export, sign out", icon: Download },
    ];

    if (loading) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
                <CubeLoader message="Loading profile…" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">

            <motion.div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5" variants={staggerContainer} initial="hidden" animate="visible">
                <SwipeNav sections={getYouSections(enabledKeys)} />

                {/* Profile Card */}
                <motion.div variants={staggerItem} className="relative rounded-2xl overflow-hidden">
                    {/* Animated gradient border */}
                    <div className="absolute inset-0 rounded-2xl" style={{
                        background: `conic-gradient(from var(--border-angle, 0deg), rgb(var(--accent-rgb) / 0.5), transparent 40%, transparent 60%, rgb(var(--accent-light-rgb) / 0.5))`,
                        padding: "1px",
                    }}>
                        <div className="w-full h-full rounded-2xl bg-[var(--bg-card)]" />
                    </div>
                    <style>{`@property --border-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; } @keyframes border-spin { to { --border-angle: 360deg; } }`}</style>
                    <div className="absolute inset-0 rounded-2xl animate-[border-spin_4s_linear_infinite]" style={{
                        background: `conic-gradient(from var(--border-angle, 0deg), rgb(var(--accent-rgb) / 0.4), transparent 30%, transparent 70%, rgb(var(--accent-light-rgb) / 0.4))`,
                        padding: "1px",
                        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        maskComposite: "exclude",
                        WebkitMaskComposite: "xor",
                    }} />

                    <div className="relative bg-[var(--bg-card)]/95 rounded-2xl">
                        {/* Banner */}
                        <div className="absolute inset-x-0 top-0 h-28 rounded-t-2xl overflow-hidden pointer-events-none">
                            {(() => {
                                const customIdx = data.banner_preset.startsWith("custom_") ? parseInt(data.banner_preset.split("_")[1]) : -1;
                                const customUrl = customIdx >= 0 ? data.custom_banners[customIdx] : null;
                                if (customUrl) return (
                                    <>
                                        <img src={customUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20" />
                                    </>
                                );
                                return <div className="absolute inset-0" style={{ background: BANNER_PRESETS.find(b => b.key === data.banner_preset)?.bg ?? BANNER_PRESETS[0].bg, opacity: 0.6 }} />;
                            })()}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-card)]" />
                        </div>

                        {/* Save indicator */}
                        {(saving || saved) && (
                            <div className="absolute top-3 right-3 z-10">
                                <span className={`text-[9px] font-mono px-2 py-1 rounded-md border transition ${saved ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/5" : "border-[var(--fg-10)] text-[var(--fg-30)] bg-[var(--fg-02)]"}`}>
                                    {saved ? "SAVED" : "SAVING..."}
                                </span>
                            </div>
                        )}

                        <div className="relative px-5 pt-6 pb-5">
                            {/* Centered Avatar + Identity */}
                            <button onClick={openProfileModal} className="w-full flex flex-col items-center text-center group">
                                {/* Avatar with glow */}
                                <div className="relative w-[96px] h-[96px] mb-3">
                                    {/* Glow */}
                                    <div className="absolute inset-[-8px] rounded-full opacity-40 blur-xl" style={{ backgroundColor: `rgb(var(--accent-rgb))` }} />
                                    {/* XP ring */}
                                    {(() => {
                                        const pct = levelInfo.isMaxLevel ? 100 : Math.round(levelInfo.progress * 100);
                                        const r = 44;
                                        const circ = 2 * Math.PI * r;
                                        const offset = circ - (pct / 100) * circ;
                                        return (
                                            <svg viewBox="0 0 96 96" className="absolute inset-0 w-full h-full -rotate-90">
                                                <defs>
                                                    <linearGradient id="xp-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="rgb(var(--accent-rgb))" />
                                                        <stop offset="100%" stopColor="rgb(var(--accent-light-rgb))" />
                                                    </linearGradient>
                                                    <filter id="xp-ring-glow">
                                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                                        <feMerge>
                                                            <feMergeNode in="blur" />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                </defs>
                                                <circle cx="48" cy="48" r={r} fill="none" stroke="var(--fg-06)" strokeWidth="3.5" />
                                                <circle cx="48" cy="48" r={r} fill="none" stroke="url(#xp-ring-grad)" strokeWidth="3.5" strokeLinecap="round"
                                                    strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" filter="url(#xp-ring-glow)" />
                                                {pct > 0 && (
                                                    <circle cx="48" cy="48" r={r} fill="none" stroke="rgb(var(--accent-light-rgb))" strokeWidth="1" strokeLinecap="round"
                                                        strokeDasharray={`1 ${circ - 1}`} strokeDashoffset={offset} className="transition-all duration-700 opacity-80" />
                                                )}
                                            </svg>
                                        );
                                    })()}
                                    <div
                                        className="absolute inset-[8px] rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold"
                                        style={{ backgroundColor: profile?.avatar_url ? "var(--bg-card)" : data.avatar_color + "15", color: data.avatar_color }}
                                    >
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            (profile?.username?.[0] ?? "?").toUpperCase()
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-full">
                                            <Pencil size={16} className="text-[var(--text-primary)]" />
                                        </div>
                                    </div>
                                    {/* Level badge */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[var(--bg-elevated)] border border-[rgb(var(--accent-rgb)/0.4)] flex items-center justify-center">
                                        <span className="text-[10px] font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{levelInfo.level}</span>
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <h1 className="text-xl font-bold text-[var(--fg-90)]">{profile?.username ?? "Unknown"}</h1>
                                    <Pencil size={10} className="shrink-0 text-[var(--fg-15)] group-hover:text-[rgb(var(--accent-light-rgb))] transition" />
                                </div>

                                {/* Rank + Goal tags */}
                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${rank.bgClass} border ${rank.border} ${rank.color}`}>
                                        <RankIcon size={10} />
                                        {rank.name}
                                    </span>
                                    {goalLabel && goalLabel !== "General Fitness" && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--fg-04)] border border-[var(--fg-08)] text-[var(--fg-40)]">
                                            {goalLabel}
                                        </span>
                                    )}
                                </div>

                                {nextRank && (
                                    <p className="text-[8px] font-mono text-[var(--fg-20)] mt-1.5">Next rank: <span className={rank.color}>{nextRank.name}</span> at Lv. {nextRank.minLevel}</p>
                                )}
                            </button>

                            {/* Share profile badge */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    shareProfileBadge({
                                        username: profile?.username ?? "Unknown",
                                        level: levelInfo.level,
                                        rankName: rank.name,
                                        totalWorkouts: totalSessions,
                                        totalXp: levelInfo.totalXp,
                                        streak: 0,
                                    });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[rgb(var(--accent-light-rgb))] hover:border-[rgb(var(--accent-light-rgb)/0.3)] transition text-[10px] font-mono"
                            >
                                <Share2 size={12} />
                                Share Profile
                            </button>

                            {/* Social handles */}
                            <div className="flex items-center gap-2 justify-center mt-3 flex-wrap">
                                {/* Instagram */}
                                {data.social_instagram ? (
                                    <a href={`https://instagram.com/${data.social_instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-04)] hover:bg-[#E1306C]/15 transition group/ig" onClick={(e) => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-none stroke-[#E1306C] group-hover/ig:stroke-[#F77737]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" className="fill-[#E1306C] group-hover/ig:fill-[#F77737] stroke-none" style={{ transition: "fill 0.2s" }}/></svg>
                                    </a>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setShowProfileModal(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-03)] hover:bg-[var(--fg-06)] transition group/ig">
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-none stroke-white/15 group-hover/ig:stroke-[#E1306C]/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" className="fill-white/15 group-hover/ig:fill-[#E1306C]/50 stroke-none" style={{ transition: "fill 0.2s" }}/></svg>
                                    </button>
                                )}
                                {/* X / Twitter */}
                                {data.social_twitter ? (
                                    <a href={`https://x.com/${data.social_twitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-04)] hover:bg-[var(--fg-08)] transition group/tw" onClick={(e) => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white/50 group-hover/tw:fill-white/90"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    </a>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setShowProfileModal(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-03)] hover:bg-[var(--fg-06)] transition group/tw">
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white/15 group-hover/tw:fill-white/30"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    </button>
                                )}
                                {/* TikTok */}
                                {data.social_tiktok ? (
                                    <a href={`https://tiktok.com/@${data.social_tiktok.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-04)] hover:bg-[#ff0050]/15 transition group/tt" onClick={(e) => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-[#ff0050]/70 group-hover/tt:fill-[#ff0050]"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.5a6.34 6.34 0 0 0 6.34-6.34V8.71a8.16 8.16 0 0 0 3.76.92V6.18a4.81 4.81 0 0 1 0 .51z"/></svg>
                                    </a>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setShowProfileModal(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-03)] hover:bg-[var(--fg-06)] transition group/tt">
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white/15 group-hover/tt:fill-[#ff0050]/40"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.5a6.34 6.34 0 0 0 6.34-6.34V8.71a8.16 8.16 0 0 0 3.76.92V6.18a4.81 4.81 0 0 1 0 .51z"/></svg>
                                    </button>
                                )}
                                {/* Snapchat */}
                                {data.social_snapchat ? (
                                    <a href={`https://snapchat.com/add/${data.social_snapchat.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-04)] hover:bg-[#FFFC00]/15 transition group/sc" onClick={(e) => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-[#FFFC00]/70 group-hover/sc:fill-[#FFFC00]"><path d="M12 2c1.94 0 3.63.5 4.87 1.64C18.1 4.77 18.7 6.4 18.7 8.3c0 .8-.05 1.57-.14 2.33-.05.37-.1.73-.16 1.08.32.1.67.15.98.15.45 0 .83-.1 1.14-.26.2-.1.43-.08.6.06.18.14.25.37.2.59-.15.6-.75.96-1.5 1.22-.35.12-.72.22-1.02.33-.12.04-.2.12-.24.22-.2.42-.05.63.04.72l.02.02c.47.47 1.01.84 1.44 1.15.4.28.7.53.88.78.28.38.3.72.18 1-.18.42-.65.7-1.38.8-.22.03-.44.04-.67.05-.1 0-.22.01-.34.02-.08 0-.1.03-.13.1-.1.24-.22.46-.37.65-.18.23-.4.33-.62.33-.06 0-.12-.01-.19-.02a3.17 3.17 0 0 0-.54-.05c-.22 0-.43.02-.65.07-.4.09-.76.32-1.17.58-.83.51-1.86 1.15-3.46 1.18h-.08c-1.6-.03-2.63-.67-3.46-1.18-.41-.26-.77-.49-1.17-.58a3.1 3.1 0 0 0-.65-.07c-.18 0-.36.02-.54.05-.07.01-.13.02-.19.02-.22 0-.44-.1-.62-.33-.15-.19-.27-.41-.37-.65-.03-.07-.05-.1-.13-.1-.12-.01-.24-.02-.34-.02-.23-.01-.45-.02-.67-.05-.73-.1-1.2-.38-1.38-.8-.12-.28-.1-.62.18-1 .18-.25.48-.5.88-.78.43-.31.97-.68 1.44-1.15l.02-.02c.09-.09.24-.3.04-.72-.04-.1-.12-.18-.24-.22-.3-.11-.67-.21-1.02-.33-.75-.26-1.35-.62-1.5-1.22-.05-.22.02-.45.2-.59.17-.14.4-.16.6-.06.31.16.69.26 1.14.26.31 0 .66-.05.98-.15-.06-.35-.11-.71-.16-1.08A17.4 17.4 0 0 1 5.3 8.3c0-1.9.6-3.53 1.83-4.66C8.37 2.5 10.06 2 12 2z"/></svg>
                                    </a>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setShowProfileModal(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-03)] hover:bg-[var(--fg-06)] transition group/sc">
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white/15 group-hover/sc:fill-[#FFFC00]/40"><path d="M12 2c1.94 0 3.63.5 4.87 1.64C18.1 4.77 18.7 6.4 18.7 8.3c0 .8-.05 1.57-.14 2.33-.05.37-.1.73-.16 1.08.32.1.67.15.98.15.45 0 .83-.1 1.14-.26.2-.1.43-.08.6.06.18.14.25.37.2.59-.15.6-.75.96-1.5 1.22-.35.12-.72.22-1.02.33-.12.04-.2.12-.24.22-.2.42-.05.63.04.72l.02.02c.47.47 1.01.84 1.44 1.15.4.28.7.53.88.78.28.38.3.72.18 1-.18.42-.65.7-1.38.8-.22.03-.44.04-.67.05-.1 0-.22.01-.34.02-.08 0-.1.03-.13.1-.1.24-.22.46-.37.65-.18.23-.4.33-.62.33-.06 0-.12-.01-.19-.02a3.17 3.17 0 0 0-.54-.05c-.22 0-.43.02-.65.07-.4.09-.76.32-1.17.58-.83.51-1.86 1.15-3.46 1.18h-.08c-1.6-.03-2.63-.67-3.46-1.18-.41-.26-.77-.49-1.17-.58a3.1 3.1 0 0 0-.65-.07c-.18 0-.36.02-.54.05-.07.01-.13.02-.19.02-.22 0-.44-.1-.62-.33-.15-.19-.27-.41-.37-.65-.03-.07-.05-.1-.13-.1-.12-.01-.24-.02-.34-.02-.23-.01-.45-.02-.67-.05-.73-.1-1.2-.38-1.38-.8-.12-.28-.1-.62.18-1 .18-.25.48-.5.88-.78.43-.31.97-.68 1.44-1.15l.02-.02c.09-.09.24-.3.04-.72-.04-.1-.12-.18-.24-.22-.3-.11-.67-.21-1.02-.33-.75-.26-1.35-.62-1.5-1.22-.05-.22.02-.45.2-.59.17-.14.4-.16.6-.06.31.16.69.26 1.14.26.31 0 .66-.05.98-.15-.06-.35-.11-.71-.16-1.08A17.4 17.4 0 0 1 5.3 8.3c0-1.9.6-3.53 1.83-4.66C8.37 2.5 10.06 2 12 2z"/></svg>
                                    </button>
                                )}
                                {/* YouTube */}
                                {data.social_youtube ? (
                                    <a href={`https://youtube.com/@${data.social_youtube.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-04)] hover:bg-[#FF0000]/15 transition group/yt" onClick={(e) => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-[#FF0000]/70 group-hover/yt:fill-[#FF0000]"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                    </a>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setShowProfileModal(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-03)] hover:bg-[var(--fg-06)] transition group/yt">
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white/15 group-hover/yt:fill-[#FF0000]/40"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                    </button>
                                )}
                                {/* WhatsApp */}
                                {data.social_whatsapp ? (
                                    <a href={`https://wa.me/${data.social_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-04)] hover:bg-[#25D366]/15 transition group/wa" onClick={(e) => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-[#25D366]/70 group-hover/wa:fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                    </a>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setShowProfileModal(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--fg-03)] hover:bg-[var(--fg-06)] transition group/wa">
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white/15 group-hover/wa:fill-[#25D366]/40"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                    </button>
                                )}
                            </div>

                            <p className="text-[9px] font-mono text-[var(--fg-15)] mt-2 text-center">
                                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—"}
                            </p>

                            {/* Divider */}
                            <div className="h-px bg-[var(--fg-06)] my-4" />

                            {/* Total XP hero + Stats Row */}
                            <div className="text-center mb-4">
                                <p className="text-[8px] font-mono text-[var(--fg-20)] tracking-widest">TOTAL XP</p>
                                <p className="text-3xl font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{levelInfo.totalXp.toLocaleString()}</p>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                <div className="text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-25)] tracking-wider">SESSIONS</p>
                                    <p className="text-lg font-bold font-mono text-[var(--fg-80)] mt-0.5">{totalSessions}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-25)] tracking-wider">VOLUME</p>
                                    <p className="text-lg font-bold font-mono text-[var(--fg-80)] mt-0.5">{(() => { const v = Math.round(kgToUnit(totalVolume, wUnit)); return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v; })()}<span className="text-[9px] font-normal text-[var(--fg-25)] ml-0.5">{wUnit}</span></p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-25)] tracking-wider">WEIGHT</p>
                                    <p className="text-lg font-bold font-mono text-[var(--fg-80)] mt-0.5">{displayWeight ?? "—"}{displayWeight != null && <span className="text-[9px] font-normal text-[var(--fg-25)] ml-0.5">{wUnit}</span>}</p>
                                </div>
                                <div className="text-center cursor-pointer" onClick={() => { if (!bmi && latestWeight) setSection("stats"); }}>
                                    <p className="text-[8px] font-mono text-[var(--fg-25)] tracking-wider">BMI</p>
                                    {bmi ? (
                                        <p className="text-lg font-bold font-mono text-[var(--fg-80)] mt-0.5">{bmi}</p>
                                    ) : latestWeight ? (
                                        <p className="text-[9px] font-mono text-[var(--fg-30)] mt-1.5">Add height</p>
                                    ) : (
                                        <p className="text-lg font-bold font-mono text-[var(--fg-80)] mt-0.5">—</p>
                                    )}
                                </div>
                            </div>

                            {/* XP Progress bar — better */}
                            {!levelInfo.isMaxLevel && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[9px] font-mono font-bold text-[var(--fg-30)]">Lv. {levelInfo.level}</span>
                                        <span className="text-[8px] font-mono text-[var(--fg-20)]">{levelInfo.xpIntoCurrentLevel} / {levelInfo.xpNeededForNext} XP</span>
                                        <span className="text-[9px] font-mono font-bold text-[rgb(var(--accent-light-rgb)/0.5)]">Lv. {levelInfo.level + 1}</span>
                                    </div>
                                    <div className="h-2.5 rounded-full bg-[var(--fg-04)] overflow-hidden relative">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{
                                                background: `linear-gradient(90deg, rgb(var(--accent-rgb)), rgb(var(--accent-light-rgb)))`,
                                                boxShadow: `0 0 12px rgb(var(--accent-rgb) / 0.4)`,
                                            }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.round(levelInfo.progress * 100)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Enabled Modules (compact, tappable) */}
                            {enabledOptional.length > 0 && (
                                <button onClick={() => router.push("/discover")} className="mt-4 pt-3 border-t border-[var(--fg-06)] w-full text-left group">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {enabledOptional.map((key) => {
                                            const mod = MODULE_REGISTRY[key];
                                            return (
                                                <span
                                                    key={key}
                                                    className="px-2 py-0.5 rounded-md text-[9px] font-mono font-medium border"
                                                    style={{
                                                        color: `rgb(${mod.colorRgb} / 0.7)`,
                                                        borderColor: `rgb(${mod.colorRgb} / 0.2)`,
                                                        backgroundColor: `rgb(${mod.colorRgb} / 0.06)`,
                                                    }}
                                                >
                                                    {mod.name}
                                                </span>
                                            );
                                        })}
                                        <span className="text-[9px] font-mono text-[var(--fg-20)] group-hover:text-[rgb(var(--accent-light-rgb))] transition ml-auto">
                                            Edit →
                                        </span>
                                    </div>
                                </button>
                            )}

                            {/* Profile completion nudge */}
                            {profileCompletion.pct < 100 && (
                                <div className="mt-4 pt-3 border-t border-[var(--fg-06)] w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="relative w-9 h-9 shrink-0">
                                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--fg-04)" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="3" strokeLinecap="round"
                                                    strokeDasharray={2 * Math.PI * 15} strokeDashoffset={2 * Math.PI * 15 * (1 - profileCompletion.pct / 100)} />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-[rgb(var(--accent-light-rgb))]">{profileCompletion.pct}%</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-medium text-[var(--fg-50)]">Complete your profile</p>
                                            <p className="text-[9px] font-mono text-[var(--fg-20)]">{profileCompletion.filled}/{profileCompletion.total} fields filled</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {profileCompletion.missing.map((f) => (
                                            <button key={f.key} onClick={() => setSection(f.section)}
                                                className="text-[9px] font-mono px-2 py-1 rounded-md border border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.05)] text-[rgb(var(--accent-light-rgb)/0.6)] hover:bg-[rgb(var(--accent-rgb)/0.1)] hover:text-[rgb(var(--accent-light-rgb))] transition">
                                                + {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Settings Accordion */}
                <motion.div variants={staggerItem} className="space-y-1">
                    {SECTIONS.map((s) => (
                        <div key={s.key}>
                            <button
                                onClick={() => setSection(section === s.key ? null : s.key)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition text-left ${section === s.key ? "border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.06)]" : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-04)] hover:border-[var(--fg-10)]"}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${section === s.key ? "bg-[rgb(var(--accent-rgb)/0.12)]" : "bg-[var(--fg-04)]"}`}>
                                    <s.icon size={14} className={section === s.key ? "text-[rgb(var(--accent-rgb))]" : "text-[var(--fg-30)]"} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${section === s.key ? "text-[rgb(var(--accent-light-rgb))]" : "text-[var(--fg-70)]"}`}>{s.label}</p>
                                    <p className="text-[10px] font-mono text-[var(--fg-25)]">{s.desc}</p>
                                </div>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${section === s.key ? "rotate-180 text-[rgb(var(--accent-rgb)/0.5)]" : "text-[var(--fg-15)]"}`} />
                            </button>
                            <AnimatePresence initial={false}>
                                {section === s.key && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-2 space-y-4">

                {/* ── STATS ── */}
                {s.key === "stats" && (<>
                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">BODY STATS</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">HEIGHT ({heightUnit})</label>
                                <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} value={data.height_cm ?? ""} onChange={(e) => updateField("height_cm", e.target.value ? Number(e.target.value) : null)} placeholder="—"
                                    className="w-full h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-base font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                            </div>
                            <div>
                                <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">SEX</label>
                                <div className="h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] flex items-center px-3">
                                    <span className="text-base font-bold font-mono text-[var(--fg-70)]">{data.sex ? data.sex.charAt(0).toUpperCase() + data.sex.slice(1) : "—"}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">DATE OF BIRTH</label>
                                <input type="date" value={data.date_of_birth ?? ""} onChange={(e) => updateField("date_of_birth", e.target.value || null)}
                                    className="w-full h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                            </div>
                            <div>
                                <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">AGE</label>
                                <div className="h-11 rounded-lg bg-[var(--fg-02)] border border-[var(--fg-04)] flex items-center justify-center text-base font-bold font-mono text-[var(--fg-50)]">
                                    {age ?? "—"}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">LOG NEW WEIGHT ({weightUnit})</label>
                            <div className="flex gap-2">
                                <input type="number" min="0" step="0.1" onWheel={(e) => (e.target as HTMLElement).blur()} value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="—"
                                    className="flex-1 h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-base font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                                <button onClick={logWeight} disabled={weightSaving || !weightInput || Number(weightInput) === latestWeight}
                                    className="shrink-0 h-11 px-4 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb))] text-[10px] font-mono hover:bg-[rgb(var(--accent-rgb)/0.1)] disabled:opacity-30 transition">
                                    {weightSaving ? "..." : "LOG"}
                                </button>
                            </div>
                            {displayWeight && <p className="text-[8px] font-mono text-[var(--fg-20)] mt-1">Last logged: {displayWeight} {weightUnit.toLowerCase()}</p>}
                        </div>
                        {bmi !== null && (
                            <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--fg-40)]">
                                <span>BMI: <span className="text-[var(--fg-70)] font-bold">{bmi}</span></span>
                                <span>—</span>
                                <span className={bmi < 18.5 ? "text-amber-300" : bmi < 25 ? "text-emerald-300" : bmi < 30 ? "text-orange-300" : "text-red-400"}>
                                    {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-3">INJURY / LIMITATION NOTES</p>
                        <textarea
                            value={data.injury_notes ?? ""}
                            onChange={(e) => updateField("injury_notes", e.target.value)}
                            placeholder="e.g. Left shoulder impingement — avoid heavy overhead pressing"
                            rows={3}
                            className="w-full rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] px-3 py-2.5 text-sm font-mono text-[var(--fg-70)] placeholder:text-[var(--fg-20)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition resize-none"
                        />
                        <p className="text-[8px] font-mono text-[var(--fg-20)] mt-1.5">This is for your reference — the system will show warnings for exercises that affect noted areas.</p>
                    </div>
                </>)}

                {/* ── GOALS ── */}
                {s.key === "goals" && (<>
                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">PRIMARY GOAL</p>
                        <div className="grid grid-cols-2 gap-2">
                            {GOAL_TYPE_OPTIONS.map((opt) => (
                                <button key={opt.value} onClick={() => updateGoal("goal_type", opt.value)}
                                    className={`text-[10px] font-mono py-2.5 px-2 rounded-lg border transition text-center ${goals.goal_type === opt.value ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-70)]"}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">WEIGHT TARGET</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">TARGET ({weightUnit})</label>
                                <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} value={goals.target_weight_kg ?? ""} onChange={(e) => updateGoal("target_weight_kg", e.target.value ? Number(e.target.value) : null)} placeholder="—"
                                    className="w-full h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-base font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                            </div>
                            <div>
                                <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">RATE ({weightUnit}/WK)</label>
                                <input type="number" min="0.1" max="1.5" step="0.1" onWheel={(e) => (e.target as HTMLElement).blur()} value={goals.rate_per_week_kg ?? 0.5} onChange={(e) => updateGoal("rate_per_week_kg", Number(e.target.value))}
                                    className="w-full h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-base font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">TARGET DATE (OPTIONAL)</label>
                            <input type="date" value={goals.target_date ?? ""} onChange={(e) => updateGoal("target_date", e.target.value || null)}
                                className="w-full h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                        </div>
                        {weightToGoal !== null && (
                            <div className="rounded-lg border border-[rgb(var(--accent-rgb)/0.15)] bg-[rgb(var(--accent-rgb))]/[0.03] p-3 text-center">
                                <p className="text-[9px] font-mono text-[rgb(var(--accent-light-rgb)/0.5)]">DISTANCE TO TARGET</p>
                                <p className={`text-xl font-bold font-mono ${weightToGoal > 0 ? "text-orange-300" : weightToGoal < 0 ? "text-emerald-300" : "text-[rgb(var(--accent-light-rgb))]"}`}>
                                    {weightToGoal > 0 ? `-${weightToGoal}` : weightToGoal < 0 ? `+${Math.abs(weightToGoal)}` : "AT GOAL"} {weightUnit}
                                </p>
                                <p className="text-[9px] font-mono text-[var(--fg-25)] mt-1">
                                    Current: {displayWeight} → Target: {displayTargetWeight}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-4 space-y-3">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">ACTIVITY LEVEL</p>
                        <div className="space-y-1.5">
                            {ACTIVITY_OPTIONS.map((opt) => (
                                <button key={opt.value} onClick={() => updateField("activity_level", opt.value)}
                                    className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg border transition ${data.activity_level === opt.value ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)]" : "border-[var(--fg-06)] hover:border-[var(--fg-15)]"}`}>
                                    <span className={`text-[10px] font-mono ${data.activity_level === opt.value ? "text-[rgb(var(--accent-light-rgb))]" : "text-[var(--fg-50)]"}`}>{opt.label}</span>
                                    <span className="text-[9px] font-mono text-[var(--fg-25)]">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">NUTRITION</p>
                        <div>
                            <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1.5 block">DIET PREFERENCE</label>
                            <div className="grid grid-cols-4 gap-2">
                                {DIET_OPTIONS.map((opt) => (
                                    <button key={opt.value} onClick={() => updateGoal("diet_preference", opt.value)}
                                        className={`text-[10px] font-mono py-2 rounded-lg border transition ${goals.diet_preference === opt.value ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-70)]"}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">CALORIE OVERRIDE (OPTIONAL)</label>
                            <input type="number" min="800" max="8000" onWheel={(e) => (e.target as HTMLElement).blur()} value={goals.calorie_target_override ?? ""} onChange={(e) => updateGoal("calorie_target_override", e.target.value ? Number(e.target.value) : null)} placeholder="Auto-calculated"
                                className="w-full h-11 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-base font-bold font-mono placeholder:text-[var(--fg-15)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                            <p className="text-[8px] font-mono text-[var(--fg-20)] mt-1">Leave empty to auto-calculate from your stats and goal</p>
                        </div>
                    </div>

                    {calorieSummary && (
                        <div className="rounded-lg border border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb))]/[0.03] p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Flame size={14} className="text-[rgb(var(--accent-light-rgb))]" />
                                <p className="text-[10px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb))]">CALORIE INTELLIGENCE</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2.5 text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">BMR</p>
                                    <p className="text-base font-bold font-mono text-[var(--fg-70)]">{calorieSummary.bmr}</p>
                                </div>
                                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2.5 text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">TDEE</p>
                                    <p className="text-base font-bold font-mono text-[var(--fg-70)]">{calorieSummary.tdee}</p>
                                </div>
                                <div className="rounded-lg bg-[rgb(var(--accent-rgb)/0.08)] border border-[rgb(var(--accent-rgb)/0.2)] p-2.5 text-center">
                                    <p className="text-[8px] font-mono text-[rgb(var(--accent-light-rgb)/0.5)]">TARGET</p>
                                    <p className="text-base font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{calorieSummary.calorieTarget}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">PROTEIN</p>
                                    <p className="text-sm font-bold font-mono text-emerald-300">{calorieSummary.macros.protein}g</p>
                                </div>
                                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">FAT</p>
                                    <p className="text-sm font-bold font-mono text-amber-300">{calorieSummary.macros.fat}g</p>
                                </div>
                                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">CARBS</p>
                                    <p className="text-sm font-bold font-mono text-cyan-300">{calorieSummary.macros.carbs}g</p>
                                </div>
                            </div>
                            <p className="text-[8px] font-mono text-[var(--fg-20)] text-center">Based on Mifflin-St Jeor equation · {data.sex === "male" ? "Male" : "Female"} · {age}y · {displayWeight}{wUnit} · {data.height_cm}cm</p>
                        </div>
                    )}
                    {!calorieSummary && (
                        <div className="glass-card p-4 text-center">
                            <Flame size={18} className="mx-auto text-[var(--fg-15)] mb-2" />
                            <p className="text-[10px] font-mono text-[var(--fg-25)]">Add your height, DOB, and sex in Stats to unlock calorie intelligence</p>
                        </div>
                    )}

                    <div className="glass-card p-4 space-y-3">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">PREFERRED TRAINING DAYS</p>
                        <div className="flex gap-1.5">
                            {DAYS_OF_WEEK.map((day) => {
                                const selected = goals.preferred_days.includes(day);
                                return (
                                    <button key={day} onClick={() => updateGoal("preferred_days", selected ? goals.preferred_days.filter((d) => d !== day) : [...goals.preferred_days, day])}
                                        className={`flex-1 text-[10px] font-mono py-2.5 rounded-lg border transition ${selected ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"}`}>
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[8px] font-mono text-[var(--fg-20)]">{goals.preferred_days.length} days selected</p>
                    </div>

                    <div className="glass-card p-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-3">TRAINING STYLE</p>
                        <CustomSelect
                            options={GOAL_OPTIONS}
                            value={data.goal}
                            onChange={(v) => updateField("goal", v)}
                            placeholder="Select a style..."
                            searchable={false}
                        />
                    </div>

                    <div className="glass-card p-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-3">TARGET LIFTS</p>
                        <p className="text-[9px] font-mono text-[var(--fg-25)] mb-3">Set weight goals for specific exercises. You'll get notified when you hit them.</p>
                        {targetLifts.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {targetLifts.map((lift) => (
                                    <div key={lift.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${lift.achieved ? "border-emerald-400/30 bg-emerald-400/[0.05]" : "border-[var(--fg-06)] bg-[var(--fg-02)]"}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold ${lift.achieved ? "text-emerald-300" : "text-[var(--fg-80)]"}`}>{lift.exercise_name}</p>
                                            <p className="text-[10px] font-mono text-[var(--fg-30)]">Target: {Math.round(kgToUnit(lift.target_weight, wUnit))} {weightUnit}</p>
                                        </div>
                                        {lift.achieved ? (
                                            <span className="text-[9px] font-mono text-emerald-300 px-2 py-1 rounded bg-emerald-400/10 border border-emerald-400/20">ACHIEVED</span>
                                        ) : (
                                            <button onClick={() => deleteTargetLift(lift.id)} className="text-[var(--fg-20)] hover:text-red-400 transition"><Trash2 size={14} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                                <CustomSelect
                                    options={exercises.map((ex) => ({ value: ex.id, label: ex.name }))}
                                    value={newLiftExercise}
                                    onChange={setNewLiftExercise}
                                    placeholder="Select exercise..."
                                />
                            </div>
                            <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} value={newLiftWeight} onChange={(e) => setNewLiftWeight(e.target.value)} placeholder={weightUnit}
                                className="w-20 shrink-0 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono py-2.5 focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                            <button onClick={addTargetLift} disabled={!newLiftExercise || !newLiftWeight}
                                className="shrink-0 w-11 h-11 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb))] flex items-center justify-center hover:bg-[rgb(var(--accent-rgb)/0.1)] disabled:opacity-30 transition">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </>)}

                {/* ── TRAINING ── */}
                {s.key === "training" && (<>
                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">TRAINING PROFILE</p>
                        <div>
                            <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">EXPERIENCE LEVEL</label>
                            <div className="flex gap-2">
                                {["beginner", "intermediate", "advanced"].map((lvl) => (
                                    <button key={lvl} onClick={() => updateField("experience", lvl)}
                                        className={`flex-1 text-[10px] font-mono py-2.5 rounded-lg border transition ${data.experience === lvl ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-70)]"
                                            }`}>
                                        {lvl.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[8px] font-mono text-[var(--fg-20)] mt-1">
                                {data.experience === "beginner" ? "< 1 year of consistent training. Volume recommendations will be conservative." :
                                    data.experience === "intermediate" ? "1-3 years. Standard volume ranges apply." :
                                        "3+ years. Higher volume tolerance, more aggressive progression."}
                            </p>
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">PREFERRED WORKOUT TIME</label>
                            <div className="flex gap-2">
                                {[{ value: "morning", label: "MORNING", sub: "5-9 AM" }, { value: "afternoon", label: "AFTERNOON", sub: "12-5 PM" }, { value: "evening", label: "EVENING", sub: "5-10 PM" }].map((t) => (
                                    <button key={t.value} onClick={() => updateField("workout_time_pref", t.value)}
                                        className={`flex-1 text-center py-2.5 rounded-lg border transition ${data.workout_time_pref === t.value ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-70)]"
                                            }`}>
                                        <p className="text-[10px] font-mono">{t.label}</p>
                                        <p className="text-[8px] font-mono text-[var(--fg-20)]">{t.sub}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-4 space-y-3">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">GYM PROFILE</p>
                        <p className="text-[9px] font-mono text-[var(--fg-25)]">Quick-switch your equipment set. Tap a profile to auto-fill, or customize below.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {GYM_PROFILES.map((gp) => {
                                const active = activeGymProfile === gp.value;
                                const Icon = gp.value === "commercial_gym" ? Building2 : gp.value === "home_gym" ? Home : gp.value === "small_gym" ? Dumbbell : Briefcase;
                                return (
                                    <button key={gp.value} onClick={() => switchGymProfile(gp.value)}
                                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition text-left ${
                                            active
                                                ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.08)]"
                                                : "border-[var(--fg-08)] bg-[var(--fg-02)] hover:border-[var(--fg-15)]"
                                        }`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-[rgb(var(--accent-rgb)/0.15)]" : "bg-[var(--fg-04)]"}`}>
                                            <Icon size={14} className={active ? "text-[rgb(var(--accent-rgb))]" : "text-[var(--fg-30)]"} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-[10px] font-semibold ${active ? "text-[rgb(var(--accent-light-rgb))]" : "text-[var(--fg-60)]"}`}>{gp.label}</p>
                                            <p className="text-[8px] font-mono text-[var(--fg-20)]">{gp.desc}</p>
                                        </div>
                                        {active && <Check size={12} className="text-[rgb(var(--accent-rgb))] ml-auto shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="glass-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">EQUIPMENT ACCESS</p>
                            {activeGymProfile && <span className="text-[8px] font-mono text-[rgb(var(--accent-rgb)/0.5)]">via {GYM_PROFILES.find(g => g.value === activeGymProfile)?.label} preset</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {EQUIPMENT_LIST.map((item) => {
                                const selected = equipmentAccess.includes(item);
                                return (
                                    <button key={item} onClick={() => toggleEquipment(item)}
                                        className={`text-[10px] font-mono px-3 py-2 rounded-lg border transition ${
                                            selected
                                                ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]"
                                                : "border-[var(--fg-10)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"
                                        }`}>
                                        {selected ? "✓ " : ""}{item}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[8px] font-mono text-[var(--fg-20)]">{equipmentAccess.length} items selected{activeGymProfile ? " · editing clears preset" : ""}</p>
                    </div>
                </>)}

                {/* ── APPEARANCE ── */}
                {s.key === "appearance" && (<>
                    <div className="relative rounded-2xl border-2 overflow-hidden transition-all duration-500"
                        style={{
                            borderColor: data.sex === "female" ? "rgba(236,72,153,0.3)" : "rgba(59,130,246,0.3)",
                            boxShadow: data.sex === "female"
                                ? "0 0 40px -8px rgba(236,72,153,0.15), inset 0 1px 0 var(--fg-06)"
                                : "0 0 40px -8px rgba(59,130,246,0.15), inset 0 1px 0 var(--fg-06)",
                        }}>
                        <div className="absolute inset-0 transition-all duration-500"
                            style={{
                                background: data.sex === "female"
                                    ? "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.05))"
                                    : "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.05))",
                            }} />
                        <div className="relative px-5 py-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-1">PROFILE MODE</p>
                                    <p className="text-lg font-bold transition-colors duration-300"
                                        style={{ color: data.sex === "female" ? "rgb(236,72,153)" : "rgb(96,165,250)" }}>
                                        {data.sex === "female" ? "Female" : "Male"}
                                    </p>
                                </div>
                                <span className="text-3xl">{data.sex === "female" ? "♀" : "♂"}</span>
                            </div>
                            <p className="text-[10px] font-mono text-[var(--fg-30)] mb-4 leading-relaxed">
                                {data.sex === "female"
                                    ? "Recovery, nutrition, volume, plans, leaderboards — all calibrated for female physiology."
                                    : "Recovery, nutrition, volume, plans, leaderboards — all calibrated for male physiology."}
                            </p>
                            <button
                                onClick={() => updateField("sex", data.sex === "female" ? "male" : "female")}
                                className="w-full relative h-14 rounded-xl border transition-all duration-300 overflow-hidden"
                                style={{
                                    borderColor: data.sex === "female" ? "rgba(236,72,153,0.2)" : "rgba(59,130,246,0.2)",
                                    background: "var(--fg-02)",
                                }}>
                                <motion.div
                                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg"
                                    animate={{ x: data.sex === "female" ? "calc(100% + 4px)" : 4 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    style={{
                                        background: data.sex === "female"
                                            ? "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.15))"
                                            : "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.15))",
                                        borderWidth: 1,
                                        borderStyle: "solid",
                                        borderColor: data.sex === "female" ? "rgba(236,72,153,0.3)" : "rgba(59,130,246,0.3)",
                                    }}
                                />
                                <div className="relative flex h-full">
                                    <div className={`flex-1 flex items-center justify-center gap-2 transition-colors duration-300 ${data.sex !== "female" ? "text-blue-400" : "text-[var(--fg-25)]"}`}>
                                        <span className="text-lg">♂</span>
                                        <span className="text-[11px] font-mono font-bold">MALE</span>
                                    </div>
                                    <div className={`flex-1 flex items-center justify-center gap-2 transition-colors duration-300 ${data.sex === "female" ? "text-pink-400" : "text-[var(--fg-25)]"}`}>
                                        <span className="text-lg">♀</span>
                                        <span className="text-[11px] font-mono font-bold">FEMALE</span>
                                    </div>
                                </div>
                            </button>
                            <p className="text-[8px] font-mono text-[var(--fg-15)] mt-3 text-center">
                                Switching mode recalibrates all engines, plans, and rankings. Your workout history and progress are always preserved.
                            </p>
                        </div>
                    </div>

                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">THEME</p>
                        <div className="grid grid-cols-4 gap-2">
                            {([
                                { key: "dark" as ThemeMode, label: "Dark", preview: "#050914" },
                                { key: "oled" as ThemeMode, label: "OLED", preview: "#000000" },
                                { key: "daylight" as ThemeMode, label: "Daylight", preview: "#f5f3ee" },
                                { key: "auto" as ThemeMode, label: "Auto", preview: "linear-gradient(135deg, #050914 50%, #f5f3ee 50%)" },
                            ]).map((t) => {
                                const active = themeMode === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => setThemeMode(t.key)}
                                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition ${
                                            active
                                                ? "border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.08)]"
                                                : "border-[var(--fg-08)] hover:border-[var(--fg-15)]"
                                        }`}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full border border-[var(--fg-15)]"
                                            style={{ background: t.preview }}
                                        />
                                        <span className="text-[9px] font-mono text-[var(--fg-50)]">{t.label}</span>
                                        {active && <Check size={10} className="text-[rgb(var(--accent-rgb))]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">ACCENT COLOR</p>
                        <div className="grid grid-cols-4 gap-2">
                            {ACCENT_PRESETS.map((preset) => (
                                <button
                                    key={preset.key}
                                    onClick={() => selectAccent(preset.key)}
                                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition ${accent === preset.key ? "border-[var(--fg-40)] bg-[var(--fg-06)]" : "border-[var(--fg-10)] hover:border-[var(--fg-20)]"}`}
                                >
                                    <span
                                        className="w-6 h-6 rounded-full border border-[var(--fg-20)]"
                                        style={{ backgroundColor: `rgb(${preset.rgb})` }}
                                    />
                                    <span className="text-[9px] font-mono text-[var(--fg-50)]">{preset.label.toUpperCase()}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>)}

                {/* ── PRIVACY ── */}
                {s.key === "privacy" && (<>
                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">UNITS</p>
                        <div className="flex gap-2">
                            <button onClick={() => updateField("unit_preference", "metric")}
                                className={`flex-1 text-center py-3 rounded-lg border transition ${data.unit_preference === "metric" ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)]"}`}>
                                <p className="text-sm font-mono font-bold">METRIC</p>
                                <p className="text-[9px] font-mono text-[var(--fg-30)]">KG · CM · KM</p>
                            </button>
                            <button onClick={() => updateField("unit_preference", "imperial")}
                                className={`flex-1 text-center py-3 rounded-lg border transition ${data.unit_preference === "imperial" ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)]"}`}>
                                <p className="text-sm font-mono font-bold">IMPERIAL</p>
                                <p className="text-[9px] font-mono text-[var(--fg-30)]">LBS · FT/IN · MI</p>
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-4 space-y-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">PROFILE VISIBILITY</p>
                        <div className="flex gap-2">
                            {[
                                { value: "public", label: "PUBLIC", desc: "Visible on leaderboard", icon: Eye },
                                { value: "friends", label: "FRIENDS", desc: "Friends only (coming soon)", icon: User },
                                { value: "private", label: "PRIVATE", desc: "Hidden from leaderboard", icon: EyeOff },
                            ].map((opt) => (
                                <button key={opt.value} onClick={() => updateField("profile_visibility", opt.value)}
                                    className={`flex-1 text-center py-3 rounded-lg border transition ${data.profile_visibility === opt.value ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)]"}`}>
                                    <opt.icon size={16} className="mx-auto mb-1" />
                                    <p className="text-[10px] font-mono font-bold">{opt.label}</p>
                                    <p className="text-[8px] font-mono text-[var(--fg-20)]">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </>)}

                {/* ── DATA ── */}
                {s.key === "data" && (<>
                    <div className="glass-card p-4">
                        <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-3">EXPORT DATA</p>
                        <p className="text-[10px] font-mono text-[var(--fg-30)] mb-3">Download your complete workout history as a CSV file.</p>
                        <button onClick={exportData} className="flex items-center gap-2 text-sm font-mono px-4 py-2.5 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] transition">
                            <Download size={14} /> EXPORT WORKOUT HISTORY
                        </button>
                    </div>

                    <div className="rounded-lg border border-red-400/20 bg-red-400/[0.03] p-4">
                        <p className="text-[10px] font-mono tracking-widest text-red-400/70 mb-2">DANGER ZONE</p>
                        <p className="text-[10px] font-mono text-[var(--fg-30)] mb-3">Permanently delete your account and all data. This cannot be undone.</p>
                        {!showDeleteConfirm ? (
                            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-sm font-mono px-4 py-2.5 rounded-lg border border-red-400/30 text-red-400/70 hover:text-red-400 hover:border-red-400/50 transition">
                                <AlertTriangle size={14} /> DELETE ACCOUNT
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs font-mono text-red-400">Are you absolutely sure? All data will be permanently destroyed.</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 text-sm font-mono py-2.5 rounded-lg border border-[var(--fg-15)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">
                                        CANCEL
                                    </button>
                                    <button onClick={deleteAccount} className="flex-1 text-sm font-mono py-2.5 rounded-lg bg-red-500 text-[var(--text-primary)] hover:bg-red-400 transition">
                                        YES, DELETE EVERYTHING
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px" />

                    <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 text-sm font-mono px-4 py-3 rounded-lg border border-[var(--fg-15)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">
                        <LogOut size={14} /> SIGN OUT
                    </button>
                </>)}

                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            {/* ══════════ PROFILE STUDIO MODAL ══════════ */}
            {showProfileModal && createPortal(
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4" onClick={() => { setShowProfileModal(false); setEditingSocial(null); }}>
                    <div className="w-full max-w-md max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[var(--fg-08)] bg-[var(--bg-card)] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

                        {/* Live Preview Card */}
                        <div className="relative shrink-0 rounded-t-2xl">
                            {/* Banner bg */}
                            <div className="h-24 rounded-t-2xl overflow-hidden relative">
                                {(() => {
                                    const customIdx = data.banner_preset.startsWith("custom_") ? parseInt(data.banner_preset.split("_")[1]) : -1;
                                    const customUrl = customIdx >= 0 ? data.custom_banners[customIdx] : null;
                                    if (customUrl) return (
                                        <>
                                            <img src={customUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/30" />
                                        </>
                                    );
                                    return <div className="absolute inset-0" style={{ background: BANNER_PRESETS.find(b => b.key === data.banner_preset)?.bg ?? BANNER_PRESETS[0].bg, opacity: 0.7 }} />;
                                })()}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-card)]" />
                            </div>
                            {/* Close button */}
                            <button onClick={() => { setShowProfileModal(false); setEditingSocial(null); }} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-[var(--fg-10)] flex items-center justify-center text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">
                                <X size={14} />
                            </button>
                            {/* Avatar + name — flows below banner */}
                            <div className="flex flex-col items-center -mt-7 pb-2 relative z-[1]">
                                <label className="relative w-14 h-14 rounded-full border-2 flex items-center justify-center text-lg font-bold cursor-pointer overflow-hidden group mb-1"
                                    style={{ borderColor: data.avatar_color + "60", backgroundColor: profile?.avatar_url ? "var(--bg-card)" : data.avatar_color + "15", color: data.avatar_color }}>
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (profile?.username?.[0] ?? "?").toUpperCase()
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition">
                                        {avatarUploading ? <div className="w-4 h-4 border-2 border-[var(--fg-30)] border-t-white rounded-full animate-spin" /> : <Camera size={14} className="text-[var(--text-primary)]" />}
                                    </div>
                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarSelect} disabled={avatarUploading} />
                                </label>
                                {avatarError && <p className="text-[9px] font-mono text-red-400">{avatarError}</p>}
                                <p className="text-xs font-bold text-[var(--fg-90)]">{usernameInput || profile?.username || "Unknown"}</p>
                                <p className="text-[9px] font-mono text-[var(--fg-30)]">{user?.email ?? ""}</p>
                            </div>
                        </div>

                        {/* Tab bar */}
                        <div className="flex border-b border-[var(--fg-06)] px-4 shrink-0">
                            {([["identity", "Identity"], ["socials", "Socials"], ["style", "Style"]] as [StudioTab, string][]).map(([key, label]) => (
                                <button key={key} onClick={() => { setStudioTab(key); setEditingSocial(null); }}
                                    className={`flex-1 py-2.5 text-[10px] font-mono tracking-wider transition border-b-2 ${studioTab === key ? "text-[rgb(var(--accent-light-rgb))] border-[rgb(var(--accent-rgb))]" : "text-[var(--fg-30)] border-transparent hover:text-[var(--fg-50)]"}`}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="p-5 overflow-y-auto flex-1">

                            {/* ── IDENTITY TAB ── */}
                            {studioTab === "identity" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">USERNAME</label>
                                        <div className="flex gap-2">
                                            <input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && saveUsername()} disabled={usernameSaving}
                                                className="flex-1 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] px-3 py-2.5 text-sm font-mono text-[var(--fg-80)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                                            <button onClick={saveUsername} disabled={usernameSaving || usernameInput.trim() === profile?.username}
                                                className="shrink-0 px-3 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb))] text-[9px] font-mono hover:bg-[rgb(var(--accent-rgb)/0.1)] disabled:opacity-30 transition">
                                                {usernameSaving ? "..." : "SAVE"}
                                            </button>
                                        </div>
                                        {usernameError && <p className="text-[10px] font-mono text-red-400 mt-1">{usernameError}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-mono text-[var(--fg-30)] mb-1 block">EMAIL</label>
                                        <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-04)] px-3 py-2.5 text-sm font-mono text-[var(--fg-30)]">{user?.email ?? "—"}</div>
                                    </div>
                                </div>
                            )}

                            {/* ── SOCIALS TAB ── */}
                            {studioTab === "socials" && (() => {
                                const socials: { key: keyof ProfileData; label: string; placeholder: string; color: string; icon: React.ReactNode }[] = [
                                    { key: "social_instagram", label: "Instagram", placeholder: "@username", color: "#E1306C",
                                        icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" className="fill-current stroke-none"/></svg> },
                                    { key: "social_twitter", label: "X", placeholder: "@handle", color: "#ffffff",
                                        icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                                    { key: "social_tiktok", label: "TikTok", placeholder: "@username", color: "#ff0050",
                                        icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.5a6.34 6.34 0 0 0 6.34-6.34V8.71a8.16 8.16 0 0 0 3.76.92V6.18a4.81 4.81 0 0 1 0 .51z"/></svg> },
                                    { key: "social_snapchat", label: "Snapchat", placeholder: "@username", color: "#FFFC00",
                                        icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2c1.94 0 3.63.5 4.87 1.64C18.1 4.77 18.7 6.4 18.7 8.3c0 .8-.05 1.57-.14 2.33-.05.37-.1.73-.16 1.08.32.1.67.15.98.15.45 0 .83-.1 1.14-.26.2-.1.43-.08.6.06.18.14.25.37.2.59-.15.6-.75.96-1.5 1.22-.35.12-.72.22-1.02.33-.12.04-.2.12-.24.22-.2.42-.05.63.04.72l.02.02c.47.47 1.01.84 1.44 1.15.4.28.7.53.88.78.28.38.3.72.18 1-.18.42-.65.7-1.38.8-.22.03-.44.04-.67.05-.1 0-.22.01-.34.02-.08 0-.1.03-.13.1-.1.24-.22.46-.37.65-.18.23-.4.33-.62.33-.06 0-.12-.01-.19-.02a3.17 3.17 0 0 0-.54-.05c-.22 0-.43.02-.65.07-.4.09-.76.32-1.17.58-.83.51-1.86 1.15-3.46 1.18h-.08c-1.6-.03-2.63-.67-3.46-1.18-.41-.26-.77-.49-1.17-.58a3.1 3.1 0 0 0-.65-.07c-.18 0-.36.02-.54.05-.07.01-.13.02-.19.02-.22 0-.44-.1-.62-.33-.15-.19-.27-.41-.37-.65-.03-.07-.05-.1-.13-.1-.12-.01-.24-.02-.34-.02-.23-.01-.45-.02-.67-.05-.73-.1-1.2-.38-1.38-.8-.12-.28-.1-.62.18-1 .18-.25.48-.5.88-.78.43-.31.97-.68 1.44-1.15l.02-.02c.09-.09.24-.3.04-.72-.04-.1-.12-.18-.24-.22-.3-.11-.67-.21-1.02-.33-.75-.26-1.35-.62-1.5-1.22-.05-.22.02-.45.2-.59.17-.14.4-.16.6-.06.31.16.69.26 1.14.26.31 0 .66-.05.98-.15-.06-.35-.11-.71-.16-1.08A17.4 17.4 0 0 1 5.3 8.3c0-1.9.6-3.53 1.83-4.66C8.37 2.5 10.06 2 12 2z"/></svg> },
                                    { key: "social_youtube", label: "YouTube", placeholder: "@channel", color: "#FF0000",
                                        icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                                    { key: "social_whatsapp", label: "WhatsApp", placeholder: "+1234567890", color: "#25D366",
                                        icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
                                ];
                                return (
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-mono text-[var(--fg-25)] tracking-wider">TAP AN ICON TO LINK</p>
                                        <div className="flex items-center justify-center gap-3 flex-wrap">
                                            {socials.map((s) => {
                                                const val = data[s.key] as string | null;
                                                const isActive = !!val;
                                                const isEditing = editingSocial === s.key;
                                                return (
                                                    <button key={s.key} onClick={() => setEditingSocial(isEditing ? null : s.key)}
                                                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isEditing ? "ring-2 scale-110" : isActive ? "bg-[var(--fg-06)]" : "bg-[var(--fg-03)] hover:bg-[var(--fg-06)]"}`}
                                                        style={{ color: isActive || isEditing ? s.color : "var(--fg-15)", outlineColor: isEditing ? s.color : undefined }}>
                                                        {!isActive && !isEditing && <div className="absolute w-2.5 h-2.5 rounded-full bg-[var(--fg-10)] -top-0.5 -right-0.5 flex items-center justify-center text-[6px] text-[var(--fg-30)] font-bold">+</div>}
                                                        {s.icon}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* Inline input for selected social */}
                                        <AnimatePresence mode="wait">
                                            {editingSocial && (() => {
                                                const s = socials.find(s => s.key === editingSocial)!;
                                                const val = data[s.key] as string | null;
                                                return (
                                                    <motion.div key={s.key} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ color: s.color, backgroundColor: s.color + "15" }}>
                                                                {s.icon}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[9px] font-mono text-[var(--fg-30)] mb-1">{s.label.toUpperCase()}</p>
                                                                <input type="text" value={val ?? ""} onChange={(e) => updateField(s.key as keyof ProfileData, e.target.value)} placeholder={s.placeholder} autoFocus
                                                                    className="w-full rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] px-3 py-2 text-sm font-mono text-[var(--fg-70)] placeholder:text-[var(--fg-15)] focus:outline-none transition"
                                                                    style={{ borderColor: s.color + "40" }} />
                                                            </div>
                                                            {val && (
                                                                <button onClick={() => updateField(s.key as keyof ProfileData, "")} className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--fg-20)] hover:text-red-400 hover:bg-red-400/10 transition shrink-0">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })()}
                                        </AnimatePresence>
                                    </div>
                                );
                            })()}

                            {/* ── STYLE TAB ── */}
                            {studioTab === "style" && (
                                <div className="space-y-5 pb-4">
                                    {/* Banner presets */}
                                    <div>
                                        <p className="text-[9px] font-mono text-[var(--fg-25)] tracking-wider mb-2">GRADIENTS</p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {BANNER_PRESETS.map((b) => (
                                                <button key={b.key} onClick={() => updateField("banner_preset", b.key)}
                                                    className={`h-10 rounded-lg border-2 transition overflow-hidden ${data.banner_preset === b.key ? "border-[var(--fg-60)] scale-105" : "border-transparent hover:border-[var(--fg-20)]"}`}>
                                                    <div className="w-full h-full" style={{ background: b.bg }} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom banners */}
                                    <div>
                                        <p className="text-[9px] font-mono text-[var(--fg-25)] tracking-wider mb-2">CUSTOM BANNERS <span className="text-[var(--fg-15)]">{data.custom_banners.length}/5</span></p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {data.custom_banners.map((url, idx) => (
                                                <div key={idx} className="relative group">
                                                    <button onClick={() => updateField("banner_preset", `custom_${idx}`)}
                                                        className={`h-10 w-full rounded-lg border-2 transition overflow-hidden ${data.banner_preset === `custom_${idx}` ? "border-[var(--fg-60)] scale-105" : "border-transparent hover:border-[var(--fg-20)]"}`}>
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                    </button>
                                                    <button onClick={() => removeCustomBanner(idx)}
                                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/90 text-[var(--text-primary)] flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition z-10">
                                                        <X size={8} />
                                                    </button>
                                                </div>
                                            ))}
                                            {data.custom_banners.length < 5 && (
                                                <label className="h-10 rounded-lg border-2 border-dashed border-[var(--fg-15)] hover:border-[var(--fg-30)] transition overflow-hidden cursor-pointer flex items-center justify-center">
                                                    {bannerUploading ? (
                                                        <div className="w-4 h-4 border-2 border-[var(--fg-20)] border-t-white/60 rounded-full animate-spin" />
                                                    ) : (
                                                        <Plus size={14} className="text-[var(--fg-25)]" />
                                                    )}
                                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleBannerSelect} disabled={bannerUploading} />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Avatar Color */}
                                    <div>
                                        <p className="text-[9px] font-mono text-[var(--fg-25)] tracking-wider mb-2">ACCENT COLOR</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {AVATAR_COLORS.map((color) => (
                                                <button key={color} onClick={() => updateField("avatar_color", color)}
                                                    className={`w-9 h-9 rounded-full border-2 transition ${data.avatar_color === color ? "border-[var(--fg-60)] scale-110" : "border-transparent hover:border-[var(--fg-20)]"}`}
                                                    style={{ backgroundColor: color + "30", borderColor: data.avatar_color === color ? color : undefined }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ══════════ AVATAR CROP MODAL ══════════ */}
            {cropSrc && createPortal(
                <div className="fixed inset-0 z-[250] flex flex-col bg-black" onClick={() => setCropSrc(null)}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setCropSrc(null)} className="text-sm text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">Cancel</button>
                        <p className="text-sm font-semibold text-[var(--fg-80)]">Move and Scale</p>
                        <button onClick={handleCropConfirm} className="text-sm font-semibold text-[rgb(var(--accent-light-rgb))] hover:opacity-80 transition">Done</button>
                    </div>

                    {/* Crop area */}
                    <div className="flex-1 relative overflow-hidden" onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => {
                            const cr = cropRef.current;
                            cr.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                            cr.origin = { ...cropPos };
                            if (cr.pointers.size === 2) {
                                const pts = [...cr.pointers.values()];
                                cr.initDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                            }
                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                            const cr = cropRef.current;
                            if (!cr.pointers.has(e.pointerId)) return;
                            const prev = cr.pointers.get(e.pointerId)!;
                            cr.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

                            if (cr.pointers.size === 1) {
                                const dx = e.clientX - prev.x;
                                const dy = e.clientY - prev.y;
                                setCropPos((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
                            } else if (cr.pointers.size === 2) {
                                const pts = [...cr.pointers.values()];
                                const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                                if (cr.initDist > 0) {
                                    const ratio = dist / cr.initDist;
                                    setCropPos((p) => ({ ...p, scale: Math.max(0.5, Math.min(3, cr.origin.scale * ratio)) }));
                                }
                            }
                        }}
                        onPointerUp={(e) => {
                            const cr = cropRef.current;
                            cr.pointers.delete(e.pointerId);
                            if (cr.pointers.size === 0) cr.origin = { ...cropPos };
                            if (cr.pointers.size === 1) {
                                cr.origin = { ...cropPos };
                                const remaining = [...cr.pointers.values()][0];
                                cr.pointers.set([...cr.pointers.keys()][0], remaining);
                            }
                        }}
                        onWheel={(e) => {
                            setCropPos((p) => ({ ...p, scale: Math.max(0.5, Math.min(3, p.scale - e.deltaY * 0.003)) }));
                        }}
                        style={{ touchAction: "none" }}
                    >
                        {/* Image */}
                        <img
                            ref={cropImgRef}
                            src={cropSrc}
                            alt="Crop preview"
                            className="absolute pointer-events-none select-none"
                            style={{
                                left: "50%", top: "50%",
                                transform: `translate(calc(-50% + ${cropPos.x}px), calc(-50% + ${cropPos.y}px)) scale(${cropPos.scale})`,
                                maxWidth: "none", width: "100%", height: "auto",
                            }}
                            draggable={false}
                        />
                        {/* Circle overlay mask */}
                        <div className="absolute inset-0 pointer-events-none" style={{
                            background: `radial-gradient(circle at center, transparent 130px, rgba(0,0,0,0.7) 131px)`,
                        }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border-2 border-[var(--fg-20)] pointer-events-none" />
                    </div>

                    <canvas ref={cropCanvasRef} className="hidden" />
                </div>,
                document.body
            )}

            {/* ══════════ BANNER CROP MODAL ══════════ */}
            {bannerCropSrc && createPortal(
                <div className="fixed inset-0 z-[250] flex flex-col bg-black" onClick={() => setBannerCropSrc(null)}>
                    <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setBannerCropSrc(null)} className="text-sm text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">Cancel</button>
                        <p className="text-sm font-semibold text-[var(--fg-80)]">Position Banner</p>
                        <button onClick={handleBannerCropConfirm} className="text-sm font-semibold text-[rgb(var(--accent-light-rgb))] hover:opacity-80 transition">Done</button>
                    </div>

                    <div className="flex-1 relative overflow-hidden" onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => {
                            const cr = bannerCropRef.current;
                            cr.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                            cr.origin = { ...bannerCropPos };
                            if (cr.pointers.size === 2) {
                                const pts = [...cr.pointers.values()];
                                cr.initDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                            }
                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                            const cr = bannerCropRef.current;
                            if (!cr.pointers.has(e.pointerId)) return;
                            const prev = cr.pointers.get(e.pointerId)!;
                            cr.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                            if (cr.pointers.size === 1) {
                                setBannerCropPos((p) => ({ ...p, x: p.x + (e.clientX - prev.x), y: p.y + (e.clientY - prev.y) }));
                            } else if (cr.pointers.size === 2) {
                                const pts = [...cr.pointers.values()];
                                const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                                if (cr.initDist > 0) {
                                    const ratio = dist / cr.initDist;
                                    setBannerCropPos((p) => ({ ...p, scale: Math.max(0.5, Math.min(3, cr.origin.scale * ratio)) }));
                                }
                            }
                        }}
                        onPointerUp={(e) => {
                            const cr = bannerCropRef.current;
                            cr.pointers.delete(e.pointerId);
                            if (cr.pointers.size === 0) cr.origin = { ...bannerCropPos };
                            if (cr.pointers.size === 1) {
                                cr.origin = { ...bannerCropPos };
                                const remaining = [...cr.pointers.values()][0];
                                cr.pointers.set([...cr.pointers.keys()][0], remaining);
                            }
                        }}
                        onWheel={(e) => {
                            setBannerCropPos((p) => ({ ...p, scale: Math.max(0.5, Math.min(3, p.scale - e.deltaY * 0.003)) }));
                        }}
                        style={{ touchAction: "none" }}
                    >
                        <img
                            ref={bannerCropImgRef}
                            src={bannerCropSrc}
                            alt="Banner crop preview"
                            className="absolute pointer-events-none select-none"
                            style={{
                                left: "50%", top: "50%",
                                transform: `translate(calc(-50% + ${bannerCropPos.x}px), calc(-50% + ${bannerCropPos.y}px)) scale(${bannerCropPos.scale})`,
                                maxWidth: "none", width: "100%", height: "auto",
                            }}
                            draggable={false}
                        />
                        {/* Rectangular overlay mask — 90% width, 3:1 ratio */}
                        <div className="absolute inset-0 pointer-events-none" style={{
                            background: `linear-gradient(to bottom,
                                rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.7) calc(50% - 15vw),
                                transparent calc(50% - 15vw), transparent calc(50% + 15vw),
                                rgba(0,0,0,0.7) calc(50% + 15vw), rgba(0,0,0,0.7) 100%)`,
                        }} />
                        <div className="absolute inset-0 pointer-events-none" style={{
                            background: `linear-gradient(to right,
                                rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.7) 5%,
                                transparent 5%, transparent 95%,
                                rgba(0,0,0,0.7) 95%, rgba(0,0,0,0.7) 100%)`,
                        }} />
                        <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 border-2 border-[var(--fg-20)] rounded-lg pointer-events-none" style={{ aspectRatio: "3/1" }} />
                    </div>

                    <canvas ref={bannerCropCanvasRef} className="hidden" />
                </div>,
                document.body
            )}
        </main>
    );
}