import { describe, it, expect } from "vitest";
import { runCode, checkCode } from "../lib/easycode/index";

describe("EasyCode Error System: All 16 Beginner-Specific Errors", () => {
  // 1. Undefined variable (with did-you-mean)
  it("1. asserts UNDEFINED_VARIABLE with did-you-mean and line reference", () => {
    const code = `set name to "Alice"\nsay "Hello, " + nmae`;
    const res = runCode(code);

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error?.type).toBe("UNDEFINED_VARIABLE");
    expect(res.error?.line).toBe(2);
    expect(res.error?.message).toContain('I don\'t know what "nmae" is');
    expect(res.error?.didYouMean).toContain('Did you mean "name"? (you set it on line 1)');
    expect(res.error?.suggestedLine).toBe('say "Hello, " + name');
  });

  // 2. Misspelled keyword (e.g. "sey", "prnt")
  it("2. asserts MISSPELLED_KEYWORD for typo like 'sey' or 'prnt'", () => {
    const code = `sey "Welcome!"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors[0];
    expect(err.type).toBe("MISSPELLED_KEYWORD");
    expect(err.line).toBe(1);
    expect(err.message).toContain('I don\'t recognize the command "sey"');
    expect(err.didYouMean).toContain('Did you mean "say"?');
    expect(err.suggestedLine).toBe('say "Welcome!"');
    expect(err.fix).toContain('say');
  });

  // 3. Unclosed quote
  it("3. asserts UNCLOSED_QUOTE with line and highlighted position", () => {
    const code = `say "Hello, world`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "UNCLOSED_QUOTE");
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
    expect(err?.column).toBe(5);
    expect(err?.message).toContain("closing quote");
    expect(err?.suggestedLine).toBe('say "Hello, world"');
  });

  // 4. Using = instead of "to" or "is"
  it("4a. asserts EQUALS_INSTEAD_OF_TO_OR_IS in assignment (set x = 5)", () => {
    const code = `set score = 100`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "EQUALS_INSTEAD_OF_TO_OR_IS");
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
    expect(err?.message).toContain('Use "to" instead of "="');
    expect(err?.suggestedLine).toBe("set score to 100");
  });

  it("4b. asserts EQUALS_INSTEAD_OF_TO_OR_IS in comparison (if score = 100)", () => {
    const code = `if score = 100:\n    say "Perfect"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "EQUALS_INSTEAD_OF_TO_OR_IS");
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
    expect(err?.message).toContain('Use "is" instead of "="');
    expect(err?.suggestedLine).toBe('if score is 100:');
  });

  // 5. Missing "times" after repeat
  it("5. asserts MISSING_TIMES_AFTER_REPEAT", () => {
    const code = `repeat 5:\n    say "Hello"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "MISSING_TIMES_AFTER_REPEAT");
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
    expect(err?.message).toContain('Missing the word "times"');
    expect(err?.suggestedLine).toBe("repeat 5 times:");
  });

  // 6. Wrong or missing indentation after if/repeat/while/define
  it("6. asserts INDENTATION_ERROR after header", () => {
    const code = `if score is 10:\nsay "You win"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "INDENTATION_ERROR");
    expect(err).toBeDefined();
    expect(err?.line).toBe(2);
    expect(err?.message).toContain("Missing indentation");
    expect(err?.suggestedLine).toBe('    say "You win"');
  });

  // 7. Dividing by zero
  it("7. asserts DIVIDE_BY_ZERO", () => {
    const code = `set x to 10\nset y to 0\nsay x / y`;
    const res = runCode(code);

    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("DIVIDE_BY_ZERO");
    expect(res.error?.line).toBe(3);
    expect(res.error?.message).toContain("Cannot divide by zero");
    expect(res.error?.fix).toContain("divisor is not zero");
  });

  // 8. Adding text and number without conversion
  it("8. asserts TYPE_MISMATCH_ADDITION with suggested text() conversion", () => {
    const code = `say "Score: " + 100`;
    const res = runCode(code);

    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("TYPE_MISMATCH_ADDITION");
    expect(res.error?.line).toBe(1);
    expect(res.error?.message).toContain("Cannot add text and a number");
    expect(res.error?.fix).toContain("text(...)");
  });

  // 9. Calling an undefined function (with did-you-mean)
  it("9. asserts UNDEFINED_FUNCTION with did-you-mean suggestion", () => {
    const code = `
define greetUser with name:
    say "Hello " + name

call greetUsr with "David"
`;
    const res = runCode(code);

    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("UNDEFINED_FUNCTION");
    expect(res.error?.line).toBe(5);
    expect(res.error?.message).toContain('I couldn\'t find a function called "greetUsr"');
    expect(res.error?.didYouMean).toContain('Did you mean "greetUser"?');
    expect(res.error?.suggestedLine).toBe('call greetUser with "David"');
  });

  // 10. Wrong number of arguments to a function
  it("10. asserts WRONG_ARGUMENT_COUNT", () => {
    const code = `
define addNumbers with a, b:
    give back a + b

call addNumbers with 5
`;
    const res = runCode(code);

    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("WRONG_ARGUMENT_COUNT");
    expect(res.error?.line).toBe(5);
    expect(res.error?.message).toContain('Function "addNumbers" expects 2 argument(s), but got 1');
  });

  // 11. List index out of range
  it("11. asserts INDEX_OUT_OF_RANGE", () => {
    const code = `
set animals to ["cat", "dog"]
say animals[5]
`;
    const res = runCode(code);

    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("INDEX_OUT_OF_RANGE");
    expect(res.error?.line).toBe(3);
    expect(res.error?.message).toContain("List index 5 is out of range");
    expect(res.error?.fix).toContain("Remember that EasyCode lists start counting at 0!");
  });

  // 12. Using a variable before it is set
  it("12. asserts VARIABLE_USED_BEFORE_SET", () => {
    const code = `
say score + 5
set score to 10
`;
    const res = runCode(code);

    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("VARIABLE_USED_BEFORE_SET");
    expect(res.error?.line).toBe(2);
    expect(res.error?.message).toContain('"score" is used on line 2, but you don\'t set it until line 3');
    expect(res.error?.didYouMean).toContain("(you set it on line 3)");
  });

  // 13. Unbalanced brackets or parentheses
  it("13. asserts UNBALANCED_DELIMITER", () => {
    const code = `set fruits to ["apple", "banana"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "UNBALANCED_DELIMITER");
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
    expect(err?.message).toContain("forgot to close your list bracket");
  });

  // 14. Infinite loop guard triggered
  it("14. asserts INFINITE_LOOP_GUARD with explanation", () => {
    const code = `
set x to 1
while x is 1:
    set x to 1
`;
    const res = runCode(code, "run", { maxIterations: 50 });

    expect(res.success).toBe(false);
    expect(res.error?.type).toBe("INFINITE_LOOP_GUARD");
    expect(res.error?.message).toContain("Infinite loop guard triggered");
    expect(res.error?.why).toContain("Your loop ran more than 50 times without stopping");
    expect(res.error?.fix).toContain("Make sure the condition eventually becomes false");
  });

  // 15. "otherwise" without a matching "if"
  it("15. asserts ORPHAN_OTHERWISE", () => {
    const code = `otherwise:\n    say "Hello"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "ORPHAN_OTHERWISE");
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
    expect(err?.message).toContain('Found "otherwise" without an "if"');
  });

  // 16. Empty block
  it("16. asserts EMPTY_BLOCK", () => {
    const code = `if x is 5:\n    \nsay "Done"`;
    const res = checkCode(code);

    expect(res.valid).toBe(false);
    const err = res.errors.find((e) => e.type === "EMPTY_BLOCK");
    expect(err).toBeDefined();
    expect(err?.message).toContain("This block is empty");
    expect(err?.fix).toContain('write "pass"');
  });
});

