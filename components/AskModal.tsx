"use client";

import React, { useState } from "react";
import { HelpCircle, Play, X } from "lucide-react";

export interface AskPrompt {
  target: string;
  prompt: string;
}

interface AskModalProps {
  prompts: AskPrompt[];
  isOpen: boolean;
  onSubmit: (inputs: string[]) => void;
  onClose: () => void;
}

export default function AskModal({ prompts, isOpen, onSubmit, onClose }: AskModalProps) {
  const [answers, setAnswers] = useState<string[]>(prompts.map(() => ""));

  if (!isOpen || prompts.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-warm-900 dark:text-warm-100">
                Your Program has Questions!
              </h3>
              <p className="text-xs text-warm-500 dark:text-warm-400">
                Please provide the inputs below before running.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-warm-400 hover:text-warm-700 dark:hover:text-warm-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {prompts.map((p, idx) => (
            <div key={idx} className="space-y-1.5">
              <label className="text-xs font-semibold text-warm-700 dark:text-warm-300 flex items-center gap-1.5">
                <span>{p.prompt}</span>
                <span className="text-[11px] text-warm-400 font-mono">({p.target})</span>
              </label>
              <input
                type="text"
                autoFocus={idx === 0}
                value={answers[idx] || ""}
                onChange={(e) => {
                  const copy = [...answers];
                  copy[idx] = e.target.value;
                  setAnswers(copy);
                }}
                placeholder={`Enter value for ${p.target}...`}
                className="w-full px-3.5 py-2 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100 placeholder-warm-400"
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl flex items-center gap-2 shadow-sm transition-transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Program</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
