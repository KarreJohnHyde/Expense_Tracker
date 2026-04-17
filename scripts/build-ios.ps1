$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Expense AI - iOS Build" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check for iOS project
$iosRoot = Join-Path $projectRoot 'ios'
if (!(Test-Path $iosRoot)) {
  Write-Host "iOS project not found. Adding iOS platform..." -ForegroundColor Yellow
  Push-Location $projectRoot
  cmd /c "npx cap add ios"
  Pop-Location
}

# Step 2: Build web bundle
Write-Host "`n[1/3] Building production web bundle..." -ForegroundColor Cyan
Push-Location $projectRoot
cmd /c "npx vite build"
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "Vite build failed with exit code $LASTEXITCODE"
}
Pop-Location

# Step 3: Sync to iOS
Write-Host "`n[2/3] Syncing to iOS..." -ForegroundColor Cyan
Push-Location $projectRoot
cmd /c "npx cap sync ios"
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "Capacitor sync failed with exit code $LASTEXITCODE"
}
Pop-Location

# Step 4: Open in Xcode
Write-Host "`n[3/3] Opening in Xcode..." -ForegroundColor Cyan
Push-Location $projectRoot
cmd /c "npx cap open ios"
Pop-Location

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  iOS project opened in Xcode!" -ForegroundColor Green
Write-Host "  Build & run from Xcode to deploy" -ForegroundColor Green
Write-Host "  to simulator or physical device." -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
