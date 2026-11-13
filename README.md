# EasyCode 🌟

> **A beginner-friendly programming language where every mistake teaches something.**

EasyCode is an educational programming language and interactive web playground built from the ground up to replace cryptic syntax and intimidating compiler stack traces with calm, patient, English-like guidance.

---

## 💡 Core Philosophy

In traditional languages like Python, Java, or C++, a small beginner mistake produces frightening walls of red stack traces (`NameError`, `IndentationError`, `TypeError: can only concatenate str to int`, `IndexError`, `ZeroDivisionError`). For learners and school-age students, this breeds anxiety and discouragement.

**In EasyCode, errors are compassionate mentors.** Every error diagnostic answers three essential questions:
1. **What happened:** A plain-English summary highlighting the exact line and position.
2. **Why it happened:** The conceptual explanation behind the rule.
3. **How to fix it:** A clear, actionable solution with a **1-click "Apply fix"** button directly in the playground.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Code Editor:** Hand-crafted syntax-highlighted editor with line numbers, error squiggles, and 4-space tab indentation.
- **Backend:** Next.js Route Handlers (`/app/api/run`, `/app/api/check`, `/app/api/examples`)
- **Core Engine:** Pure TypeScript hand-written Lexer, Recursive Descent Parser, AST Tree-walk Interpreter, and Step-by-Step Narrator (zero parser-generators, zero `eval`, zero `Function` constructor).
- **Safety Limits:** 10,000 loop iteration limit and 2.0-second execution timeout to prevent infinite loops on serverless runtimes.
- **Testing:** Vitest test suite with 100% assertion coverage across all 16 error scenarios.
- **Deployment:** Vercel-ready with no custom servers or runtime filesystem dependencies.

---

## 📖 Language Reference

EasyCode has a fixed, English-like grammar consisting of ~15 clean statement forms:

### 1. Variables & Assignment
```easycode
set score to 100
set playerName to "Alex"
```
*(Notice: use `to`, not `=`)*

### 2. Output
```easycode
say "Hello, world!"
say "Current score: " + text(score)
```

### 3. User Input (`ask`)
```easycode
ask userName with "What is your name?"
say "Welcome, " + userName
```

### 4. Conditionals (`if`, `otherwise if`, `otherwise`)
Blocks use clean indentation (2 or 4 spaces):
```easycode
if score is at least 90:
    say "Grade: A - Outstanding!"
otherwise if score is at least 80:
    say "Grade: B - Great work!"
otherwise:
    say "Keep trying!"
```

### 5. Loops
#### Repeat Loop (fixed count)
```easycode
repeat 3 times:
    say "Hip hip hooray!"
```

#### While Loop (conditional)
```easycode
set energy to 3
while energy is greater than 0:
    say "Energy: " + text(energy)
    set energy to energy - 1
```

#### For-Each Loop (lists)
```easycode
for each fruit in ["apple", "banana", "orange"]:
    say "I like " + fruit
```

### 6. Functions & Return Values
```easycode
define addNumbers with a, b:
    give back a + b

set result to call addNumbers with 10, 20
say result # prints 30
```

### 7. Lists
```easycode
set items to ["pencil", "notebook"]
add "ruler" to items
remove "pencil" from items
say items[0] # prints "notebook"
say length(items) # prints 2
```

### 8. Comparisons & Math Operators
- **Comparisons:** `is`, `is not`, `is greater than`, `is less than`, `is at least`, `is at most`
- **Logic:** `and`, `or`, `not`
- **Math:** `+`, `-`, `*`, `/`, and `remainder of a divided by b`
- **Comments:** Single line comments start with `#`
- **Types:** `number`, `text` (strings), `true`/`false` (booleans), `list`

---

## 🚨 The 16 Beginner-Specific Error Catalogue

EasyCode detects, explains, and offers 1-click fixes for at least 16 common beginner mistakes:

| # | Error Type | Cause | Example | EasyCode Solution |
|---|---|---|---|---|
| **1** | `UNDEFINED_VARIABLE` | Typo in variable name | `say "Hello " + nmae` | Did you mean `"name"`? (you set it on line 1). Offers 1-click replacement. |
| **2** | `MISSPELLED_KEYWORD` | Typo in keyword or command | `sey "Hello"` / `prnt "Hi"` | Explains that EasyCode uses `say` instead of `sey`/`print`. |
| **3** | `UNCLOSED_QUOTE` | Missing closing quote on string | `say "Hello` | Pinpoints the unclosed quote and inserts matching quote. |
| **4** | `EQUALS_INSTEAD_OF_TO_OR_IS` | Using `=` for assignment or check | `set x = 5` or `if x = 5:` | Gently explains to use `to` for setting or `is` for comparisons. |
| **5** | `MISSING_TIMES_AFTER_REPEAT` | Forgetting `times` | `repeat 5:` | Suggests `repeat 5 times:`. |
| **6** | `INDENTATION_ERROR` | Missing indentation after header | `if x is 5:\nsay "yes"` | Explains block structure and automatically indents by 4 spaces. |
| **7** | `DIVIDE_BY_ZERO` | Division by 0 | `10 / 0` | Explains that division by zero is undefined in mathematics. |
| **8** | `TYPE_MISMATCH_ADDITION` | Adding text and numbers directly | `"Age: " + 12` | Suggests converting the number with `text(12)` so bugs don't hide. |
| **9** | `UNDEFINED_FUNCTION` | Calling undefined function name | `call greetUsr with "Sam"` | Did you mean `"greetUser"`? |
| **10** | `WRONG_ARGUMENT_COUNT` | Passing wrong number of arguments | Function needs 2 args, received 1 | Shows function signature and expected parameters. |
| **11** | `INDEX_OUT_OF_RANGE` | Accessing list index outside bounds | `items[10]` on 2-item list | Explains list length and reminds that indexing starts at 0. |
| **12** | `VARIABLE_USED_BEFORE_SET` | Accessing variable before definition line | Variable set on line 4, read on line 2 | Explains top-to-bottom execution and shows where variable was set. |
| **13** | `UNBALANCED_DELIMITER` | Unclosed `[` or `(` | `set items to [1, 2` | Identifies where the bracket opened and adds matching `]`. |
| **14** | `INFINITE_LOOP_GUARD` | Loop running indefinitely | `while 1 is 1:` | Tripped at 10,000 iterations or 2s timeout; explains loop counter logic. |
| **15** | `ORPHAN_OTHERWISE` | `otherwise` without preceding `if` | Standalone `otherwise:` | Reminds that `otherwise` must follow an `if` block. |
| **16** | `EMPTY_BLOCK` | Header block with no body code | `if x is 5:` with no body | Advises adding commands or using `pass`. |

---

## 🏃 Getting Started Locally

### Prerequisites
- Node.js 18+ (tested with v20 and v24)
- npm

### 1. Installation
```bash
git clone <repository-url>
cd EasyCode
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run the Test Suite
```bash
npm test
```
Runs 54 automated Vitest tests verifying the lexer, parser, interpreter, all 16 error scenarios, explain mode, and API routes.

### 4. Build for Production
```bash
npm run build
```

---

## 🚀 Deploying to Vercel

EasyCode is built with pure Next.js Route Handlers and standard App Router conventions with no filesystem writes, making it 100% native to Vercel:

### Option A: Via Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: Via GitHub Import
1. Push this repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), click **Import Project**.
3. Select your repository. Framework preset will automatically detect **Next.js**.
4. Click **Deploy**.

