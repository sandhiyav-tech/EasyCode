import { describe, it, expect } from "vitest";
import { runCode } from "../lib/easycode/index";

describe("EasyCode Interpreter", () => {
  it("executes basic arithmetic and variable assignment", () => {
    const code = `
set x to 10
set y to 20
set z to x + y * 2
say z
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["50"]);
  });

  it("handles remainder calculation", () => {
    const code = `
set rem to remainder of 14 divided by 4
say rem
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["2"]);
  });

  it("evaluates conditionals correctly", () => {
    const code = `
set age to 12
if age is greater than 18:
    say "Adult"
otherwise if age is at least 13:
    say "Teen"
otherwise:
    say "Child"
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["Child"]);
  });

  it("executes repeat loops", () => {
    const code = `
set counter to 0
repeat 4 times:
    set counter to counter + 1
say counter
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["4"]);
  });

  it("executes while loops", () => {
    const code = `
set n to 1
while n is less than 8:
    set n to n * 2
say n
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["8"]);
  });

  it("executes for each loops over lists", () => {
    const code = `
set total to 0
for each num in [10, 20, 30]:
    set total to total + num
say total
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["60"]);
  });

  it("executes functions with parameters and return values", () => {
    const code = `
define multiply with a, b:
    give back a * b

set res to call multiply with 6, 7
say res
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["42"]);
  });

  it("supports recursive functions", () => {
    const code = `
define factorial with n:
    if n is at most 1:
        give back 1
    give back n * call factorial with n - 1

say call factorial with 5
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["120"]);
  });

  it("handles list mutations and indexing", () => {
    const code = `
set items to ["cat", "dog"]
add "bird" to items
remove "dog" from items
say items[1]
say length(items)
`;
    const res = runCode(code);
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["bird", "2"]);
  });

  it("handles ask statement with provided inputs", () => {
    const code = `
ask name with "What is your name?"
say "Welcome, " + name
`;
    const res = runCode(code, "run", { inputs: ["Charlie"] });
    expect(res.success).toBe(true);
    expect(res.output).toEqual(["Welcome, Charlie"]);
  });

  it("stops infinite loops safely via iteration limit", () => {
    const code = `
set x to 1
while x is 1:
    set x to 1
`;
    const res = runCode(code, "run", { maxIterations: 100 });
    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("INFINITE_LOOP_GUARD");
    expect(res.error?.message).toContain("Infinite loop guard");
  });
});

