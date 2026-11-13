import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmailOrUsername,
  hashPassword,
  createSessionToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please enter your username/email and password." },
        { status: 400 }
      );
    }

    const storedUser = findUserByEmailOrUsername(identifier);
    if (!storedUser) {
      return NextResponse.json(
        { error: "No account found with this username or email." },
        { status: 401 }
      );
    }

    const computedHash = hashPassword(password, storedUser.salt);
    if (computedHash !== storedUser.passwordHash) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    const token = createSessionToken(storedUser.id);
    const { passwordHash: _, salt: __, ...safeUser } = storedUser;

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    response.cookies.set({
      name: "easycode_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

