// EasyCode AST Tree-Walk Interpreter with Safety Sandbox & Pedagogical Diagnostics
import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  EasyCodeValue,
  EasyCodeFunction,
  Scope,
  VariableRecord,
} from "./ast";
import {
  EasyCodeError,
  formatErrorSnippet,
  findBestMatch,
} from "./errors";

export class RuntimeError extends Error {
  public easyCodeError: EasyCodeError;

  constructor(easyCodeError: EasyCodeError) {
    super(easyCodeError.message);
    this.name = "RuntimeError";
    this.easyCodeError = easyCodeError;
  }
}

export interface InterpreterOptions {
  maxIterations?: number; // Default: 10,000
  timeoutMs?: number;     // Default: 2,000 ms
  inputs?: Record<string, string> | string[];
}

export interface InterpreterResult {
  output: string[];
  error?: EasyCodeError;
  iterations: number;
  durationMs: number;
}

export class Interpreter {
  private globalScope: Scope;
  private currentScope: Scope;
  private source: string;
  private output: string[] = [];
  private totalIterations: number = 0;
  private startTime: number = 0;
  private maxIterations: number;
  private timeoutMs: number;
  private inputs: string[] = [];
  private inputIdx: number = 0;

  // Static analysis map: tracks all variable assignments in the program and their line numbers
  private allProgramVariables: Map<string, number[]> = new Map();
  // Static analysis map: tracks all defined functions
  private allProgramFunctions: Map<string, number> = new Map();

  constructor(source: string, options: InterpreterOptions = {}) {
    this.source = source;
    this.maxIterations = options.maxIterations ?? 10000;
    this.timeoutMs = options.timeoutMs ?? 2000;

    if (Array.isArray(options.inputs)) {
      this.inputs = [...options.inputs];
    } else if (options.inputs && typeof options.inputs === "object") {
      this.inputs = Object.values(options.inputs);
    }

    this.globalScope = {
      variables: new Map(),
      functions: new Map(),
    };
    this.currentScope = this.globalScope;
  }

  public run(program: ProgramNode): InterpreterResult {
    this.startTime = Date.now();
    this.totalIterations = 0;
    this.output = [];

    // Pre-scan the AST for variable declarations and function definitions for pedagogical errors
    this.preScanDeclarations(program.body);

    try {
      for (const stmt of program.body) {
        this.checkSafetyGuards(stmt.line, stmt.column, stmt.length);
        const ret = this.executeStatement(stmt);
        if (ret !== undefined) {
          // Top-level give back, ignore or terminate
          break;
        }
      }

      return {
        output: this.output,
        iterations: this.totalIterations,
        durationMs: Date.now() - this.startTime,
      };
    } catch (err: unknown) {
      if (err instanceof RuntimeError) {
        return {
          output: this.output,
          error: err.easyCodeError,
          iterations: this.totalIterations,
          durationMs: Date.now() - this.startTime,
        };
      }
      throw err;
    }
  }

  // Pre-scan to know where variables and functions are defined anywhere in the script
  private preScanDeclarations(stmts: StatementNode[]): void {
    for (const stmt of stmts) {
      if (stmt.type === "SetStatement") {
        const existing = this.allProgramVariables.get(stmt.target) || [];
        existing.push(stmt.line);
        this.allProgramVariables.set(stmt.target, existing);
      } else if (stmt.type === "AskStatement") {
        const existing = this.allProgramVariables.get(stmt.target) || [];
        existing.push(stmt.line);
        this.allProgramVariables.set(stmt.target, existing);
      } else if (stmt.type === "DefineStatement") {
        this.allProgramFunctions.set(stmt.name, stmt.line);
        this.preScanDeclarations(stmt.body);
      } else if (stmt.type === "IfStatement") {
        for (const branch of stmt.branches) {
          this.preScanDeclarations(branch.body);
        }
        if (stmt.otherwiseBody) {
          this.preScanDeclarations(stmt.otherwiseBody);
        }
      } else if (stmt.type === "RepeatStatement" || stmt.type === "WhileStatement" || stmt.type === "ForEachStatement") {
        if (stmt.type === "ForEachStatement") {
          const existing = this.allProgramVariables.get(stmt.itemVar) || [];
          existing.push(stmt.line);
          this.allProgramVariables.set(stmt.itemVar, existing);
        }
        this.preScanDeclarations(stmt.body);
      }
    }
  }

