import { describe, it, expect } from "vitest";
import { runCode } from "../lib/easycode/index";

describe("EasyCode Narrator (Explain Mode)", () => {
  it("narrates step-by-step execution for variables and conditionals", () => {
    const code = `
set age to 12
if age is greater than 10:
    say "Older than 10"
`;
    const res = runCode(code, "explain");

    expect(res.success).toBe(true);
    expect(res.output).toEqual(["Older than 10"]);
    expect(res.steps).toBeDefined();
    expect(res.steps!.length).toBeGreaterThan(0);

    const stepText = res.steps!.join("\n");
    expect(stepText).toContain('Setting "age" to 12');
    expect(stepText).toContain("condition is met (true)");
    expect(stepText).toContain('Saying "Older than 10"');
  });

  it("narrates loops with iteration progress", () => {
    const code = `
set sum to 0
repeat 3 times:
    set sum to sum + 1
say sum
`;
    const res = runCode(code, "explain");

    expect(res.success).toBe(true);
    expect(res.output).toEqual(["3"]);
    const stepText = res.steps!.join("\n");
    expect(stepText).toContain("Repeat loop iteration 1 of 3");
    expect(stepText).toContain("Repeat loop iteration 2 of 3");
    expect(stepText).toContain("Repeat loop iteration 3 of 3");
  });
});

