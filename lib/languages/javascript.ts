// Sandboxed JavaScript Runner & Pedagogical Error Adapter for EasyCode
import { EasyCodeError, formatErrorSnippet } from "@/lib/easycode/errors";

export interface LangRunResult {
  output: string[];
  error?: EasyCodeError;
  durationMs: number;
}

export function runJavaScript(code: string): LangRunResult {
  const startTime = Date.now();
  const logs: string[] = [];

  // Sandbox console.log
  const customConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    error: (...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(" "));
    },
    warn: (...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(" "));
    },
  };

  try {
    // Check for obvious infinite loops or block dangerous globals
    const sanitized = code
      .replace(/\bprocess\b/g, "undefined")
      .replace(/\bwindow\b/g, "undefined")
      .replace(/\bdocument\b/g, "undefined")
      .replace(/\bglobal\b/g, "undefined")
      .replace(/\beval\b/g, "undefined")
      .replace(/\bFunction\b/g, "undefined");

    const runner = new Function("console", sanitized);
    runner(customConsole);

    return {
      output: logs,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const errorObj = err as Error;
    const errorName = errorObj.name || "Error";
    const rawMessage = errorObj.message || "Execution error";

    // Try extracting line number from stack
    let line = 1;
    let column = 1;
    if (errorObj.stack) {
      const lineMatch = errorObj.stack.match(/<anonymous>:(\d+):(\d+)/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10) - 2; // adjust for wrapper
        column = parseInt(lineMatch[2], 10);
      }
    }

    const lines = code.split("\n");
    const safeLine = Math.max(1, Math.min(line, lines.length));
    const lineContent = lines[safeLine - 1] || "";

    let why = "JavaScript ran into an issue while executing this line.";
    let fix = "Check this line for typos or incorrect syntax.";
    let didYouMean: string | undefined;

    if (errorName === "ReferenceError") {
      const varMatch = rawMessage.match(/(\w+) is not defined/);
      const varName = varMatch ? varMatch[1] : "variable";
      why = `You used "${varName}", but haven't declared it with "let" or "const" yet.`;
      fix = `Declare it first: let ${varName} = ...`;
    } else if (errorName === "TypeError") {
      if (rawMessage.includes("is not a function")) {
        why = "You tried to call something as a function that isn't a function.";
        fix = "Make sure the name refers to a defined function.";
      } else if (rawMessage.includes("Assignment to constant variable")) {
        why = "You tried to reassign a variable declared with 'const'.";
        fix = "Change 'const' to 'let' if you need to update its value.";
      }
    } else if (errorName === "RangeError" && rawMessage.includes("call stack size exceeded")) {
      why = "Your function kept calling itself infinitely without a base stopping condition.";
      fix = "Add an 'if' check to stop recursion.";
    }

    const structuredError: EasyCodeError = {
      type: "GENERIC_RUNTIME_ERROR",
      line: safeLine,
      column,
      length: lineContent.trim().length || 1,
      message: `${errorName}: ${rawMessage}`,
      why,
      fix,
      didYouMean,
      suggestedLine: lineContent,
      snippet: formatErrorSnippet(code, safeLine, column, lineContent.trim().length || 1),
      pythonEquivalent: {
        code: lineContent,
        rawError: `${errorName}: ${rawMessage}\n  (Raw JavaScript Engine Trace)`,
        explanation: "JavaScript reports engine errors with stack traces.",
      },
    };

    return {
      output: logs,
      error: structuredError,
      durationMs: Date.now() - startTime,
    };
  }
}
