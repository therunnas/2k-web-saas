const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(appRoot, "src");
const allowedExtensions = new Set([".ts", ".tsx", ".css", ".json"]);
const ignoredDirectories = new Set(["node_modules", ".next", ".git", "generated"]);

const detectors = [
  { label: "PrÃ³ximas", regex: /Pr\u00c3\u00b3ximas/g },
  { label: "produÃ§Ãµes", regex: /produ\u00c3\u00a7\u00c3\u00b5es/g },
  { label: "competÃªncia", regex: /compet\u00c3\u00aancia/g },
  { label: "saÃ­das", regex: /sa\u00c3\u00addas/g },
  { label: "pendÃªncias", regex: /pend\u00c3\u00aancias/g },
  { label: "Ãƒ", regex: /\u00c3\u0192/g },
  { label: "ÃÂ", regex: /\u00c3\u00c2/g },
  { label: "ÂÂ", regex: /\u00c2\u00c2/g },
  { label: "Â¬", regex: /\u00c2\u00ac/g },
  { label: "â€", regex: /\u00e2\u20ac/g },
  { label: "�", regex: /\ufffd/g },
  { label: "UTF-8 quebrado com Ã", regex: /\u00c3[\u0080-\u00bf]/g },
  { label: "UTF-8 quebrado com Â", regex: /\u00c2[\u0080-\u00bf]/g },
];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name), files);
      }
      continue;
    }

    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

function getLineAndColumn(content, index) {
  const before = content.slice(0, index);
  const lines = before.split(/\r\n|\r|\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function getLineText(content, lineNumber) {
  return content.split(/\r\n|\r|\n/)[lineNumber - 1] || "";
}

function findEncodingIssues(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const issues = [];

  for (const detector of detectors) {
    detector.regex.lastIndex = 0;

    for (const match of content.matchAll(detector.regex)) {
      const position = getLineAndColumn(content, match.index);
      const lineText = getLineText(content, position.line).trim();

      issues.push({
        filePath,
        line: position.line,
        column: position.column,
        label: detector.label,
        snippet: lineText,
      });
    }
  }

  return issues;
}

if (!fs.existsSync(srcRoot)) {
  console.error(`Pasta src não encontrada: ${srcRoot}`);
  process.exit(1);
}

const issues = walk(srcRoot).flatMap(findEncodingIssues);

if (issues.length > 0) {
  console.error("Mojibake encontrado em arquivos do projeto:\n");

  for (const issue of issues) {
    const relativePath = path.relative(appRoot, issue.filePath);
    console.error(`${relativePath}:${issue.line}:${issue.column}`);
    console.error(`  padrão: ${issue.label}`);
    console.error(`  trecho: ${issue.snippet}\n`);
  }

  console.error(`Total de ocorrências: ${issues.length}`);
  process.exit(1);
}

console.log("Encoding OK: nenhum mojibake encontrado em apps/web/src.");
