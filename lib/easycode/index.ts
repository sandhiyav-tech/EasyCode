// EasyCode Language Engine Entry Point
import { tokenize } from "./lexer";
import { parseSource } from "./parser";
import { Interpreter, InterpreterOptions, InterpreterResult } from "./interpreter";
import { Narrator, NarratorResult } from "./narrator";
import { EasyCodeError, renderHumanFriendlyError } from "./errors";
import { ProgramNode } from "./ast";

export * from "./ast";
export * from "./errors";
export * from "./lexer";
export * from "./parser";
export * from "./interpreter";
export * from "./narrator";

export interface CheckResult {
  valid: boolean;
  errors: EasyCodeError[];
  program?: ProgramNode;
}

export interface RunResult {
  success: boolean;
  output: string[];
  steps?: string[];
  error?: EasyCodeError;
  durationMs: number;
}

// Check syntax and structure without executing
export function checkCode(source: string): CheckResult {
  const { tokens, errors: lexErrors } = tokenize(source);
  const { program, errors: parseErrors } = parseSource(source, tokens, lexErrors);

  return {
    valid: parseErrors.length === 0,
    errors: parseErrors,
    program: parseErrors.length === 0 ? program : undefined,
  };
}

// Run code in regular or explain mode
export function runCode(
  source: string,
  mode: "run" | "explain" = "run",
  options: InterpreterOptions = {}
): RunResult {
  const check = checkCode(source);
  if (!check.valid || !check.program) {
    const firstErr = check.errors[0];
    return {
      success: false,
      output: [],
      error: firstErr,
      durationMs: 0,
    };
  }

  if (mode === "explain") {
    const inputsArr = Array.isArray(options.inputs)
      ? options.inputs
      : options.inputs
      ? Object.values(options.inputs)
      : [];
    const narrator = new Narrator(source, inputsArr);
    const narrRes: NarratorResult = narrator.explain(check.program);
    return {
      success: !narrRes.error,
      output: narrRes.output,
      steps: narrRes.steps,
      error: narrRes.error,
      durationMs: narrRes.durationMs,
    };
  }

  const interpreter = new Interpreter(source, options);
  const result: InterpreterResult = interpreter.run(check.program);

  return {
    success: !result.error,
    output: result.output,
    error: result.error,
    durationMs: result.durationMs,
  };
}

