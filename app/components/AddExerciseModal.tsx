"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, SlidersHorizontal, ChevronDown, Star, Clock, Flame, Plus, Dumbbell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthProvider";
import { useSex } from "../lib/useSex";
import { useEquipment } from "../lib/useEquipment";

type Exercise = {
  id: string;
  name: string;
  body_segment: string;
  primary_muscle: string;
  secondary_muscles: string[];
  movement_pattern: string;
  equipment: string;
  equipment_type: string;
  category: string;
  difficulty: string;
  is_unilateral: boolean;
  per_side_weight: boolean;
  image_url: string | null;
  created_by?: string | null;
};

const BODY_SEGMENTS = ["All", "Chest", "Back", "Shoulders", "Traps", "Biceps", "Triceps", "Forearms", "Core", "Legs", "Glutes", "Full Body", "Cardio"];

const PRIMARY_MUSCLES: Record<string, string[]> = {
  Chest: ["Chest"],
  Back: ["Lats", "Lower Back", "Traps"],
  Shoulders: ["Shoulders"],
  Traps: ["Traps"],
  Biceps: ["Biceps"],
  Triceps: ["Triceps"],
  Forearms: ["Forearms"],
  Core: ["Abs", "Obliques"],
  Legs: ["Quads", "Hamstrings", "Calves", "Adductors", "Abductors"],
  Glutes: ["Glutes"],
};

const EQUIPMENT = ["All", "Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Other"];
const CATEGORIES = ["All", "Compound", "Isolation", "Isometric", "Cardio"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

function Chip({ active, children, onClick, size = "sm" }: { active: boolean; children: React.ReactNode; onClick: () => void; size?: "sm" | "xs" }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-md border transition ${
        size === "xs" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
      } font-mono ${
        active ? "border-[rgb(var(--accent-rgb)/0.6)] bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] bg-[var(--fg-03)] text-[var(--fg-50)] hover:text-[var(--fg-80)]"
      }`}
    >
      {children}
    </button>
  );
}

function Tag({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "muted" | "accent" | "owned" | "unowned" }) {
  const classes: Record<string, string> = {
    default: "bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))] border-[rgb(var(--accent-rgb)/0.2)]",
    muted: "bg-[var(--fg-05)] text-[var(--fg-40)] border-[var(--fg-10)]",
    accent: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    owned: "bg-emerald-400/10 text-emerald-300/80 border-emerald-400/20",
    unowned: "bg-orange-400/5 text-orange-300/40 border-orange-400/10",
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${classes[variant]}`}>
      {children}
    </span>
  );
}

function scoreMatch(ex: Exercise, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);
  const name = ex.name.toLowerCase();
  const haystack = [ex.name, ex.primary_muscle, ex.body_segment, ex.equipment, ex.movement_pattern, ...(ex.secondary_muscles || [])].join(" ").toLowerCase();
  let score = 0;
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 60;
  else if (name.includes(q)) score += 30;
  for (const w of words) {
    if (name.includes(w)) score += 10;
    else if (haystack.includes(w)) score += 4;
  }
  return score;
}

