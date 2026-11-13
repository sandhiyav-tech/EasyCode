"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@/components/Editor";
import OutputPanel from "@/components/OutputPanel";
import ErrorsPanel from "@/components/ErrorsPanel";
import AskModal, { AskPrompt } from "@/components/AskModal";
import { EasyCodeError } from "@/lib/easycode";
import { EXAMPLES, ExampleProgram } from "@/lib/easycode/examples";
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
} from "lucide-react";

const DEFAULT_CODE = `# Welcome to EasyCode!
# A beginner-friendly language where every mistake teaches something.

set name to "Alex"
set score to 10

say "Hello, " + name + "!"

if score is at least 10:
    say "Outstanding! You got a top score."
otherwise:
    say "Keep practicing, you will get it!"
`;

export default function PlaygroundPage() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [errors, setErrors] = useState<EasyCodeError[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [mode, setMode] = useState<"run" | "explain">("run");
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showPythonCompare, setShowPythonCompare] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Ask prompt modal state
  const [isAskModalOpen, setIsAskModalOpen] = useState<boolean>(false);
  const [detectedPrompts, setDetectedPrompts] = useState<AskPrompt[]>([]);
  const pendingRunModeRef = useRef<"run" | "explain">("run");

  // Load code from URL hash on mount
  useEffect(() => {
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

  // Live syntax checking debounced 400ms
  useEffect(() => {
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
  }, [code]);

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
          }),
        });

        const data = await res.json();
        setOutput(data.output || []);
        setSteps(data.steps || []);
        setDurationMs(data.durationMs);

        if (data.error) {
          setErrors([data.error]);
          setActiveLine(data.error.line);
        }
      } catch (err: unknown) {
        setOutput(["Failed to connect to execution engine."]);
      } finally {
        setIsRunning(false);
      }
    },
    [code]
  );

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
    setCode(example.code);
    setOutput([]);
    setSteps([]);
    if (example.category === "broken") {
      setShowPythonCompare(true);
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
          <div className="absolute left-0 mt-1 w-64 p-2 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-2xl shadow-xl hidden group-hover:block z-50">
            <div className="text-[10px] uppercase font-bold text-warm-400 px-2 py-1">
              Starter Programs
            </div>
            {EXAMPLES.filter((e) => e.category === "starter").map((ex) => (
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

            <div className="text-[10px] uppercase font-bold text-amber-500 px-2 pt-2.5 pb-1 border-t border-warm-100 dark:border-warm-800 mt-1">
              Error Demonstrations
            </div>
            {EXAMPLES.filter((e) => e.category === "broken").map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExample(ex)}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex flex-col"
              >
                <span className="font-semibold">{ex.title}</span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400 line-clamp-1">
                  {ex.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions (Run, Explain, Python Compare, Share, Theme) */}
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
        </div>
      </header>

      {/* Main Workspace (Editor on Left, Split Output/Errors on Right) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left: Code Editor (7 cols on large screens) */}
        <section className="lg:col-span-7 h-full flex flex-col overflow-hidden">
          <Editor
            code={code}
            onChange={(val) => setCode(val)}
            errors={errors}
            onRun={() => handleRun("run")}
            onExplain={() => handleRun("explain")}
            activeLine={activeLine}
            onSelectErrorLine={(line) => setActiveLine(line)}
          />
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
