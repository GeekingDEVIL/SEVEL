"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Orbitron } from "next/font/google";
import { supabase } from "../lib/supabase";
import AsciiCanvas from "../components/AsciiCanvas";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700"] });

const TAGLINES = [
  "YOUR BODY IS YOUR MACHINE",
  "DISCIPLINE IS FREEDOM",
  "RAISE YOUR LEVEL",
  "BUILT DIFFERENT",
];

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&";

function useScrambleText(text: string, duration = 600) {
  const [display, setDisplay] = useState(text);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setDisplay(text);
    }
    let frame = 0;
    const total = Math.ceil(duration / 16);
    const id = setInterval(() => {
      frame++;
      const p = frame / total;
      let r = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") r += " ";
        else if (i < Math.floor(p * text.length)) r += text[i];
        else r += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      setDisplay(r);
      if (frame >= total) {
        setDisplay(text);
        clearInterval(id);
      }
    }, 16);
    return () => clearInterval(id);
  }, [text, duration]);
  return display;
}

function getStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

const STR_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
const STR_LABELS = ["Weak", "Fair", "Good", "Strong"];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.2-17 10.3z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.2 0-9.7-3.1-11.3-7.6l-6.5 5C9.7 39.7 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C40.8 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}


function Typewriter({
  texts,
  speed = 80,
  deleteSpeed = 40,
  delay = 2200,
}: {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx] || "";
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          if (charIdx < current.length) {
            setDisplay(current.slice(0, charIdx + 1));
            setCharIdx((c) => c + 1);
          } else {
            setTimeout(() => setDeleting(true), delay);
          }
        } else {
          if (display.length > 0) {
            setDisplay((d) => d.slice(0, -1));
          } else {
            setDeleting(false);
            setCharIdx(0);
            setIdx((i) => (i + 1) % texts.length);
          }
        }
      },
      deleting ? deleteSpeed : speed,
    );
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, display, idx, texts, speed, deleteSpeed, delay]);

  return (
    <span className="text-[var(--fg-50)] font-mono text-[10px] tracking-[0.25em]" suppressHydrationWarning>
      {display}
      <span className="animate-pulse text-[rgb(var(--accent-rgb))]">|</span>
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSignIn, setIsSignIn] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem("sevel_has_signed_in")) setIsReturning(true);
    } catch {}
  }, []);

  const heading = isSignIn
    ? isReturning
      ? "Welcome Back"
      : "Sign In"
    : "Begin Your Ascent";
  const subtitle = isSignIn
    ? isReturning
      ? "Continue your journey"
      : "Sign in to your account"
    : "Create your account to start training";

  const scrambledHeading = useScrambleText(heading);
  const strength = getStrength(password);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    try {
      localStorage.setItem("sevel_has_signed_in", "1");
    } catch {}
    setAuthSuccess(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 800);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data: existing } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();
    if (existing) {
      setError("Username already taken");
      setLoading(false);
      return;
    }
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setSubmitted(true);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  }

  function toggle() {
    setIsSignIn((v) => !v);
    setError(null);
    setEmail("");
    setPassword("");
    setUsername("");
    setShowPassword(false);
  }

  const inputCls =
    "w-full rounded-xl bg-[var(--fg-03)] border border-[var(--fg-06)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--fg-20)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.25)] focus:shadow-[0_0_20px_rgb(var(--accent-rgb)/0.06)] transition-all duration-200";

  if (submitted) {
    return (
      <main className="relative min-h-screen text-[var(--text-primary)] overflow-hidden">
        <AsciiCanvas src="/ascii-bg.jpeg" />
        <div className="fixed inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/30 z-[1]" />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div
            className="relative w-full max-w-md rounded-3xl p-8 text-center overflow-hidden"
            style={{
              background: "var(--fg-01)",
              backdropFilter: "blur(10px) saturate(1.5) brightness(1.15)",
              WebkitBackdropFilter: "blur(10px) saturate(1.5) brightness(1.15)",
              border: "1px solid var(--fg-10)",
              boxShadow: `inset 0 0.5px 0 var(--fg-12), inset 0 -0.5px 0 var(--fg-04), 0 8px 32px rgba(0,0,0,0.25), 0 0 0 0.5px var(--fg-06)`,
              animation: "fadeSlideUp 0.5s ease-out",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent rounded-t-3xl" />
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] flex items-center justify-center text-[rgb(var(--accent-rgb))] font-bold">
                A
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Check Your Email
              </h1>
              <p className="text-[var(--fg-50)] text-sm mb-6">
                We sent a confirmation link to{" "}
                <span className="text-[var(--text-primary)] font-medium">{email}</span>
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setIsSignIn(true);
                }}
                className="text-[rgb(var(--accent-rgb))] text-sm hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-[var(--text-primary)] overflow-hidden">
      <AsciiCanvas src="/ascii-bg.jpeg" />

      <div className="fixed inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/20 z-[1]" />

      {authSuccess && (
        <div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{
            background: "white",
            animation: "flash 0.6s ease-out forwards",
          }}
        />
      )}

      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes breathe { 0%, 100% { opacity: 0.08; } 50% { opacity: 0.15; } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 var(--fg-01); } 50% { box-shadow: 0 0 25px 0 var(--fg-12); } }
        @keyframes flash { 0% { opacity: 0.25; } 100% { opacity: 0; } }
        @keyframes card-exit { 0% { opacity: 1; transform: scale(1) translateY(0); } 100% { opacity: 0; transform: scale(0.96) translateY(-20px); } }
        input[type="password"]::-ms-reveal, input[type="password"]::-ms-clear { display: none; }
      `}</style>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Branding */}
        <div
          className="flex flex-col items-center pt-12 md:pt-16 pb-4"
          suppressHydrationWarning
          style={{
            animation: mounted ? "fadeSlideUp 0.6s ease-out" : "none",
          }}
        >
          <div className="relative mb-3">
            <div
              className="absolute inset-[-6px] rounded-lg bg-[rgb(var(--accent-rgb))]"
              style={{ animation: "breathe 4s ease-in-out infinite", filter: "blur(12px)" }}
            />
            <div className="relative w-11 h-11 rounded-lg border border-[var(--fg-12)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-primary)] font-bold text-lg" suppressHydrationWarning>
              S
            </div>
          </div>
          <span
            className={`${orbitron.className} text-[11px] tracking-[0.35em] text-[var(--fg-40)] mb-2`}
          >
            SEVEL
          </span>
          <Typewriter texts={TAGLINES} />
        </div>

        {/* Form card area */}
        <div className="flex-1 flex items-end md:items-center justify-center px-5 pb-8 md:pb-12">
          <div className="relative z-0 w-full max-w-[400px]">
            <div
              ref={cardRef}
              className="relative rounded-3xl p-6 md:p-8 overflow-hidden"
              suppressHydrationWarning
              style={{
                background: "var(--fg-01)",
                backdropFilter: "blur(10px) saturate(1.5) brightness(1.15)",
                WebkitBackdropFilter: "blur(10px) saturate(1.5) brightness(1.15)",
                border: "1px solid var(--fg-10)",
                boxShadow: `inset 0 0.5px 0 var(--fg-12), inset 0 -0.5px 0 var(--fg-04), 0 8px 32px rgba(0,0,0,0.25), 0 0 0 0.5px var(--fg-06)`,
                animation: authSuccess
                  ? "card-exit 0.8s ease-in forwards"
                  : mounted
                    ? "fadeSlideUp 0.7s ease-out 0.1s both"
                    : "none",
              }}
            >
                {/* Glass edge highlight — top */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent rounded-t-3xl" />
                {/* Glass edge highlight — bottom (fainter) */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-b-3xl" />

                {/* Content */}
                <div className="relative">
                  <h1
                    className="text-2xl font-bold text-[var(--text-primary)] mb-1 font-mono tracking-tight"
                    aria-label={heading}
                    suppressHydrationWarning
                  >
                    {scrambledHeading}
                  </h1>
                  <p className="text-[var(--fg-40)] text-sm mb-6">{subtitle}</p>

                  <form
                    onSubmit={isSignIn ? handleSignIn : handleSignUp}
                    className="space-y-3"
                  >
                    {/* Username — animated reveal */}
                    <div
                      style={{
                        maxHeight: isSignIn ? 0 : 80,
                        opacity: isSignIn ? 0 : 1,
                        overflow: "hidden",
                        transition:
                          "max-height 0.3s ease, opacity 0.25s ease",
                      }}
                    >
                      <div className="pb-3">
                        <label className="text-xs text-[var(--fg-50)] font-medium mb-1.5 block">
                          Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required={!isSignIn}
                          placeholder="Choose a username"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[var(--fg-50)] font-medium mb-1.5 block">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[var(--fg-50)] font-medium mb-1.5 block">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={isSignIn ? undefined : 6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={
                            isSignIn
                              ? "Enter your password"
                              : "Min 6 characters"
                          }
                          autoComplete={
                            isSignIn ? "current-password" : "new-password"
                          }
                          className={`${inputCls} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-30)] hover:text-[var(--fg-60)] transition"
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>

                      {/* Password strength */}
                      {!isSignIn && password && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 flex gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                style={{
                                  background:
                                    i < strength
                                      ? STR_COLORS[strength - 1]
                                      : "var(--fg-06)",
                                }}
                              />
                            ))}
                          </div>
                          {strength > 0 && (
                            <span
                              className="text-[10px] font-mono"
                              style={{ color: STR_COLORS[strength - 1] }}
                            >
                              {STR_LABELS[strength - 1]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {error && (
                      <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black font-semibold text-sm py-3.5 hover:bg-[var(--fg-90)] active:scale-[0.97] transition-colors disabled:opacity-50 mt-1"
                      suppressHydrationWarning
                      style={{
                        animation:
                          !loading && mounted
                            ? "pulse-glow 3s ease-in-out infinite"
                            : "none",
                      }}
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          {isSignIn ? "Sign In" : "Create Account"}
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-5">
                    <span className="h-px flex-1 bg-[var(--fg-08)]" />
                    <span className="text-[var(--fg-25)] text-[11px] font-mono tracking-wider">
                      OR
                    </span>
                    <span className="h-px flex-1 bg-[var(--fg-08)]" />
                  </div>

                  {/* Social buttons */}
                  <button
                    type="button"
                    onClick={handleGoogle}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-[var(--fg-05)] border border-[var(--fg-08)] py-3 text-sm text-[var(--fg-70)] hover:bg-[var(--fg-10)] hover:border-[var(--fg-15)] hover:text-[var(--text-primary)] active:scale-[0.97] transition-all"
                  >
                    <GoogleIcon />
                    <span>Sign in with Google</span>
                  </button>

                  {/* Toggle */}
                  <p className="text-center text-[var(--fg-35)] text-sm mt-5">
                    {isSignIn
                      ? "Don't have an account?"
                      : "Already have an account?"}{" "}
                    <button
                      onClick={toggle}
                      className="text-[rgb(var(--accent-rgb))] hover:text-[rgb(var(--accent-light-rgb))] font-medium transition"
                    >
                      {isSignIn ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
