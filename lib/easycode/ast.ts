// EasyCode AST & Core Type Definitions

export type TokenType =
  // Keywords
  | "SET"
  | "TO"
  | "SAY"
  | "ASK"
  | "WITH"
  | "IF"
  | "OTHERWISE"
  | "REPEAT"
  | "TIMES"
  | "WHILE"
  | "FOR"
  | "EACH"
  | "IN"
  | "DEFINE"
  | "CALL"
  | "GIVE"
  | "BACK"
  | "ADD"
  | "REMOVE"
  | "FROM"
  | "PASS"
  // Comparisons & Logic
  | "IS"
  | "NOT"
  | "GREATER"
  | "LESS"
  | "THAN"
  | "AT"
  | "LEAST"
  | "MOST"
  | "AND"
  | "OR"
  // Math & Special phrases
  | "REMAINDER"
  | "OF"
  | "DIVIDED"
  | "BY"
  | "PLUS"
  | "MINUS"
  | "MULTIPLY"
  | "DIVIDE"
  // Literals & Identifiers
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  // Symbols & Delimiters
  | "LBRACKET" // [
  | "RBRACKET" // ]
  | "LPAREN"   // (
  | "RPAREN"   // )
  | "COMMA"    // ,
  | "COLON"    // :
  | "EQUALS"   // = (lexer can catch this for friendly error!)
  // Structure
  | "NEWLINE"
  | "INDENT"
  | "DEDENT"
  | "EOF";

export interface SourceLocation {
  line: number;    // 1-based
  column: number;  // 1-based
  length: number;  // length in characters
  offset?: number;
}

export interface Token extends SourceLocation {
  type: TokenType;
  value: string;
}

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "remainder"
  | "is"
  | "is not"
  | "is greater than"
  | "is less than"
  | "is at least"
  | "is at most"
  | "and"
  | "or";

export type UnaryOperator = "not" | "-";

// Base AST Node
export interface BaseNode extends SourceLocation {
  type: string;
}

// Expression Nodes
export interface NumberLiteralNode extends BaseNode {
  type: "NumberLiteral";
  value: number;
  raw: string;
}

export interface StringLiteralNode extends BaseNode {
  type: "StringLiteral";
  value: string;
}

export interface BooleanLiteralNode extends BaseNode {
  type: "BooleanLiteral";
  value: boolean;
}

export interface ListLiteralNode extends BaseNode {
  type: "ListLiteral";
  elements: ExpressionNode[];
}

export interface IdentifierNode extends BaseNode {
  type: "Identifier";
  name: string;
}

export interface BinaryExprNode extends BaseNode {
  type: "BinaryExpr";
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExprNode extends BaseNode {
  type: "UnaryExpr";
  operator: UnaryOperator;
  operand: ExpressionNode;
}

export interface CallExprNode extends BaseNode {
  type: "CallExpr";
  callee: string;
  args: ExpressionNode[];
}

export interface IndexAccessExprNode extends BaseNode {
  type: "IndexAccessExpr";
  target: ExpressionNode;
  index: ExpressionNode;
}

export type ExpressionNode =
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | ListLiteralNode
  | IdentifierNode
  | BinaryExprNode
  | UnaryExprNode
  | CallExprNode
  | IndexAccessExprNode;

// Statement Nodes
export interface SetStatementNode extends BaseNode {
  type: "SetStatement";
  target: string;
  index?: ExpressionNode;
  value: ExpressionNode;
}

export interface SayStatementNode extends BaseNode {
  type: "SayStatement";
  expression: ExpressionNode;
}

export interface AskStatementNode extends BaseNode {
  type: "AskStatement";
  target: string;
  prompt: string;
}

export interface IfBranch {
  condition: ExpressionNode;
  body: StatementNode[];
  location: SourceLocation;
}

export interface IfStatementNode extends BaseNode {
  type: "IfStatement";
  branches: IfBranch[];
  otherwiseBody?: StatementNode[];
}

export interface RepeatStatementNode extends BaseNode {
  type: "RepeatStatement";
  count: ExpressionNode;
  body: StatementNode[];
}

export interface WhileStatementNode extends BaseNode {
  type: "WhileStatement";
  condition: ExpressionNode;
  body: StatementNode[];
}

export interface ForEachStatementNode extends BaseNode {
  type: "ForEachStatement";
  itemVar: string;
  list: ExpressionNode;
  body: StatementNode[];
}

export interface DefineStatementNode extends BaseNode {
  type: "DefineStatement";
  name: string;
  params: string[];
  body: StatementNode[];
}

export interface CallStatementNode extends BaseNode {
  type: "CallStatement";
  callee: string;
  args: ExpressionNode[];
}

export interface GiveBackStatementNode extends BaseNode {
  type: "GiveBackStatement";
  value?: ExpressionNode;
}

export interface AddStatementNode extends BaseNode {
  type: "AddStatement";
  item: ExpressionNode;
  listVar: string;
}

export interface RemoveStatementNode extends BaseNode {
  type: "RemoveStatement";
  item: ExpressionNode;
  listVar: string;
}

export interface PassStatementNode extends BaseNode {
  type: "PassStatement";
}

export type StatementNode =
  | SetStatementNode
  | SayStatementNode
  | AskStatementNode
  | IfStatementNode
  | RepeatStatementNode
  | WhileStatementNode
  | ForEachStatementNode
  | DefineStatementNode
  | CallStatementNode
  | GiveBackStatementNode
  | AddStatementNode
  | RemoveStatementNode
  | PassStatementNode;

export interface ProgramNode extends BaseNode {
  type: "Program";
  body: StatementNode[];
}

// Runtime Values
export type EasyCodeValue =
  | number
  | string
  | boolean
  | EasyCodeValue[]
  | EasyCodeFunction;

export interface EasyCodeFunction {
  __isEasyCodeFunction: true;
  name: string;
  params: string[];
  body: StatementNode[];
  closure: Scope;
}

export interface VariableRecord {
  value: EasyCodeValue;
  definedAtLine: number;
}

export interface Scope {
  parent?: Scope;
  variables: Map<string, VariableRecord>;
  functions: Map<string, EasyCodeFunction>;
}

