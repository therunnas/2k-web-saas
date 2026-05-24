$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================"
Write-Host "  2K Command OS - Auditoria de Nomes"
Write-Host "========================================"
Write-Host ""

$checks = @(
  @{
    label = "Referencia antiga: Recebimentos como rota/menu"
    pattern = "Recebimentos"
    allowed = @(
      "VencimentosDashboard.tsx",
      "AgendaDashboard.tsx"
    )
  },
  @{
    label = "Referencia antiga: Faturamento como item de menu"
    pattern = "Faturamento"
    allowed = @(
      "DashboardOverview.tsx",
      "FinanceiroDashboard.tsx",
      "ClientesDashboard.tsx",
      "GruposDashboard.tsx",
      "ProducoesDashboard.tsx",
      "RelatoriosDashboard.tsx",
      "MetasDashboard.tsx"
    )
  },
  @{
    label = "Referencia antiga: Agenda financeira"
    pattern = "Agenda financeira"
    allowed = @()
  },
  @{
    label = "Referencia antiga: automacoes"
    pattern = "automacoes"
    allowed = @()
  },
  @{
    label = "Referencia antiga: discord como modulo principal"
    pattern = "/discord"
    allowed = @()
  }
)

$files = Get-ChildItem -Path "$root\src" -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.next\\"
  }

$totalWarnings = 0

foreach ($check in $checks) {
  Write-Host ""
  Write-Host $check.label
  Write-Host "Padrao: $($check.pattern)"

  $foundFiles = @()

  foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    if ($content.Contains($check.pattern)) {
      $allowed = $false

      foreach ($allowedName in $check.allowed) {
        if ($file.Name -eq $allowedName) {
          $allowed = $true
        }
      }

      if (-not $allowed) {
        $relativePath = $file.FullName.Replace($root + "\", "")
        $foundFiles += $relativePath
      }
    }
  }

  if ($foundFiles.Count -eq 0) {
    Write-Host "  OK"
  } else {
    foreach ($foundFile in $foundFiles) {
      Write-Host "  AVISO $foundFile"
      $totalWarnings += 1
    }
  }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Resultado"
Write-Host "========================================"
Write-Host "Avisos encontrados: $totalWarnings"
Write-Host ""

if ($totalWarnings -gt 0) {
  Write-Host "Existem nomes/referencias para revisar na FASE 10.2."
} else {
  Write-Host "Nenhuma inconsistencia critica de nomes encontrada."
}