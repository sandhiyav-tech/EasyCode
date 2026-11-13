import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, findUserById } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("easycode_session");
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ user: null });
    }

    const userId = verifySessionToken(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const user = findUserById(userId);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}

