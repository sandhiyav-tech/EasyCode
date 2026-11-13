"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@/components/Editor";
import OutputPanel from "@/components/OutputPanel";
import ErrorsPanel from "@/components/ErrorsPanel";
import AskModal, { AskPrompt } from "@/components/AskModal";
import UserMenu from "@/components/UserMenu";
import SavedSnippetsModal from "@/components/SavedSnippetsModal";
import { EasyCodeError } from "@/lib/easycode";
import { EXAMPLES, ExampleProgram, DEFAULT_CODE_BY_LANG } from "@/lib/easycode/examples";
import { User, SavedSnippet } from "@/lib/auth";
import {
  Play,
  Compass,
  Share2,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  Terminal,
  BookOpen,
  Check,
  Bookmark,
  Languages,
  ArrowRightLeft,
  Code2,
} from "lucide-react";

export default function PlaygroundPage() {
  const [language, setLanguage] = useState<"easycode" | "python" | "javascript">("easycode");
  const [code, setCode] = useState<string>(DEFAULT_CODE_BY_LANG.easycode);
  const [errors, setErrors] = useState<EasyCodeError[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isTranspiling, setIsTranspiling] = useState<boolean>(false);
  const [mode, setMode] = useState<"run" | "explain">("run");
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showPythonCompare, setShowPythonCompare] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // User Authentication & Saved Programs State
  const [user, setUser] = useState<User | null>(null);
  const [isSavedSnippetsOpen, setIsSavedSnippetsOpen] = useState(false);

  // Ask prompt modal state
  const [isAskModalOpen, setIsAskModalOpen] = useState<boolean>(false);
  const [detectedPrompts, setDetectedPrompts] = useState<AskPrompt[]>([]);
  const pendingRunModeRef = useRef<"run" | "explain">("run");

  // Fetch current authenticated user session
  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // not logged in
    }
  };

  // Load code from URL hash on mount & fetch session
  useEffect(() => {
    fetchSession();

    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.startsWith("#code=")) {
        try {
          const encoded = hash.slice(6);
          const decoded = decodeURIComponent(encoded);
          if (decoded.trim()) {
            setCode(decoded);
          }
        } catch {
          // Ignore invalid hash
        }
      }

      // Detect dark mode preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  // Live syntax checking debounced 400ms (for EasyCode)
  useEffect(() => {
    if (language !== "easycode") {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (res.ok) {
          const data = await res.json();
          setErrors(data.errors || []);
        }
      } catch {
        // network or server error
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [code, language]);

  // Scan for ask statements in code
  const scanForAskPrompts = (source: string): AskPrompt[] => {
    const prompts: AskPrompt[] = [];
    const lines = source.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*ask\s+([a-zA-Z_]\w*)\s+with\s+"([^"]*)"/);
      if (match) {
        prompts.push({ target: match[1], prompt: match[2] });
      }
    }
    return prompts;
  };

  // Run execution
  const executeCode = useCallback(
    async (execMode: "run" | "explain", userInputs: string[] = []) => {
      setIsRunning(true);
      setMode(execMode);

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            mode: execMode,
            inputs: userInputs,
            language,
          }),
        });

        const data = await res.json();
        setOutput(data.output || []);
        setSteps(data.steps || []);
        setDurationMs(data.durationMs);

        if (data.error) {
          setErrors([data.error]);
          setActiveLine(data.error.line);
        } else {
          setErrors([]);
        }
      } catch {
        setOutput(["Failed to connect to execution engine."]);
      } finally {
        setIsRunning(false);
      }
    },
    [code, language]
  );

  // Switch Active Programming Language
  const handleSwitchLanguage = (newLang: "easycode" | "python" | "javascript") => {
    if (newLang === language) return;
    setLanguage(newLang);
    setErrors([]);
    setOutput([]);
    setSteps([]);

    const currentIsDefault =
      !code.trim() ||
      code.trim() === DEFAULT_CODE_BY_LANG.easycode.trim() ||
      code.trim() === DEFAULT_CODE_BY_LANG.python.trim() ||
      code.trim() === DEFAULT_CODE_BY_LANG.javascript.trim();

    if (currentIsDefault) {
      setCode(DEFAULT_CODE_BY_LANG[newLang]);
    }
  };

  // 1-Click Code Transpiler between languages
  const handleTranspile = async (targetLang: "python" | "javascript") => {
    setIsTranspiling(true);
    try {
      const res = await fetch("/api/transpile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          targetLanguage: targetLang,
        }),
      });
      const data = await res.json();
      if (data.converted) {
        setCode(data.converted);
        setLanguage(targetLang);
        setErrors([]);
        setOutput([
          `⚡ Converted EasyCode into ${targetLang === "python" ? "Python" : "JavaScript"} successfully! You can run it directly.`
        ]);
      }
    } catch {
      setOutput(["Failed to transpile code."]);
    } finally {
      setIsTranspiling(false);
    }
  };

  // Trigger Run with Ask detection
  const handleRun = (execMode: "run" | "explain" = "run") => {
    const prompts = scanForAskPrompts(code);
    if (prompts.length > 0) {
      setDetectedPrompts(prompts);
      pendingRunModeRef.current = execMode;
      setIsAskModalOpen(true);
    } else {
      executeCode(execMode);
    }
  };

  const handleAskModalSubmit = (inputs: string[]) => {
    setIsAskModalOpen(false);
    executeCode(pendingRunModeRef.current, inputs);
  };

  // 1-Click "Apply fix" handler
  const handleApplyFix = (error: EasyCodeError) => {
    if (!error.suggestedLine) return;
    const lines = code.split("\n");
    const targetIdx = error.line - 1;
    if (targetIdx >= 0 && targetIdx < lines.length) {
      lines[targetIdx] = error.suggestedLine;
      const updatedCode = lines.join("\n");
      setCode(updatedCode);
    }
  };

  // Jump to line
  const handleJumpToLine = (line: number) => {
    setActiveLine(line);
  };

  // Share button: copy hash URL
  const handleShare = () => {
    const encoded = encodeURIComponent(code);
    const url = `${window.location.origin}${window.location.pathname}#code=${encoded}`;
    navigator.clipboard.writeText(url);
    window.location.hash = `code=${encoded}`;
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Example selection
  const handleSelectExample = (example: ExampleProgram) => {
    setLanguage(example.language || "easycode");
    setCode(example.code);
    setOutput([]);
    setSteps([]);
    setErrors([]);
    if (example.category === "broken") {
      setShowPythonCompare(true);
    }
  };

  // User Sign Out
  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  // Save Snippet
  const handleSaveSnippet = async (title: string) => {
    try {
      const res = await fetch("/api/auth/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, code }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.snippet && user) {
          setUser({
            ...user,
            savedSnippets: [data.snippet, ...user.savedSnippets],
          });
        }
      }
    } catch {
      // ignore
    }
  };

  // Delete Snippet
  const handleDeleteSnippet = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/snippets?id=${id}`, { method: "DELETE" });
      if (res.ok && user) {
        setUser({
          ...user,
          savedSnippets: user.savedSnippets.filter((s) => s.id !== id),
        });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-warm-50 dark:bg-warm-950 text-warm-900 dark:text-warm-100 font-sans">
      {/* Ask Input Modal */}
      <AskModal
        prompts={detectedPrompts}
        isOpen={isAskModalOpen}
        onSubmit={handleAskModalSubmit}
        onClose={() => setIsAskModalOpen(false)}
      />

      {/* Saved Snippets Modal */}
      <SavedSnippetsModal
        isOpen={isSavedSnippetsOpen}
        onClose={() => setIsSavedSnippetsOpen(false)}
        snippets={user?.savedSnippets || []}
        currentCode={code}
        onLoadSnippet={(newCode) => setCode(newCode)}
        onSaveSnippet={handleSaveSnippet}
        onDeleteSnippet={handleDeleteSnippet}
      />

      {/* Top Navbar */}
      <header className="flex items-center justify-between px-5 py-3 bg-white dark:bg-warm-900 border-b border-warm-200 dark:border-warm-800 z-20">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight">EasyCode</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                Beginner Edition
              </span>
            </div>
            <p className="text-[11px] text-warm-500 dark:text-warm-400">
              Where every mistake teaches something
            </p>
          </div>
        </div>

        {/* Center: Examples Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-warm-100 hover:bg-warm-200/80 dark:bg-warm-800 dark:hover:bg-warm-700 rounded-xl transition-colors">
            <BookOpen className="w-3.5 h-3.5 text-warm-600 dark:text-warm-300" />
            <span>Examples</span>
            <ChevronDown className="w-3.5 h-3.5 text-warm-500" />
          </button>

          {/* Dropdown Menu */}
          <div className="absolute left-0 mt-1 w-72 max-h-96 overflow-y-auto p-2 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-2xl shadow-xl hidden group-hover:block z-50">
            {/* EasyCode Starters */}
            <div className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 px-2 py-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>EasyCode Programs</span>
            </div>
            {EXAMPLES.filter((e) => e.category === "starter" && (!e.language || e.language === "easycode")).map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExample(ex)}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800 flex flex-col"
              >
                <span className="font-semibold text-warm-800 dark:text-warm-200">
                  {ex.title}
                </span>
                <span className="text-[10px] text-warm-400 line-clamp-1">
                  {ex.description}
                </span>
              </button>
            ))}

            {/* Python Starters */}
            <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 px-2 pt-2 pb-1 border-t border-warm-100 dark:border-warm-800 mt-1 flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              <span>Python Programs</span>
            </div>
            {EXAMPLES.filter((e) => e.category === "starter" && e.language === "python").map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExample(ex)}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 flex flex-col"
              >
                <span className="font-semibold text-warm-800 dark:text-warm-200">
                  {ex.title}
                </span>
                <span className="text-[10px] text-warm-400 line-clamp-1">
                  {ex.description}
                </span>
              </button>
            ))}

            {/* JavaScript Starters */}
            <div className="text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-400 px-2 pt-2 pb-1 border-t border-warm-100 dark:border-warm-800 mt-1 flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              <span>JavaScript Programs</span>
            </div>
            {EXAMPLES.filter((e) => e.category === "starter" && e.language === "javascript").map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExample(ex)}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-950/40 flex flex-col"
              >
                <span className="font-semibold text-warm-800 dark:text-warm-200">
                  {ex.title}
                </span>
                <span className="text-[10px] text-warm-400 line-clamp-1">
                  {ex.description}
                </span>
              </button>
            ))}

            {/* Broken / Bug Demonstrations */}
            <div className="text-[10px] uppercase font-bold text-rose-500 px-2 pt-2 pb-1 border-t border-warm-100 dark:border-warm-800 mt-1">
              Bug &amp; Error Demonstrations
            </div>
            {EXAMPLES.filter((e) => e.category === "broken").map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExample(ex)}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-900 dark:text-rose-200 flex flex-col"
              >
                <span className="font-semibold">{ex.title}</span>
                <span className="text-[10px] text-rose-700/80 dark:text-rose-400 line-clamp-1">
                  {ex.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions (Run, Explain, Save, Python Compare, Share, Theme, User) */}
        <div className="flex items-center gap-2">
          {/* Run Button */}
          <button
            onClick={() => handleRun("run")}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all transform active:scale-95 disabled:opacity-50"
            title="Run (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run</span>
          </button>

          {/* Explain Step-by-Step Button */}
          <button
            onClick={() => handleRun("explain")}
            disabled={isRunning}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all transform active:scale-95 disabled:opacity-50"
            title="Explain step by step (Ctrl+Shift+Enter)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explain</span>
          </button>

          {/* Save Program Button (Available to logged-in users) */}
          {user && (
            <button
              onClick={() => setIsSavedSnippetsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 rounded-xl transition-colors border border-brand-200 dark:border-brand-900"
              title="Save or load programs"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">My Programs</span>
            </button>
          )}

          {/* Compare with Python Toggle */}
          <button
            onClick={() => setShowPythonCompare((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
              showPythonCompare
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-warm-100 hover:bg-warm-200 dark:bg-warm-800 dark:hover:bg-warm-700 text-warm-700 dark:text-warm-200 border-warm-200 dark:border-warm-800"
            }`}
            title="Toggle side-by-side Python comparison"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compare with Python</span>
          </button>

          {/* Clear Code */}
          <button
            onClick={() => {
              setCode("");
              setOutput([]);
              setSteps([]);
            }}
            className="p-2 text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 rounded-xl transition-colors"
            title="Clear editor"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-warm-100 hover:bg-warm-200 dark:bg-warm-800 dark:hover:bg-warm-700 rounded-xl transition-colors"
            title="Share program via URL"
          >
            {copiedShare ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">{copiedShare ? "Copied!" : "Share"}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 rounded-xl transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Portal / Sign In Menu */}
          <div className="pl-1 border-l border-warm-200 dark:border-warm-800">
            <UserMenu
              user={user}
              onSignOut={handleSignOut}
              onOpenSavedSnippets={() => setIsSavedSnippetsOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* Main Workspace (Editor on Left, Split Output/Errors on Right) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left: Code Editor (7 cols on large screens) */}
        <section className="lg:col-span-7 h-full flex flex-col gap-2 overflow-hidden">
          {/* Language Selector & Transpiler Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-xl shadow-xs text-xs">
            {/* Language Selector Pills */}
            <div className="flex items-center gap-1 bg-warm-100 dark:bg-warm-950 p-1 rounded-lg">
              <button
                onClick={() => handleSwitchLanguage("easycode")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                  language === "easycode"
                    ? "bg-white dark:bg-warm-800 text-brand-600 dark:text-brand-300 shadow-xs"
                    : "text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
                }`}
                title="EasyCode: beginner-friendly syntax with friendly learning errors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>EasyCode</span>
              </button>

              <button
                onClick={() => handleSwitchLanguage("python")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                  language === "python"
                    ? "bg-white dark:bg-warm-800 text-amber-600 dark:text-amber-300 shadow-xs"
                    : "text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
                }`}
                title="Python: clean indentation and colons"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Python</span>
              </button>

              <button
                onClick={() => handleSwitchLanguage("javascript")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                  language === "javascript"
                    ? "bg-white dark:bg-warm-800 text-yellow-600 dark:text-yellow-300 shadow-xs"
                    : "text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
                }`}
                title="JavaScript: the language of the modern web"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>JavaScript</span>
              </button>
            </div>

            {/* Quick Transpile Actions */}
            <div className="flex items-center gap-1.5">
              {language === "easycode" ? (
                <>
                  <span className="text-[11px] text-warm-400 hidden sm:inline">Convert to:</span>
                  <button
                    onClick={() => handleTranspile("python")}
                    disabled={isTranspiling}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800 transition-colors disabled:opacity-50"
                    title="Translate this EasyCode program into Python code"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Python</span>
                  </button>
                  <button
                    onClick={() => handleTranspile("javascript")}
                    disabled={isTranspiling}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:hover:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-md border border-yellow-200 dark:border-yellow-800 transition-colors disabled:opacity-50"
                    title="Translate this EasyCode program into JavaScript code"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>JavaScript</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-warm-500 font-medium hidden sm:inline">
                    Running in {language === "python" ? "Python" : "JavaScript"} Sandbox
                  </span>
                  <button
                    onClick={() => handleSwitchLanguage("easycode")}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded-md border border-brand-200 dark:border-brand-800"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Back to EasyCode</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <Editor
              code={code}
              onChange={(val) => setCode(val)}
              errors={errors}
              onRun={() => handleRun("run")}
              onExplain={() => handleRun("explain")}
              activeLine={activeLine}
              onSelectErrorLine={(line) => setActiveLine(line)}
              language={language}
            />
          </div>
        </section>

        {/* Right: Output & Errors (5 cols on large screens) */}
        <section className="lg:col-span-5 h-full flex flex-col gap-3 overflow-hidden">
          {/* Top Half: Output Console */}
          <div className="flex-1 min-h-[160px] overflow-hidden">
            <OutputPanel
              output={output}
              steps={steps}
              durationMs={durationMs}
              isRunning={isRunning}
              mode={mode}
              onClear={() => {
                setOutput([]);
                setSteps([]);
              }}
              onJumpToLine={handleJumpToLine}
            />
          </div>

          {/* Bottom Half: Kind Pedagogical Errors */}
          <div className="flex-1 min-h-[180px] overflow-hidden">
            <ErrorsPanel
              errors={errors}
              onApplyFix={handleApplyFix}
              onJumpToLine={handleJumpToLine}
              showPythonComparison={showPythonCompare}
              onTogglePythonComparison={() => setShowPythonCompare((prev) => !prev)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
