$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot 'dist'
$zipPath = Join-Path $projectRoot 'expense-ai-netlify-drop.zip'

if (!(Test-Path $distPath)) {
  throw "dist folder not found. Run build first."
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $distPath '*') -DestinationPath $zipPath -Force
Write-Host "Created Netlify Drop bundle at: $zipPath"