  private checkSafetyGuards(line: number, column: number, length: number): void {
    const elapsed = Date.now() - this.startTime;
    if (elapsed > this.timeoutMs) {
      const lineStr = this.getLine(line);
      throw new RuntimeError({
        type: "INFINITE_LOOP_GUARD",
        line,
        column,
        length: length || 1,
        message: `Execution timed out (exceeded ${this.timeoutMs / 1000} seconds).`,
        why: `Your program took longer than ${this.timeoutMs / 1000} seconds to finish, likely due to a loop that never terminates.`,
        fix: `Check your loop conditions to make sure they reach a stopping point.`,
        suggestedLine: lineStr,
        snippet: formatErrorSnippet(this.source, line, column, length || 1),
        pythonEquivalent: {
          code: lineStr,
          rawError: `Timeout / Process Terminated (SIGKILL)`,
          explanation: `Python would hang indefinitely until manually killed with Ctrl+C or a server timeout.`,
        },
      });
    }

    if (this.totalIterations > this.maxIterations) {
      const lineStr = this.getLine(line);
      throw new RuntimeError({
        type: "INFINITE_LOOP_GUARD",
        line,
        column,
        length: length || 1,
        message: `Infinite loop guard triggered (exceeded ${this.maxIterations.toLocaleString()} iterations).`,
        why: `Your loop ran more than ${this.maxIterations.toLocaleString()} times without stopping. In a while loop, check that the condition changes inside the loop body (e.g. set count to count + 1).`,
        fix: `Make sure the condition eventually becomes false.`,
        suggestedLine: lineStr,
        snippet: formatErrorSnippet(this.source, line, column, length || 1),
        pythonEquivalent: {
          code: lineStr,
          rawError: `Process killed (infinite loop consumed CPU)`,
          explanation: `Python will continue looping forever, freezing the thread or script.`,
        },
      });
    }
  }

  // --- Statement Execution ---

