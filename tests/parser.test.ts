import { describe, it, expect } from "vitest";
import { checkCode } from "../lib/easycode/index";

describe("EasyCode Parser", () => {
  it("parses variable assignment and output statements", () => {
    const code = `set name to "Alice"\nsay "Hello " + name`;
    const res = checkCode(code);

    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.program?.body).toHaveLength(2);
    expect(res.program?.body[0].type).toBe("SetStatement");
    expect(res.program?.body[1].type).toBe("SayStatement");
  });

  it("parses if / otherwise if / otherwise conditionals", () => {
    const code = `
if score is greater than 90:
    say "A"
otherwise if score is greater than 80:
    say "B"
otherwise:
    say "C"
`;
    const res = checkCode(code);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.program?.body[0].type).toBe("IfStatement");
  });

  it("parses loops: repeat, while, for each", () => {
    const code = `
repeat 3 times:
    say "Hip hip hooray!"

set count to 0
while count is less than 5:
    set count to count + 1

for each item in [1, 2, 3]:
    say item
`;
    const res = checkCode(code);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("parses function definitions and calls", () => {
    const code = `
define addNumbers with a, b:
    give back a + b

call addNumbers with 3, 4
`;
    const res = checkCode(code);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("parses list modifications: add and remove", () => {
    const code = `
set fruits to ["apple"]
add "banana" to fruits
remove "apple" from fruits
`;
    const res = checkCode(code);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("detects using '=' instead of 'to'", () => {
    const code = `set age = 12`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "EQUALS_INSTEAD_OF_TO_OR_IS");
    expect(err).toBeDefined();
    expect(err?.message).toContain('Use "to" instead of "="');
    expect(err?.suggestedLine).toBe("set age to 12");
  });

  it("detects missing 'times' after repeat", () => {
    const code = `repeat 5:\n    say "Hello"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "MISSING_TIMES_AFTER_REPEAT");
    expect(err).toBeDefined();
    expect(err?.message).toContain('Missing the word "times"');
    expect(err?.suggestedLine).toContain("repeat 5 times:");
  });

  it("detects missing indentation after if", () => {
    const code = `if score is 10:\nsay "Winner"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "INDENTATION_ERROR");
    expect(err).toBeDefined();
    expect(err?.message).toContain("Missing indentation");
  });

  it("detects empty blocks", () => {
    const code = `if score is 10:\n    \nsay "Done"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "EMPTY_BLOCK");
    expect(err).toBeDefined();
    expect(err?.message).toContain("This block is empty");
  });

  it("detects orphan otherwise without if", () => {
    const code = `otherwise:\n    say "No"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "ORPHAN_OTHERWISE");
    expect(err).toBeDefined();
    expect(err?.message).toContain('Found "otherwise" without an "if"');
  });

  it("detects misspelled keywords at statement start", () => {
    const code = `sey "Hello world"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "MISSPELLED_KEYWORD");
    expect(err).toBeDefined();
    expect(err?.didYouMean).toContain('Did you mean "say"?');
    expect(err?.suggestedLine).toBe('say "Hello world"');
  });
});

