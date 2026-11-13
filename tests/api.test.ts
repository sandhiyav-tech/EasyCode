import { describe, it, expect } from "vitest";
import { POST as runHandler } from "../app/api/run/route";
import { POST as checkHandler } from "../app/api/check/route";
import { GET as examplesHandler } from "../app/api/examples/route";
import { NextRequest } from "next/server";

describe("API Route Handlers", () => {
  it("GET /api/examples returns at least 6 examples including broken programs", async () => {
    const res = await examplesHandler();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.examples).toBeDefined();
    expect(data.examples.length).toBeGreaterThanOrEqual(6);
    const broken = data.examples.filter((e: { category: string }) => e.category === "broken");
    expect(broken.length).toBeGreaterThanOrEqual(3);
  });

  it("POST /api/check validates valid syntax", async () => {
    const req = new NextRequest("http://localhost:3000/api/check", {
      method: "POST",
      body: JSON.stringify({ code: 'say "Hello world"' }),
    });
    const res = await checkHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.errors).toHaveLength(0);
  });

  it("POST /api/check catches errors and returns structured diagnostic", async () => {
    const req = new NextRequest("http://localhost:3000/api/check", {
      method: "POST",
      body: JSON.stringify({ code: 'repeat 5:\n    say "Hi"' }),
    });
    const res = await checkHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.errors[0].type).toBe("MISSING_TIMES_AFTER_REPEAT");
  });

  it("POST /api/run executes in normal mode", async () => {
    const req = new NextRequest("http://localhost:3000/api/run", {
      method: "POST",
      body: JSON.stringify({ code: 'set x to 21\nsay x * 2', mode: "run" }),
    });
    const res = await runHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.output).toEqual(["42"]);
  });

  it("POST /api/run returns steps in explain mode", async () => {
    const req = new NextRequest("http://localhost:3000/api/run", {
      method: "POST",
      body: JSON.stringify({ code: 'set age to 12\nsay age', mode: "explain" }),
    });
    const res = await runHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.steps).toBeDefined();
    expect(data.steps.length).toBeGreaterThan(0);
  });

  it("POST /api/run rejects code exceeding 5,000 characters", async () => {
    const hugeCode = "a".repeat(5001);
    const req = new NextRequest("http://localhost:3000/api/run", {
      method: "POST",
      body: JSON.stringify({ code: hugeCode }),
    });
    const res = await runHandler(req);
    expect(res.status).toBe(413);
  });
});

