// EasyCode Narrator: Step-by-Step Plain-English Execution Explainer
import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  EasyCodeValue,
  EasyCodeFunction,
  Scope,
  VariableRecord,
} from "./ast";
import { EasyCodeError, formatErrorSnippet } from "./errors";
import { RuntimeError } from "./interpreter";

export interface NarratorStep {
  stepNumber: number;
  line: number;
  narration: string;
  variableSnapshot?: Record<string, string>;
}

export interface NarratorResult {
  output: string[];
  steps: string[];
  detailedSteps: NarratorStep[];
  error?: EasyCodeError;
  durationMs: number;
}

export class Narrator {
  private globalScope: Scope;
  private currentScope: Scope;
  private source: string;
  private output: string[] = [];
  private steps: NarratorStep[] = [];
  private stepCount: number = 0;
  private totalIterations: number = 0;
  private maxIterations: number = 1000; // Explain mode caps at 1000 steps for responsiveness
  private startTime: number = 0;
  private inputs: string[] = [];
  private inputIdx: number = 0;

  constructor(source: string, inputs: string[] = []) {
    this.source = source;
    this.inputs = inputs;
    this.globalScope = {
      variables: new Map(),
      functions: new Map(),
    };
    this.currentScope = this.globalScope;
  }

  public explain(program: ProgramNode): NarratorResult {
    this.startTime = Date.now();
    this.stepCount = 0;
    this.totalIterations = 0;
    this.output = [];
    this.steps = [];

    try {
      for (const stmt of program.body) {
        this.explainStatement(stmt);
      }

      return {
        output: this.output,
        steps: this.steps.map((s) => s.narration),
        detailedSteps: this.steps,
        durationMs: Date.now() - this.startTime,
      };
    } catch (err: unknown) {
      if (err instanceof RuntimeError) {
        this.addStep(err.easyCodeError.line, `Line ${err.easyCodeError.line}: Stopped with error: ${err.easyCodeError.message}`);
        return {
          output: this.output,
          steps: this.steps.map((s) => s.narration),
          detailedSteps: this.steps,
          error: err.easyCodeError,
          durationMs: Date.now() - this.startTime,
        };
      }
      throw err;
    }
  }

  private addStep(line: number, narration: string): void {
    this.stepCount++;
    const snapshot: Record<string, string> = {};
    let s: Scope | undefined = this.currentScope;
    while (s) {
      s.variables.forEach((v, k) => {
        if (!snapshot[k]) {
          snapshot[k] = this.stringify(v.value);
        }
      });
      s = s.parent;
    }

    this.steps.push({
      stepNumber: this.stepCount,
      line,
      narration,
      variableSnapshot: snapshot,
    });
  }

