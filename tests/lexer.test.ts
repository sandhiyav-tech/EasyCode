import { describe, it, expect } from "vitest";
import { tokenize } from "../lib/easycode/lexer";

describe("EasyCode Lexer", () => {
  it("tokenizes simple statements", () => {
    const code = `set score to 100\nsay score`;
    const { tokens, errors } = tokenize(code);

    expect(errors).toHaveLength(0);
    const types = tokens.map((t) => t.type);
    expect(types).toContain("SET");
    expect(types).toContain("IDENTIFIER");
    expect(types).toContain("TO");
    expect(types).toContain("NUMBER");
    expect(types).toContain("SAY");
  });

  it("handles string literals and escape characters", () => {
    const code = `say "Hello, \\"world\\"!\\n"`;
    const { tokens, errors } = tokenize(code);

    expect(errors).toHaveLength(0);
    const strToken = tokens.find((t) => t.type === "STRING");
    expect(strToken).toBeDefined();
    expect(strToken?.value).toBe('Hello, "world"!\n');
  });

  it("generates INDENT and DEDENT tokens based on indentation", () => {
    const code = `if score is 10:\n    say "Win"\nsay "Done"`;
    const { tokens, errors } = tokenize(code);

    expect(errors).toHaveLength(0);
    const types = tokens.map((t) => t.type);
    expect(types).toContain("INDENT");
    expect(types).toContain("DEDENT");
  });

  it("ignores full line comments and inline comments", () => {
    const code = `# Full line comment\nset x to 5 # inline comment\nsay x`;
    const { tokens, errors } = tokenize(code);

    expect(errors).toHaveLength(0);
    const ids = tokens.filter((t) => t.type === "IDENTIFIER").map((t) => t.value);
    expect(ids).toEqual(["x", "x"]);
  });

  it("detects unclosed quote error", () => {
    const code = `say "Hello world`;
    const { errors } = tokenize(code);

    expect(errors.length).toBeGreaterThan(0);
    const err = errors.find((e) => e.type === "UNCLOSED_QUOTE");
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
    expect(err?.column).toBe(5);
    expect(err?.message).toContain("closing quote");
    expect(err?.fix).toContain('say "Hello world"');
  });

  it("detects unbalanced closing brackets", () => {
    const code = `set items to [1, 2, 3]]`;
    const { errors } = tokenize(code);

    const err = errors.find((e) => e.type === "UNBALANCED_DELIMITER");
    expect(err).toBeDefined();
    expect(err?.message).toContain('Unexpected closing bracket "]"');
  });

  it("detects unclosed brackets at EOF", () => {
    const code = `set items to [1, 2, 3`;
    const { errors } = tokenize(code);

    const err = errors.find((e) => e.type === "UNBALANCED_DELIMITER");
    expect(err).toBeDefined();
    expect(err?.message).toContain('forgot to close your list bracket');
  });
});

