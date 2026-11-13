import { NextRequest, NextResponse } from "next/server";
import { checkCode } from "@/lib/easycode";

const MAX_CODE_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (typeof code !== "string") {
      return NextResponse.json(
        {
          valid: false,
          errors: [
            {
              type: "GENERIC_SYNTAX_ERROR",
              line: 1,
              column: 1,
              length: 1,
              message: "Invalid payload: 'code' must be a text string.",
              why: "The server expected a JSON payload with a 'code' field containing your program.",
              fix: "Ensure code is passed as a string.",
            },
          ],
        },
        { status: 400 }
      );
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        {
          valid: false,
          errors: [
            {
              type: "GENERIC_SYNTAX_ERROR",
              line: 1,
              column: 1,
              length: 1,
              message: `Program is too large (${code.length.toLocaleString()} characters).`,
              why: `To ensure fast performance and safety in the browser playground, programs are limited to ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
              fix: `Shorten your code to under ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
            },
          ],
        },
        { status: 413 }
      );
    }

    const result = checkCode(code);
    return NextResponse.json({
      valid: result.valid,
      errors: result.errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      {
        valid: false,
        errors: [
          {
            type: "GENERIC_SYNTAX_ERROR",
            line: 1,
            column: 1,
            length: 1,
            message: "Failed to parse code: " + message,
            why: "An unexpected error occurred while parsing your program.",
            fix: "Please check your code syntax.",
          },
        ],
      },
      { status: 500 }
    );
  }
}