  public executeStatement(stmt: StatementNode): EasyCodeValue | undefined {
    switch (stmt.type) {
      case "SetStatement": {
        const value = this.evaluateExpression(stmt.value);
        if (stmt.index) {
          // List item assignment: set items[0] to value
          const indexVal = this.evaluateExpression(stmt.index);
          const listVar = this.getVariable(stmt.target, stmt.line, stmt.column, stmt.target.length);
          if (!Array.isArray(listVar.value)) {
            throw new RuntimeError({
              type: "GENERIC_RUNTIME_ERROR",
              line: stmt.line,
              column: stmt.column,
              length: stmt.target.length,
              message: `Cannot use list indexing on non-list "${stmt.target}".`,
              why: `"${stmt.target}" is of type ${typeof listVar.value}, not a list.`,
              fix: `Make sure "${stmt.target}" is set to a list like [1, 2, 3].`,
              snippet: formatErrorSnippet(this.source, stmt.line, stmt.column, stmt.target.length),
            });
          }
          if (typeof indexVal !== "number" || !Number.isInteger(indexVal)) {
            throw new RuntimeError({
              type: "GENERIC_RUNTIME_ERROR",
              line: stmt.index.line,
              column: stmt.index.column,
              length: stmt.index.length,
              message: `List index must be a whole number.`,
              why: `You tried to use ${String(indexVal)} as a list index.`,
              fix: `Use a whole number like 0, 1, or 2.`,
              snippet: formatErrorSnippet(this.source, stmt.index.line, stmt.index.column, stmt.index.length),
            });
          }
          const list = listVar.value as EasyCodeValue[];
          if (indexVal < 0 || indexVal >= list.length) {
            this.reportIndexOutOfRange(stmt.index, indexVal, list.length);
          }
          list[indexVal] = value;
        } else {
          this.setVariable(stmt.target, value, stmt.line);
        }
        return undefined;
      }

      case "SayStatement": {
        const val = this.evaluateExpression(stmt.expression);
        const str = this.stringify(val);
        this.output.push(str);
        return undefined;
      }

      case "AskStatement": {
        let inputAnswer = "";
        if (this.inputIdx < this.inputs.length) {
          inputAnswer = this.inputs[this.inputIdx++];
        } else {
          inputAnswer = "user_input";
        }
        // Try parsing as number if it looks like a number
        let finalVal: EasyCodeValue = inputAnswer;
        if (/^-?\d+(\.\d+)?$/.test(inputAnswer.trim())) {
          finalVal = Number(inputAnswer.trim());
        }
        this.setVariable(stmt.target, finalVal, stmt.line);
        return undefined;
      }

      case "IfStatement": {
        for (const branch of stmt.branches) {
          const condVal = this.evaluateExpression(branch.condition);
          if (this.isTruthy(condVal)) {
            for (const bodyStmt of branch.body) {
              this.checkSafetyGuards(bodyStmt.line, bodyStmt.column, bodyStmt.length);
              const ret = this.executeStatement(bodyStmt);
              if (ret !== undefined) return ret;
            }
            return undefined;
          }
        }
        if (stmt.otherwiseBody) {
          for (const bodyStmt of stmt.otherwiseBody) {
            this.checkSafetyGuards(bodyStmt.line, bodyStmt.column, bodyStmt.length);
            const ret = this.executeStatement(bodyStmt);
            if (ret !== undefined) return ret;
          }
        }
        return undefined;
      }

      case "RepeatStatement": {
        const countVal = this.evaluateExpression(stmt.count);
        if (typeof countVal !== "number") {
          throw new RuntimeError({
            type: "GENERIC_RUNTIME_ERROR",
            line: stmt.count.line,
            column: stmt.count.column,
            length: stmt.count.length,
            message: `Repeat count must be a number.`,
            why: `You provided ${typeof countVal} (${this.stringify(countVal)}) instead of a number.`,
            fix: `Use a number like: repeat 5 times:`,
            snippet: formatErrorSnippet(this.source, stmt.count.line, stmt.count.column, stmt.count.length),
          });
        }
        const iterations = Math.max(0, Math.floor(countVal));
        for (let i = 0; i < iterations; i++) {
          this.totalIterations++;
          this.checkSafetyGuards(stmt.line, stmt.column, stmt.length);
          for (const bodyStmt of stmt.body) {
            const ret = this.executeStatement(bodyStmt);
            if (ret !== undefined) return ret;
          }
        }
        return undefined;
      }

      case "WhileStatement": {
        while (this.isTruthy(this.evaluateExpression(stmt.condition))) {
          this.totalIterations++;
          this.checkSafetyGuards(stmt.line, stmt.column, stmt.length);
          for (const bodyStmt of stmt.body) {
            const ret = this.executeStatement(bodyStmt);
            if (ret !== undefined) return ret;
          }
        }
        return undefined;
      }

      case "ForEachStatement": {
        const listVal = this.evaluateExpression(stmt.list);
        if (!Array.isArray(listVal)) {
          throw new RuntimeError({
            type: "GENERIC_RUNTIME_ERROR",
            line: stmt.list.line,
            column: stmt.list.column,
            length: stmt.list.length,
            message: `Expected a list to loop over in "for each".`,
            why: `"${this.stringify(listVal)}" is a ${typeof listVal}, not a list.`,
            fix: `Use a list, e.g. [1, 2, 3] or a variable containing a list.`,
            snippet: formatErrorSnippet(this.source, stmt.list.line, stmt.list.column, stmt.list.length),
          });
        }
        for (const item of listVal) {
          this.totalIterations++;
          this.checkSafetyGuards(stmt.line, stmt.column, stmt.length);
          this.setVariable(stmt.itemVar, item, stmt.line);
          for (const bodyStmt of stmt.body) {
            const ret = this.executeStatement(bodyStmt);
            if (ret !== undefined) return ret;
          }
        }
        return undefined;
      }

      case "DefineStatement": {
        const fn: EasyCodeFunction = {
          __isEasyCodeFunction: true,
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
          closure: this.currentScope,
        };
        this.currentScope.functions.set(stmt.name, fn);
        return undefined;
      }

      case "CallStatement": {
        this.invokeFunction(stmt.callee, stmt.args, stmt.line, stmt.column, stmt.length);
        return undefined;
      }

      case "GiveBackStatement": {
        if (stmt.value) {
          return this.evaluateExpression(stmt.value);
        }
        return null as unknown as EasyCodeValue;
      }

      case "AddStatement": {
        const itemVal = this.evaluateExpression(stmt.item);
        const listRec = this.getVariable(stmt.listVar, stmt.line, stmt.column, stmt.listVar.length);
        if (!Array.isArray(listRec.value)) {
          throw new RuntimeError({
            type: "GENERIC_RUNTIME_ERROR",
            line: stmt.line,
            column: stmt.column,
            length: stmt.listVar.length,
            message: `"${stmt.listVar}" is not a list.`,
            why: `You can only add items to a list. "${stmt.listVar}" is currently ${this.stringify(listRec.value)}.`,
            fix: `Set "${stmt.listVar}" to a list first: set ${stmt.listVar} to []`,
            snippet: formatErrorSnippet(this.source, stmt.line, stmt.column, stmt.listVar.length),
          });
        }
        (listRec.value as EasyCodeValue[]).push(itemVal);
        return undefined;
      }

      case "RemoveStatement": {
        const itemVal = this.evaluateExpression(stmt.item);
        const listRec = this.getVariable(stmt.listVar, stmt.line, stmt.column, stmt.listVar.length);
        if (!Array.isArray(listRec.value)) {
          throw new RuntimeError({
            type: "GENERIC_RUNTIME_ERROR",
            line: stmt.line,
            column: stmt.column,
            length: stmt.listVar.length,
            message: `"${stmt.listVar}" is not a list.`,
            why: `You can only remove items from a list.`,
            fix: `Make sure "${stmt.listVar}" is a list.`,
            snippet: formatErrorSnippet(this.source, stmt.line, stmt.column, stmt.listVar.length),
          });
        }
        const list = listRec.value as EasyCodeValue[];
        const idx = list.findIndex((x) => this.valuesEqual(x, itemVal));
        if (idx !== -1) {
          list.splice(idx, 1);
        }
        return undefined;
      }

      case "PassStatement":
        return undefined;
    }
  }

