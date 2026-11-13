"use client";

import React, { useState } from "react";
import { EasyCodeError } from "@/lib/easycode";
import { Sparkles, CheckCircle2, ArrowRight, BookOpen, AlertCircle, Wrench, Terminal } from "lucide-react";

interface ErrorsPanelProps {
  errors: EasyCodeError[];
  onApplyFix: (error: EasyCodeError) => void;
  onJumpToLine: (line: number) => void;
  showPythonComparison?: boolean;
  onTogglePythonComparison?: () => void;
}

export default function ErrorsPanel({
  errors,
  onApplyFix,
  onJumpToLine,
  showPythonComparison = false,
  onTogglePythonComparison,
}: ErrorsPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full text-center bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-2xl">
        <div className="w-12 h-12 mb-3 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-warm-800 dark:text-warm-100">
          No syntax errors found!
        </h3>
        <p className="text-xs text-warm-500 dark:text-warm-400 mt-1 max-w-xs">
          Your code looks clean and ready to run. Press &quot;Run&quot; or &quot;Explain step by step&quot; above.
        </p>
      </div>
    );
  }

  const currentError = errors[selectedIdx] || errors[0];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              Learning Hint ({selectedIdx + 1} of {errors.length})
            </h3>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">
              Every mistake teaches something
            </span>
          </div>
        </div>

        {/* Toggle Python Comparison & Quick Nav */}
        <div className="flex items-center gap-2">
          {onTogglePythonComparison && (
            <button
              onClick={onTogglePythonComparison}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                showPythonComparison
                  ? "bg-amber-600 text-white"
                  : "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Compare with Python</span>
            </button>
          )}

          {errors.length > 1 && (
            <div className="flex items-center gap-1 text-xs">
              <button
                disabled={selectedIdx === 0}
                onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                className="px-2 py-0.5 rounded bg-warm-200 dark:bg-warm-800 disabled:opacity-40"
              >
                &larr;
              </button>
              <span className="text-warm-500">{selectedIdx + 1}/{errors.length}</span>
              <button
                disabled={selectedIdx === errors.length - 1}
                onClick={() => setSelectedIdx((i) => Math.min(errors.length - 1, i + 1))}
                className="px-2 py-0.5 rounded bg-warm-200 dark:bg-warm-800 disabled:opacity-40"
              >
                &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {showPythonComparison ? (
          /* Side-by-Side Comparison */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* EasyCode Kind Explanation */}
            <div className="p-3.5 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>EasyCode (Kind &amp; Helpful)</span>
              </div>
              <p className="text-xs font-bold text-warm-900 dark:text-warm-100 mb-1">
                Oops! Line {currentError.line}: {currentError.message}
              </p>
              <p className="text-xs text-warm-600 dark:text-warm-300 mb-2">
                {currentError.why}
              </p>
              {currentError.didYouMean && (
                <div className="text-xs bg-brand-100/70 dark:bg-brand-900/40 text-brand-900 dark:text-brand-200 px-2 py-1 rounded mb-2">
                  {currentError.didYouMean}
                </div>
              )}
              <div className="text-xs text-brand-800 dark:text-brand-300 font-medium">
                Fix: {currentError.fix}
              </div>
            </div>

            {/* Python Cryptic Error */}
            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Python (Raw Cryptic Error)</span>
                </div>
                <pre className="whitespace-pre-wrap text-[11px] text-rose-300 bg-slate-950 p-2.5 rounded border border-slate-800 mb-2">
                  {currentError.pythonEquivalent?.rawError ||
                    `Traceback (most recent call last):\n  File "script.py", line ${currentError.line}, in <module>\n    ${currentError.message}\nError: execution failed`}
                </pre>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                {currentError.pythonEquivalent?.explanation ||
                  "Python stops with stack traces and technical jargon that can intimidate beginners."}
              </p>
            </div>
          </div>
        ) : (
          /* Standard EasyCode Friendly Card */
          <div className="space-y-3">
            {/* Title & Line Jump */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-warm-900 dark:text-warm-50">
                  Oops! Line {currentError.line}: {currentError.message}
                </h4>
              </div>
              <button
                onClick={() => onJumpToLine(currentError.line)}
                className="text-xs px-2.5 py-1 rounded-md bg-warm-100 hover:bg-warm-200 dark:bg-warm-800 dark:hover:bg-warm-700 text-warm-700 dark:text-warm-300 flex items-center gap-1 transition-colors flex-shrink-0"
              >
                <span>Go to Line {currentError.line}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Pre-rendered Visual Snippet */}
            {currentError.snippet && (
              <pre className="bg-warm-100/70 dark:bg-warm-950 p-3 rounded-xl font-mono text-xs text-warm-800 dark:text-warm-200 overflow-x-auto border border-warm-200/80 dark:border-warm-800">
                <code>{currentError.snippet}</code>
              </pre>
            )}

            {/* Why this happened */}
            <div className="flex items-start gap-2 text-xs text-warm-600 dark:text-warm-300">
              <BookOpen className="w-4 h-4 text-warm-400 flex-shrink-0 mt-0.5" />
              <p>{currentError.why}</p>
            </div>

            {/* Did you mean */}
            {currentError.didYouMean && (
              <div className="p-2.5 bg-sunny-50 dark:bg-sunny-950/30 border border-sunny-200 dark:border-sunny-800/40 rounded-xl text-xs text-sunny-900 dark:text-sunny-200 font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sunny-500 flex-shrink-0" />
                <span>{currentError.didYouMean}</span>
              </div>
            )}

            {/* Fix Suggestion & 1-Click Apply */}
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Fix: </span>
                <span className="text-emerald-900 dark:text-emerald-200 font-mono">
                  {currentError.fix}
                </span>
              </div>

              {currentError.suggestedLine && (
                <button
                  onClick={() => onApplyFix(currentError)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all transform active:scale-95 flex-shrink-0"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Apply fix</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

