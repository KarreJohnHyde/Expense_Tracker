# Android Build (Capacitor)

This project ships a native Android wrapper around the Vite web app using Capacitor.

## Prerequisites

- Node + pnpm
- JDK 21 (recommended)
- Android SDK (platform + build tools) installed
- `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) set, or `android/local.properties` with `sdk.dir=...`

## One-time Setup

```powershell
pnpm install
npx cap add android
```

## Build Debug APK

```powershell
pnpm build:native
pnpm cap:sync:android
pnpm android:build:debug
```

## Open In Android Studio

```powershell
pnpm cap:open:android
```

## Output APK Path

`android/app/build/outputs/apk/debug/app-debug.apk`