  // --- Expression Evaluation ---

  public evaluateExpression(expr: ExpressionNode): EasyCodeValue {
    switch (expr.type) {
      case "NumberLiteral":
        return expr.value;

      case "StringLiteral":
        return expr.value;

      case "BooleanLiteral":
        return expr.value;

      case "ListLiteral":
        return expr.elements.map((el) => this.evaluateExpression(el));

      case "Identifier": {
        const rec = this.getVariable(expr.name, expr.line, expr.column, expr.length);
        return rec.value;
      }

      case "IndexAccessExpr": {
        const targetVal = this.evaluateExpression(expr.target);
        const indexVal = this.evaluateExpression(expr.index);

        if (!Array.isArray(targetVal) && typeof targetVal !== "string") {
          throw new RuntimeError({
            type: "GENERIC_RUNTIME_ERROR",
            line: expr.line,
            column: expr.column,
            length: expr.length,
            message: `Cannot access index on non-list/non-text.`,
            why: `Only lists and text can be indexed by number.`,
            fix: `Make sure your variable is a list or text.`,
            snippet: formatErrorSnippet(this.source, expr.line, expr.column, expr.length),
          });
        }

        if (typeof indexVal !== "number" || !Number.isInteger(indexVal)) {
          throw new RuntimeError({
            type: "GENERIC_RUNTIME_ERROR",
            line: expr.index.line,
            column: expr.index.column,
            length: expr.index.length,
            message: `Index must be a whole number.`,
            why: `You provided ${this.stringify(indexVal)} as an index.`,
            fix: `Use a whole number like 0, 1, or 2.`,
            snippet: formatErrorSnippet(this.source, expr.index.line, expr.index.column, expr.index.length),
          });
        }

        const len = targetVal.length;
        if (indexVal < 0 || indexVal >= len) {
          this.reportIndexOutOfRange(expr.index, indexVal, len);
        }

        return targetVal[indexVal];
      }

      case "BinaryExpr": {
        const left = this.evaluateExpression(expr.left);
        const right = this.evaluateExpression(expr.right);

        switch (expr.operator) {
          case "+": {
            // Addition or Concatenation
            if (typeof left === "number" && typeof right === "number") {
              return left + right;
            }
            if (typeof left === "string" && typeof right === "string") {
              return left + right;
            }

            // String and Number mismatch!
            if (
              (typeof left === "string" && typeof right === "number") ||
              (typeof left === "number" && typeof right === "string")
            ) {
              const lineStr = this.getLine(expr.line);
              const numExpr = typeof left === "number" ? "left" : "right";
              const suggestedLine =
                typeof left === "number"
                  ? lineStr.replace(String(left), `text(${left})`)
                  : lineStr.replace(String(right), `text(${right})`);

              throw new RuntimeError({
                type: "TYPE_MISMATCH_ADDITION",
                line: expr.line,
                column: expr.column,
                length: expr.length,
                message: `Cannot add text and a number together directly.`,
                why: `One side is text ("...") and the other is a number. EasyCode keeps text and numbers separate so subtle bugs don't sneak in.`,
                fix: `Convert the number to text first using text(...), like: text(...)`,
                suggestedLine,
                snippet: formatErrorSnippet(this.source, expr.line, expr.column, expr.length),
                pythonEquivalent: {
                  code: lineStr,
                  rawError: `TypeError: can only concatenate str (not "int") to str`,
                  explanation: `Python will not automatically convert numbers to strings when using '+'. You must call str() in Python, or text() in EasyCode.`,
                },
              });
            }

            // Other unsupported additions
            throw new RuntimeError({
              type: "GENERIC_RUNTIME_ERROR",
              line: expr.line,
              column: expr.column,
              length: expr.length,
              message: `Cannot add ${typeof left} and ${typeof right}.`,
              why: `The "+" operator is only for numbers (addition) or text (joining together).`,
              fix: `Make sure both sides are numbers or both sides are text.`,
              snippet: formatErrorSnippet(this.source, expr.line, expr.column, expr.length),
            });
          }

          case "-":
            this.assertNumbers(left, right, "-", expr);
            return (left as number) - (right as number);

          case "*":
            this.assertNumbers(left, right, "*", expr);
            return (left as number) * (right as number);

          case "/": {
            this.assertNumbers(left, right, "/", expr);
            if ((right as number) === 0) {
              const lineStr = this.getLine(expr.line);
              throw new RuntimeError({
                type: "DIVIDE_BY_ZERO",
                line: expr.right.line,
                column: expr.right.column,
                length: expr.right.length,
                message: `Cannot divide by zero.`,
                why: `In mathematics, dividing any number by zero is undefined and impossible.`,
                fix: `Check that your divisor is not zero before dividing, or use an "if" check.`,
                suggestedLine: lineStr,
                snippet: formatErrorSnippet(this.source, expr.right.line, expr.right.column, expr.right.length),
                pythonEquivalent: {
                  code: lineStr,
                  rawError: `ZeroDivisionError: division by zero`,
                  explanation: `Python immediately halts program execution when a division by zero occurs.`,
                },
              });
            }
            return (left as number) / (right as number);
          }

          case "remainder": {
            this.assertNumbers(left, right, "remainder", expr);
            if ((right as number) === 0) {
              const lineStr = this.getLine(expr.line);
              throw new RuntimeError({
                type: "DIVIDE_BY_ZERO",
                line: expr.right.line,
                column: expr.right.column,
                length: expr.right.length,
                message: `Cannot find remainder when dividing by zero.`,
                why: `Remainder division by zero is undefined.`,
                fix: `Ensure the second number is greater than zero.`,
                suggestedLine: lineStr,
                snippet: formatErrorSnippet(this.source, expr.right.line, expr.right.column, expr.right.length),
                pythonEquivalent: {
                  code: lineStr,
                  rawError: `ZeroDivisionError: integer modulo by zero`,
                  explanation: `Python raises ZeroDivisionError on modulo by zero.`,
                },
              });
            }
            return (left as number) % (right as number);
          }

          case "is":
            return this.valuesEqual(left, right);

          case "is not":
            return !this.valuesEqual(left, right);

          case "is greater than":
            this.assertComparable(left, right, "is greater than", expr);
            return (left as number) > (right as number);

          case "is less than":
            this.assertComparable(left, right, "is less than", expr);
            return (left as number) < (right as number);

          case "is at least":
            this.assertComparable(left, right, "is at least", expr);
            return (left as number) >= (right as number);

          case "is at most":
            this.assertComparable(left, right, "is at most", expr);
            return (left as number) <= (right as number);

          case "and":
            return this.isTruthy(left) && this.isTruthy(right);

          case "or":
            return this.isTruthy(left) || this.isTruthy(right);
        }
        break;
      }

      case "UnaryExpr": {
        const val = this.evaluateExpression(expr.operand);
        if (expr.operator === "not") {
          return !this.isTruthy(val);
        }
        if (expr.operator === "-") {
          if (typeof val !== "number") {
            throw new RuntimeError({
              type: "GENERIC_RUNTIME_ERROR",
              line: expr.line,
              column: expr.column,
              length: expr.length,
              message: `Cannot negate a non-number.`,
              why: `Unary "-" can only be used on numbers.`,
              fix: `Use "-" in front of a number only.`,
              snippet: formatErrorSnippet(this.source, expr.line, expr.column, expr.length),
            });
          }
          return -val;
        }
        break;
      }

      case "CallExpr": {
        return this.invokeFunction(expr.callee, expr.args, expr.line, expr.column, expr.length);
      }
    }

    return 0;
  }

