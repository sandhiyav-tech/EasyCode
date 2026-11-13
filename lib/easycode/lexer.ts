// EasyCode Hand-Written Lexer
import { Token, TokenType } from "./ast";
import { EasyCodeError, formatErrorSnippet } from "./errors";

export class LexerError extends Error {
  public easyCodeError: EasyCodeError;

  constructor(easyCodeError: EasyCodeError) {
    super(easyCodeError.message);
    this.name = "LexerError";
    this.easyCodeError = easyCodeError;
  }
}

const KEYWORDS: Record<string, TokenType> = {
  set: "SET",
  to: "TO",
  say: "SAY",
  ask: "ASK",
  with: "WITH",
  if: "IF",
  otherwise: "OTHERWISE",
  repeat: "REPEAT",
  times: "TIMES",
  while: "WHILE",
  for: "FOR",
  each: "EACH",
  in: "IN",
  define: "DEFINE",
  call: "CALL",
  give: "GIVE",
  back: "BACK",
  add: "ADD",
  remove: "REMOVE",
  from: "FROM",
  pass: "PASS",
  is: "IS",
  not: "NOT",
  greater: "GREATER",
  less: "LESS",
  than: "THAN",
  at: "AT",
  least: "LEAST",
  most: "MOST",
  and: "AND",
  or: "OR",
  remainder: "REMAINDER",
  of: "OF",
  divided: "DIVIDED",
  by: "BY",
  true: "BOOLEAN",
  false: "BOOLEAN",
};

interface DelimiterStackItem {
  char: string;
  line: number;
  column: number;
}

