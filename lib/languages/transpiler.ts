// EasyCode Multi-Language Transpiler
// Translates between EasyCode, Python, and JavaScript

export function easyCodeToPython(code: string): string {
  const lines = code.split("\n");
  const pyLines: string[] = [];

  for (const line of lines) {
    let l = line;

    // Check if line is purely comment
    if (l.trim().startsWith("#")) {
      pyLines.push(l);
      continue;
    }

    // Preserve leading indentation
    const indentMatch = l.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : "";
    let content = l.trim();

    // Comments at end of line
    let inlineComment = "";
    const hashIdx = content.indexOf("#");
    if (hashIdx !== -1) {
      inlineComment = " " + content.slice(hashIdx);
      content = content.slice(0, hashIdx).trim();
    }

    // 1. say <expr> -> print(<expr>)
    if (content.startsWith("say ")) {
      const expr = content.slice(4).trim();
      content = `print(${convertExprToPython(expr)})`;
    }
    // 2. set <target> to <expr> -> <target> = <expr>
    else if (content.startsWith("set ")) {
      const match = content.match(/^set\s+([a-zA-Z0-9_[\]]+)\s+to\s+(.+)$/);
      if (match) {
        content = `${match[1]} = ${convertExprToPython(match[2])}`;
      }
    }
    // 3. ask <name> with "<prompt>" -> <name> = input("<prompt>")
    else if (content.startsWith("ask ")) {
      const match = content.match(/^ask\s+([a-zA-Z_]\w*)\s+with\s+(.+)$/);
      if (match) {
        content = `${match[1]} = input(${match[2]})`;
      }
    }
    // 4. repeat <n> times: -> for _ in range(<n>):
    else if (content.startsWith("repeat ")) {
      const match = content.match(/^repeat\s+(.+)\s+times:?$/);
      if (match) {
        content = `for _ in range(${convertExprToPython(match[1])}):`;
      }
    }
    // 5. while <cond>: -> while <cond>:
    else if (content.startsWith("while ")) {
      const cond = content.slice(6).replace(/:$/, "").trim();
      content = `while ${convertExprToPython(cond)}:`;
    }
    // 6. for each <item> in <list>: -> for <item> in <list>:
    else if (content.startsWith("for each ")) {
      const match = content.match(/^for each\s+([a-zA-Z_]\w*)\s+in\s+(.+?):?$/);
      if (match) {
        content = `for ${match[1]} in ${convertExprToPython(match[2])}:`;
      }
    }
    // 7. if <cond>: -> if <cond>:
    else if (content.startsWith("if ")) {
      const cond = content.slice(3).replace(/:$/, "").trim();
      content = `if ${convertExprToPython(cond)}:`;
    }
    // 8. otherwise if <cond>: -> elif <cond>:
    else if (content.startsWith("otherwise if ")) {
      const cond = content.slice(13).replace(/:$/, "").trim();
      content = `elif ${convertExprToPython(cond)}:`;
    }
    // 9. otherwise: -> else:
    else if (content === "otherwise" || content === "otherwise:") {
      content = "else:";
    }
    // 10. define <name> with <params>: -> def <name>(<params>):
    else if (content.startsWith("define ")) {
      const withMatch = content.match(/^define\s+([a-zA-Z_]\w*)\s+with\s+(.+?):?$/);
      if (withMatch) {
        content = `def ${withMatch[1]}(${withMatch[2]}):`;
      } else {
        const simpleMatch = content.match(/^define\s+([a-zA-Z_]\w*):?$/);
        if (simpleMatch) {
          content = `def ${simpleMatch[1]}():`;
        }
      }
    }
    // 11. give back <expr> -> return <expr>
    else if (content.startsWith("give back")) {
      const val = content.slice(9).trim();
      content = val ? `return ${convertExprToPython(val)}` : "return";
    }
    // 12. call <name> with <args> -> <name>(<args>)
    else if (content.startsWith("call ")) {
      const withMatch = content.match(/^call\s+([a-zA-Z_]\w*)\s+with\s+(.+)$/);
      if (withMatch) {
        content = `${withMatch[1]}(${withMatch[2]})`;
      } else {
        const simple = content.slice(5).trim();
        content = `${simple}()`;
      }
    }
    // 13. add <item> to <list> -> <list>.append(<item>)
    else if (content.startsWith("add ")) {
      const match = content.match(/^add\s+(.+)\s+to\s+([a-zA-Z_]\w*)$/);
      if (match) {
        content = `${match[2]}.append(${convertExprToPython(match[1])})`;
      }
    }
    // 14. remove <item> from <list> -> <list>.remove(<item>)
    else if (content.startsWith("remove ")) {
      const match = content.match(/^remove\s+(.+)\s+from\s+([a-zA-Z_]\w*)$/);
      if (match) {
        content = `${match[2]}.remove(${convertExprToPython(match[1])})`;
      }
    }
    // 15. pass
    else if (content === "pass") {
      content = "pass";
    }

    pyLines.push(indent + content + inlineComment);
  }

  return pyLines.join("\n");
}

