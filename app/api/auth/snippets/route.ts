import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  findUserById,
  addSnippetToUser,
  deleteSnippetFromUser,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("easycode_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = verifySessionToken(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = findUserById(userId);
    return NextResponse.json({ snippets: user?.savedSnippets || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch snippets";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("easycode_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Please log in to save your program." }, { status: 401 });
    }

    const userId = verifySessionToken(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    const body = await req.json();
    const { title, code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code cannot be empty." }, { status: 400 });
    }

    const snippet = addSnippetToUser(userId, title, code);
    return NextResponse.json({ success: true, snippet });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save snippet";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("easycode_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = verifySessionToken(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const snippetId = searchParams.get("id");
    if (!snippetId) {
      return NextResponse.json({ error: "Snippet ID is required" }, { status: 400 });
    }

    const deleted = deleteSnippetFromUser(userId, snippetId);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete snippet";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