export default function AddExerciseModal({
  onAdd,
  onClose,
  existingIds,
  defaultSegment,
}: {
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
  existingIds?: Set<string>;
  defaultSegment?: string;
}) {
  const { user } = useAuth();
  const { sex: userSex } = useSex();
  const { equipmentAccess } = useEquipment();
  const [myEquipmentOn, setMyEquipmentOn] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [bodySegment, setBodySegment] = useState(defaultSegment || "All");
  const [primaryMuscle, setPrimaryMuscle] = useState("All");
  const [equipment, setEquipment] = useState("All");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recentExerciseIds, setRecentExerciseIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "recent" | "popular" | "equipment">("name");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSegment, setNewSegment] = useState("Chest");
  const [newMuscle, setNewMuscle] = useState("");
  const [newEquipment, setNewEquipment] = useState("Barbell");
  const [newCategory, setNewCategory] = useState("Compound");
  const [newDifficulty, setNewDifficulty] = useState("Intermediate");
  const [createError, setCreateError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const availableMuscles = bodySegment !== "All" && PRIMARY_MUSCLES[bodySegment]
    ? PRIMARY_MUSCLES[bodySegment]
    : [];

  const activeFilterCount = [bodySegment, equipment, category, difficulty].filter(f => f !== "All").length
    + (primaryMuscle !== "All" ? 1 : 0);

  useEffect(() => {
    setMounted(true);
    async function load() {
      const { data } = await supabase.from("exercises").select("*").order("name");
      setExercises((data as Exercise[]) ?? []);
      setLoading(false);
    }
    load();
    setTimeout(() => searchRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    if (!user) return;
    async function loadUserData() {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { data: logs } = await supabase
        .from("exercise_set_logs")
        .select("exercise_id, workout_sessions!inner(user_id, status, sex)")
        .eq("workout_sessions.user_id", user!.id)
        .eq("workout_sessions.status", "completed")
        .eq("workout_sessions.sex", userSex)
        .gte("completed_at", twoWeeksAgo.toISOString())
        .limit(200);
      if (logs) setRecentExerciseIds(new Set(logs.map((l: any) => l.exercise_id)));

      const { data: favs } = await supabase
        .from("favorite_exercises")
        .select("exercise_id")
        .eq("user_id", user!.id);
      if (favs) setFavoriteIds(new Set(favs.map((f: any) => f.exercise_id)));
    }
    loadUserData();
  }, [user]);

  // Reset primary muscle when body segment changes
  useEffect(() => { setPrimaryMuscle("All"); }, [bodySegment]);

  // Whether the "my equipment" filter is applicable (user has equipment set)
  const hasEquipmentProfile = equipmentAccess.length > 0;

  const filtered = useMemo(() => {
    let base = exercises.filter((ex) => {
      if (bodySegment !== "All" && ex.body_segment !== bodySegment) return false;
      if (primaryMuscle !== "All" && ex.primary_muscle !== primaryMuscle) return false;
      if (equipment !== "All" && ex.equipment !== equipment) return false;
      if (category !== "All" && ex.category !== category) return false;
      if (difficulty !== "All" && ex.difficulty !== difficulty) return false;
      // Equipment-access filter: always show Bodyweight; hide exercises whose equipment isn't in user's list
      if (myEquipmentOn && hasEquipmentProfile && ex.equipment !== "Bodyweight" && !equipmentAccess.includes(ex.equipment)) return false;
      return true;
    });

    if (query.trim()) {
      base = base.map(ex => ({ ex, score: scoreMatch(ex, query) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.ex);
    } else {
      // Apply sort
      if (sortBy === "recent") {
        base.sort((a, b) => {
          const aRecent = recentExerciseIds.has(a.id) ? 1 : 0;
          const bRecent = recentExerciseIds.has(b.id) ? 1 : 0;
          if (aRecent !== bRecent) return bRecent - aRecent;
          return a.name.localeCompare(b.name);
        });
      } else if (sortBy === "popular") {
        base.sort((a, b) => {
          const aFav = favoriteIds.has(a.id) ? 1 : 0;
          const bFav = favoriteIds.has(b.id) ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
          const aRecent = recentExerciseIds.has(a.id) ? 1 : 0;
          const bRecent = recentExerciseIds.has(b.id) ? 1 : 0;
          if (aRecent !== bRecent) return bRecent - aRecent;
          return a.name.localeCompare(b.name);
        });
      } else if (sortBy === "equipment") {
        base.sort((a, b) => {
          const aOwned = a.equipment === "Bodyweight" || equipmentAccess.includes(a.equipment) ? 1 : 0;
          const bOwned = b.equipment === "Bodyweight" || equipmentAccess.includes(b.equipment) ? 1 : 0;
          if (aOwned !== bOwned) return bOwned - aOwned;
          return a.name.localeCompare(b.name);
        });
      }
    }

    return base;
  }, [exercises, query, bodySegment, primaryMuscle, equipment, category, difficulty, sortBy, recentExerciseIds, favoriteIds, myEquipmentOn, hasEquipmentProfile, equipmentAccess]);

  // Keep newMuscle in sync with newSegment
  useEffect(() => {
    const muscles = PRIMARY_MUSCLES[newSegment];
    if (muscles?.length) setNewMuscle(muscles[0]);
    else setNewMuscle("");
  }, [newSegment]);

  async function handleCreate() {
    if (!newName.trim()) { setCreateError("Name is required"); return; }
    if (!newMuscle) { setCreateError("Select a primary muscle"); return; }
    if (!user) return;
    setCreating(true);
    setCreateError("");
    const { data, error } = await supabase.from("exercises").insert({
      name: newName.trim(),
      body_segment: newSegment,
      primary_muscle: newMuscle,
      equipment: newEquipment,
      category: newCategory,
      difficulty: newDifficulty,
      secondary_muscles: [],
      is_unilateral: false,
      created_by: user.id,
    }).select("*").single();
    if (error || !data) {
      setCreateError(error?.message || "Failed to create exercise");
      setCreating(false);
      return;
    }
    const newEx = data as Exercise;
    setExercises(prev => [...prev, newEx].sort((a, b) => a.name.localeCompare(b.name)));
    onAdd(newEx);
    setShowCreateForm(false);
    setNewName("");
    setCreating(false);
    setJustAdded(newEx.id);
    setTimeout(() => setJustAdded(null), 1200);
  }

  function handleAdd(ex: Exercise) {
    onAdd(ex);
    setJustAdded(ex.id);
    setTimeout(() => setJustAdded(null), 1200);
  }

  function clearFilters() {
    setBodySegment("All");
    setPrimaryMuscle("All");
    setEquipment("All");
    setCategory("All");
    setDifficulty("All");
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-6">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgb(var(--accent-rgb) / 0.25); border-radius: 999px; }
      `}</style>
      <div className="pointer-events-none fixed top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[rgb(var(--accent-rgb)/0.1)] rounded-full blur-[130px]" />

      <div
        className="relative w-full md:max-w-xl h-[90vh] md:h-[85vh] rounded-t-2xl md:rounded-md border border-[rgb(var(--accent-rgb)/0.25)] bg-[var(--bg-elevated)]/95 backdrop-blur-2xl flex flex-col overflow-hidden"
        style={{ boxShadow: "0 0 60px -12px rgb(var(--accent-rgb) / 0.3), inset 0 1px 0 var(--fg-06)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--accent-rgb)/0.1)] shrink-0">
          <div>
            <p className="font-bold text-[var(--fg-90)]">Add Exercise</p>
            <p className="text-[10px] font-mono text-[var(--fg-30)] mt-0.5">{filtered.length} results</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-80)] hover:border-[var(--fg-20)] transition">
            <X size={16} />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="px-4 pt-3 pb-2 space-y-2.5 shrink-0 border-b border-[rgb(var(--accent-rgb)/0.1)]">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--accent-light-rgb)/0.5)]" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, muscle, equipment..."
                className="w-full rounded-md bg-[var(--fg-04)] border border-[rgb(var(--accent-rgb)/0.2)] pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)] transition"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-30)] hover:text-[var(--fg-60)]">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`shrink-0 flex items-center gap-1.5 rounded-md border px-3 text-xs font-mono transition ${
                activeFilterCount > 0 || showFilters ? "border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-50)] hover:text-[var(--fg-80)]"
              }`}
            >
              <SlidersHorizontal size={14} />
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[rgb(var(--accent-rgb))] text-black text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
              <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Quick segment bar (always visible) */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {hasEquipmentProfile && (
              <Chip active={myEquipmentOn} onClick={() => setMyEquipmentOn(v => !v)} size="xs">
                {myEquipmentOn ? "✓ " : ""}MY EQUIPMENT
              </Chip>
            )}
            {BODY_SEGMENTS.map(s => (
              <Chip key={s} active={bodySegment === s} onClick={() => setBodySegment(s)} size="xs">{s}</Chip>
            ))}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="space-y-2.5 pt-1 pb-1">
              {/* Primary Muscle (contextual — only shows muscles in selected segment) */}
              {availableMuscles.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1.5">PRIMARY MUSCLE</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={primaryMuscle === "All"} onClick={() => setPrimaryMuscle("All")} size="xs">All</Chip>
                    {availableMuscles.map(m => (
                      <Chip key={m} active={primaryMuscle === m} onClick={() => setPrimaryMuscle(m)} size="xs">{m}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              <div>
                <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1.5">EQUIPMENT</p>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT.map(eq => <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)} size="xs">{eq}</Chip>)}
                </div>
              </div>

              {/* Category (Compound / Isolation / Isometric) */}
              <div>
                <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1.5">TYPE</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => <Chip key={c} active={category === c} onClick={() => setCategory(c)} size="xs">{c}</Chip>)}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1.5">DIFFICULTY</p>
                <div className="flex flex-wrap gap-1.5">
                  {DIFFICULTIES.map(d => <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)} size="xs">{d}</Chip>)}
                </div>
              </div>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition underline underline-offset-2">
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Sort bar */}
          {!query && (
            <div className="flex items-center gap-1.5 pt-0.5 pb-1">
              <p className="text-[9px] font-mono text-[var(--fg-20)] mr-1">SORT</p>
              <button onClick={() => setSortBy("name")} className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition ${sortBy === "name" ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-06)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"}`}>
                A–Z
              </button>
              <button onClick={() => setSortBy("recent")} className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition ${sortBy === "recent" ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-06)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"}`}>
                <Clock size={10} /> Recent
              </button>
              <button onClick={() => setSortBy("popular")} className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition ${sortBy === "popular" ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-06)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"}`}>
                <Flame size={10} /> Popular
              </button>
              {hasEquipmentProfile && (
                <button onClick={() => setSortBy("equipment")} className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition ${sortBy === "equipment" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-[var(--fg-06)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"}`}>
                  <Dumbbell size={10} /> My Gear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4 pb-24 space-y-2">
          {/* Create Custom Exercise form */}
          {showCreateForm && (
            <div className="rounded-md border border-[rgb(var(--accent-rgb)/0.3)] bg-[var(--fg-03)] p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[var(--fg-80)]">Create Custom Exercise</p>
                <button onClick={() => { setShowCreateForm(false); setCreateError(""); }} className="text-[var(--fg-30)] hover:text-[var(--fg-60)] transition">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1">NAME</p>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Landmine Press"
                    className="w-full rounded-md bg-[var(--fg-04)] border border-[var(--fg-10)] px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)] transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1">BODY SEGMENT</p>
                    <select
                      value={newSegment}
                      onChange={(e) => setNewSegment(e.target.value)}
                      className="w-full rounded-md bg-[var(--fg-04)] border border-[var(--fg-10)] px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)] transition"
                    >
                      {BODY_SEGMENTS.filter(s => s !== "All").map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1">PRIMARY MUSCLE</p>
                    <select
                      value={newMuscle}
                      onChange={(e) => setNewMuscle(e.target.value)}
                      className="w-full rounded-md bg-[var(--fg-04)] border border-[var(--fg-10)] px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)] transition"
                    >
                      {(PRIMARY_MUSCLES[newSegment] || []).map(m => <option key={m} value={m}>{m}</option>)}
                      {!PRIMARY_MUSCLES[newSegment] && <option value={newSegment}>{newSegment}</option>}
                    </select>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1">EQUIPMENT</p>
                    <select
                      value={newEquipment}
                      onChange={(e) => setNewEquipment(e.target.value)}
                      className="w-full rounded-md bg-[var(--fg-04)] border border-[var(--fg-10)] px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)] transition"
                    >
                      {EQUIPMENT.filter(e => e !== "All").map(eq => <option key={eq} value={eq}>{eq}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1">CATEGORY</p>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-md bg-[var(--fg-04)] border border-[var(--fg-10)] px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)] transition"
                    >
                      <option value="Compound">Compound</option>
                      <option value="Isolation">Isolation</option>
                      <option value="Isometric">Isometric</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-1">DIFFICULTY</p>
                    <select
                      value={newDifficulty}
                      onChange={(e) => setNewDifficulty(e.target.value)}
                      className="w-full rounded-md bg-[var(--fg-04)] border border-[var(--fg-10)] px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)] transition"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                {createError && <p className="text-red-400 text-xs font-mono">{createError}</p>}
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full rounded-md bg-[rgb(var(--accent-rgb))] text-black text-sm font-bold py-2.5 hover:bg-[rgb(var(--accent-light-rgb))] transition disabled:opacity-50"
                  style={{ boxShadow: "0 0 16px -3px rgb(var(--accent-rgb) / 0.6)" }}
                >
                  {creating ? "Creating..." : "Create & Add"}
                </button>
              </div>
            </div>
          )}

          {/* Create CTA button */}
          {!showCreateForm && !loading && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-[rgb(var(--accent-rgb)/0.25)] bg-[var(--fg-02)] px-4 py-3 text-xs font-mono text-[rgb(var(--accent-light-rgb)/0.6)] hover:border-[rgb(var(--accent-rgb)/0.5)] hover:text-[rgb(var(--accent-light-rgb))] hover:bg-[var(--fg-04)] transition mb-3"
            >
              <Plus size={14} />
              {filtered.length === 0 && query.trim() ? `Can't find it? Create "${query.trim()}"` : "Can't find it? Create your own"}
            </button>
          )}

          {loading && <p className="text-center text-[var(--fg-40)] text-sm py-10">Loading...</p>}
          {!loading && filtered.length === 0 && !showCreateForm && (
            <div className="text-center py-10">
              <p className="text-[var(--fg-40)] text-sm mb-2">No exercises match your filters.</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs font-mono text-[rgb(var(--accent-light-rgb))] hover:underline">Clear filters</button>
              )}
            </div>
          )}
          {filtered.map((ex) => {
            const alreadyInDay = existingIds?.has(ex.id);
            const isRecent = recentExerciseIds.has(ex.id);
            const isFav = favoriteIds.has(ex.id);
            return (
              <div key={ex.id} className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3.5 transition ${
                alreadyInDay
                  ? "border-[var(--fg-06)] bg-[var(--fg-01)]"
                  : "border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-03)] hover:border-[rgb(var(--accent-rgb)/0.35)] hover:bg-[var(--fg-05)]"
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  {ex.image_url ? (
                    <img src={ex.image_url} alt="" className="w-12 h-12 rounded-md object-cover shrink-0 border border-[var(--fg-10)]" />
                  ) : (
                    <div className="w-12 h-12 rounded-md shrink-0 bg-[var(--fg-05)] border border-[var(--fg-10)]" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="font-bold text-sm text-[var(--fg-90)] truncate">{ex.name}</p>
                      {isFav && <Star size={11} className="text-yellow-300 shrink-0" fill="currentColor" />}
                      {ex.created_by && <Tag variant="accent">CUSTOM</Tag>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Tag>{ex.primary_muscle}</Tag>
                      <Tag variant={hasEquipmentProfile ? (ex.equipment === "Bodyweight" || equipmentAccess.includes(ex.equipment) ? "owned" : "unowned") : "muted"}>{ex.equipment}</Tag>
                      <Tag variant="muted">{ex.category}</Tag>
                      {isRecent && <Tag variant="accent">Recent</Tag>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => !alreadyInDay && handleAdd(ex)}
                  disabled={alreadyInDay}
                  className={`shrink-0 rounded-md text-xs font-bold px-4 py-2.5 transition ${
                    alreadyInDay ? "bg-[var(--fg-05)] text-[var(--fg-30)] border border-[var(--fg-10)] cursor-not-allowed" : "bg-[rgb(var(--accent-rgb))] text-black hover:bg-[rgb(var(--accent-light-rgb))]"
                  }`}
                  style={!alreadyInDay ? { boxShadow: "0 0 16px -3px rgb(var(--accent-rgb) / 0.6)" } : undefined}
                >
                  {alreadyInDay ? "Added" : justAdded === ex.id ? "Added ✓" : "+ Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
