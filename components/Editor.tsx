"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { EasyCodeError } from "@/lib/easycode";

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: EasyCodeError[];
  onRun?: () => void;
  onExplain?: () => void;
  activeLine?: number | null;
  onSelectErrorLine?: (line: number) => void;
}

const KEYWORDS = new Set([
  "set",
  "to",
  "say",
  "ask",
  "with",
  "if",
  "otherwise",
  "repeat",
  "times",
  "while",
  "for",
  "each",
  "in",
  "define",
  "call",
  "give",
  "back",
  "add",
  "remove",
  "from",
  "pass",
  "is",
  "not",
  "greater",
  "less",
  "than",
  "at",
  "least",
  "most",
  "and",
  "or",
  "remainder",
  "of",
  "divided",
  "by",
  "true",
  "false",
]);

export default function Editor({
  code,
  onChange,
  errors,
  onRun,
  onExplain,
  activeLine,
  onSelectErrorLine,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => code.split("\n"), [code]);

  // Sync scrolling between textarea, highlight overlay, and gutter
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
      }
      if (gutterRef.current) {
        gutterRef.current.scrollTop = scrollTop;
      }
    }
  };

  // Handle Tab key for 4 spaces and shortcuts (Ctrl+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey && onExplain) {
        onExplain();
      } else if (onRun) {
        onRun();
      }
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Dedent (Shift+Tab)
        const lineStart = code.lastIndexOf("\n", start - 1) + 1;
        const lineText = code.slice(lineStart, end);
        if (lineText.startsWith("    ")) {
          const newCode = code.slice(0, lineStart) + lineText.slice(4) + code.slice(end);
          onChange(newCode);
          setTimeout(() => {
            textarea.selectionStart = Math.max(lineStart, start - 4);
            textarea.selectionEnd = Math.max(lineStart, end - 4);
          }, 0);
        }
      } else {
        // Indent 4 spaces
        const newCode = code.substring(0, start) + "    " + code.substring(end);
        onChange(newCode);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      }
    }
  };

  // Jump to active line when changed from outside
  useEffect(() => {
    if (activeLine && textareaRef.current) {
      const textarea = textareaRef.current;
      const linesArray = code.split("\n");
      let charCount = 0;
      for (let i = 0; i < Math.min(activeLine - 1, linesArray.length); i++) {
        charCount += linesArray[i].length + 1;
      }
      textarea.focus();
      textarea.setSelectionRange(charCount, charCount + (linesArray[activeLine - 1]?.length || 0));

      const lineHeight = 24;
      const targetScroll = Math.max(0, (activeLine - 3) * lineHeight);
      textarea.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [activeLine, code]);

  // Syntax highlighting builder for each line
  const renderHighlightedLine = (lineText: string, lineIndex: number) => {
    const lineNum = lineIndex + 1;
    const lineError = errors.find((e) => e.line === lineNum);

    // Tokenize line with regex for keywords, strings, numbers, comments, symbols
    const tokens: React.ReactNode[] = [];
    let idx = 0;

    // Check comment
    const commentIdx = lineText.indexOf("#");
    const codePart = commentIdx !== -1 ? lineText.slice(0, commentIdx) : lineText;
    const commentPart = commentIdx !== -1 ? lineText.slice(commentIdx) : "";

    const wordRegex = /("[^"]*"|'[^']*'|\b\w+\b|[+\-*/()[\]:,=]| +)/g;
    let match;

    while ((match = wordRegex.exec(codePart)) !== null) {
      const str = match[0];
      const startCol = match.index + 1;
      const endCol = startCol + str.length;

      // Check if this token is covered by the line error
      const isErrorSpan =
        lineError &&
        lineError.column <= endCol &&
        lineError.column + lineError.length >= startCol;

      const lower = str.toLowerCase();
      let className = "token-identifier";

      if (str.startsWith('"') || str.startsWith("'")) {
        className = "token-string";
      } else if (/^\d+(\.\d+)?$/.test(str)) {
        className = "token-number";
      } else if (KEYWORDS.has(lower)) {
        className = "token-keyword";
      } else if (/[+\-*/=]/.test(str)) {
        className = "token-operator";
      }

      if (isErrorSpan) {
        className += " error-squiggle";
      }

      tokens.push(
        <span key={`${lineNum}-${idx++}`} className={className}>
          {str}
        </span>
      );
    }

    if (commentPart) {
      tokens.push(
        <span key={`${lineNum}-comment`} className="token-comment">
          {commentPart}
        </span>
      );
    }

    // Fallback if empty line to keep height
    if (lineText.length === 0) {
      tokens.push(<span key="empty">&nbsp;</span>);
    }

    return (
      <div
        key={`hl-${lineNum}`}
        className={`leading-6 h-6 px-4 font-mono text-[13.5px] whitespace-pre select-none ${activeLine === lineNum ? "bg-amber-100/50 dark:bg-amber-900/20" : ""
          }`}
      >
        {tokens}
      </div>
    );
  };

  return (
    <div className="relative flex flex-1 h-full overflow-hidden bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-2xl shadow-sm">
      {/* Line Numbers Gutter */}
      <div
        ref={gutterRef}
        className="w-12 py-3 select-none overflow-hidden bg-warm-50 dark:bg-warm-950 border-r border-warm-200 dark:border-warm-800 text-right text-xs font-mono text-warm-400 dark:text-warm-500 flex flex-col items-end pr-2"
        style={{ scrollbarWidth: "none" }}
      >
        {lines.map((_, i) => {
          const lineNum = i + 1;
          const hasError = errors.some((e) => e.line === lineNum);
          const isActive = activeLine === lineNum;

          return (
            <div
              key={lineNum}
              onClick={() => onSelectErrorLine && onSelectErrorLine(lineNum)}
              className={`h-6 leading-6 flex items-center justify-end gap-1 cursor-pointer w-full pr-1 rounded ${hasError
                  ? "text-rose-500 font-bold"
                  : isActive
                    ? "text-amber-500 font-bold"
                    : "hover:text-warm-700 dark:hover:text-warm-300"
                }`}
            >
              {hasError && (
                <span
                  title="Has error"
                  className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse"
                />
              )}
              <span>{lineNum}</span>
            </div>
          );
        })}
      </div>

      {/* Code Area */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Syntax Highlighted Overlay (Layer underneath) */}
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="absolute inset-0 py-3 overflow-hidden pointer-events-none"
        >
          {lines.map((lineText, idx) => renderHighlightedLine(lineText, idx))}
        </div>

        {/* Real Editable Textarea (Layer on top, transparent text, visible caret) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          placeholder="Write your EasyCode program here..."
          className="absolute inset-0 w-full h-full py-3 px-4 font-mono text-[13.5px] leading-6 bg-transparent text-transparent caret-warm-800 dark:caret-warm-100 resize-none outline-none border-none whitespace-pre overflow-auto z-10 selection:bg-brand-200/50 dark:selection:bg-brand-900/50"
        />
      </div>
    </div>
  );
}