export function easyCodeToJavaScript(code: string): string {
  const lines = code.split("\n");
  const jsLines: string[] = [];
  const blockIndentStack: number[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      jsLines.push("");
      continue;
    }

    // Comments
    if (trimmed.startsWith("#")) {
      jsLines.push(rawLine.replace(/^(\s*)#/, "$1//"));
      continue;
    }

    const indentMatch = rawLine.match(/^(\s*)/);
    const indentLevel = indentMatch ? indentMatch[1].length : 0;
    const indentStr = " ".repeat(indentLevel);
    let content = trimmed;

    let inlineComment = "";
    const hashIdx = content.indexOf("#");
    if (hashIdx !== -1) {
      inlineComment = " //" + content.slice(hashIdx + 1);
      content = content.slice(0, hashIdx).trim();
    }

    const isOtherwise = content === "otherwise" || content === "otherwise:";
    const isOtherwiseIf = content.startsWith("otherwise if ");

    // Close any open blocks that have deeper or equal indentation, UNLESS this line is otherwise / otherwise if at that indent level
    while (
      blockIndentStack.length > 0 &&
      indentLevel <= blockIndentStack[blockIndentStack.length - 1] &&
      !((isOtherwise || isOtherwiseIf) && indentLevel === blockIndentStack[blockIndentStack.length - 1])
    ) {
      const closedIndent = blockIndentStack.pop()!;
      jsLines.push(" ".repeat(closedIndent) + "}");
    }

    let isBlockStart = false;

    // 1. say <expr> -> console.log(<expr>);
    if (content.startsWith("say ")) {
      content = `console.log(${convertExprToJS(content.slice(4).trim())});`;
    }
    // 2. set <target> to <expr> -> let <target> = <expr>;
    else if (content.startsWith("set ")) {
      const match = content.match(/^set\s+([a-zA-Z0-9_[\]]+)\s+to\s+(.+)$/);
      if (match) {
        const prefix = match[1].includes("[") ? "" : "let ";
        content = `${prefix}${match[1]} = ${convertExprToJS(match[2])};`;
      }
    }
    // 3. ask <name> with "<prompt>" -> let <name> = prompt("<prompt>");
    else if (content.startsWith("ask ")) {
      const match = content.match(/^ask\s+([a-zA-Z_]\w*)\s+with\s+(.+)$/);
      if (match) {
        content = `let ${match[1]} = prompt(${match[2]});`;
      }
    }
    // 4. repeat <n> times: -> for (let i = 0; i < <n>; i++) {
    else if (content.startsWith("repeat ")) {
      const match = content.match(/^repeat\s+(.+)\s+times:?$/);
      if (match) {
        const loopVar = `_i${idx}`;
        content = `for (let ${loopVar} = 0; ${loopVar} < ${convertExprToJS(match[1])}; ${loopVar}++) {`;
        isBlockStart = true;
      }
    }
    // 5. while <cond>: -> while (<cond>) {
    else if (content.startsWith("while ")) {
      const cond = content.slice(6).replace(/:$/, "").trim();
      content = `while (${convertExprToJS(cond)}) {`;
      isBlockStart = true;
    }
    // 6. for each <item> in <list>: -> for (const <item> of <list>) {
    else if (content.startsWith("for each ")) {
      const match = content.match(/^for each\s+([a-zA-Z_]\w*)\s+in\s+(.+?):?$/);
      if (match) {
        content = `for (const ${match[1]} of ${convertExprToJS(match[2])}) {`;
        isBlockStart = true;
      }
    }
    // 7. if <cond>: -> if (<cond>) {
    else if (content.startsWith("if ")) {
      const cond = content.slice(3).replace(/:$/, "").trim();
      content = `if (${convertExprToJS(cond)}) {`;
      isBlockStart = true;
    }
    // 8. otherwise if <cond>: -> } else if (<cond>) {
    else if (isOtherwiseIf) {
      const cond = content.slice(13).replace(/:$/, "").trim();
      content = `} else if (${convertExprToJS(cond)}) {`;
    }
    // 9. otherwise: -> } else {
    else if (isOtherwise) {
      content = "} else {";
    }
    // 10. define <name> with <params>: -> function <name>(<params>) {
    else if (content.startsWith("define ")) {
      const withMatch = content.match(/^define\s+([a-zA-Z_]\w*)\s+with\s+(.+?):?$/);
      if (withMatch) {
        content = `function ${withMatch[1]}(${withMatch[2]}) {`;
      } else {
        const simple = content.match(/^define\s+([a-zA-Z_]\w*):?$/);
        content = `function ${simple ? simple[1] : "func"}() {`;
      }
      isBlockStart = true;
    }
    // 11. give back <expr> -> return <expr>;
    else if (content.startsWith("give back")) {
      const val = content.slice(9).trim();
      content = val ? `return ${convertExprToJS(val)};` : "return;";
    }
    // 12. call <name> with <args> -> <name>(<args>);
    else if (content.startsWith("call ")) {
      const withMatch = content.match(/^call\s+([a-zA-Z_]\w*)\s+with\s+(.+)$/);
      if (withMatch) {
        content = `${withMatch[1]}(${withMatch[2]});`;
      } else {
        content = `${content.slice(5).trim()}();`;
      }
    }
    // 13. add <item> to <list> -> <list>.push(<item>);
    else if (content.startsWith("add ")) {
      const match = content.match(/^add\s+(.+)\s+to\s+([a-zA-Z_]\w*)$/);
      if (match) {
        content = `${match[2]}.push(${convertExprToJS(match[1])});`;
      }
    }
    // 14. remove <item> from <list> -> <list>.splice(...)
    else if (content.startsWith("remove ")) {
      const match = content.match(/^remove\s+(.+)\s+from\s+([a-zA-Z_]\w*)$/);
      if (match) {
        content = `${match[2]} = ${match[2]}.filter(x => x !== ${convertExprToJS(match[1])});`;
      }
    }
    // 15. pass
    else if (content === "pass") {
      content = "// pass";
    }

    if (isBlockStart) {
      blockIndentStack.push(indentLevel);
    }

    jsLines.push(indentStr + content + inlineComment);
  }

  // Close remaining open blocks at end of file
  while (blockIndentStack.length > 0) {
    const closedIndent = blockIndentStack.pop()!;
    jsLines.push(" ".repeat(closedIndent) + "}");
  }

  return jsLines.join("\n");
}

function convertExprToPython(expr: string): string {
  let e = expr;
  // call func with args -> func(args)
  e = e.replace(/\bcall\s+([a-zA-Z_]\w*)\s+with\s+(.+)/g, "$1($2)");
  e = e.replace(/\bcall\s+([a-zA-Z_]\w*)\b/g, "$1()");
  // remainder of a divided by b -> a % b
  e = e.replace(/remainder\s+of\s+(.+?)\s+divided\s+by\s+(.+)/g, "$1 % $2");
  e = e.replace(/\bis\s+not\b/g, "!=");
  e = e.replace(/\bis\s+greater\s+than\b/g, ">");
  e = e.replace(/\bis\s+less\s+than\b/g, "<");
  e = e.replace(/\bis\s+at\s+least\b/g, ">=");
  e = e.replace(/\bis\s+at\s+most\b/g, "<=");
  e = e.replace(/\bis\b/g, "==");
  e = e.replace(/\btext\(/g, "str(");
  e = e.replace(/\bnumber\(/g, "int(");
  e = e.replace(/\blength\(/g, "len(");
  return e;
}

function convertExprToJS(expr: string): string {
  let e = expr;
  // call func with args -> func(args)
  e = e.replace(/\bcall\s+([a-zA-Z_]\w*)\s+with\s+(.+)/g, "$1($2)");
  e = e.replace(/\bcall\s+([a-zA-Z_]\w*)\b/g, "$1()");
  e = e.replace(/remainder\s+of\s+(.+?)\s+divided\s+by\s+(.+)/g, "$1 % $2");
  e = e.replace(/\bis\s+not\b/g, "!==");
  e = e.replace(/\bis\s+greater\s+than\b/g, ">");
  e = e.replace(/\bis\s+less\s+than\b/g, "<");
  e = e.replace(/\bis\s+at\s+least\b/g, ">=");
  e = e.replace(/\bis\s+at\s+most\b/g, "<=");
  e = e.replace(/\bis\b/g, "===");
  e = e.replace(/\btext\(/g, "String(");
  e = e.replace(/\bnumber\(/g, "Number(");
  e = e.replace(/\blength\((.+?)\)/g, "$1.length");
  return e;
}
