import { NextRequest, NextResponse } from "next/server";
import { runCode } from "@/lib/easycode";

const MAX_CODE_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, mode = "run", inputs = [] } = body;

    if (typeof code !== "string") {
      return NextResponse.json(
        {
          success: false,
          output: [],
          error: {
            type: "GENERIC_SYNTAX_ERROR",
            line: 1,
            column: 1,
            length: 1,
            message: "Invalid payload: 'code' must be a text string.",
            why: "The server expected a JSON payload with a 'code' field.",
            fix: "Ensure code is passed as a string.",
          },
        },
        { status: 400 }
      );
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          output: [],
          error: {
            type: "GENERIC_SYNTAX_ERROR",
            line: 1,
            column: 1,
            length: 1,
            message: `Program is too large (${code.length.toLocaleString()} characters).`,
            why: `To ensure fast performance on serverless, programs cannot exceed ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
            fix: `Please shorten your program.`,
          },
        },
        { status: 413 }
      );
    }

    const runMode = mode === "explain" ? "explain" : "run";
    const result = runCode(code, runMode, {
      inputs,
      maxIterations: 10000,
      timeoutMs: 2000,
    });

    return NextResponse.json({
      success: result.success,
      output: result.output,
      steps: result.steps,
      error: result.error,
      durationMs: result.durationMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Execution Error";
    return NextResponse.json(
      {
        success: false,
        output: [],
        error: {
          type: "GENERIC_RUNTIME_ERROR",
          line: 1,
          column: 1,
          length: 1,
          message: "Internal execution failure: " + message,
          why: "An unexpected internal server error occurred while executing the program.",
          fix: "Please try running the code again.",
        },
      },
      { status: 500 }
    );
  }
}

