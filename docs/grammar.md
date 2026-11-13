# EasyCode Formal Grammar & Specification

## 1. Overview
EasyCode is an indentation-based, beginner-first programming language designed to replace confusing punctuation and cryptic syntax with natural English-like phrasings.

---

## 2. Lexical Structure

### Whitespace & Indentation
- EasyCode uses indentation to define block structures.
- Indentation levels are normalized (typically 2 or 4 spaces).
- Spaces and tabs can be used, but mixing within an indentation column is warned or converted.
- Newlines terminate statements unless within brackets `[...]` or parentheses `(...)`.
- Empty lines and lines containing only comments (`#`) are ignored by the grammar.

### Comments
- Single-line comments start with `#` and extend to the end of the line:
  ```easycode
  # This is a comment
  say "Hello" # This is an inline comment
  ```

### Literals
- **Number**: Integers or floating-point numbers: `42`, `3.14`, `-7`.
- **Text (String)**: Delimited by double quotes `"..."` or single quotes `'...'`. Escape sequences `\n`, `\t`, `\"`, `\\` are supported.
- **Boolean**: `true` or `false`.
- **List**: Comma-separated elements enclosed in brackets: `[1, 2, "three", true]`.

### Identifiers
- Names of variables and functions start with a letter (`a-z`, `A-Z`) or underscore `_`, followed by letters, digits, or underscores.
- Keywords (reserved): `set`, `to`, `say`, `ask`, `with`, `if`, `otherwise`, `repeat`, `times`, `while`, `for`, `each`, `in`, `define`, `call`, `give`, `back`, `add`, `remove`, `from`, `is`, `not`, `greater`, `than`, `less`, `at`, `least`, `most`, `and`, `or`, `remainder`, `of`, `divided`, `by`, `true`, `false`.

---

## 3. EBNF Grammar

```ebnf
Program         ::= StatementList EOF

StatementList   ::= { Statement ( NEWLINE | EOF ) }

Statement       ::= SetStatement
                  | SayStatement
                  | AskStatement
                  | IfStatement
                  | RepeatStatement
                  | WhileStatement
                  | ForEachStatement
                  | DefineStatement
                  | CallStatement
                  | GiveBackStatement
                  | AddStatement
                  | RemoveStatement
                  | PassStatement

(* Variable Assignment *)
SetStatement    ::= "set" Identifier ( "[" Expression "]" )? "to" Expression

(* Output *)
SayStatement    ::= "say" Expression

(* Input *)
AskStatement    ::= "ask" Identifier "with" StringLiteral

(* Conditionals *)
IfStatement     ::= "if" Expression ":" NEWLINE INDENT StatementList DEDENT
                    { "otherwise" "if" Expression ":" NEWLINE INDENT StatementList DEDENT }
                    [ "otherwise" ":" NEWLINE INDENT StatementList DEDENT ]

(* Loops *)
RepeatStatement ::= "repeat" Expression "times" ":" NEWLINE INDENT StatementList DEDENT

WhileStatement  ::= "while" Expression ":" NEWLINE INDENT StatementList DEDENT

ForEachStatement::= "for" "each" Identifier "in" Expression ":" NEWLINE INDENT StatementList DEDENT

(* Functions *)
DefineStatement ::= "define" Identifier [ "with" ParameterList ] ":" NEWLINE INDENT StatementList DEDENT
ParameterList   ::= Identifier { "," Identifier }

CallStatement   ::= "call" Identifier [ "with" ArgumentList ]
ArgumentList    ::= Expression { "," Expression }

GiveBackStatement ::= "give" "back" [ Expression ]

(* List Modifications *)
AddStatement    ::= "add" Expression "to" Identifier
RemoveStatement ::= "remove" Expression "from" Identifier

(* No-op or Pass *)
PassStatement   ::= "pass"

(* Expressions *)
Expression      ::= LogicalOr

LogicalOr       ::= LogicalAnd { "or" LogicalAnd }

LogicalAnd      ::= LogicalNot { "and" LogicalNot }

LogicalNot      ::= [ "not" ] Comparison

Comparison      ::= Additive [ CompOperator Additive ]

CompOperator    ::= "is" "not"
                  | "is" "greater" "than"
                  | "is" "less" "than"
                  | "is" "at" "least"
                  | "is" "at" "most"
                  | "is"

Additive        ::= Multiplicative { ( "+" | "-" ) Multiplicative }

Multiplicative  ::= RemainderExpr { ( "*" | "/" ) RemainderExpr }

RemainderExpr   ::= "remainder" "of" Primary "divided" "by" Primary
                  | Primary

Primary         ::= NumberLiteral
                  | StringLiteral
                  | BooleanLiteral
                  | ListLiteral
                  | Identifier [ "[" Expression "]" ]
                  | FunctionCallExpr
                  | "(" Expression ")"

ListLiteral     ::= "[" [ Expression { "," Expression } ] "]"

FunctionCallExpr::= "call" Identifier [ "with" ArgumentList ]
                  | Identifier "(" [ ArgumentList ] ")"
```

---

## 4. Operator Semantics

| Operator in EasyCode | Equivalent in JS / Python | Meaning |
|---|---|---|
| `+` | `+` | Addition (numbers only) or concatenation (text only) |
| `-` | `-` | Subtraction |
| `*` | `*` | Multiplication |
| `/` | `/` | Division (guarded against division by zero) |
| `remainder of a divided by b` | `a % b` | Modulo / remainder |
| `is` | `==` | Equality |
| `is not` | `!=` | Inequality |
| `is greater than` | `>` | Greater than |
| `is less than` | `<` | Less than |
| `is at least` | `>=` | Greater than or equal to |
| `is at most` | `<=` | Less than or equal to |
| `and` | `&&` / `and` | Logical conjunction |
| `or` | `\|\|` / `or` | Logical disjunction |
| `not` | `!` / `not` | Logical negation |

---

## 5. Standard Built-in Functions

- `text(value)`: Converts a number, boolean, or list into its string representation.
- `number(value)`: Converts string text into a number (e.g. `number("42")`).
- `length of <list or text>` or `length(value)`: Returns the count of items in a list or characters in text.
- `round(number)`: Rounds a number to the nearest integer.
- `item <index> of <list>`: Friendly 1-based or 0-based access helper.

---

## 6. Execution Safety Limits

To guarantee deterministic, safe execution in serverless cloud environments (such as Vercel Route Handlers):
- **Iteration Cap**: Any single execution cannot exceed 10,000 total loop iterations across all loop structures (`repeat`, `while`, `for each`).
- **Wall-clock Timeout**: Total interpreter run time is bounded at 2,000 milliseconds (2 seconds).
- **Stack Depth Guard**: Maximum recursion depth of 100 stack frames.
- **Payload Limits**: Max input code size is 5,000 characters.

