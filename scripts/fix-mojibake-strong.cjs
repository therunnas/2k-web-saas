const fs = require("fs");
const path = require("path");
const { TextDecoder } = require("util");

const root = path.join(process.cwd(), "apps", "web", "src");

const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".json",
  ".md",
]);

const cp1252 = new Map([
  ["€", 0x80],
  ["‚", 0x82],
  ["ƒ", 0x83],
  ["„", 0x84],
  ["…", 0x85],
  ["†", 0x86],
  ["‡", 0x87],
  ["ˆ", 0x88],
  ["‰", 0x89],
  ["Š", 0x8a],
  ["‹", 0x8b],
  ["Œ", 0x8c],
  ["Ž", 0x8e],
  ["‘", 0x91],
  ["’", 0x92],
  ["“", 0x93],
  ["”", 0x94],
  ["•", 0x95],
  ["–", 0x96],
  ["—", 0x97],
  ["˜", 0x98],
  ["™", 0x99],
  ["š", 0x9a],
  ["›", 0x9b],
  ["œ", 0x9c],
  ["ž", 0x9e],
  ["Ÿ", 0x9f],
]);

const manualReplacements = [
  ["ÃƒÂ¡", "á"], ["ÃƒÂ ", "à"], ["ÃƒÂ¢", "â"], ["ÃƒÂ£", "ã"],
  ["ÃƒÂ©", "é"], ["ÃƒÂª", "ê"], ["ÃƒÂ­", "í"], ["ÃƒÂ³", "ó"],
  ["ÃƒÂ´", "ô"], ["ÃƒÂµ", "õ"], ["ÃƒÂº", "ú"], ["ÃƒÂ§", "ç"],

  ["Ã¡", "á"], ["Ã ", "à"], ["Ã¢", "â"], ["Ã£", "ã"], ["Ã¤", "ä"],
  ["Ã©", "é"], ["Ãª", "ê"], ["Ã¨", "è"], ["Ã­", "í"], ["Ã¬", "ì"],
  ["Ã³", "ó"], ["Ã´", "ô"], ["Ãµ", "õ"], ["Ã²", "ò"],
  ["Ãº", "ú"], ["Ã¼", "ü"], ["Ã¹", "ù"], ["Ã§", "ç"],

  ["Ã", "Á"], ["Ã€", "À"], ["Ã‚", "Â"], ["Ã‰", "É"],
  ["ÃŠ", "Ê"], ["Ã", "Í"], ["Ã“", "Ó"], ["Ã”", "Ô"],
  ["Ã•", "Õ"], ["Ãš", "Ú"], ["Ã‡", "Ç"],

  ["Â·", "·"], ["Âº", "º"], ["Âª", "ª"], ["Â ", " "],
  ["â€“", "–"], ["â€”", "—"], ["â€˜", "‘"], ["â€™", "’"],
  ["â€œ", "“"], ["â€", "”"], ["â€¢", "•"], ["â€¦", "…"],
  ["Ã—", "×"], ["Ãƒâ€”", "×"],

  ["VisÃ£o", "Visão"],
  ["visÃ£o", "visão"],
  ["operaÃ§Ã£o", "operação"],
  ["OperaÃ§Ã£o", "Operação"],
  ["operaÃ§Ãµes", "operações"],
  ["produÃ§Ã£o", "produção"],
  ["ProduÃ§Ã£o", "Produção"],
  ["produÃ§Ãµes", "produções"],
  ["ProduÃ§Ãµes", "Produções"],
  ["lanÃ§amento", "lançamento"],
  ["LanÃ§amento", "Lançamento"],
  ["lanÃ§amentos", "lançamentos"],
  ["LanÃ§amentos", "Lançamentos"],
  ["pendÃªncia", "pendência"],
  ["PendÃªncia", "Pendência"],
  ["pendÃªncias", "pendências"],
  ["PendÃªncias", "Pendências"],
  ["participaÃ§Ã£o", "participação"],
  ["ParticipaÃ§Ã£o", "Participação"],
  ["PrÃ³ximos", "Próximos"],
  ["prÃ³ximos", "próximos"],
  ["saÃ­das", "saídas"],
  ["SaÃ­das", "Saídas"],
  ["saÃ­da", "saída"],
  ["SaÃ­da", "Saída"],
  ["competÃªncia", "competência"],
  ["CompetÃªncia", "Competência"],
  ["configuraÃ§Ãµes", "configurações"],
  ["ConfiguraÃ§Ãµes", "Configurações"],
  ["relatÃ³rios", "relatórios"],
  ["RelatÃ³rios", "Relatórios"],
  ["grÃ¡fico", "gráfico"],
  ["GrÃ¡fico", "Gráfico"],
  ["usuÃ¡rio", "usuário"],
  ["UsuÃ¡rio", "Usuário"],
];

function walk(dir) {
  const files = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(item.name)) continue;
      files.push(...walk(full));
      continue;
    }

    if (extensions.has(path.extname(item.name))) files.push(full);
  }

  return files;
}

function toCp1252Bytes(text) {
  const bytes = [];

  for (const char of text) {
    const code = char.codePointAt(0);

    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    if (cp1252.has(char)) {
      bytes.push(cp1252.get(char));
      continue;
    }

    return null;
  }

  return Buffer.from(bytes);
}

function score(text) {
  const bad = [
    /Ã/g,
    /Â/g,
    /â€/g,
    /�/g,
    /Ãƒ/g,
    /Ã‚/g,
  ];

  return bad.reduce((total, regex) => {
    const matches = text.match(regex);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function manualFix(text) {
  let output = text;

  for (let i = 0; i < 5; i += 1) {
    for (const [from, to] of manualReplacements) {
      output = output.split(from).join(to);
    }
  }

  return output;
}

function decodeCp1252AsUtf8(text) {
  const bytes = toCp1252Bytes(text);
  if (!bytes) return text;

  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return text;
  }
}

function fixText(text) {
  let best = manualFix(text);
  let bestScore = score(best);

  for (let i = 0; i < 4; i += 1) {
    const candidate = manualFix(decodeCp1252AsUtf8(best));
    const candidateScore = score(candidate);

    if (candidateScore <= bestScore && !candidate.includes("�")) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return manualFix(best);
}

let changed = 0;

for (const file of walk(root)) {
  const before = fs.readFileSync(file, "utf8");
  const after = fixText(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
    console.log("corrigido:", path.relative(process.cwd(), file));
  }
}

console.log(`Arquivos alterados: ${changed}`);
