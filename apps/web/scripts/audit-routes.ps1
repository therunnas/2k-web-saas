$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================"
Write-Host "  2K Command OS - Auditoria de Rotas"
Write-Host "========================================"
Write-Host ""

$expectedPages = @(
  "dashboard",
  "financeiro",
  "clientes",
  "grupos",
  "vencimentos",
  "despesas",
  "producoes",
  "agenda",
  "relatorios",
  "metas",
  "setup"
)

$expectedApis = @(
  "finance\overview",
  "finance\entries",
  "clients\overview",
  "grupos\overview",
  "vencimentos\overview",
  "despesas\overview",
  "producoes\overview",
  "agenda\overview",
  "relatorios\overview",
  "metas\overview",
  "workspace\current",
  "workspace\spreadsheet\upload",
  "auth\login",
  "auth\logout",
  "auth\session"
)

$expectedComponents = @(
  "dashboard\DashboardOverview.tsx",
  "financeiro\FinanceiroDashboard.tsx",
  "clientes\ClientesDashboard.tsx",
  "grupos\GruposDashboard.tsx",
  "vencimentos\VencimentosDashboard.tsx",
  "despesas\DespesasDashboard.tsx",
  "producoes\ProducoesDashboard.tsx",
  "agenda\AgendaDashboard.tsx",
  "relatorios\RelatoriosDashboard.tsx",
  "metas\MetasDashboard.tsx",
  "layout\AdminShell.tsx"
)

$legacyRoutes = @(
  "discord",
  "automacoes",
  "obsidian",
  "recebimentos"
)

$errors = @()
$warnings = @()

Write-Host "Páginas oficiais:"
foreach ($page in $expectedPages) {
  $file = Join-Path $root "src\app\$page\page.tsx"

  if (Test-Path $file) {
    Write-Host "  OK  /$page"
  } else {
    Write-Host "  ERRO /$page ausente"
    $errors += "Página ausente: /$page"
  }
}

Write-Host ""
Write-Host "APIs principais:"
foreach ($api in $expectedApis) {
  $file = Join-Path $root "src\app\api\$api\route.ts"

  if (Test-Path $file) {
    Write-Host "  OK  /api/$($api.Replace('\','/'))"
  } else {
    Write-Host "  ERRO /api/$($api.Replace('\','/')) ausente"
    $errors += "API ausente: /api/$($api.Replace('\','/'))"
  }
}

Write-Host ""
Write-Host "Componentes principais:"
foreach ($component in $expectedComponents) {
  $file = Join-Path $root "src\components\$component"

  if (Test-Path $file) {
    Write-Host "  OK  $component"
  } else {
    Write-Host "  ERRO $component ausente"
    $errors += "Componente ausente: $component"
  }
}

Write-Host ""
Write-Host "Rotas antigas/legadas:"
foreach ($route in $legacyRoutes) {
  $folder = Join-Path $root "src\app\$route"

  if (Test-Path $folder) {
    Write-Host "  AVISO rota legada ainda existe: /$route"
    $warnings += "Rota legada ainda existe: /$route"
  } else {
    Write-Host "  OK  /$route não existe"
  }
}

Write-Host ""
Write-Host "Arquivos críticos:"
$criticalFiles = @(
  "src\components\layout\AdminShell.tsx",
  "src\lib\auth.ts",
  "src\lib\guards.ts",
  "src\lib\prisma.ts",
  "prisma\schema.prisma",
  ".env",
  ".env.local",
  "package.json"
)

foreach ($file in $criticalFiles) {
  $path = Join-Path $root $file

  if (Test-Path $path) {
    Write-Host "  OK  $file"
  } else {
    Write-Host "  AVISO não encontrado: $file"
    $warnings += "Arquivo não encontrado: $file"
  }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Resultado da auditoria"
Write-Host "========================================"

if ($errors.Count -eq 0) {
  Write-Host "OK: Nenhum erro crítico encontrado."
} else {
  Write-Host "ERROS:"
  foreach ($errorItem in $errors) {
    Write-Host " - $errorItem"
  }
}

if ($warnings.Count -gt 0) {
  Write-Host ""
  Write-Host "AVISOS:"
  foreach ($warningItem in $warnings) {
    Write-Host " - $warningItem"
  }
}

Write-Host ""
Write-Host "Total de erros: $($errors.Count)"
Write-Host "Total de avisos: $($warnings.Count)"
Write-Host ""

if ($errors.Count -gt 0) {
  exit 1
}

exit 0