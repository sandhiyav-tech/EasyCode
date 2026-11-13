"use client";

import React, { useState } from "react";
import { Terminal, Compass, Copy, Check, Trash2, Clock, Play, SkipForward, RotateCcw } from "lucide-react";

interface OutputPanelProps {
  output: string[];
  steps?: string[];
  durationMs?: number;
  isRunning?: boolean;
  mode: "run" | "explain";
  onClear: () => void;
  onJumpToLine?: (line: number) => void;
}

export default function OutputPanel({
  output,
  steps,
  durationMs,
  isRunning,
  mode,
  onClear,
  onJumpToLine,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<"output" | "explain">(
    mode === "explain" ? "explain" : "output"
  );
  const [copied, setCopied] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Switch tab automatically if mode changes
  React.useEffect(() => {
    if (mode === "explain" && steps && steps.length > 0) {
      setActiveTab("explain");
      setActiveStepIndex(0);
    } else {
      setActiveTab("output");
    }
  }, [mode, steps]);

  const handleCopy = () => {
    const textToCopy =
      activeTab === "output"
        ? output.join("\n")
        : steps
        ? steps.join("\n")
        : "";
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Top Bar with Tabs and Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-warm-50/80 dark:bg-warm-950/60 border-b border-warm-200 dark:border-warm-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("output")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === "output"
                ? "bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 shadow-xs font-semibold"
                : "text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Output</span>
            {output.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300">
                {output.length}
              </span>
            )}
          </button>

          {steps && steps.length > 0 && (
            <button
              onClick={() => setActiveTab("explain")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === "explain"
                  ? "bg-white dark:bg-warm-800 text-purple-700 dark:text-purple-300 shadow-xs font-semibold"
                  : "text-warm-500 hover:text-warm-800 dark:hover:text-warm-200"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Step-by-Step Narration</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                {steps.length}
              </span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs text-warm-500">
          {isRunning ? (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Running...</span>
            </div>
          ) : durationMs !== undefined ? (
            <div className="flex items-center gap-1 text-[11px] text-warm-400">
              <Clock className="w-3 h-3" />
              <span>{durationMs}ms</span>
            </div>
          ) : null}

          <button
            onClick={handleCopy}
            disabled={output.length === 0 && (!steps || steps.length === 0)}
            title="Copy output"
            className="p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 disabled:opacity-30 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClear}
            disabled={output.length === 0 && (!steps || steps.length === 0)}
            title="Clear output"
            className="p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs">
        {activeTab === "output" ? (
          output.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-warm-400 dark:text-warm-600 text-center select-none">
              <Terminal className="w-8 h-8 mb-2 stroke-[1.5]" />
              <p className="text-xs">No output yet.</p>
              <p className="text-[11px] mt-0.5">Click &quot;Run&quot; or press Ctrl+Enter to see the result.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {output.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-warm-800 dark:text-warm-100">
                  <span className="text-warm-300 dark:text-warm-600 select-none text-[11px] pt-0.5">
                    &gt;
                  </span>
                  <span className="whitespace-pre-wrap">{line}</span>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Explain Mode Step-by-Step Viewer */
          <div className="space-y-3">
            {/* Step Controls */}
            {steps && steps.length > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl mb-3">
                <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                  Step {activeStepIndex + 1} of {steps.length}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={activeStepIndex === 0}
                    onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
                    className="p-1 rounded bg-white dark:bg-warm-800 text-purple-700 dark:text-purple-300 disabled:opacity-40 text-xs shadow-xs"
                    title="Previous step"
                  >
                    &larr; Prev
                  </button>
                  <button
                    disabled={activeStepIndex === steps.length - 1}
                    onClick={() => setActiveStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                    className="p-1 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 text-xs shadow-xs"
                    title="Next step"
                  >
                    Next &rarr;
                  </button>
                  <button
                    onClick={() => setActiveStepIndex(0)}
                    className="p-1 rounded bg-white dark:bg-warm-800 text-warm-600 dark:text-warm-300 text-xs shadow-xs"
                    title="Restart"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Step Cards */}
            {steps && steps.length > 0 ? (
              <div className="space-y-2">
                {steps.map((step, idx) => {
                  const isCurrent = idx === activeStepIndex;
                  // Extract line number if present
                  const lineMatch = step.match(/Line (\d+):/);
                  const lineNum = lineMatch ? Number(lineMatch[1]) : undefined;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveStepIndex(idx);
                        if (lineNum && onJumpToLine) onJumpToLine(lineNum);
                      }}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? "bg-purple-100/70 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 shadow-xs ring-1 ring-purple-400/50"
                          : "bg-white dark:bg-warm-900 border-warm-200 dark:border-warm-800 text-warm-700 dark:text-warm-300 hover:border-warm-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Step {idx + 1}
                        </span>
                        {lineNum && (
                          <span className="text-[10px] bg-purple-200/60 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded font-sans">
                            Line {lineNum}
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-xs leading-relaxed">{step}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

