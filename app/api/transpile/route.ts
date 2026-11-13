import { NextRequest, NextResponse } from "next/server";
import { easyCodeToPython, easyCodeToJavaScript } from "@/lib/languages/transpiler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, targetLanguage } = body;

    if (typeof code !== "string") {
      return NextResponse.json({ error: "Code must be a string." }, { status: 400 });
    }

    if (targetLanguage === "python") {
      const converted = easyCodeToPython(code);
      return NextResponse.json({ converted, targetLanguage: "python" });
    }

    if (targetLanguage === "javascript") {
      const converted = easyCodeToJavaScript(code);
      return NextResponse.json({ converted, targetLanguage: "javascript" });
    }

    return NextResponse.json({ error: "Invalid target language" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transpilation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
