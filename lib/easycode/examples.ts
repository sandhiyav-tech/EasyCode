// Sample programs for EasyCode Playground

export interface ExampleProgram {
  id: string;
  title: string;
  category: "starter" | "broken";
  language?: "easycode" | "python" | "javascript";
  description: string;
  code: string;
  inputs?: string[];
  expectedBug?: string;
  pythonEquivalent?: {
    code: string;
    rawError: string;
    explanation: string;
  };
}

export const DEFAULT_CODE_BY_LANG: Record<"easycode" | "python" | "javascript", string> = {
  easycode: `# Welcome to EasyCode!
# A beginner-friendly language where every mistake teaches something.

set name to "Alex"
set score to 10

say "Hello, " + name + "!"

if score is at least 10:
    say "Outstanding! You got a top score."
otherwise:
    say "Keep practicing, you will get it!"
`,
  python: `# Welcome to Python Mode!
# Clean syntax with colons and indentation.

name = "Alex"
score = 10

print("Hello, " + name + "!")

if score >= 10:
    print("Outstanding! You got a top score.")
else:
    print("Keep practicing, you will get it!")
`,
  javascript: `// Welcome to JavaScript Mode!
// The language that powers the modern web.

let name = "Alex";
let score = 10;

console.log("Hello, " + name + "!");

if (score >= 10) {
    console.log("Outstanding! You got a top score.");
} else {
    console.log("Keep practicing, you will get it!");
}
`,
};

