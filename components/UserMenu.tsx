"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User } from "@/lib/auth";
import { LogIn, LogOut, Bookmark, ChevronDown } from "lucide-react";

interface UserMenuProps {
  user: User | null;
  onSignOut: () => void;
  onOpenSavedSnippets: () => void;
}

export default function UserMenu({
  user,
  onSignOut,
  onOpenSavedSnippets,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs transition-transform active:scale-95"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Log In / Join</span>
      </Link>
    );
  }

  const roleLabels: Record<string, string> = {
    student: "Student",
    teacher: "Teacher",
    explorer: "Explorer",
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1 bg-warm-100 hover:bg-warm-200/80 dark:bg-warm-800 dark:hover:bg-warm-700/80 rounded-xl transition-colors text-xs font-semibold"
      >
        <span className="text-sm select-none">{user.avatar || "⭐"}</span>
        <span className="text-warm-800 dark:text-warm-100 max-w-[110px] truncate">
          {user.name.split(" ")[0]}
        </span>
        <ChevronDown className="w-3 h-3 text-warm-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 p-2 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
          {/* User Info */}
          <div className="px-3 py-2 border-b border-warm-100 dark:border-warm-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{user.avatar}</span>
              <div className="min-w-0">
                <div className="font-bold text-xs text-warm-900 dark:text-warm-100 truncate">
                  {user.name}
                </div>
                <div className="text-[10px] text-warm-400 truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
              {roleLabels[user.role] || "Learner"}
            </span>
          </div>

          {/* Saved Programs */}
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenSavedSnippets();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 rounded-xl transition-colors font-medium"
          >
            <Bookmark className="w-3.5 h-3.5 text-brand-500" />
            <span>My Saved Programs</span>
            {user.savedSnippets && user.savedSnippets.length > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.2 bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-full font-bold">
                {user.savedSnippets.length}
              </span>
            )}
          </button>

          {/* Sign Out */}
          <button
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors font-medium border-t border-warm-100 dark:border-warm-800 pt-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

