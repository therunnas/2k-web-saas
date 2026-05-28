const fs = require("fs");
const path = require("path");

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

const replacements = [
  // Double mojibake mais comum
  ["ÃƒÂ¡", "á"],
  ["ÃƒÂ ", "à"],
  ["ÃƒÂ¢", "â"],
  ["ÃƒÂ£", "ã"],
  ["ÃƒÂ©", "é"],
  ["ÃƒÂª", "ê"],
  ["ÃƒÂ­", "í"],
  ["ÃƒÂ³", "ó"],
  ["ÃƒÂ´", "ô"],
  ["ÃƒÂµ", "õ"],
  ["ÃƒÂº", "ú"],
  ["ÃƒÂ§", "ç"],
  ["ÃƒÂ‡", "Ç"],
  ["ÃƒÂ“", "Ó"],
  ["ÃƒÂ¡", "á"],

  // Mojibake português
  ["Ã¡", "á"],
  ["Ã ", "à"],
  ["Ã¢", "â"],
  ["Ã£", "ã"],
  ["Ã¤", "ä"],
  ["Ã©", "é"],
  ["Ãª", "ê"],
  ["Ã¨", "è"],
  ["Ã­", "í"],
  ["Ã¬", "ì"],
  ["Ã³", "ó"],
  ["Ã´", "ô"],
  ["Ãµ", "õ"],
  ["Ã²", "ò"],
  ["Ãº", "ú"],
  ["Ã¼", "ü"],
  ["Ã¹", "ù"],
  ["Ã§", "ç"],

  ["Ã", "Á"],
  ["Ã€", "À"],
  ["Ã‚", "Â"],
  ["Ãƒ", "Ã"],
  ["Ã‰", "É"],
  ["ÃŠ", "Ê"],
  ["Ã", "Í"],
  ["Ã“", "Ó"],
  ["Ã”", "Ô"],
  ["Ã•", "Õ"],
  ["Ãš", "Ú"],
  ["Ã‡", "Ç"],

  // Símbolos quebrados
  ["Â·", "·"],
  ["Âº", "º"],
  ["Âª", "ª"],
  ["Â ", " "],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€˜", "‘"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€¢", "•"],
  ["â€¦", "…"],
  ["Ã—", "×"],
  ["Ãƒâ€”", "×"],

  // Correções textuais conhecidas do dashboard
  ["VisÃ£o geral", "Visão geral"],
  ["operaÃ§Ã£o", "operação"],
  ["operaÃ§Ãµes", "operações"],
  ["produÃ§Ã£o", "produção"],
  ["produÃ§Ãµes", "produções"],
  ["lanÃ§amento", "lançamento"],
  ["lanÃ§amentos", "lançamentos"],
  ["pendÃªncia", "pendência"],
  ["pendÃªncias", "pendências"],
  ["participaÃ§Ã£o", "participação"],
  ["PrÃ³ximos", "Próximos"],
  ["prÃ³ximos", "próximos"],
  ["recebÃ­veis", "recebíveis"],
  ["saÃ­das", "saídas"],
  ["SaÃ­das", "Saídas"],
  ["competÃªncia", "competência"],
  ["CompetÃªncia", "Competência"],
  ["configuraÃ§Ãµes", "configurações"],
  ["ConfiguraÃ§Ãµes", "Configurações"],
  ["relatÃ³rios", "relatórios"],
  ["RelatÃ³rios", "Relatórios"],
  ["mÃ©dia", "média"],
  ["MÃ©dia", "Média"],
  ["grÃ¡fico", "gráfico"],
  ["GrÃ¡fico", "Gráfico"],
  ["usuÃ¡rio", "usuário"],
  ["UsuÃ¡rio", "Usuário"],

  // Texto final padronizado
  ["Visão geral · Ano fiscal 2026", "Visão geral · Ano fiscal 2026"],
  ["Top grupos por faturamento", "Top grupos por faturamento"],
  ["Próximos recebimentos", "Próximos recebimentos"],
  ["participação no ano fiscal 2026", "participação no ano fiscal 2026"],
  ["pendências recentes em aberto", "pendências recentes em aberto"],
];

function walk(dir) {
  const files = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (
        item.name === "node_modules" ||
        item.name === ".next" ||
        item.name === ".git"
      ) {
        continue;
      }

      files.push(...walk(fullPath));
      continue;
    }

    if (extensions.has(path.extname(item.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function fix(content) {
  let output = content;

  // roda várias vezes porque pode existir mojibake duplo
  for (let round = 0; round < 4; round += 1) {
    for (const [from, to] of replacements) {
      output = output.split(from).join(to);
    }
  }

  return output;
}

let changed = 0;

for (const file of walk(root)) {
  const before = fs.readFileSync(file, "utf8");
  const after = fix(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
    console.log("corrigido:", path.relative(process.cwd(), file));
  }
}

console.log(`Arquivos corrigidos: ${changed}`);