  // --- Function Invocation & Built-ins ---

  private invokeFunction(
    callee: string,
    args: ExpressionNode[],
    line: number,
    column: number,
    length: number
  ): EasyCodeValue {
    // Check standard built-ins first
    if (callee === "text") {
      if (args.length !== 1) {
        throw new RuntimeError({
          type: "WRONG_ARGUMENT_COUNT",
          line,
          column,
          length,
          message: `Function "text" expects 1 argument, but got ${args.length}.`,
          why: `text(...) converts a single value into text.`,
          fix: `Call text with 1 argument: text(value)`,
          snippet: formatErrorSnippet(this.source, line, column, length),
        });
      }
      const val = this.evaluateExpression(args[0]);
      return this.stringify(val);
    }

    if (callee === "number") {
      if (args.length !== 1) {
        throw new RuntimeError({
          type: "WRONG_ARGUMENT_COUNT",
          line,
          column,
          length,
          message: `Function "number" expects 1 argument, but got ${args.length}.`,
          why: `number(...) converts text into a number.`,
          fix: `Call number with 1 argument: number("42")`,
          snippet: formatErrorSnippet(this.source, line, column, length),
        });
      }
      const val = this.evaluateExpression(args[0]);
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    }

    if (callee === "length") {
      if (args.length !== 1) {
        throw new RuntimeError({
          type: "WRONG_ARGUMENT_COUNT",
          line,
          column,
          length,
          message: `Function "length" expects 1 argument, but got ${args.length}.`,
          why: `length(...) counts the items in a list or characters in text.`,
          fix: `Call length with 1 argument: length(myList)`,
          snippet: formatErrorSnippet(this.source, line, column, length),
        });
      }
      const val = this.evaluateExpression(args[0]);
      if (Array.isArray(val) || typeof val === "string") {
        return val.length;
      }
      return 0;
    }

    if (callee === "round") {
      if (args.length !== 1) {
        throw new RuntimeError({
          type: "WRONG_ARGUMENT_COUNT",
          line,
          column,
          length,
          message: `Function "round" expects 1 argument, but got ${args.length}.`,
          why: `round(...) rounds a single number to the nearest integer.`,
          fix: `Call round with 1 argument: round(3.7)`,
          snippet: formatErrorSnippet(this.source, line, column, length),
        });
      }
      const val = this.evaluateExpression(args[0]);
      return typeof val === "number" ? Math.round(val) : 0;
    }

    // Lookup user-defined function
    const fn = this.lookupFunction(callee);
    if (!fn) {
      // Undefined function!
      const knownFns = Array.from(this.allProgramFunctions.keys()).concat(["text", "number", "length", "round"]);
      const match = findBestMatch(callee, knownFns, 3);
      const lineStr = this.getLine(line);
      const regex = new RegExp(`\\b${callee}\\b`);
      const suggestedLine = match ? lineStr.replace(regex, match) : undefined;

      throw new RuntimeError({
        type: "UNDEFINED_FUNCTION",
        line,
        column,
        length,
        message: `I couldn't find a function called "${callee}".`,
        why: `You called "${callee}", but you haven't defined a function with that name yet.`,
        didYouMean: match ? `Did you mean "${match}"?` : undefined,
        fix: match ? `Change "${callee}" to "${match}".` : `Define it first with: define ${callee}:`,
        suggestedLine,
        snippet: formatErrorSnippet(this.source, line, column, length),
        pythonEquivalent: {
          code: lineStr,
          rawError: `NameError: name '${callee}' is not defined`,
          explanation: `Python raises NameError when calling an undefined function name.`,
        },
      });
    }

    // Argument count check!
    if (args.length !== fn.params.length) {
      const lineStr = this.getLine(line);
      throw new RuntimeError({
        type: "WRONG_ARGUMENT_COUNT",
        line,
        column,
        length,
        message: `Function "${callee}" expects ${fn.params.length} argument(s), but got ${args.length}.`,
        why: `When you defined "${callee}", you gave it ${fn.params.length} parameter(s): (${fn.params.join(", ")}).`,
        fix: `Pass ${fn.params.length} argument(s): call ${callee} with ${fn.params.join(", ")}`,
        suggestedLine: `call ${callee} with ${fn.params.join(", ")}`,
        snippet: formatErrorSnippet(this.source, line, column, length),
        pythonEquivalent: {
          code: lineStr,
          rawError: `TypeError: ${callee}() takes ${fn.params.length} positional arguments but ${args.length} were given`,
          explanation: `Python throws TypeError when calling a function with the wrong number of parameters.`,
        },
      });
    }

    // Evaluate arguments in current scope
    const evaluatedArgs = args.map((a) => this.evaluateExpression(a));

    // Create function scope chaining to closure
    const fnScope: Scope = {
      parent: fn.closure,
      variables: new Map(),
      functions: new Map(),
    };

    for (let i = 0; i < fn.params.length; i++) {
      fnScope.variables.set(fn.params[i], {
        value: evaluatedArgs[i],
        definedAtLine: line,
      });
    }

    const previousScope = this.currentScope;
    this.currentScope = fnScope;

    try {
      for (const bodyStmt of fn.body) {
        this.checkSafetyGuards(bodyStmt.line, bodyStmt.column, bodyStmt.length);
        const result = this.executeStatement(bodyStmt);
        if (result !== undefined) {
          return result;
        }
      }
      return 0; // default return
    } finally {
      this.currentScope = previousScope;
    }
  }

