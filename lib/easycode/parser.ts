// EasyCode Recursive Descent Parser with Built-in Diagnostics
import {
  Token,
  TokenType,
  ProgramNode,
  StatementNode,
  ExpressionNode,
  SetStatementNode,
  SayStatementNode,
  AskStatementNode,
  IfStatementNode,
  RepeatStatementNode,
  WhileStatementNode,
  ForEachStatementNode,
  DefineStatementNode,
  CallStatementNode,
  GiveBackStatementNode,
  AddStatementNode,
  RemoveStatementNode,
  PassStatementNode,
  BinaryOperator,
  SourceLocation,
  IfBranch,
} from "./ast";
import {
  EasyCodeError,
  formatErrorSnippet,
  findBestMatch,
  EASYCODE_KEYWORDS,
} from "./errors";

export class ParserError extends Error {
  public easyCodeError: EasyCodeError;

  constructor(easyCodeError: EasyCodeError) {
    super(easyCodeError.message);
    this.name = "ParserError";
    this.easyCodeError = easyCodeError;
  }
}

const STATEMENT_START_KEYWORDS = [
  "set",
  "say",
  "ask",
  "if",
  "otherwise",
  "repeat",
  "while",
  "for",
  "define",
  "call",
  "give",
  "add",
  "remove",
  "pass",
];