export function tokenize(source: string): { tokens: Token[]; errors: EasyCodeError[] } {
  const tokens: Token[] = [];
  const errors: EasyCodeError[] = [];
  const lines = source.split(/\r?\n/);
  const indentStack: number[] = [0];
  const delimiterStack: DelimiterStackItem[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const lineNum = lineIdx + 1;

    // Determine leading indentation
    let colIdx = 0;
    let indentLevel = 0;

    while (colIdx < rawLine.length) {
      const ch = rawLine[colIdx];
      if (ch === " ") {
        indentLevel += 1;
        colIdx++;
      } else if (ch === "\t") {
        indentLevel += 4; // Normalize tab to 4 spaces
        colIdx++;
      } else {
        break;
      }
    }

    // Check if the rest of line is empty or comment
    const lineAfterIndent = rawLine.slice(colIdx).trim();
    if (lineAfterIndent.length === 0 || lineAfterIndent.startsWith("#")) {
      // Empty or comment-only line; skip indentation logic
      continue;
    }

    // Check indentation level vs stack
    const currentIndent = indentStack[indentStack.length - 1];

    if (indentLevel > currentIndent) {
      indentStack.push(indentLevel);
      tokens.push({
        type: "INDENT",
        value: " ".repeat(indentLevel - currentIndent),
        line: lineNum,
        column: 1,
        length: indentLevel,
      });
    } else if (indentLevel < currentIndent) {
      // Dedent until matching level is found
      let matched = false;
      while (indentStack.length > 1) {
        if (indentStack[indentStack.length - 1] === indentLevel) {
          matched = true;
          break;
        }
        indentStack.pop();
        tokens.push({
          type: "DEDENT",
          value: "",
          line: lineNum,
          column: 1,
          length: 0,
        });
      }

      if (!matched && indentStack[indentStack.length - 1] !== indentLevel) {
        // Indentation error: inconsistent dedent
        const error: EasyCodeError = {
          type: "INDENTATION_ERROR",
          line: lineNum,
          column: 1,
          length: indentLevel || 1,
          message: `Unindent does not match any outer indentation level.`,
          why: `This line has ${indentLevel} spaces of indentation, but outer blocks use ${indentStack.join(", ")} spaces.`,
          fix: `Align this line with ${indentStack[indentStack.length - 1]} spaces.`,
          suggestedLine: " ".repeat(indentStack[indentStack.length - 1]) + rawLine.trimStart(),
          snippet: formatErrorSnippet(source, lineNum, 1, indentLevel || 1),
          pythonEquivalent: {
            code: rawLine,
            rawError: `IndentationError: unindent does not match any outer indentation level`,
            explanation: `Python raises IndentationError when indentation steps are uneven or mismatched.`,
          },
        };
        errors.push(error);
      }
    }

    // Now tokenize tokens within this line starting at colIdx
    let i = colIdx;
    let lineHadTokens = false;

    while (i < rawLine.length) {
      const ch = rawLine[i];
      const colNum = i + 1;

      // Skip spaces and tabs
      if (ch === " " || ch === "\t") {
        i++;
        continue;
      }

      // Comment to end of line
      if (ch === "#") {
        break;
      }

      // Delimiters
      if (ch === "[") {
        delimiterStack.push({ char: "[", line: lineNum, column: colNum });
        tokens.push({ type: "LBRACKET", value: "[", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === "]") {
        const top = delimiterStack.pop();
        if (!top || top.char !== "[") {
          const err: EasyCodeError = {
            type: "UNBALANCED_DELIMITER",
            line: lineNum,
            column: colNum,
            length: 1,
            message: `Unexpected closing bracket "]".`,
            why: `You have a closing bracket "]" that doesn't match an opening bracket "[".`,
            fix: `Check if you opened the list properly or if this "]" was added by mistake.`,
            suggestedLine: rawLine.slice(0, i) + rawLine.slice(i + 1),
            snippet: formatErrorSnippet(source, lineNum, colNum, 1),
            pythonEquivalent: {
              code: rawLine,
              rawError: `SyntaxError: unmatched ']'`,
              explanation: `Python raises a SyntaxError when closing a delimiter that was never opened.`,
            },
          };
          errors.push(err);
        }
        tokens.push({ type: "RBRACKET", value: "]", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === "(") {
        delimiterStack.push({ char: "(", line: lineNum, column: colNum });
        tokens.push({ type: "LPAREN", value: "(", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === ")") {
        const top = delimiterStack.pop();
        if (!top || top.char !== "(") {
          const err: EasyCodeError = {
            type: "UNBALANCED_DELIMITER",
            line: lineNum,
            column: colNum,
            length: 1,
            message: `Unexpected closing parenthesis ")".`,
            why: `You have a closing parenthesis ")" that doesn't match an opening parenthesis "(".`,
            fix: `Check if you opened with "(" earlier or remove this ")".`,
            suggestedLine: rawLine.slice(0, i) + rawLine.slice(i + 1),
            snippet: formatErrorSnippet(source, lineNum, colNum, 1),
            pythonEquivalent: {
              code: rawLine,
              rawError: `SyntaxError: unmatched ')'`,
              explanation: `Python raises a SyntaxError when closing an unopened parenthesis.`,
            },
          };
          errors.push(err);
        }
        tokens.push({ type: "RPAREN", value: ")", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === ",") {
        tokens.push({ type: "COMMA", value: ",", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === ":") {
        tokens.push({ type: "COLON", value: ":", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === "+") {
        tokens.push({ type: "PLUS", value: "+", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === "-") {
        tokens.push({ type: "MINUS", value: "-", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === "*") {
        tokens.push({ type: "MULTIPLY", value: "*", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }
      if (ch === "/") {
        tokens.push({ type: "DIVIDE", value: "/", line: lineNum, column: colNum, length: 1 });
        lineHadTokens = true;
        i++;
        continue;
      }

      // Check for = or ==
      if (ch === "=") {
        let length = 1;
        if (rawLine[i + 1] === "=") {
          length = 2;
        }
        tokens.push({ type: "EQUALS", value: rawLine.slice(i, i + length), line: lineNum, column: colNum, length });
        lineHadTokens = true;
        i += length;
        continue;
      }

      // String literal: double or single quote
      if (ch === '"' || ch === "'") {
        const quoteChar = ch;
        let strVal = "";
        let strLen = 1;
        let closed = false;
        let j = i + 1;

        while (j < rawLine.length) {
          if (rawLine[j] === "\\") {
            // Escape sequence
            if (j + 1 < rawLine.length) {
              const esc = rawLine[j + 1];
              if (esc === "n") strVal += "\n";
              else if (esc === "t") strVal += "\t";
              else if (esc === quoteChar) strVal += quoteChar;
              else if (esc === "\\") strVal += "\\";
              else strVal += esc;
              j += 2;
              strLen += 2;
              continue;
            }
          }
          if (rawLine[j] === quoteChar) {
            closed = true;
            strLen++;
            j++;
            break;
          }
          strVal += rawLine[j];
          strLen++;
          j++;
        }

        if (!closed) {
          // Unclosed quote!
          const remainingLine = rawLine.slice(i);
          const error: EasyCodeError = {
            type: "UNCLOSED_QUOTE",
            line: lineNum,
            column: colNum,
            length: remainingLine.length,
            message: `I couldn't find the closing quote for your text.`,
            why: `Text in EasyCode starts and ends with quotation marks like "hello". You opened a quote here but didn't close it before the end of the line.`,
            fix: `Add a matching ${quoteChar} at the end, like: ${rawLine}${quoteChar}`,
            suggestedLine: `${rawLine}${quoteChar}`,
            snippet: formatErrorSnippet(source, lineNum, colNum, remainingLine.length),
            pythonEquivalent: {
              code: rawLine,
              rawError: `SyntaxError: unterminated string literal (detected at line ${lineNum})`,
              explanation: `Python will stop compiling immediately with an unterminated string error.`,
            },
          };
          errors.push(error);
          tokens.push({
            type: "STRING",
            value: strVal,
            line: lineNum,
            column: colNum,
            length: strLen,
          });
          lineHadTokens = true;
          i = rawLine.length;
          break;
        }

        tokens.push({
          type: "STRING",
          value: strVal,
          line: lineNum,
          column: colNum,
          length: strLen,
        });
        lineHadTokens = true;
        i = j;
        continue;
      }

      // Number literal
      if (/[0-9]/.test(ch)) {
        let numStr = "";
        let j = i;
        let hasDot = false;
        while (j < rawLine.length) {
          const c = rawLine[j];
          if (/[0-9]/.test(c)) {
            numStr += c;
            j++;
          } else if (c === "." && !hasDot && j + 1 < rawLine.length && /[0-9]/.test(rawLine[j + 1])) {
            hasDot = true;
            numStr += c;
            j++;
          } else {
            break;
          }
        }
        tokens.push({
          type: "NUMBER",
          value: numStr,
          line: lineNum,
          column: colNum,
          length: numStr.length,
        });
        lineHadTokens = true;
        i = j;
        continue;
      }

      // Word (Identifier or Keyword)
      if (/[a-zA-Z_]/.test(ch)) {
        let wordStr = "";
        let j = i;
        while (j < rawLine.length && /[a-zA-Z0-9_]/.test(rawLine[j])) {
          wordStr += rawLine[j];
          j++;
        }

        const lower = wordStr.toLowerCase();
        const kwType = KEYWORDS[lower];

        if (kwType) {
          tokens.push({
            type: kwType,
            value: lower,
            line: lineNum,
            column: colNum,
            length: wordStr.length,
          });
        } else {
          tokens.push({
            type: "IDENTIFIER",
            value: wordStr,
            line: lineNum,
            column: colNum,
            length: wordStr.length,
          });
        }
        lineHadTokens = true;
        i = j;
        continue;
      }

      // If we reach here, unknown character
      const err: EasyCodeError = {
        type: "GENERIC_SYNTAX_ERROR",
        line: lineNum,
        column: colNum,
        length: 1,
        message: `I didn't recognize the character '${ch}'.`,
        why: `EasyCode uses simple English words and symbols (+, -, *, /, [, ], (, )).`,
        fix: `Remove or replace the character '${ch}'.`,
        suggestedLine: rawLine.slice(0, i) + rawLine.slice(i + 1),
        snippet: formatErrorSnippet(source, lineNum, colNum, 1),
      };
      errors.push(err);
      i++;
    }

    if (lineHadTokens) {
      tokens.push({
        type: "NEWLINE",
        value: "\n",
        line: lineNum,
        column: rawLine.length + 1,
        length: 1,
      });
    }
  }

  // Pop remaining indents at EOF
  while (indentStack.length > 1) {
    indentStack.pop();
    const lastLine = lines.length || 1;
    tokens.push({
      type: "DEDENT",
      value: "",
      line: lastLine,
      column: 1,
      length: 0,
    });
  }

  // Check unclosed delimiters from stack
  if (delimiterStack.length > 0) {
    const unclosed = delimiterStack[delimiterStack.length - 1];
    const matchChar = unclosed.char === "[" ? "]" : ")";
    const desc = unclosed.char === "[" ? 'list bracket "["' : 'parenthesis "("';
    const linesArr = source.split(/\r?\n/);
    const targetLine = linesArr[unclosed.line - 1] || "";

    const err: EasyCodeError = {
      type: "UNBALANCED_DELIMITER",
      line: unclosed.line,
      column: unclosed.column,
      length: 1,
      message: `It looks like you forgot to close your ${desc}.`,
      why: `You opened ${unclosed.char} on line ${unclosed.line}, but never closed it before the end of your program.`,
      fix: `Add a closing ${matchChar} to complete it.`,
      suggestedLine: targetLine + matchChar,
      snippet: formatErrorSnippet(source, unclosed.line, unclosed.column, 1),
      pythonEquivalent: {
        code: targetLine,
        rawError: `SyntaxError: unexpected EOF while parsing`,
        explanation: `Python reports an unexpected EOF when an open bracket or parenthesis is left unclosed.`,
      },
    };
    errors.push(err);
  }

  const lastLine = lines.length || 1;
  const lastCol = (lines[lastLine - 1]?.length || 0) + 1;
  tokens.push({
    type: "EOF",
    value: "",
    line: lastLine,
    column: lastCol,
    length: 0,
  });

  return { tokens, errors };
}

