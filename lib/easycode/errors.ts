// EasyCode Structured Error System & Error Catalogue

export type ErrorType =
  | "UNDEFINED_VARIABLE"
  | "MISSPELLED_KEYWORD"
  | "UNCLOSED_QUOTE"
  | "EQUALS_INSTEAD_OF_TO_OR_IS"
  | "MISSING_TIMES_AFTER_REPEAT"
  | "INDENTATION_ERROR"
  | "DIVIDE_BY_ZERO"
  | "TYPE_MISMATCH_ADDITION"
  | "UNDEFINED_FUNCTION"
  | "WRONG_ARGUMENT_COUNT"
  | "INDEX_OUT_OF_RANGE"
  | "VARIABLE_USED_BEFORE_SET"
  | "UNBALANCED_DELIMITER"
  | "INFINITE_LOOP_GUARD"
  | "ORPHAN_OTHERWISE"
  | "EMPTY_BLOCK"
  | "GENERIC_SYNTAX_ERROR"
  | "GENERIC_RUNTIME_ERROR";

export interface PythonEquivalent {
  code: string;
  rawError: string;
  explanation: string;
}

export interface EasyCodeError {
  type: ErrorType;
  line: number;           // 1-based line number
  column: number;         // 1-based column number
  length: number;         // Highlight length
  message: string;        // Headline message: "I don't know what \"nmae\" is."
  why: string;            // Why this happened
  fix: string;            // Concise fix instruction: 'say "Hello, " + name'
  suggestedLine?: string; // Full code line for 1-click replacement
  didYouMean?: string;    // "Did you mean \"name\"? (you set it on line 1)"
  snippet?: string;       // Pre-rendered visual code snippet with underline
  pythonEquivalent?: PythonEquivalent;
}

// Levenshtein distance implementation for friendly "Did you mean?" suggestions
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

export function findBestMatch(target: string, candidates: string[], maxDistance: number = 3): string | null {
  let bestCandidate: string | null = null;
  let minDistance = maxDistance + 1;

  for (const candidate of candidates) {
    const dist = levenshteinDistance(target, candidate);
    if (dist < minDistance) {
      minDistance = dist;
      bestCandidate = candidate;
    }
  }

  return minDistance <= maxDistance ? bestCandidate : null;
}

// Pre-render a code snippet with lines and caret / tildes
export function formatErrorSnippet(sourceCode: string, line: number, column: number, length: number): string {
  const lines = sourceCode.split(/\r?\n/);
  const targetLineIdx = line - 1;

  if (targetLineIdx < 0 || targetLineIdx >= lines.length) {
    return "";
  }

  const lineStr = lines[targetLineIdx];
  const lineNumStr = String(line).padStart(4, " ");
  const indentPad = " ".repeat(Math.max(0, column - 1));
  const highlightSpan = "^".repeat(Math.max(1, length));

  let result = `  ${lineNumStr} | ${lineStr}\n`;
  result += `       | ${indentPad}${highlightSpan}`;
  return result;
}

// Format the complete human-friendly error string matching the requested spec
export function renderHumanFriendlyError(err: EasyCodeError, sourceCode?: string): string {
  const snippet = err.snippet || (sourceCode ? formatErrorSnippet(sourceCode, err.line, err.column, err.length) : "");
  const parts: string[] = [];

  parts.push(`Oops! Line ${err.line}: ${err.message}`);
  if (snippet) {
    parts.push(snippet);
  }
  parts.push(err.why);
  if (err.didYouMean) {
    parts.push(err.didYouMean);
  }
  parts.push(`Fix: ${err.fix}`);

  return parts.join("\n");
}

// All keywords in EasyCode for typo detection
export const EASYCODE_KEYWORDS = [
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
];

