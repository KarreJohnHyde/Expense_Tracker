$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'

if (!(Test-Path $androidRoot)) {
  throw "Android project not found. Run 'npx cap add android' first."
}

$gradlew = Join-Path $androidRoot 'gradlew.bat'
if (!(Test-Path $gradlew)) {
  throw "gradlew.bat not found at $gradlew"
}

Push-Location $androidRoot
try {
  & $gradlew assembleDebug
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
if (Test-Path $apkPath) {
  Write-Host "Debug APK built successfully:"
  Write-Host $apkPath
} else {
  throw "Gradle finished but APK was not found at expected path: $apkPath"
}