export const EXAMPLES: ExampleProgram[] = [
  {
    id: "hello-world",
    title: "1. Hello World",
    category: "starter",
    description: "The classic first program. Friendly and straightforward.",
    code: `# Welcome to EasyCode!
# Every great programmer starts here.

say "Hello, world!"
say "Welcome to beginner-friendly coding!"
`,
  },
  {
    id: "variables-and-math",
    title: "2. Variables and Math",
    category: "starter",
    description: "Creating variables and performing math operations.",
    code: `# Creating variables and doing calculations
set apples to 5
set pricePerApple to 2
set totalCost to apples * pricePerApple

say "Total cost of " + text(apples) + " apples is $" + text(totalCost)

# Remainder calculation
set leftover to remainder of 14 divided by 4
say "14 divided by 4 leaves remainder: " + text(leftover)
`,
  },
  {
    id: "if-otherwise",
    title: "3. Decisions (If / Otherwise)",
    category: "starter",
    description: "Branching logic with English-like conditionals.",
    code: `# Let's decide a grade based on a score
set score to 85

if score is at least 90:
    say "Grade: A - Outstanding!"
otherwise if score is at least 80:
    say "Grade: B - Great work!"
otherwise if score is at least 70:
    say "Grade: C - Keep practicing!"
otherwise:
    say "Don't give up! Try again."
`,
  },
  {
    id: "loops",
    title: "4. Loops (Repeat & While)",
    category: "starter",
    description: "Counting and repeating actions with repeat and while.",
    code: `# Repeat loop: run a fixed number of times
say "Starting countdown:"
repeat 3 times:
    say "Tick... tock..."

say "Blastoff!"

# While loop: runs until the condition becomes false
set energy to 3
while energy is greater than 0:
    say "Robot power remaining: " + text(energy)
    set energy to energy - 1

say "Robot needs recharging!"
`,
  },
  {
    id: "functions",
    title: "5. Custom Functions",
    category: "starter",
    description: "Building reusable functions with give back.",
    code: `# Define reusable functions
define calculateArea with width, height:
    set area to width * height
    give back area

set roomWidth to 12
set roomHeight to 10
set roomArea to call calculateArea with roomWidth, roomHeight

say "Room area is: " + text(roomArea) + " square units."
`,
  },
  {
    id: "lists",
    title: "6. Lists & For-Each",
    category: "starter",
    description: "Working with lists, adding/removing items, and looping.",
    code: `# Creating and modifying lists
set shoppingList to ["pencils", "notebook", "eraser"]
say "Starting list:"
say shoppingList

add "ruler" to shoppingList
remove "eraser" from shoppingList

say "Updated list:"
for each item in shoppingList:
    say "- " + item
`,
  },
  {
    id: "broken-typo",
    title: "7. [Bug] Typo in Variable Name",
    category: "broken",
    description: "Watch EasyCode identify the misspelled variable and suggest a fix.",
    code: `# Notice the small spelling mistake on line 4
set playerName to "Alex"
set currentLevel to 3

say "Welcome back, " + playrName + "!"
say "You are on level " + text(currentLevel)
`,
    expectedBug: "Undefined variable 'playrName' with did-you-mean suggestion",
    pythonEquivalent: {
      code: `player_name = "Alex"
print("Welcome back, " + playr_name + "!")`,
      rawError: `Traceback (most recent call last):
  File "game.py", line 2, in <module>
    print("Welcome back, " + playr_name + "!")
NameError: name 'playr_name' is not defined. Did you mean: 'player_name'?`,
      explanation: "Python throws a NameError stack trace. EasyCode kindly highlights the exact word and offers a 1-click 'Apply fix' button.",
    },
  },
  {
    id: "broken-indentation",
    title: "8. [Bug] Missing Indentation",
    category: "broken",
    description: "See how EasyCode explains block structure and spacing.",
    code: `# In EasyCode, instructions inside 'if' must be indented
set score to 100

if score is 100:
say "You scored maximum points!"
`,
    expectedBug: "Missing indentation after if statement",
    pythonEquivalent: {
      code: `score = 100
if score == 100:
print("You scored maximum points!")`,
      rawError: `  File "game.py", line 3
    print("You scored maximum points!")
    ^
IndentationError: expected an indented block after 'if' statement on line 2`,
      explanation: "Python halts with an IndentationError. EasyCode explains why indentation is needed and can indent the line for you.",
    },
  },
  {
    id: "broken-divide-by-zero",
    title: "9. [Bug] Divide by Zero",
    category: "broken",
    description: "Friendly explanation when dividing by zero.",
    code: `# Dividing by zero is impossible in math
set totalPizzas to 8
set numberOfPeople to 0

set slicesEach to totalPizzas / numberOfPeople
say "Each person gets: " + text(slicesEach)
`,
    expectedBug: "Division by zero on line 5",
    pythonEquivalent: {
      code: `total_pizzas = 8
people = 0
slices = total_pizzas / people`,
      rawError: `Traceback (most recent call last):
  File "pizza.py", line 3, in <module>
    slices = total_pizzas / people
ZeroDivisionError: division by zero`,
      explanation: "Python crashes with ZeroDivisionError. EasyCode gently explains the mathematical reason and shows how to guard against it.",
    },
  },
  // Python Examples
  {
    id: "py-starter-loops",
    title: "Python: Loops & Logic",
    category: "starter",
    language: "python",
    description: "For-in range loops and conditions in Python.",
    code: `# Python loops and condition demonstration
total = 0
for i in range(5):
    total = total + i
    print("Step " + str(i) + ": total is " + str(total))

if total >= 10:
    print("Done! Sum is double digits.")
else:
    print("Done! Sum is single digit.")
`,
  },
  {
    id: "py-starter-functions",
    title: "Python: Functions & Math",
    category: "starter",
    language: "python",
    description: "Defining functions and returning computed values in Python.",
    code: `# Python function definition and call
def calculate_box_volume(w, h, d):
    return w * h * d

width = 4
height = 5
depth = 2
volume = calculate_box_volume(width, height, depth)

print("Box volume: " + str(volume) + " cubic units")
`,
  },
  {
    id: "py-bug-missing-colon",
    title: "Python: [Bug] Missing Colon ':'",
    category: "broken",
    language: "python",
    description: "Common Python syntax mistake: forgetting the colon at header end.",
    code: `# Notice line 3 is missing the trailing colon ':'
score = 95

if score >= 90
    print("Grade: A")
`,
    expectedBug: "SyntaxError: expected ':' at end of header",
  },
  {
    id: "py-bug-name-error",
    title: "Python: [Bug] NameError / Typo",
    category: "broken",
    language: "python",
    description: "Notice the spelling mistake in variable name.",
    code: `# Misspelled variable 'playr_name'
player_name = "Taylor"
print("Welcome back, " + playr_name)
`,
    expectedBug: "NameError: name 'playr_name' is not defined",
  },
  // JavaScript Examples
  {
    id: "js-starter-arrays",
    title: "JavaScript: Arrays & Mapping",
    category: "starter",
    language: "javascript",
    description: "Creating arrays, pushing items, and logging in JavaScript.",
    code: `// Working with arrays and loops in JavaScript
const languages = ["EasyCode", "Python"];
languages.push("JavaScript");

console.log("Total languages: " + languages.length);

for (const lang of languages) {
    console.log("Learning: " + lang);
}
`,
  },
  {
    id: "js-starter-functions",
    title: "JavaScript: Functions & Scope",
    category: "starter",
    language: "javascript",
    description: "Defining functions and doing calculations in JavaScript.",
    code: `// Function definitions in JavaScript
function calculateDiscount(price, discountPercent) {
    let savings = price * (discountPercent / 100);
    return price - savings;
}

let original = 80;
let finalPrice = calculateDiscount(original, 25);

console.log("Original: $" + original);
console.log("With 25% off: $" + finalPrice);
`,
  },
  {
    id: "js-bug-reference-error",
    title: "JavaScript: [Bug] ReferenceError",
    category: "broken",
    language: "javascript",
    description: "Using an unassigned or undeclared variable in JavaScript.",
    code: `// Typo on line 3: 'usreName' is not defined
let userName = "Sam";
console.log("Welcome, " + usreName);
`,
    expectedBug: "ReferenceError: usreName is not defined",
  },
  {
    id: "js-bug-const-reassignment",
    title: "JavaScript: [Bug] Const Reassignment",
    category: "broken",
    language: "javascript",
    description: "Trying to mutate a variable declared with 'const'.",
    code: `// 'const' variables cannot be reassigned
const maxLives = 3;
console.log("Initial lives: " + maxLives);

maxLives = 2; // TypeError!
`,
    expectedBug: "TypeError: Assignment to constant variable",
  },
];

