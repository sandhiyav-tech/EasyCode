// Sandboxed Python Runner & Pedagogical Error Adapter for EasyCode
import { EasyCodeError, formatErrorSnippet } from "@/lib/easycode/errors";
import { LangRunResult } from "./javascript";

export function runPython(code: string): LangRunResult {
  const startTime = Date.now();
  const logs: string[] = [];

  // Transpile basic Python into safe runnable JS
  const lines = code.split("\n");
  const jsLines: string[] = [];
  let syntaxErr: EasyCodeError | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const lineNum = idx + 1;
    const trimmed = rawLine.trim();

    // Check indentation syntax errors
    if ((trimmed.startsWith("if ") || trimmed.startsWith("for ") || trimmed.startsWith("while ") || trimmed.startsWith("def ")) && !trimmed.endsWith(":")) {
      syntaxErr = {
        type: "GENERIC_SYNTAX_ERROR",
        line: lineNum,
        column: rawLine.length,
        length: 1,
        message: "SyntaxError: expected ':' at end of header",
        why: "In Python, compound statements (if, while, for, def) must end with a colon ':'.",
        fix: `Add a ':' at the end: ${trimmed}:`,
        suggestedLine: `${rawLine}:`,
        snippet: formatErrorSnippet(code, lineNum, rawLine.length, 1),
        pythonEquivalent: {
          code: rawLine,
          rawError: `  File "main.py", line ${lineNum}\n    ${trimmed}\n             ^\nSyntaxError: expected ':'`,
          explanation: "Python throws SyntaxError when a header is missing its colon.",
        },
      };
      break;
    }

    // Convert print(...) to console.log(...)
    let translated = rawLine
      .replace(/\bprint\s*\(/g, "console.log(")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\band\b/g, "&&")
      .replace(/\bor\b/g, "||")
      .replace(/\bnot\b/g, "!");

    // Convert simple variable assignments x = y -> var x = y if not already declared
    const assignMatch = translated.match(/^(\s*)([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch && !assignMatch[2].startsWith("if") && !assignMatch[2].startsWith("for")) {
      translated = `${assignMatch[1]}var ${assignMatch[2]} = ${assignMatch[3]};`;
    }

    // Convert range(n)
    translated = translated.replace(/range\((\d+)\)/g, "Array.from({length: $1}, (_, i) => i)");

    // Convert def foo(x): to function foo(x) {
    const defMatch = translated.match(/^(\s*)def\s+([a-zA-Z_]\w*)\s*\((.*?)\)\s*:/);
    if (defMatch) {
      translated = `${defMatch[1]}function ${defMatch[2]}(${defMatch[3]}) {`;
    }

    // Convert for x in list:
    const forMatch = translated.match(/^(\s*)for\s+([a-zA-Z_]\w*)\s+in\s+(.+?)\s*:/);
    if (forMatch) {
      translated = `${forMatch[1]}for (var ${forMatch[2]} of ${forMatch[3]}) {`;
    }

    // Convert if / elif / else
    const elifMatch = translated.match(/^(\s*)elif\s+(.+?)\s*:/);
    if (elifMatch) {
      translated = `${elifMatch[1]}} else if (${elifMatch[2]}) {`;
    }
    const elseMatch = translated.match(/^(\s*)else\s*:/);
    if (elseMatch) {
      translated = `${elseMatch[1]}} else {`;
    }
    const ifMatch = translated.match(/^(\s*)if\s+(.+?)\s*:/);
    if (ifMatch && !elifMatch) {
      translated = `${ifMatch[1]}if (${ifMatch[2]}) {`;
    }

    jsLines.push(translated);
  }

  if (syntaxErr) {
    return {
      output: [],
      error: syntaxErr,
      durationMs: Date.now() - startTime,
    };
  }

  // Count open braces to close them at EOF
  let openBraces = 0;
  for (const l of jsLines) {
    openBraces += (l.match(/{/g) || []).length;
    openBraces -= (l.match(/}/g) || []).length;
  }
  for (let i = 0; i < openBraces; i++) {
    jsLines.push("}");
  }

  const customConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    error: (...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(" "));
    },
  };

  try {
    const executable = jsLines.join("\n");
    const runner = new Function("console", executable);
    runner(customConsole);

    return {
      output: logs,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const errorObj = err as Error;
    const rawMessage = errorObj.message || "Runtime error";

    // Format Python-like NameError / TypeError
    let pyErrorType = "RuntimeError";
    let why = "Python encountered an error while executing.";
    let fix = "Review your code syntax.";

    if (rawMessage.includes("is not defined")) {
      pyErrorType = "NameError";
      const varMatch = rawMessage.match(/(\w+) is not defined/);
      const varName = varMatch ? varMatch[1] : "name";
      why = `Name "${varName}" is not defined. You must assign a value to "${varName}" before using it.`;
      fix = `Define "${varName}" first: ${varName} = ...`;
    } else if (rawMessage.includes("is not a function")) {
      pyErrorType = "TypeError";
      why = "Object is not callable like a function.";
      fix = "Verify the function name.";
    }

    const structuredError: EasyCodeError = {
      type: "GENERIC_RUNTIME_ERROR",
      line: 1,
      column: 1,
      length: 1,
      message: `${pyErrorType}: ${rawMessage}`,
      why,
      fix,
      pythonEquivalent: {
        code: code,
        rawError: `Traceback (most recent call last):\n  File "main.py", line 1, in <module>\n${pyErrorType}: ${rawMessage}`,
        explanation: "Python halts with this traceback in the terminal.",
      },
    };

    return {
      output: logs,
      error: structuredError,
      durationMs: Date.now() - startTime,
    };
  }
}