  private explainStatement(stmt: StatementNode): EasyCodeValue | undefined {
    if (this.stepCount > this.maxIterations) {
      this.addStep(stmt.line, `Line ${stmt.line}: Reached narration limit of ${this.maxIterations} steps.`);
      return undefined;
    }

    switch (stmt.type) {
      case "SetStatement": {
        const val = this.evalExpr(stmt.value);
        if (stmt.index) {
          const idxVal = this.evalExpr(stmt.index);
          const listRec = this.getVar(stmt.target, stmt.line, stmt.column, stmt.target.length);
          if (Array.isArray(listRec.value) && typeof idxVal === "number") {
            (listRec.value as EasyCodeValue[])[idxVal] = val;
            this.addStep(
              stmt.line,
              `Line ${stmt.line}: Setting ${stmt.target}[${idxVal}] to ${this.stringify(val)}.`
            );
          }
        } else {
          this.setVar(stmt.target, val, stmt.line);
          this.addStep(
            stmt.line,
            `Line ${stmt.line}: Setting "${stmt.target}" to ${this.stringify(val)}.`
          );
        }
        return undefined;
      }

      case "SayStatement": {
        const val = this.evalExpr(stmt.expression);
        const str = this.stringify(val);
        this.output.push(str);
        this.addStep(
          stmt.line,
          `Line ${stmt.line}: Saying "${str}".`
        );
        return undefined;
      }

      case "AskStatement": {
        let inputVal: EasyCodeValue = "user_input";
        if (this.inputIdx < this.inputs.length) {
          inputVal = this.inputs[this.inputIdx++];
          if (/^-?\d+(\.\d+)?$/.test(inputVal.trim())) {
            inputVal = Number(inputVal.trim());
          }
        }
        this.setVar(stmt.target, inputVal, stmt.line);
        this.addStep(
          stmt.line,
          `Line ${stmt.line}: Asking user with "${stmt.prompt}" -> received ${this.stringify(inputVal)}, stored in "${stmt.target}".`
        );
        return undefined;
      }

      case "IfStatement": {
        let matched = false;
        for (let bIdx = 0; bIdx < stmt.branches.length; bIdx++) {
          const branch = stmt.branches[bIdx];
          const condVal = this.evalExpr(branch.condition);
          const isTrue = this.isTruthy(condVal);
          const label = bIdx === 0 ? "Checking if" : "Checking otherwise if";

          if (isTrue) {
            this.addStep(
              branch.location.line,
              `Line ${branch.location.line}: ${label} condition is met (true)... running the block.`
            );
            matched = true;
            for (const bodyStmt of branch.body) {
              const ret = this.explainStatement(bodyStmt);
              if (ret !== undefined) return ret;
            }
            break;
          } else {
            this.addStep(
              branch.location.line,
              `Line ${branch.location.line}: ${label} condition is not met (false)... skipping.`
            );
          }
        }

        if (!matched && stmt.otherwiseBody) {
          this.addStep(
            stmt.line,
            `Line ${stmt.line}: None of the if conditions matched, so running the otherwise block.`
          );
          for (const bodyStmt of stmt.otherwiseBody) {
            const ret = this.explainStatement(bodyStmt);
            if (ret !== undefined) return ret;
          }
        }
        return undefined;
      }

      case "RepeatStatement": {
        const countVal = this.evalExpr(stmt.count);
        const count = typeof countVal === "number" ? Math.max(0, Math.floor(countVal)) : 0;
        this.addStep(
          stmt.line,
          `Line ${stmt.line}: Starting repeat loop to run ${count} times.`
        );

        for (let i = 0; i < count; i++) {
          this.addStep(
            stmt.line,
            `Line ${stmt.line}: Repeat loop iteration ${i + 1} of ${count}.`
          );
          for (const bodyStmt of stmt.body) {
            const ret = this.explainStatement(bodyStmt);
            if (ret !== undefined) return ret;
          }
        }
        this.addStep(stmt.line, `Line ${stmt.line}: Finished repeat loop.`);
        return undefined;
      }

      case "WhileStatement": {
        let iter = 0;
        this.addStep(stmt.line, `Line ${stmt.line}: Starting while loop.`);
        while (this.isTruthy(this.evalExpr(stmt.condition))) {
          iter++;
          if (iter > 200) {
            this.addStep(stmt.line, `Line ${stmt.line}: Stopped while loop in explain mode after 200 iterations.`);
            break;
          }
          this.addStep(
            stmt.line,
            `Line ${stmt.line}: While condition is true (iteration ${iter})... running block.`
          );
          for (const bodyStmt of stmt.body) {
            const ret = this.explainStatement(bodyStmt);
            if (ret !== undefined) return ret;
          }
        }
        this.addStep(stmt.line, `Line ${stmt.line}: While condition became false... exiting loop.`);
        return undefined;
      }

      case "ForEachStatement": {
        const listVal = this.evalExpr(stmt.list);
        if (Array.isArray(listVal)) {
          this.addStep(
            stmt.line,
            `Line ${stmt.line}: Starting for-each loop over list of ${listVal.length} item(s).`
          );
          for (let i = 0; i < listVal.length; i++) {
            const item = listVal[i];
            this.setVar(stmt.itemVar, item, stmt.line);
            this.addStep(
              stmt.line,
              `Line ${stmt.line}: Loop item ${i + 1}/${listVal.length}: setting "${stmt.itemVar}" to ${this.stringify(item)}.`
            );
            for (const bodyStmt of stmt.body) {
              const ret = this.explainStatement(bodyStmt);
              if (ret !== undefined) return ret;
            }
          }
          this.addStep(stmt.line, `Line ${stmt.line}: Finished for-each loop.`);
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
        this.addStep(
          stmt.line,
          `Line ${stmt.line}: Defined function "${stmt.name}" with parameters (${stmt.params.join(", ")}).`
        );
        return undefined;
      }

      case "CallStatement": {
        this.addStep(stmt.line, `Line ${stmt.line}: Calling function "${stmt.callee}".`);
        this.invokeFn(stmt.callee, stmt.args, stmt.line, stmt.column, stmt.length);
        return undefined;
      }

      case "GiveBackStatement": {
        if (stmt.value) {
          const val = this.evalExpr(stmt.value);
          this.addStep(stmt.line, `Line ${stmt.line}: Giving back ${this.stringify(val)}.`);
          return val;
        }
        this.addStep(stmt.line, `Line ${stmt.line}: Giving back.`);
        return null as unknown as EasyCodeValue;
      }

      case "AddStatement": {
        const itemVal = this.evalExpr(stmt.item);
        const listRec = this.getVar(stmt.listVar, stmt.line, stmt.column, stmt.listVar.length);
        if (Array.isArray(listRec.value)) {
          (listRec.value as EasyCodeValue[]).push(itemVal);
          this.addStep(
            stmt.line,
            `Line ${stmt.line}: Added ${this.stringify(itemVal)} to "${stmt.listVar}".`
          );
        }
        return undefined;
      }

      case "RemoveStatement": {
        const itemVal = this.evalExpr(stmt.item);
        const listRec = this.getVar(stmt.listVar, stmt.line, stmt.column, stmt.listVar.length);
        if (Array.isArray(listRec.value)) {
          const list = listRec.value as EasyCodeValue[];
          const idx = list.findIndex((x) => this.valuesEqual(x, itemVal));
          if (idx !== -1) {
            list.splice(idx, 1);
            this.addStep(
              stmt.line,
              `Line ${stmt.line}: Removed ${this.stringify(itemVal)} from "${stmt.listVar}".`
            );
          } else {
            this.addStep(
              stmt.line,
              `Line ${stmt.line}: Item ${this.stringify(itemVal)} was not in "${stmt.listVar}".`
            );
          }
        }
        return undefined;
      }

      case "PassStatement":
        this.addStep(stmt.line, `Line ${stmt.line}: Passing (doing nothing).`);
        return undefined;
    }
  }

  private evalExpr(expr: ExpressionNode): EasyCodeValue {
    switch (expr.type) {
      case "NumberLiteral":
        return expr.value;
      case "StringLiteral":
        return expr.value;
      case "BooleanLiteral":
        return expr.value;
      case "ListLiteral":
        return expr.elements.map((el) => this.evalExpr(el));
      case "Identifier": {
        const rec = this.getVar(expr.name, expr.line, expr.column, expr.length);
        return rec.value;
      }
      case "IndexAccessExpr": {
        const target = this.evalExpr(expr.target);
        const idx = this.evalExpr(expr.index);
        if ((Array.isArray(target) || typeof target === "string") && typeof idx === "number") {
          return target[idx];
        }
        return 0;
      }
      case "BinaryExpr": {
        const left = this.evalExpr(expr.left);
        const right = this.evalExpr(expr.right);
        switch (expr.operator) {
          case "+":
            if (typeof left === "number" && typeof right === "number") return left + right;
            if (typeof left === "string" && typeof right === "string") return left + right;
            return String(left) + String(right);
          case "-":
            return Number(left) - Number(right);
          case "*":
            return Number(left) * Number(right);
          case "/":
            if (Number(right) === 0) return 0;
            return Number(left) / Number(right);
          case "remainder":
            if (Number(right) === 0) return 0;
            return Number(left) % Number(right);
          case "is":
            return this.valuesEqual(left, right);
          case "is not":
            return !this.valuesEqual(left, right);
          case "is greater than":
            return Number(left) > Number(right);
          case "is less than":
            return Number(left) < Number(right);
          case "is at least":
            return Number(left) >= Number(right);
          case "is at most":
            return Number(left) <= Number(right);
          case "and":
            return this.isTruthy(left) && this.isTruthy(right);
          case "or":
            return this.isTruthy(left) || this.isTruthy(right);
        }
        break;
      }
      case "UnaryExpr": {
        const val = this.evalExpr(expr.operand);
        if (expr.operator === "not") return !this.isTruthy(val);
        if (expr.operator === "-") return -Number(val);
        break;
      }
      case "CallExpr": {
        return this.invokeFn(expr.callee, expr.args, expr.line, expr.column, expr.length);
      }
    }
    return 0;
  }

  private invokeFn(
    callee: string,
    args: ExpressionNode[],
    line: number,
    column: number,
    length: number
  ): EasyCodeValue {
    if (callee === "text") {
      const val = args[0] ? this.evalExpr(args[0]) : "";
      return this.stringify(val);
    }
    if (callee === "number") {
      const val = args[0] ? this.evalExpr(args[0]) : 0;
      return Number(val) || 0;
    }
    if (callee === "length") {
      const val = args[0] ? this.evalExpr(args[0]) : [];
      if (Array.isArray(val) || typeof val === "string") return val.length;
      return 0;
    }
    if (callee === "round") {
      const val = args[0] ? this.evalExpr(args[0]) : 0;
      return Math.round(Number(val) || 0);
    }

    const fn = this.lookupFn(callee);
    if (!fn) return 0;

    const evaluatedArgs = args.map((a) => this.evalExpr(a));
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

    const prev = this.currentScope;
    this.currentScope = fnScope;
    try {
      for (const bodyStmt of fn.body) {
        const ret = this.explainStatement(bodyStmt);
        if (ret !== undefined) return ret;
      }
      return 0;
    } finally {
      this.currentScope = prev;
    }
  }

  private setVar(name: string, value: EasyCodeValue, line: number): void {
    let s: Scope | undefined = this.currentScope;
    while (s) {
      if (s.variables.has(name)) {
        s.variables.set(name, { value, definedAtLine: line });
        return;
      }
      s = s.parent;
    }
    this.currentScope.variables.set(name, { value, definedAtLine: line });
  }

  private getVar(name: string, line: number, column: number, length: number): VariableRecord {
    let s: Scope | undefined = this.currentScope;
    while (s) {
      if (s.variables.has(name)) return s.variables.get(name)!;
      s = s.parent;
    }
    return { value: 0, definedAtLine: line };
  }

  private lookupFn(name: string): EasyCodeFunction | undefined {
    let s: Scope | undefined = this.currentScope;
    while (s) {
      if (s.functions.has(name)) return s.functions.get(name);
      s = s.parent;
    }
    return undefined;
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

  private stringify(val: EasyCodeValue): string {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) {
      return "[" + val.map((x) => this.stringify(x)).join(", ") + "]";
    }
    return String(val);
  }
}

