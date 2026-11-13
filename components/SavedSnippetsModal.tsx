"use client";

import React, { useState } from "react";
import { SavedSnippet } from "@/lib/auth";
import { Bookmark, Trash2, Code2, Plus, X, Check, FileText } from "lucide-react";

interface SavedSnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: SavedSnippet[];
  currentCode: string;
  onLoadSnippet: (code: string) => void;
  onSaveSnippet: (title: string) => Promise<void>;
  onDeleteSnippet: (id: string) => Promise<void>;
}

export default function SavedSnippetsModal({
  isOpen,
  onClose,
  snippets,
  currentCode,
  onLoadSnippet,
  onSaveSnippet,
  onDeleteSnippet,
}: SavedSnippetsModalProps) {
  const [newTitle, setNewTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);
    await onSaveSnippet(newTitle.trim());
    setIsSaving(false);
    setNewTitle("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl p-6 shadow-xl space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-warm-100 dark:border-warm-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-warm-900 dark:text-warm-100">
                My Saved Programs
              </h3>
              <p className="text-xs text-warm-500 dark:text-warm-400">
                Save your programs to the cloud and load them anytime.
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

        {/* Save Current Program Form */}
        <form onSubmit={handleSave} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Name your current program (e.g. Space Math)..."
            className="flex-1 px-3.5 py-2 text-xs bg-warm-50 dark:bg-warm-950 border border-warm-200 dark:border-warm-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-warm-900 dark:text-warm-100 placeholder-warm-400"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isSaving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Save Current</span>
              </>
            )}
          </button>
        </form>

        {/* Snippets List */}
        <div className="flex-1 overflow-auto space-y-2 pr-1">
          {snippets.length === 0 ? (
            <div className="text-center py-8 text-warm-400 dark:text-warm-600">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">No saved programs yet.</p>
              <p className="text-[11px] mt-0.5">Name your code above to save your first program!</p>
            </div>
          ) : (
            snippets.map((snip) => (
              <div
                key={snip.id}
                className="p-3 bg-warm-50 dark:bg-warm-950/60 border border-warm-200 dark:border-warm-800 rounded-2xl flex items-center justify-between gap-3 group hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-warm-900 dark:text-warm-100 truncate">
                    {snip.title}
                  </h4>
                  <p className="text-[10px] text-warm-400 font-mono line-clamp-1 mt-0.5">
                    {snip.code.split("\n").filter((l) => l.trim() && !l.startsWith("#"))[0] || "Program"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onLoadSnippet(snip.code);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Load</span>
                  </button>
                  <button
                    onClick={() => onDeleteSnippet(snip.id)}
                    className="p-1.5 text-warm-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete program"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

