"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, UserCheck, ShieldCheck, ArrowLeft, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign In Form State
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState<"student" | "teacher" | "explorer">("student");

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: signInIdentifier,
          password: signInPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Sign in failed.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setErrorMsg("Unable to connect to the server. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signUpName,
          email: signUpEmail,
          username: signUpUsername,
          password: signUpPassword,
          role: signUpRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Account creation failed.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setErrorMsg("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Demo Profiles
  const handleQuickLogin = async (identifier: string, pass: string) => {
    setSignInIdentifier(identifier);
    setSignInPassword(pass);
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password: pass,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setErrorMsg(data.error || "Demo login failed");
      }
    } catch {
      setErrorMsg("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-950 flex flex-col items-center justify-center p-4">
      {/* Return to Playground Link */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center text-xs">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-warm-600 dark:text-warm-400 hover:text-warm-900 dark:hover:text-warm-100 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Playground</span>
        </Link>
        <Link
          href="/"
          className="text-brand-600 dark:text-brand-400 hover:underline font-semibold"
        >
          Continue as Guest &rarr;
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-xl font-extrabold text-warm-900 dark:text-warm-50">
            Welcome to EasyCode Portal
          </h1>
          <p className="text-xs text-warm-500 dark:text-warm-400">
            Save your programs, track your coding journey, and learn without fear.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-warm-100 dark:bg-warm-950 rounded-2xl">
          <button
            onClick={() => {
              setTab("signin");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "signin"
                ? "bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 shadow-xs"
                : "text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab("signup");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "signup"
                ? "bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 shadow-xs"
                : "text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sign In Tab */}
        {tab === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                Email or Username
              </label>
              <input
                type="text"
                required
                value={signInIdentifier}
                onChange={(e) => setSignInIdentifier(e.target.value)}
                placeholder="alex@easycode.dev or alex_coder"
                className="w-full px-3.5 py-2.5 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                Password
              </label>
              <input
                type="password"
                required
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{loading ? "Signing in..." : "Sign In to EasyCode"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Sign Up Tab */
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                Your Name
              </label>
              <input
                type="text"
                required
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full px-3.5 py-2 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="jordan@school.edu"
                  className="w-full px-3 py-2 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                  Username
                </label>
                <input
                  type="text"
                  value={signUpUsername}
                  onChange={(e) => setSignUpUsername(e.target.value)}
                  placeholder="jordan_coder"
                  className="w-full px-3 py-2 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                Password (min 6 characters)
              </label>
              <input
                type="password"
                required
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100"
              />
            </div>

            {/* Role Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                I am a...
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "student", label: "Student", icon: "🎒" },
                  { key: "teacher", label: "Teacher", icon: "👩‍🏫" },
                  { key: "explorer", label: "Explorer", icon: "🚀" },
                ].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSignUpRole(r.key as "student" | "teacher" | "explorer")}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      signUpRole === r.key
                        ? "bg-brand-50 dark:bg-brand-950/50 border-brand-500 text-brand-700 dark:text-brand-300 shadow-xs"
                        : "bg-warm-50 dark:bg-warm-950 border-warm-200 dark:border-warm-800 text-warm-600 dark:text-warm-400"
                    }`}
                  >
                    <span className="text-base">{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? "Creating..." : "Create Free Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Quick Demo Profiles (1-Click Demo) */}
        <div className="pt-4 border-t border-warm-100 dark:border-warm-800 space-y-2">
          <div className="text-[10px] font-bold text-warm-400 uppercase tracking-wider text-center">
            One-Click Demo Profiles
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin("alex@easycode.dev", "password123")}
              className="p-2.5 rounded-xl border border-warm-200 dark:border-warm-800 hover:border-brand-400 dark:hover:border-brand-600 bg-warm-50/70 dark:bg-warm-950/50 text-left transition-colors text-xs flex items-center gap-2"
            >
              <span className="text-xl">🎒</span>
              <div>
                <div className="font-bold text-warm-900 dark:text-warm-100">Alex</div>
                <div className="text-[10px] text-warm-400">Grade 7 Student</div>
              </div>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin("taylor@easycode.dev", "teacher123")}
              className="p-2.5 rounded-xl border border-warm-200 dark:border-warm-800 hover:border-brand-400 dark:hover:border-brand-600 bg-warm-50/70 dark:bg-warm-950/50 text-left transition-colors text-xs flex items-center gap-2"
            >
              <span className="text-xl">👩‍🏫</span>
              <div>
                <div className="font-bold text-warm-900 dark:text-warm-100">Ms. Taylor</div>
                <div className="text-[10px] text-warm-400">CS Teacher</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

