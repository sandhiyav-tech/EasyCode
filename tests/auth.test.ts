import { describe, it, expect } from "vitest";
import {
  hashPassword,
  generateSalt,
  createSessionToken,
  verifySessionToken,
  registerUser,
  findUserById,
  findUserByEmailOrUsername,
  addSnippetToUser,
  deleteSnippetFromUser,
} from "../lib/auth";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { POST as signupHandler } from "../app/api/auth/signup/route";
import { POST as logoutHandler } from "../app/api/auth/logout/route";
import { NextRequest } from "next/server";

describe("EasyCode Auth System", () => {
  it("hashes and verifies passwords correctly", () => {
    const salt = generateSalt();
    const hash1 = hashPassword("secret123", salt);
    const hash2 = hashPassword("secret123", salt);
    const hashWrong = hashPassword("wrongpass", salt);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashWrong);
  });

  it("creates and verifies cryptographic session tokens", () => {
    const token = createSessionToken("user-123");
    const verifiedId = verifySessionToken(token);
    expect(verifiedId).toBe("user-123");

    const invalid = verifySessionToken("invalid-token-tampered");
    expect(invalid).toBeNull();
  });

  it("finds default demo users (Alex and Ms. Taylor)", () => {
    const alex = findUserByEmailOrUsername("alex@easycode.dev");
    expect(alex).toBeDefined();
    expect(alex?.name).toBe("Alex Rivera");
    expect(alex?.role).toBe("student");

    const taylor = findUserByEmailOrUsername("ms_taylor");
    expect(taylor).toBeDefined();
    expect(taylor?.role).toBe("teacher");
  });

  it("registers new users and retrieves them safely", () => {
    const uniqueEmail = `student_${Date.now()}@school.edu`;
    const user = registerUser({
      name: "Jamie Doe",
      email: uniqueEmail,
      username: `jamie_${Date.now()}`,
      password: "mypassword",
      role: "student",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(uniqueEmail);

    const retrieved = findUserById(user.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Jamie Doe");
  });

  it("adds and deletes code snippets for users", () => {
    const alex = findUserByEmailOrUsername("alex@easycode.dev")!;
    const snippet = addSnippetToUser(alex.id, "My Loop Test", "repeat 5 times:\n    say 1");
    expect(snippet).toBeDefined();
    expect(snippet?.title).toBe("My Loop Test");

    const alexUpdated = findUserById(alex.id)!;
    expect(alexUpdated.savedSnippets.some((s) => s.id === snippet!.id)).toBe(true);

    const deleted = deleteSnippetFromUser(alex.id, snippet!.id);
    expect(deleted).toBe(true);
  });

  it("POST /api/auth/login logs in valid user and returns session cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: "alex@easycode.dev",
        password: "password123",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.name).toBe("Alex Rivera");
    expect(res.cookies.get("easycode_session")).toBeDefined();
  });

  it("POST /api/auth/login rejects incorrect password", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: "alex@easycode.dev",
        password: "wrong_password",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/logout clears session cookie", async () => {
    const res = await logoutHandler();
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("easycode_session");
    expect(cookie?.value).toBe("");
  });
});

