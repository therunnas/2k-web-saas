const fs = require("fs");
const path = require("path");

const root = path.join(process.cwd(), "apps", "web", "src");
const globalsPath = path.join(process.cwd(), "apps", "web", "src", "app", "globals.css");

const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md", ".json"]);

const replacements = [
  // Mojibake português
  ["Ã¡", "á"], ["Ã ", "à"], ["Ã¢", "â"], ["Ã£", "ã"], ["Ã¤", "ä"],
  ["Ã©", "é"], ["Ãª", "ê"], ["Ã¨", "è"],
  ["Ã­", "í"], ["Ã¬", "ì"],
  ["Ã³", "ó"], ["Ã´", "ô"], ["Ãµ", "õ"], ["Ã²", "ò"],
  ["Ãº", "ú"], ["Ã¼", "ü"], ["Ã¹", "ù"],
  ["Ã§", "ç"],

  ["Ã", "Á"], ["Ã€", "À"], ["Ã‚", "Â"], ["Ãƒ", "Ã"],
  ["Ã‰", "É"], ["ÃŠ", "Ê"],
  ["Ã", "Í"],
  ["Ã“", "Ó"], ["Ã”", "Ô"], ["Ã•", "Õ"],
  ["Ãš", "Ú"], ["Ã‡", "Ç"],

  // Símbolos quebrados
  ["â€“", "–"], ["â€”", "—"],
  ["â€˜", "‘"], ["â€™", "’"],
  ["â€œ", "“"], ["â€", "”"], ["â€", "”"],
  ["â€¢", "•"], ["â€¦", "…"],
  ["Â·", "·"], ["Âº", "º"], ["Âª", "ª"], ["Â ", " "],

  // Correções de gramática/labels conhecidos
  ["Independe de sido recebido", "Independente de ter sido recebido"],
  ["Independe de ser recebido", "Independente de ter sido recebido"],
  ["anofiscal", "ano fiscal"],
  ["Ano fiscal 2026", "Ano fiscal 2026"],
  ["01 Jan — 31 Dez 2026", "01 Jan — 31 Dez 2026"],

  // Padronização de interface
  ["Dashboard executivo", "Dashboard executivo"],
  ["Visão geral da operação financeira e audiovisual da 2K STUDIOS com dados reais da planilha importada.", "Visão geral da operação financeira e audiovisual da 2K STUDIOS com dados reais da planilha importada."],
  ["lançamentos recentes", "lançamentos recentes"],
  ["conversão em caixa", "conversão em caixa"],
  ["pendências em atraso", "pendências em atraso"],
  ["Resultado do período", "Resultado do período"],
  ["Lucro por competência", "Lucro por competência"],
  ["Margem por competência", "Margem por competência"],
  ["Total faturado no ano", "Total faturado no ano"],
  ["Entradas efetivamente recebidas", "Entradas efetivamente recebidas"],
  ["Recebido menos saídas pagas", "Recebido menos saídas pagas"],
  ["Recebido menos todas as saídas lançadas", "Recebido menos todas as saídas lançadas"],
  ["Faturamento menos todas as saídas lançadas", "Faturamento menos todas as saídas lançadas"],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === ".git"
      ) {
        continue;
      }

      files.push(...walk(full));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

function fixText(content) {
  let output = content;

  for (const [from, to] of replacements) {
    output = output.split(from).join(to);
  }

  return output;
}

let changed = 0;

for (const file of walk(root)) {
  const before = fs.readFileSync(file, "utf8");
  const after = fixText(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed++;
    console.log("fixed text:", path.relative(process.cwd(), file));
  }
}

