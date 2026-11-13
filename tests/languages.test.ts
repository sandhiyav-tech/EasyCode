import { describe, it, expect } from "vitest";
import { easyCodeToPython, easyCodeToJavaScript } from "@/lib/languages/transpiler";
import { runJavaScript } from "@/lib/languages/javascript";
import { runPython } from "@/lib/languages/python";

describe("Multi-Language Transpiler", () => {
  describe("easyCodeToPython", () => {
    it("converts simple say and set statements", () => {
      const easyCode = `set name to "Alex"\nsay "Hello, " + name`;
      const py = easyCodeToPython(easyCode);
      expect(py).toContain('name = "Alex"');
      expect(py).toContain('print("Hello, " + name)');
    });

    it("converts if-otherwise conditionals", () => {
      const easyCode = `if score is at least 90:\n    say "A"\notherwise:\n    say "B"`;
      const py = easyCodeToPython(easyCode);
      expect(py).toContain("if score >= 90:");
      expect(py).toContain('    print("A")');
      expect(py).toContain("else:");
      expect(py).toContain('    print("B")');
    });

    it("converts repeat and while loops", () => {
      const easyCode = `repeat 3 times:\n    say "tick"\nwhile count is greater than 0:\n    set count to count - 1`;
      const py = easyCodeToPython(easyCode);
      expect(py).toContain("for _ in range(3):");
      expect(py).toContain('    print("tick")');
      expect(py).toContain("while count > 0:");
      expect(py).toContain("    count = count - 1");
    });

    it("converts functions and returns", () => {
      const easyCode = `define addNumbers with a, b:\n    give back a + b\nset res to call addNumbers with 3, 4`;
      const py = easyCodeToPython(easyCode);
      expect(py).toContain("def addNumbers(a, b):");
      expect(py).toContain("    return a + b");
      expect(py).toContain("res = addNumbers(3, 4)");
    });

    it("converts list operations and remainder", () => {
      const easyCode = `set items to [1, 2]\nadd 3 to items\nremove 1 from items\nset rem to remainder of 10 divided by 3`;
      const py = easyCodeToPython(easyCode);
      expect(py).toContain("items.append(3)");
      expect(py).toContain("items.remove(1)");
      expect(py).toContain("rem = 10 % 3");
    });
  });

  describe("easyCodeToJavaScript", () => {
    it("converts say and set into let and console.log with braces", () => {
      const easyCode = `set count to 5\nsay count`;
      const js = easyCodeToJavaScript(easyCode);
      expect(js).toContain("let count = 5;");
      expect(js).toContain("console.log(count);");
    });

    it("converts if-otherwise with proper opening and closing braces", () => {
      const easyCode = `if score is at least 10:\n    say "High"\notherwise:\n    say "Low"`;
      const js = easyCodeToJavaScript(easyCode);
      expect(js).toContain("if (score >= 10) {");
      expect(js).toContain('    console.log("High");');
      expect(js).toContain("} else {");
      expect(js).toContain('    console.log("Low");');
      expect(js).toContain("}");
    });

    it("converts repeat loops into JS for loops", () => {
      const easyCode = `repeat 4 times:\n    say "Hello"`;
      const js = easyCodeToJavaScript(easyCode);
      expect(js).toMatch(/for \(let _i0 = 0; _i0 < 4; _i0\+\+\) \{/);
      expect(js).toContain('    console.log("Hello");');
      expect(js).toContain("}");
    });

    it("converts functions and calls", () => {
      const easyCode = `define square with n:\n    give back n * n\ncall square with 5`;
      const js = easyCodeToJavaScript(easyCode);
      expect(js).toContain("function square(n) {");
      expect(js).toContain("    return n * n;");
      expect(js).toContain("square(5);");
    });
  });
});

describe("JavaScript Sandbox Runner", () => {
  it("executes valid JavaScript and captures console.log output", () => {
    const code = `let a = 10;\nlet b = 20;\nconsole.log("Sum:", a + b);`;
    const result = runJavaScript(code);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["Sum: 30"]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("catches ReferenceError and provides beginner-friendly why and fix", () => {
    const code = `console.log(missingVariable);`;
    const result = runJavaScript(code);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("ReferenceError");
    expect(result.error?.why).toContain("missingVariable");
    expect(result.error?.fix).toContain("let missingVariable");
  });

  it("catches TypeError when reassigning a constant", () => {
    const code = `const pi = 3.14;\npi = 3;`;
    const result = runJavaScript(code);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("TypeError");
    expect(result.error?.why).toContain("const");
  });
});

describe("Python Sandbox Runner", () => {
  it("executes valid Python and captures print output", () => {
    const code = `name = "Taylor"\nprint("Welcome, " + name)`;
    const result = runPython(code);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["Welcome, Taylor"]);
  });

  it("catches missing colon at end of header statement", () => {
    const code = `if score >= 10\n    print("Score is high")`;
    const result = runPython(code);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("SyntaxError: expected ':'");
    expect(result.error?.fix).toContain("Add a ':' at the end");
  });

  it("catches undefined variables with NameError and friendly explanation", () => {
    const code = `print(unknownVal)`;
    const result = runPython(code);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("NameError");
    expect(result.error?.why).toContain("unknownVal");
  });
});