const COMMON_KEYWORD_TYPOS: Record<string, string> = {
  sey: "say",
  prnt: "say",
  print: "say",
  echo: "say",
  repat: "repeat",
  repit: "repeat",
  loop: "repeat",
  whle: "while",
  defin: "define",
  def: "define",
  func: "define",
  function: "define",
  fn: "define",
  var: "set",
  let: "set",
  const: "set",
  esle: "otherwise",
  else: "otherwise",
  elif: "otherwise if",
  retun: "give back",
  return: "give back",
};

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private source: string;
  public errors: EasyCodeError[] = [];

  constructor(tokens: Token[], source: string, initialErrors: EasyCodeError[] = []) {
    this.tokens = tokens;
    this.source = source;
    this.errors = [...initialErrors];
  }

  public parse(): { program: ProgramNode; errors: EasyCodeError[] } {
    const body: StatementNode[] = [];
    const startLoc: SourceLocation = {
      line: 1,
      column: 1,
      length: 0,
    };

    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isAtEnd()) break;

      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      } else {
        this.synchronize();
      }
    }

    const program: ProgramNode = {
      type: "Program",
      body,
      line: startLoc.line,
      column: startLoc.column,
      length: this.source.length,
    };

    return { program, errors: this.errors };
  }

  // --- Statement Parsers ---

  private parseStatement(): StatementNode | null {
    this.skipNewlines();
    if (this.isAtEnd()) return null;

    const token = this.peek();

    // Check for "otherwise" without an "if"
    if (token.type === "OTHERWISE") {
      this.reportOrphanOtherwise(token);
      this.consumeLine();
      return null;
    }

    // Check for "set"
    if (token.type === "SET") {
      return this.parseSetStatement();
    }

    // Check for "say"
    if (token.type === "SAY") {
      return this.parseSayStatement();
    }

    // Check for "ask"
    if (token.type === "ASK") {
      return this.parseAskStatement();
    }

    // Check for "if"
    if (token.type === "IF") {
      return this.parseIfStatement();
    }

    // Check for "repeat"
    if (token.type === "REPEAT") {
      return this.parseRepeatStatement();
    }

    // Check for "while"
    if (token.type === "WHILE") {
      return this.parseWhileStatement();
    }

    // Check for "for"
    if (token.type === "FOR") {
      return this.parseForEachStatement();
    }

    // Check for "define"
    if (token.type === "DEFINE") {
      return this.parseDefineStatement();
    }

    // Check for "call"
    if (token.type === "CALL") {
      return this.parseCallStatement();
    }

    // Check for "give" "back"
    if (token.type === "GIVE") {
      return this.parseGiveBackStatement();
    }

    // Check for "add"
    if (token.type === "ADD") {
      return this.parseAddStatement();
    }

    // Check for "remove"
    if (token.type === "REMOVE") {
      return this.parseRemoveStatement();
    }

    // Check for "pass"
    if (token.type === "PASS") {
      this.advance();
      this.consumeOptionalSemicolonOrNewline();
      return {
        type: "PassStatement",
        line: token.line,
        column: token.column,
        length: token.length,
      };
    }

    // Misspelled keyword detection
    if (token.type === "IDENTIFIER" || token.type === "EQUALS") {
      const typo = this.checkMisspelledKeyword(token);
      if (typo) {
        this.consumeLine();
        return null;
      }
    }

    // Generic unexpected token error
    const err: EasyCodeError = {
      type: "GENERIC_SYNTAX_ERROR",
      line: token.line,
      column: token.column,
      length: token.length || 1,
      message: `I didn't expect "${token.value}" here.`,
      why: `Every statement in EasyCode starts with a clear command word (like "say", "set", "if", "repeat", or "define").`,
      fix: `Check the spelling of your command or see the examples.`,
      suggestedLine: this.getLine(token.line),
      snippet: formatErrorSnippet(this.source, token.line, token.column, token.length || 1),
    };
    this.errors.push(err);
    this.consumeLine();
    return null;
  }

  private parseSetStatement(): SetStatementNode | null {
    const setToken = this.advance(); // consume "set"
    const nameToken = this.peek();

    if (nameToken.type !== "IDENTIFIER") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: nameToken.line,
        column: nameToken.column,
        length: nameToken.length || 1,
        message: `Expected a variable name after "set".`,
        why: `You need to name the variable you want to set, for example: set score to 10.`,
        fix: `Add a variable name: set myVar to ...`,
        suggestedLine: `set myVariable to ...`,
        snippet: formatErrorSnippet(this.source, nameToken.line, nameToken.column, nameToken.length || 1),
      };
      this.errors.push(err);
      this.consumeLine();
      return null;
    }

    this.advance(); // consume identifier
    const targetName = nameToken.value;
    let indexExpr: ExpressionNode | undefined;

    // Check optional indexing: set items[0] to ...
    if (this.match("LBRACKET")) {
      indexExpr = this.parseExpression();
      if (!this.match("RBRACKET")) {
        const bracketToken = this.peek();
        const err: EasyCodeError = {
          type: "UNBALANCED_DELIMITER",
          line: bracketToken.line,
          column: bracketToken.column,
          length: 1,
          message: `Expected "]" after index.`,
          why: `List item assignments need closing brackets, like: set items[0] to "apple".`,
          fix: `Add "]" after your index.`,
          snippet: formatErrorSnippet(this.source, bracketToken.line, bracketToken.column, 1),
        };
        this.errors.push(err);
      }
    }

    // Now expect "to"
    const nextTok = this.peek();
    if (nextTok.type === "EQUALS") {
      // Caught using = instead of "to"!
      this.advance(); // consume "="
      const lineStr = this.getLine(nextTok.line);
      const suggestedLine = lineStr.replace(/=/, "to");
      const err: EasyCodeError = {
        type: "EQUALS_INSTEAD_OF_TO_OR_IS",
        line: nextTok.line,
        column: nextTok.column,
        length: nextTok.length,
        message: `Use "to" instead of "=" when setting variables.`,
        why: `In EasyCode, we set variables using the word "to", like: set ${targetName} to ...`,
        fix: `Replace "=" with "to": set ${targetName} to ...`,
        suggestedLine,
        snippet: formatErrorSnippet(this.source, nextTok.line, nextTok.column, nextTok.length),
        pythonEquivalent: {
          code: `${targetName} = ...`,
          rawError: `In Python, '=' is used for assignment, but EasyCode uses the word 'to'.`,
          explanation: `Python uses '=' for variables, while EasyCode spells out 'set <name> to <value>' for clarity.`,
        },
      };
      this.errors.push(err);
    } else if (nextTok.type !== "TO") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: nextTok.line,
        column: nextTok.column,
        length: nextTok.length || 1,
        message: `Expected "to" after variable name "${targetName}".`,
        why: `Setting a variable in EasyCode looks like: set ${targetName} to <value>.`,
        fix: `Add "to" before the value.`,
        suggestedLine: `set ${targetName} to `,
        snippet: formatErrorSnippet(this.source, nextTok.line, nextTok.column, nextTok.length || 1),
      };
      this.errors.push(err);
    } else {
      this.advance(); // consume "to"
    }

    const valueExpr = this.parseExpression();
    this.consumeOptionalSemicolonOrNewline();

    return {
      type: "SetStatement",
      target: targetName,
      index: indexExpr,
      value: valueExpr,
      line: setToken.line,
      column: setToken.column,
      length: setToken.length,
    };
  }

  private parseSayStatement(): SayStatementNode {
    const sayToken = this.advance(); // consume "say"
    const expr = this.parseExpression();
    this.consumeOptionalSemicolonOrNewline();

    return {
      type: "SayStatement",
      expression: expr,
      line: sayToken.line,
      column: sayToken.column,
      length: sayToken.length,
    };
  }

  private parseAskStatement(): AskStatementNode | null {
    const askToken = this.advance(); // consume "ask"
    const nameToken = this.peek();

    if (nameToken.type !== "IDENTIFIER") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: nameToken.line,
        column: nameToken.column,
        length: nameToken.length || 1,
        message: `Expected variable name after "ask".`,
        why: `EasyCode needs to know where to store the answer, like: ask name with "What is your name?"`,
        fix: `Add a variable name: ask userName with "..."`,
        snippet: formatErrorSnippet(this.source, nameToken.line, nameToken.column, nameToken.length || 1),
      };
      this.errors.push(err);
      this.consumeLine();
      return null;
    }

    this.advance(); // consume identifier
    const varName = nameToken.value;

    if (!this.match("WITH")) {
      const tok = this.peek();
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Expected "with" after variable name in "ask".`,
        why: `Use "with" followed by the prompt question, like: ask ${varName} with "Enter your age:"`,
        fix: `Add 'with "..."' after ${varName}.`,
        suggestedLine: `ask ${varName} with "Please enter a value: "`,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
      };
      this.errors.push(err);
    }

    let promptText = "Please enter input:";
    const promptTok = this.peek();
    if (promptTok.type === "STRING") {
      promptText = promptTok.value;
      this.advance();
    } else {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: promptTok.line,
        column: promptTok.column,
        length: promptTok.length || 1,
        message: `Expected a text prompt in quotes after "with".`,
        why: `The prompt message tells the user what to enter, e.g. "What is your name?"`,
        fix: `Add quotes around your prompt message.`,
        suggestedLine: `ask ${varName} with "Enter a value: "`,
        snippet: formatErrorSnippet(this.source, promptTok.line, promptTok.column, promptTok.length || 1),
      };
      this.errors.push(err);
    }

    this.consumeOptionalSemicolonOrNewline();

    return {
      type: "AskStatement",
      target: varName,
      prompt: promptText,
      line: askToken.line,
      column: askToken.column,
      length: askToken.length,
    };
  }

  private parseIfStatement(): IfStatementNode | null {
    const ifToken = this.advance(); // consume "if"
    const condition = this.parseExpression();
    this.match("COLON"); // optional colon

    const branches: IfBranch[] = [];
    const ifBody = this.parseBlock("if statement", ifToken.line);
    branches.push({
      condition,
      body: ifBody,
      location: { line: ifToken.line, column: ifToken.column, length: ifToken.length },
    });

    let otherwiseBody: StatementNode[] | undefined;

    // Check for "otherwise if" or "otherwise"
    while (this.peek().type === "OTHERWISE") {
      const otherwiseTok = this.advance(); // consume "otherwise"
      if (this.match("IF")) {
        const branchCond = this.parseExpression();
        this.match("COLON");
        const branchBody = this.parseBlock("otherwise if statement", otherwiseTok.line);
        branches.push({
          condition: branchCond,
          body: branchBody,
          location: { line: otherwiseTok.line, column: otherwiseTok.column, length: otherwiseTok.length },
        });
      } else {
        this.match("COLON");
        otherwiseBody = this.parseBlock("otherwise statement", otherwiseTok.line);
        break; // final otherwise block
      }
    }

    return {
      type: "IfStatement",
      branches,
      otherwiseBody,
      line: ifToken.line,
      column: ifToken.column,
      length: ifToken.length,
    };
  }

  private parseRepeatStatement(): RepeatStatementNode | null {
    const repeatToken = this.advance(); // consume "repeat"
    const countExpr = this.parseExpression();

    // Check if user forgot "times"
    if (!this.match("TIMES")) {
      const tok = this.peek();
      const lineStr = this.getLine(repeatToken.line);
      // Generate suggestedLine inserting "times"
      let suggested = lineStr;
      if (suggested.includes(":")) {
        suggested = suggested.replace(":", " times:");
      } else {
        suggested = suggested + " times";
      }

      const err: EasyCodeError = {
        type: "MISSING_TIMES_AFTER_REPEAT",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Missing the word "times" after repeat count.`,
        why: `In EasyCode, repeat loops need the word "times" after the number to know how many times to run.`,
        fix: `Add "times" after the number: ${suggested}`,
        suggestedLine: suggested,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
        pythonEquivalent: {
          code: `repeat 5:`,
          rawError: `SyntaxError: invalid syntax`,
          explanation: `Python doesn't have a repeat statement; you use 'for _ in range(5):'. In EasyCode, we write 'repeat 5 times:'.`,
        },
      };
      this.errors.push(err);
    }

    this.match("COLON"); // optional colon
    const body = this.parseBlock("repeat loop", repeatToken.line);

    return {
      type: "RepeatStatement",
      count: countExpr,
      body,
      line: repeatToken.line,
      column: repeatToken.column,
      length: repeatToken.length,
    };
  }

  private parseWhileStatement(): WhileStatementNode | null {
    const whileToken = this.advance(); // consume "while"
    const condition = this.parseExpression();
    this.match("COLON"); // optional colon
    const body = this.parseBlock("while loop", whileToken.line);

    return {
      type: "WhileStatement",
      condition,
      body,
      line: whileToken.line,
      column: whileToken.column,
      length: whileToken.length,
    };
  }

  private parseForEachStatement(): ForEachStatementNode | null {
    const forToken = this.advance(); // consume "for"
    if (!this.match("EACH")) {
      const tok = this.peek();
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Expected "each" after "for".`,
        why: `In EasyCode, iterating through a list is written as: for each item in myList:`,
        fix: `Add "each" after "for": for each item in myList:`,
        suggestedLine: `for each item in myList:`,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
      };
      this.errors.push(err);
    }

    const itemTok = this.peek();
    if (itemTok.type !== "IDENTIFIER") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: itemTok.line,
        column: itemTok.column,
        length: itemTok.length || 1,
        message: `Expected variable name after "for each".`,
        why: `Name the variable for each item, like: for each number in numbers:`,
        fix: `Add a variable name: for each x in ...`,
        snippet: formatErrorSnippet(this.source, itemTok.line, itemTok.column, itemTok.length || 1),
      };
      this.errors.push(err);
    }
    this.advance();
    const itemVar = itemTok.value;

    if (!this.match("IN")) {
      const tok = this.peek();
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Expected "in" after variable name "${itemVar}".`,
        why: `Use "in" followed by your list, like: for each ${itemVar} in items:`,
        fix: `Add "in": for each ${itemVar} in items:`,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
      };
      this.errors.push(err);
    }

    const listExpr = this.parseExpression();
    this.match("COLON"); // optional colon
    const body = this.parseBlock("for each loop", forToken.line);

    return {
      type: "ForEachStatement",
      itemVar,
      list: listExpr,
      body,
      line: forToken.line,
      column: forToken.column,
      length: forToken.length,
    };
  }

  private parseDefineStatement(): DefineStatementNode | null {
    const defineToken = this.advance(); // consume "define"
    const nameToken = this.peek();

    if (nameToken.type !== "IDENTIFIER") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: nameToken.line,
        column: nameToken.column,
        length: nameToken.length || 1,
        message: `Expected function name after "define".`,
        why: `Give your new function a name, like: define greet with name:`,
        fix: `Add a function name: define myFunction:`,
        snippet: formatErrorSnippet(this.source, nameToken.line, nameToken.column, nameToken.length || 1),
      };
      this.errors.push(err);
      this.consumeLine();
      return null;
    }

    this.advance(); // consume name
    const funcName = nameToken.value;
    const params: string[] = [];

    // Optional parameters: with param1, param2
    if (this.match("WITH")) {
      while (!this.isAtEnd()) {
        const pTok = this.peek();
        if (pTok.type === "IDENTIFIER") {
          params.push(pTok.value);
          this.advance();
        } else {
          break;
        }

        if (this.match("COMMA")) {
          continue;
        }
        break;
      }
    }

    this.match("COLON"); // optional colon
    const body = this.parseBlock(`function "${funcName}"`, defineToken.line);

    return {
      type: "DefineStatement",
      name: funcName,
      params,
      body,
      line: defineToken.line,
      column: defineToken.column,
      length: defineToken.length,
    };
  }

  private parseCallStatement(): CallStatementNode | null {
    const callToken = this.advance(); // consume "call"
    const nameToken = this.peek();

    if (nameToken.type !== "IDENTIFIER") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: nameToken.line,
        column: nameToken.column,
        length: nameToken.length || 1,
        message: `Expected function name after "call".`,
        why: `Tell EasyCode which function to call, like: call greet with "Sam"`,
        fix: `Add function name: call myFunction`,
        snippet: formatErrorSnippet(this.source, nameToken.line, nameToken.column, nameToken.length || 1),
      };
      this.errors.push(err);
      this.consumeLine();
      return null;
    }

    this.advance(); // consume name
    const callee = nameToken.value;
    const args: ExpressionNode[] = [];

    if (this.match("WITH")) {
      while (!this.isAtEnd()) {
        const arg = this.parseExpression();
        args.push(arg);
        if (this.match("COMMA")) {
          continue;
        }
        break;
      }
    }

    this.consumeOptionalSemicolonOrNewline();

    return {
      type: "CallStatement",
      callee,
      args,
      line: callToken.line,
      column: callToken.column,
      length: callToken.length,
    };
  }

  private parseGiveBackStatement(): GiveBackStatementNode {
    const giveToken = this.advance(); // consume "give"
    if (!this.match("BACK")) {
      const tok = this.peek();
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Expected "back" after "give".`,
        why: `Returning a value from a function is written as "give back <value>".`,
        fix: `Add "back": give back result`,
        suggestedLine: `give back `,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
      };
      this.errors.push(err);
    }

    let val: ExpressionNode | undefined;
    if (!this.check("NEWLINE") && !this.check("EOF") && !this.check("DEDENT")) {
      val = this.parseExpression();
    }
    this.consumeOptionalSemicolonOrNewline();

    return {
      type: "GiveBackStatement",
      value: val,
      line: giveToken.line,
      column: giveToken.column,
      length: giveToken.length,
    };
  }

  private parseAddStatement(): AddStatementNode | null {
    const addToken = this.advance(); // consume "add"
    const item = this.parseExpression();

    if (!this.match("TO")) {
      const tok = this.peek();
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Expected "to" after item to add.`,
        why: `Adding to a list is written as: add <item> to <listName>.`,
        fix: `Add "to <listName>": add 5 to myList`,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
      };
      this.errors.push(err);
    }

    const listTok = this.peek();
    if (listTok.type !== "IDENTIFIER") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: listTok.line,
        column: listTok.column,
        length: listTok.length || 1,
        message: `Expected list name after "to".`,
        why: `Specify which list to add to, like: add "apple" to groceryList`,
        fix: `Add the list name: add ... to myList`,
        snippet: formatErrorSnippet(this.source, listTok.line, listTok.column, listTok.length || 1),
      };
      this.errors.push(err);
      this.consumeLine();
      return null;
    }
    this.advance();
    this.consumeOptionalSemicolonOrNewline();

    return {
      type: "AddStatement",
      item,
      listVar: listTok.value,
      line: addToken.line,
      column: addToken.column,
      length: addToken.length,
    };
  }

  private parseRemoveStatement(): RemoveStatementNode | null {
    const removeToken = this.advance(); // consume "remove"
    const item = this.parseExpression();

    if (!this.match("FROM")) {
      const tok = this.peek();
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Expected "from" after item to remove.`,
        why: `Removing from a list is written as: remove <item> from <listName>.`,
        fix: `Add "from <listName>": remove "banana" from fruits`,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
      };
      this.errors.push(err);
    }

    const listTok = this.peek();
    if (listTok.type !== "IDENTIFIER") {
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: listTok.line,
        column: listTok.column,
        length: listTok.length || 1,
        message: `Expected list name after "from".`,
        why: `Specify which list to remove from, like: remove "apple" from groceryList`,
        fix: `Add the list name: remove ... from myList`,
        snippet: formatErrorSnippet(this.source, listTok.line, listTok.column, listTok.length || 1),
      };
      this.errors.push(err);
      this.consumeLine();
      return null;
    }
    this.advance();
    this.consumeOptionalSemicolonOrNewline();

    return {
      type: "RemoveStatement",
      item,
      listVar: listTok.value,
      line: removeToken.line,
      column: removeToken.column,
      length: removeToken.length,
    };
  }

  // --- Indented Block Parsing ---

  private parseBlock(headerDesc: string, headerLine?: number): StatementNode[] {
    const stmts: StatementNode[] = [];
    this.skipNewlines();

    const tok = this.peek();
    const hLine = headerLine ?? (tok.line - 1);

    // If at EOF
    if (this.isAtEnd()) {
      const prevTok = this.previous();
      const err: EasyCodeError = {
        type: "EMPTY_BLOCK",
        line: prevTok.line,
        column: prevTok.column,
        length: 1,
        message: `This block is empty.`,
        why: `You created a block for ${headerDesc}, but haven't placed any commands inside it yet.`,
        fix: `Add at least one command inside the block, or write "pass" to do nothing for now.`,
        suggestedLine: `    pass`,
        snippet: formatErrorSnippet(this.source, prevTok.line, prevTok.column, 1),
        pythonEquivalent: {
          code: `# empty block`,
          rawError: `IndentationError: expected an indented block`,
          explanation: `In Python, an empty block produces an IndentationError unless you include 'pass'.`,
        },
      };
      this.errors.push(err);
      return stmts;
    }

    // Check if INDENT is missing!
    if (tok.type !== "INDENT") {
      // If there was an empty/whitespace line between header and tok, it's an empty block!
      if (tok.line > hLine + 1) {
        const err: EasyCodeError = {
          type: "EMPTY_BLOCK",
          line: hLine,
          column: 1,
          length: 1,
          message: `This block is empty.`,
          why: `You created a block for ${headerDesc}, but haven't placed any commands inside it yet.`,
          fix: `Add at least one command inside the block, or write "pass" to do nothing for now.`,
          suggestedLine: `    pass`,
          snippet: formatErrorSnippet(this.source, hLine, 1, 1),
          pythonEquivalent: {
            code: `# empty block`,
            rawError: `IndentationError: expected an indented block`,
            explanation: `In Python, an empty block produces an IndentationError unless you include 'pass'.`,
          },
        };
        this.errors.push(err);
        return stmts;
      }

      const lineStr = this.getLine(tok.line);
      const suggestedLine = "    " + lineStr.trimStart();
      const err: EasyCodeError = {
        type: "INDENTATION_ERROR",
        line: tok.line,
        column: tok.column,
        length: tok.length || 1,
        message: `Missing indentation after ${headerDesc}.`,
        why: `The code inside this block needs to be indented (spaced in) so EasyCode knows it belongs inside the ${headerDesc}.`,
        fix: `Indent this line with 2 or 4 spaces: "${suggestedLine.trimEnd()}"`,
        suggestedLine,
        snippet: formatErrorSnippet(this.source, tok.line, tok.column, tok.length || 1),
        pythonEquivalent: {
          code: lineStr,
          rawError: `IndentationError: expected an indented block after '${headerDesc.split(" ")[0]}' statement on line ${tok.line - 1}`,
          explanation: `Python requires an indented block immediately following header statements like if, for, while, and def.`,
        },
      };
      this.errors.push(err);
      return stmts;
    }

    this.advance(); // consume INDENT

    // Check for empty block: immediate DEDENT or EOF
    this.skipNewlines();
    if (this.peek().type === "DEDENT" || this.isAtEnd()) {
      const prevTok = this.previous();
      const err: EasyCodeError = {
        type: "EMPTY_BLOCK",
        line: prevTok.line,
        column: prevTok.column,
        length: 1,
        message: `This block is empty.`,
        why: `You created a block for ${headerDesc}, but haven't placed any commands inside it yet.`,
        fix: `Add at least one command inside the block, or write "pass" to do nothing for now.`,
        suggestedLine: `    pass`,
        snippet: formatErrorSnippet(this.source, prevTok.line, prevTok.column, 1),
        pythonEquivalent: {
          code: `# empty block`,
          rawError: `IndentationError: expected an indented block`,
          explanation: `In Python, an empty block produces an IndentationError unless you include 'pass'.`,
        },
      };
      this.errors.push(err);
      if (this.peek().type === "DEDENT") this.advance();
      return stmts;
    }

    while (!this.check("DEDENT") && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check("DEDENT") || this.isAtEnd()) break;

      const stmt = this.parseStatement();
      if (stmt) {
        stmts.push(stmt);
      } else {
        this.synchronize();
      }
    }

    if (this.check("DEDENT")) {
      this.advance(); // consume DEDENT
    }

    return stmts;
  }

  // --- Expression Parsers ---

  public parseExpression(): ExpressionNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ExpressionNode {
    let expr = this.parseLogicalAnd();

    while (this.match("OR")) {
      const opTok = this.previous();
      const right = this.parseLogicalAnd();
      expr = {
        type: "BinaryExpr",
        operator: "or",
        left: expr,
        right,
        line: opTok.line,
        column: opTok.column,
        length: opTok.length,
      };
    }
    return expr;
  }

  private parseLogicalAnd(): ExpressionNode {
    let expr = this.parseLogicalNot();

    while (this.match("AND")) {
      const opTok = this.previous();
      const right = this.parseLogicalNot();
      expr = {
        type: "BinaryExpr",
        operator: "and",
        left: expr,
        right,
        line: opTok.line,
        column: opTok.column,
        length: opTok.length,
      };
    }
    return expr;
  }

  private parseLogicalNot(): ExpressionNode {
    if (this.match("NOT")) {
      const notTok = this.previous();
      const operand = this.parseComparison();
      return {
        type: "UnaryExpr",
        operator: "not",
        operand,
        line: notTok.line,
        column: notTok.column,
        length: notTok.length,
      };
    }
    return this.parseComparison();
  }

  private parseComparison(): ExpressionNode {
    const left = this.parseAdditive();

    // Check for "EQUALS" (= or ==) inside expressions, e.g. "if x = 5"
    if (this.peek().type === "EQUALS") {
      const eqTok = this.advance();
      const lineStr = this.getLine(eqTok.line);
      const suggestedLine = lineStr.replace(/==?/, "is");
      const err: EasyCodeError = {
        type: "EQUALS_INSTEAD_OF_TO_OR_IS",
        line: eqTok.line,
        column: eqTok.column,
        length: eqTok.length,
        message: `Use "is" instead of "=" to compare values.`,
        why: `In EasyCode, "=" is not used. We compare things using "is", like: if x is 5:`,
        fix: `Replace "${eqTok.value}" with "is": ${suggestedLine.trim()}`,
        suggestedLine,
        snippet: formatErrorSnippet(this.source, eqTok.line, eqTok.column, eqTok.length),
        pythonEquivalent: {
          code: lineStr,
          rawError: eqTok.value === "=" ? `SyntaxError: invalid syntax. Maybe you meant '==' or ':='?` : ``,
          explanation: `Python uses '==' for comparison and '=' for assignment. EasyCode uses 'is' for clear readability.`,
        },
      };
      this.errors.push(err);
      const right = this.parseAdditive();
      return {
        type: "BinaryExpr",
        operator: "is",
        left,
        right,
        line: eqTok.line,
        column: eqTok.column,
        length: eqTok.length,
      };
    }

    // Check for "is" or "is not" or "is greater than", etc.
    if (this.match("IS")) {
      const isTok = this.previous();
      let operator: BinaryOperator = "is";

      if (this.match("NOT")) {
        operator = "is not";
      } else if (this.match("GREATER")) {
        this.consume("THAN", 'Expected "than" after "greater".');
        operator = "is greater than";
      } else if (this.match("LESS")) {
        this.consume("THAN", 'Expected "than" after "less".');
        operator = "is less than";
      } else if (this.match("AT")) {
        if (this.match("LEAST")) {
          operator = "is at least";
        } else if (this.match("MOST")) {
          operator = "is at most";
        } else {
          this.reportGenericError(this.peek(), 'Expected "least" or "most" after "at".');
        }
      }

      const right = this.parseAdditive();
      return {
        type: "BinaryExpr",
        operator,
        left,
        right,
        line: isTok.line,
        column: isTok.column,
        length: isTok.length,
      };
    }

    return left;
  }

  private parseAdditive(): ExpressionNode {
    let expr = this.parseMultiplicative();

    while (this.check("PLUS") || this.check("MINUS")) {
      const opTok = this.advance();
      const operator: BinaryOperator = opTok.type === "PLUS" ? "+" : "-";
      const right = this.parseMultiplicative();
      expr = {
        type: "BinaryExpr",
        operator,
        left: expr,
        right,
        line: opTok.line,
        column: opTok.column,
        length: opTok.length,
      };
    }

    return expr;
  }

  private parseMultiplicative(): ExpressionNode {
    let expr = this.parseRemainderExpr();

    while (this.check("MULTIPLY") || this.check("DIVIDE")) {
      const opTok = this.advance();
      const operator: BinaryOperator = opTok.type === "MULTIPLY" ? "*" : "/";
      const right = this.parseRemainderExpr();
      expr = {
        type: "BinaryExpr",
        operator,
        left: expr,
        right,
        line: opTok.line,
        column: opTok.column,
        length: opTok.length,
      };
    }

    return expr;
  }

  private parseRemainderExpr(): ExpressionNode {
    if (this.match("REMAINDER")) {
      const remTok = this.previous();
      this.consume("OF", 'Expected "of" after "remainder".');
      const left = this.parsePrimary();
      this.consume("DIVIDED", 'Expected "divided" in remainder expression.');
      this.consume("BY", 'Expected "by" after "divided".');
      const right = this.parsePrimary();

      return {
        type: "BinaryExpr",
        operator: "remainder",
        left,
        right,
        line: remTok.line,
        column: remTok.column,
        length: remTok.length,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    const token = this.peek();

    // Number literal
    if (token.type === "NUMBER") {
      this.advance();
      return {
        type: "NumberLiteral",
        value: Number(token.value),
        raw: token.value,
        line: token.line,
        column: token.column,
        length: token.length,
      };
    }

    // String literal
    if (token.type === "STRING") {
      this.advance();
      return {
        type: "StringLiteral",
        value: token.value,
        line: token.line,
        column: token.column,
        length: token.length,
      };
    }

    // Boolean literal
    if (token.type === "BOOLEAN") {
      this.advance();
      return {
        type: "BooleanLiteral",
        value: token.value === "true",
        line: token.line,
        column: token.column,
        length: token.length,
      };
    }

    // List literal: [ ... ]
    if (this.match("LBRACKET")) {
      const lbracket = this.previous();
      const elements: ExpressionNode[] = [];
      if (!this.check("RBRACKET")) {
        do {
          this.skipNewlines();
          if (this.check("RBRACKET")) break;
          elements.push(this.parseExpression());
        } while (this.match("COMMA"));
      }

      if (!this.match("RBRACKET")) {
        const err: EasyCodeError = {
          type: "UNBALANCED_DELIMITER",
          line: lbracket.line,
          column: lbracket.column,
          length: 1,
          message: `Expected "]" to close list.`,
          why: `Lists in EasyCode start with "[" and end with "]".`,
          fix: `Add "]" at the end of the list: [${elements.map(() => "...").join(", ")}]`,
          snippet: formatErrorSnippet(this.source, lbracket.line, lbracket.column, 1),
        };
        this.errors.push(err);
      }

      return {
        type: "ListLiteral",
        elements,
        line: lbracket.line,
        column: lbracket.column,
        length: lbracket.length,
      };
    }

    // Parenthesized grouping: ( expr )
    if (this.match("LPAREN")) {
      const lparen = this.previous();
      const expr = this.parseExpression();
      if (!this.match("RPAREN")) {
        const err: EasyCodeError = {
          type: "UNBALANCED_DELIMITER",
          line: lparen.line,
          column: lparen.column,
          length: 1,
          message: `Expected ")" to close parenthesis.`,
          why: `Every opening "(" must have a matching closing ")".`,
          fix: `Add ")" to close the expression.`,
          snippet: formatErrorSnippet(this.source, lparen.line, lparen.column, 1),
        };
        this.errors.push(err);
      }
      return expr;
    }

    // Call as expression: call func with arg1, arg2
    if (this.match("CALL")) {
      const callTok = this.previous();
      const nameTok = this.peek();
      if (nameTok.type !== "IDENTIFIER") {
        this.reportGenericError(nameTok, `Expected function name after "call".`);
      }
      this.advance();
      const callee = nameTok.value;
      const args: ExpressionNode[] = [];
      if (this.match("WITH")) {
        while (!this.isAtEnd()) {
          args.push(this.parseExpression());
          if (this.match("COMMA")) continue;
          break;
        }
      }
      return {
        type: "CallExpr",
        callee,
        args,
        line: callTok.line,
        column: callTok.column,
        length: callTok.length,
      };
    }

    // Identifier, standard call syntax foo(), or index access items[0]
    if (token.type === "IDENTIFIER") {
      this.advance();
      const idName = token.value;

      // Check standard function call syntax: id(args)
      if (this.match("LPAREN")) {
        const lparen = this.previous();
        const args: ExpressionNode[] = [];
        if (!this.check("RPAREN")) {
          do {
            args.push(this.parseExpression());
          } while (this.match("COMMA"));
        }
        if (!this.match("RPAREN")) {
          const err: EasyCodeError = {
            type: "UNBALANCED_DELIMITER",
            line: lparen.line,
            column: lparen.column,
            length: 1,
            message: `Expected ")" to close function call arguments.`,
            why: `Function arguments inside parentheses must end with ")".`,
            fix: `Add ")" to complete ${idName}(...).`,
            snippet: formatErrorSnippet(this.source, lparen.line, lparen.column, 1),
          };
          this.errors.push(err);
        }
        return {
          type: "CallExpr",
          callee: idName,
          args,
          line: token.line,
          column: token.column,
          length: token.length,
        };
      }

      // Check indexing: items[0]
      if (this.match("LBRACKET")) {
        const lbracket = this.previous();
        const indexExpr = this.parseExpression();
        if (!this.match("RBRACKET")) {
          const err: EasyCodeError = {
            type: "UNBALANCED_DELIMITER",
            line: lbracket.line,
            column: lbracket.column,
            length: 1,
            message: `Expected "]" to close list index.`,
            why: `List indexes start with "[" and must end with "]".`,
            fix: `Add "]" after your index: ${idName}[...]`,
            snippet: formatErrorSnippet(this.source, lbracket.line, lbracket.column, 1),
          };
          this.errors.push(err);
        }
        return {
          type: "IndexAccessExpr",
          target: {
            type: "Identifier",
            name: idName,
            line: token.line,
            column: token.column,
            length: token.length,
          },
          index: indexExpr,
          line: token.line,
          column: token.column,
          length: token.length,
        };
      }

      return {
        type: "Identifier",
        name: idName,
        line: token.line,
        column: token.column,
        length: token.length,
      };
    }

    // Unary minus for negative numbers: -5
    if (this.match("MINUS")) {
      const minTok = this.previous();
      const operand = this.parsePrimary();
      return {
        type: "UnaryExpr",
        operator: "-",
        operand,
        line: minTok.line,
        column: minTok.column,
        length: minTok.length,
      };
    }

    // Fallback error
    const errTok = this.advance();
    const fallbackErr: EasyCodeError = {
      type: "GENERIC_SYNTAX_ERROR",
      line: errTok.line,
      column: errTok.column,
      length: errTok.length || 1,
      message: `Unexpected token "${errTok.value}".`,
      why: `EasyCode was expecting an expression (a number, text, variable, or list) here.`,
      fix: `Check your expression syntax.`,
      snippet: formatErrorSnippet(this.source, errTok.line, errTok.column, errTok.length || 1),
    };
    this.errors.push(fallbackErr);
    return {
      type: "NumberLiteral",
      value: 0,
      raw: "0",
      line: errTok.line,
      column: errTok.column,
      length: 1,
    };
  }

  // --- Helper Methods ---

  private checkMisspelledKeyword(token: Token): boolean {
    const rawVal = token.value;
    const lower = rawVal.toLowerCase();

    // Direct typo dictionary check
    if (COMMON_KEYWORD_TYPOS[lower]) {
      const targetKw = COMMON_KEYWORD_TYPOS[lower];
      const lineStr = this.getLine(token.line);
      const regex = new RegExp(`\\b${rawVal}\\b`);
      const suggestedLine = lineStr.replace(regex, targetKw);

      let whyMsg = `In EasyCode, "${targetKw}" is used for this action.`;
      if (lower === "prnt" || lower === "print" || lower === "echo") {
        whyMsg = `In EasyCode, we use "say" instead of "${rawVal}" to display messages!`;
      } else if (lower === "var" || lower === "let" || lower === "const") {
        whyMsg = `In EasyCode, we create variables with "set <name> to <value>" instead of "${rawVal}".`;
      }

      const err: EasyCodeError = {
        type: "MISSPELLED_KEYWORD",
        line: token.line,
        column: token.column,
        length: token.length,
        message: `I don't recognize the command "${rawVal}".`,
        why: whyMsg,
        didYouMean: `Did you mean "${targetKw}"?`,
        fix: `Replace "${rawVal}" with "${targetKw}".`,
        suggestedLine,
        snippet: formatErrorSnippet(this.source, token.line, token.column, token.length),
        pythonEquivalent: {
          code: lineStr,
          rawError: `NameError: name '${rawVal}' is not defined`,
          explanation: `Python treats unrecognized keywords as variable or function names and throws NameError.`,
        },
      };
      this.errors.push(err);
      return true;
    }

    // Distance match across known statement keywords
    const bestMatch = findBestMatch(lower, STATEMENT_START_KEYWORDS, 2);
    if (bestMatch && bestMatch !== lower) {
      const lineStr = this.getLine(token.line);
      const regex = new RegExp(`\\b${rawVal}\\b`);
      const suggestedLine = lineStr.replace(regex, bestMatch);

      const err: EasyCodeError = {
        type: "MISSPELLED_KEYWORD",
        line: token.line,
        column: token.column,
        length: token.length,
        message: `I don't recognize the command "${rawVal}".`,
        why: `EasyCode uses plain English commands like "say", "set", "if", "repeat", etc.`,
        didYouMean: `Did you mean "${bestMatch}"?`,
        fix: `Replace "${rawVal}" with "${bestMatch}".`,
        suggestedLine,
        snippet: formatErrorSnippet(this.source, token.line, token.column, token.length),
        pythonEquivalent: {
          code: lineStr,
          rawError: `NameError: name '${rawVal}' is not defined`,
          explanation: `Python raises NameError when encountering a misspelled keyword.`,
        },
      };
      this.errors.push(err);
      return true;
    }

    return false;
  }

  private reportOrphanOtherwise(token: Token): void {
    const lineStr = this.getLine(token.line);
    const err: EasyCodeError = {
      type: "ORPHAN_OTHERWISE",
      line: token.line,
      column: token.column,
      length: token.length,
      message: `Found "otherwise" without an "if".`,
      why: `An "otherwise" block tells EasyCode what to do when an "if" condition is false. It cannot stand alone without an "if" statement above it.`,
      fix: `Make sure an "if <condition>:" statement comes before this line.`,
      suggestedLine: `if condition:\n    # code\n${lineStr}`,
      snippet: formatErrorSnippet(this.source, token.line, token.column, token.length),
      pythonEquivalent: {
        code: lineStr,
        rawError: `SyntaxError: invalid syntax`,
        explanation: `In Python, having 'else' or 'elif' without an enclosing 'if' raises a SyntaxError.`,
      },
    };
    this.errors.push(err);
  }

  private reportGenericError(token: Token, message: string): void {
    const err: EasyCodeError = {
      type: "GENERIC_SYNTAX_ERROR",
      line: token.line,
      column: token.column,
      length: token.length || 1,
      message,
      why: `EasyCode encountered something unexpected here.`,
      fix: `Check the syntax of this line.`,
      snippet: formatErrorSnippet(this.source, token.line, token.column, token.length || 1),
    };
    this.errors.push(err);
  }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, errMsg: string): Token {
    if (this.check(type)) return this.advance();
    const tok = this.peek();
    this.reportGenericError(tok, errMsg);
    return tok;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return type === "EOF";
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.current] || {
      type: "EOF",
      value: "",
      line: 1,
      column: 1,
      length: 0,
    };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private skipNewlines(): void {
    while (this.check("NEWLINE")) {
      this.advance();
    }
  }

  private consumeOptionalSemicolonOrNewline(): void {
    while (this.check("NEWLINE")) {
      this.advance();
    }
  }

  private consumeLine(): void {
    while (!this.check("NEWLINE") && !this.isAtEnd()) {
      this.advance();
    }
    if (this.check("NEWLINE")) {
      this.advance();
    }
  }

  private synchronize(): void {
    const prev = this.current;
    this.consumeLine();
    if (this.current === prev && !this.isAtEnd()) {
      this.advance();
    }
  }

  private getLine(lineNum: number): string {
    const lines = this.source.split(/\r?\n/);
    return lines[lineNum - 1] || "";
  }
}

export function parseSource(source: string, tokens: Token[], lexerErrors: EasyCodeError[]): { program: ProgramNode; errors: EasyCodeError[] } {
  const parser = new Parser(tokens, source, lexerErrors);
  return parser.parse();
}
