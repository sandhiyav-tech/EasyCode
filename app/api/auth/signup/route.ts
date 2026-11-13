import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmailOrUsername,
  registerUser,
  createSessionToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, username, password, role = "student" } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please fill in all required fields (Name, Email, Password)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const autoUsername = username || email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");

    const existing = findUserByEmailOrUsername(email) || findUserByEmailOrUsername(autoUsername);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email or username already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    const newUser = registerUser({
      name,
      email,
      username: autoUsername,
      password,
      role: role === "teacher" ? "teacher" : role === "explorer" ? "explorer" : "student",
    });

    const token = createSessionToken(newUser.id);

    const response = NextResponse.json({
      success: true,
      user: newUser,
    });

    response.cookies.set({
      name: "easycode_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

