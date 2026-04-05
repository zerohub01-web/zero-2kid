$ErrorActionPreference = "Continue"

$root = $PSScriptRoot
if (-not $root) {
  $root = (Get-Location).Path
}
$webDir = Join-Path $root "apps\web"
$apiDir = Join-Path $root "apps\api"
$reportDir = Join-Path $root "test-results"

New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
New-Item -Path (Join-Path $webDir "test-results") -ItemType Directory -Force | Out-Null
New-Item -Path (Join-Path $apiDir "test-results") -ItemType Directory -Force | Out-Null

$statusMap = [ordered]@{}

function Invoke-Step {
  param(
    [string]$Name,
    [string]$Cwd,
    [string]$Command,
    [string]$LogPath
  )

  $logDir = Split-Path -Parent $LogPath
  if ($logDir) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
  }

  Write-Host "Running: $Name"
  Push-Location $Cwd
  cmd.exe /c "$Command > `"$LogPath`" 2>&1"
  $code = $LASTEXITCODE
  Pop-Location

  $statusMap[$Name] = [ordered]@{
    command = $Command
    cwd = $Cwd
    log = $LogPath
    exitCode = $code
    passed = ($code -eq 0)
  }
}

Invoke-Step -Name "t1.1-web-tsc" -Cwd $webDir -Command "npx.cmd tsc --noEmit" -LogPath (Join-Path $webDir "test-results\ts-web.log")
Invoke-Step -Name "t1.2-api-tsc" -Cwd $apiDir -Command "npx.cmd tsc --noEmit" -LogPath (Join-Path $apiDir "test-results\ts-api.log")
Invoke-Step -Name "t1.3-web-eslint" -Cwd $webDir -Command "npx.cmd eslint . --ext .ts,.tsx" -LogPath (Join-Path $webDir "test-results\lint-web.log")
Invoke-Step -Name "t1.4-api-eslint" -Cwd $apiDir -Command "npx.cmd eslint . --ext .ts" -LogPath (Join-Path $apiDir "test-results\lint-api.log")
Invoke-Step -Name "t1.5-web-build" -Cwd $webDir -Command "npm.cmd run build" -LogPath (Join-Path $webDir "test-results\build-web.log")
Invoke-Step -Name "t1.6-api-build" -Cwd $apiDir -Command "npm.cmd run build" -LogPath (Join-Path $apiDir "test-results\build-api.log")

Invoke-Step -Name "unit-web" -Cwd $webDir -Command "npm.cmd run test:unit" -LogPath (Join-Path $webDir "test-results\unit-web.log")
Invoke-Step -Name "unit-api" -Cwd $apiDir -Command "npm.cmd run test:unit" -LogPath (Join-Path $apiDir "test-results\unit-api.log")

Invoke-Step -Name "runtime-suite" -Cwd $root -Command "powershell.exe -ExecutionPolicy Bypass -File `"$root\run-runtime-tests.ps1`"" -LogPath (Join-Path $reportDir "runtime-suite.log")

$statusJson = Join-Path $reportDir "qa-status.json"
($statusMap | ConvertTo-Json -Depth 8) | Out-File -FilePath $statusJson -Encoding utf8

Invoke-Step -Name "generate-report" -Cwd $root -Command "node scripts\generate-full-report.mjs" -LogPath (Join-Path $reportDir "report-generation.log")

Write-Host "QA run complete. Report: $root\test-results\FULL-REPORT.md"