  // --- Scope & Variables ---

  private setVariable(name: string, value: EasyCodeValue, line: number): void {
    let scope: Scope | undefined = this.currentScope;
    while (scope) {
      if (scope.variables.has(name)) {
        scope.variables.set(name, { value, definedAtLine: line });
        return;
      }
      scope = scope.parent;
    }
    // Set in current scope
    this.currentScope.variables.set(name, { value, definedAtLine: line });
  }

  private getVariable(name: string, line: number, column: number, length: number): VariableRecord {
    let scope: Scope | undefined = this.currentScope;
    while (scope) {
      if (scope.variables.has(name)) {
        return scope.variables.get(name)!;
      }
      scope = scope.parent;
    }

    // Variable was not found in runtime scope!
    // Check if it is defined anywhere else in the file (e.g. later line)
    const laterLines = this.allProgramVariables.get(name);
    const lineStr = this.getLine(line);

    if (laterLines && laterLines.length > 0) {
      const definedLine = laterLines[0];
      if (definedLine > line) {
        // Defined later! VARIABLE_USED_BEFORE_SET
        throw new RuntimeError({
          type: "VARIABLE_USED_BEFORE_SET",
          line,
          column,
          length,
          message: `"${name}" is used on line ${line}, but you don't set it until line ${definedLine}.`,
          why: `EasyCode runs instructions one by one from top to bottom. You must set a variable before you can read or use its value.`,
          didYouMean: `(you set it on line ${definedLine})`,
          fix: `Move the line where you set "${name}" above line ${line}.`,
          suggestedLine: lineStr,
          snippet: formatErrorSnippet(this.source, line, column, length),
          pythonEquivalent: {
            code: lineStr,
            rawError: `UnboundLocalError: local variable '${name}' referenced before assignment`,
            explanation: `Python raises UnboundLocalError when accessing a variable prior to its assignment in scope.`,
          },
        });
      }
    }

    // Undefined variable with Did You Mean
    const allKnown: { name: string; line: number }[] = [];
    let cur: Scope | undefined = this.currentScope;
    while (cur) {
      cur.variables.forEach((rec, varName) => {
        allKnown.push({ name: varName, line: rec.definedAtLine });
      });
      cur = cur.parent;
    }

    const candidateNames = allKnown.map((k) => k.name);
    const bestMatch = findBestMatch(name, candidateNames, 3);
    const matchRecord = bestMatch ? allKnown.find((k) => k.name === bestMatch) : undefined;

    const regex = new RegExp(`\\b${name}\\b`);
    const suggestedLine = bestMatch ? lineStr.replace(regex, bestMatch) : undefined;
    const didYouMeanText = bestMatch
      ? `Did you mean "${bestMatch}"?${matchRecord ? ` (you set it on line ${matchRecord.line})` : ""}`
      : undefined;

    throw new RuntimeError({
      type: "UNDEFINED_VARIABLE",
      line,
      column,
      length,
      message: `I don't know what "${name}" is.`,
      why: `You haven't created anything called "${name}" yet.`,
      didYouMean: didYouMeanText,
      fix: bestMatch ? `${lineStr.trim().replace(regex, bestMatch)}` : `Set "${name}" first: set ${name} to ...`,
      suggestedLine,
      snippet: formatErrorSnippet(this.source, line, column, length),
      pythonEquivalent: {
        code: lineStr,
        rawError: `NameError: name '${name}' is not defined`,
        explanation: `Python halts with NameError when encountering an undefined identifier.`,
      },
    });
  }