if (fs.existsSync(globalsPath)) {
  let css = fs.readFileSync(globalsPath, "utf8");

  css = css.replace(
    /\/\* -------------------------------------------------------------------------- \*\/\s*\/\* 2K STUDIOS — Zoom-safe layout[\s\S]*?(?=\/\* -------------------------------------------------------------------------- \*\/|$)/g,
    ""
  );

  css += `

/* -------------------------------------------------------------------------- */
/* 2K STUDIOS — Final zoom and typography normalization                        */
/* Estabiliza desktop entre 90%, 100% e 110% sem bloquear zoom do navegador    */
/* -------------------------------------------------------------------------- */

html {
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  scrollbar-gutter: stable;
}

body {
  overflow-x: hidden;
}

/* Base de páginas internas */
.dashboard-overview-v2,
.manual-page-v2,
.ops-page-v2,
.final-page-v2 {
  width: 100%;
  max-width: 1740px !important;
  margin-inline: auto !important;
}

/* Títulos: reduz estouro em zoom alto */
.dashboard-overview-v2 > header h1,
.manual-page-v2 > header h1,
.ops-page-v2 > header h1,
.final-page-v2 > header h1 {
  font-size: clamp(30px, 2.25vw, 42px) !important;
  line-height: 1 !important;
  letter-spacing: -0.06em !important;
}

/* Textos auxiliares */
.dashboard-overview-v2 > header p,
.manual-page-v2 > header p,
.ops-page-v2 > header p,
.final-page-v2 > header p {
  font-size: clamp(13px, 0.82vw, 15px) !important;
  line-height: 1.65 !important;
}

/* Números não devem explodir com zoom */
.dashboard-number {
  max-width: 100%;
  font-variant-numeric: tabular-nums;
}

/* Cards e grids mais estáveis */
.dashboard-kpi-grid > article,
.manual-page-v2 > section:first-of-type > article,
.ops-page-v2 > section:first-of-type > article,
.final-page-v2 > section:first-of-type > article {
  min-width: 0 !important;
}

/* Dashboard: cards principais */
@media (max-width: 1500px) {
  .dashboard-overview-v2,
  .manual-page-v2,
  .ops-page-v2,
  .final-page-v2 {
    gap: 18px !important;
  }

  .dashboard-overview-v2 > header,
  .manual-page-v2 > header,
  .ops-page-v2 > header,
  .final-page-v2 > header {
    padding-top: 12px !important;
    padding-bottom: 8px !important;
  }

  .dashboard-overview-v2 > header h1,
  .manual-page-v2 > header h1,
  .ops-page-v2 > header h1,
  .final-page-v2 > header h1 {
    font-size: clamp(28px, 2.05vw, 38px) !important;
  }

  .dashboard-kpi-grid {
    gap: 12px !important;
  }

  .dashboard-kpi-grid > article:nth-child(1),
  .dashboard-kpi-grid > article:nth-child(2),
  .dashboard-kpi-grid > article:nth-child(8) {
    min-height: 128px !important;
    padding: 20px !important;
  }

  .dashboard-kpi-grid > article:not(:nth-child(1)):not(:nth-child(2)):not(:nth-child(8)) {
    min-height: 76px !important;
    padding: 13px 16px !important;
  }

  .manual-page-v2 > .manual-summary-strip > article,
  .ops-page-v2 > section:first-of-type > article,
  .final-page-v2 > section:first-of-type > article {
    min-height: 86px !important;
    padding: 15px 16px !important;
  }
}

/* Zoom alto / telas menores */
@media (max-width: 1280px) {
  .dashboard-overview-v2 > header h1,
  .manual-page-v2 > header h1,
  .ops-page-v2 > header h1,
  .final-page-v2 > header h1 {
    font-size: 30px !important;
    letter-spacing: -0.052em !important;
  }

  .ops-page-v2 > section:first-of-type,
  .final-page-v2 > section:first-of-type {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .ops-page-v2 > section:first-of-type > article,
  .final-page-v2 > section:first-of-type > article {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  }

  .ops-page-v2 > section:first-of-type > article:nth-last-child(-n + 3),
  .final-page-v2 > section:first-of-type > article:nth-last-child(-n + 3) {
    border-bottom: 0 !important;
  }
}

/* Configurações */
.final-page-config h1,
.final-page-config h2,
.final-page-config h3 {
  line-height: 1.08 !important;
}

.final-page-config > section,
.final-page-config [class*="grid"] {
  min-width: 0;
}

/* Inputs e botões não estouram com zoom */
button,
input,
select,
textarea {
  min-width: 0;
}

input,
select,
textarea {
  font-size: 14px !important;
}

/* Sidebar menos dominante em zoom alto */
@media (max-width: 1280px) {
  aside,
  nav {
    font-size: 13px;
  }
}
`;

  css = fixText(css);
  fs.writeFileSync(globalsPath, css, "utf8");
  console.log("updated zoom css:", path.relative(process.cwd(), globalsPath));
}

console.log(`Done. Files changed: ${changed}`);