  private lookupFunction(name: string): EasyCodeFunction | undefined {
    let scope: Scope | undefined = this.currentScope;
    while (scope) {
      if (scope.functions.has(name)) {
        return scope.functions.get(name);
      }
      scope = scope.parent;
    }
    return undefined;
  }

  // --- Type and Value Helpers ---

  private reportIndexOutOfRange(expr: ExpressionNode, index: number, length: number): never {
    const lineStr = this.getLine(expr.line);
    const maxIdx = Math.max(0, length - 1);
    throw new RuntimeError({
      type: "INDEX_OUT_OF_RANGE",
      line: expr.line,
      column: expr.column,
      length: expr.length,
      message: `List index ${index} is out of range.`,
      why: `The list has ${length} item(s) (indexes 0 to ${maxIdx}). You asked for index ${index}.`,
      fix: `Use an index between 0 and ${maxIdx}. Remember that EasyCode lists start counting at 0!`,
      suggestedLine: lineStr,
      snippet: formatErrorSnippet(this.source, expr.line, expr.column, expr.length),
      pythonEquivalent: {
        code: lineStr,
        rawError: `IndexError: list index out of range`,
        explanation: `Python raises IndexError when an index exceeds the list's valid boundaries.`,
      },
    });
  }

  private assertNumbers(left: EasyCodeValue, right: EasyCodeValue, op: string, expr: ExpressionNode): void {
    if (typeof left !== "number" || typeof right !== "number") {
      throw new RuntimeError({
        type: "GENERIC_RUNTIME_ERROR",
        line: expr.line,
        column: expr.column,
        length: expr.length,
        message: `Operator "${op}" requires two numbers.`,
        why: `You tried to use "${op}" on ${typeof left} and ${typeof right}.`,
        fix: `Make sure both sides are numbers.`,
        snippet: formatErrorSnippet(this.source, expr.line, expr.column, expr.length),
      });
    }
  }

  private assertComparable(left: EasyCodeValue, right: EasyCodeValue, op: string, expr: ExpressionNode): void {
    if (typeof left !== typeof right) {
      throw new RuntimeError({
        type: "GENERIC_RUNTIME_ERROR",
        line: expr.line,
        column: expr.column,
        length: expr.length,
        message: `Cannot compare ${typeof left} with ${typeof right} using "${op}".`,
        why: `Comparisons like "${op}" only make sense between values of the same type.`,
        fix: `Compare numbers with numbers or text with text.`,
        snippet: formatErrorSnippet(this.source, expr.line, expr.column, expr.length),
      });
    }
  }

  private valuesEqual(a: EasyCodeValue, b: EasyCodeValue): boolean {
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.valuesEqual(a[i], b[i])) return false;
      }
      return true;
    }
    return a === b;
  }

  private isTruthy(val: EasyCodeValue): boolean {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    if (typeof val === "string") return val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return false;
  }

  public stringify(val: EasyCodeValue): string {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) {
      return "[" + val.map((x) => this.stringify(x)).join(", ") + "]";
    }
    return String(val);
  }

  private getLine(lineNum: number): string {
    const lines = this.source.split(/\r?\n/);
    return lines[lineNum - 1] || "";
  }
}

