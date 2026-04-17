# Expense AI — Mobile Deployment Guide (Android + iOS)

This app ships as a **Capacitor hybrid** — a single Vite/React web app wrapped in native Android and iOS shells with full access to device features (camera, microphone, storage).

---

## Architecture

```
┌────────────────────────────────────────────┐
│           Vite Build (dist/)               │
│   React + TailwindCSS + Tesseract.js       │
│   html5-qrcode · recharts · Supabase       │
├────────────────────────────────────────────┤
│         Capacitor Bridge Layer             │
├──────────────────┬─────────────────────────┤
│  Android (Java)  │    iOS (Swift/ObjC)     │
│  android/        │    ios/                 │
└──────────────────┴─────────────────────────┘
```

---

## Prerequisites

### Common
- **Node.js** ≥ 18 + **pnpm** ≥ 8
- All project dependencies installed: `pnpm install`

### Android
- **JDK 21** (recommended) — [Adoptium](https://adoptium.net)
- **Android SDK** — via [Android Studio](https://developer.android.com/studio) or CLI tools
- `ANDROID_HOME` environment variable set to your SDK path, **OR** create `android/local.properties`:
  ```properties
  sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
  ```
- Required SDK components (install via Android Studio → SDK Manager):
  - Android SDK Platform 35
  - Android SDK Build-Tools 35.0.0
  - Android SDK Platform-Tools

### iOS (macOS only)
- **Xcode 16+** from the Mac App Store
- **CocoaPods**: `sudo gem install cocoapods`
- Apple Developer account (free for simulators, paid for device/App Store)

---

## Quick Commands

| Command | Description |
|:--------|:------------|
| `pnpm build` | Build production web bundle to `dist/` |
| `pnpm mobile:build` | Build web + sync to both Android & iOS |
| `pnpm cap:sync` | Sync `dist/` to all native platforms |
| `pnpm cap:sync:android` | Sync to Android only |
| `pnpm cap:sync:ios` | Sync to iOS only |
| `pnpm android:debug:apk` | Full pipeline: build → sync → APK |
| `pnpm ios:open` | Full pipeline: build → sync → open Xcode |
| `pnpm cap:open:android` | Open in Android Studio |
| `pnpm cap:open:ios` | Open in Xcode |

---

## Android Build

### Option 1: One-command APK
```powershell
pnpm android:debug:apk
```
This builds the web app, syncs to Android, and produces a debug APK at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Step by step
```powershell
# 1. Build web bundle
pnpm build

# 2. Sync to Android
pnpm cap:sync:android

# 3. Open Android Studio
pnpm cap:open:android

# 4. In Android Studio: Build → Build Bundle(s) / APK → Build APK
```

### Option 3: CLI APK (no Android Studio)
```powershell
pnpm build
pnpm cap:sync:android
cd android
.\gradlew.bat assembleDebug
```

### Install on device
```powershell
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## iOS Build (macOS only)

### Option 1: One-command Xcode
```bash
pnpm ios:open
```
This builds the web app, syncs to iOS, and opens Xcode where you can run on a simulator or device.

### Option 2: Step by step
```bash
# 1. Build web bundle
pnpm build

# 2. Sync to iOS
pnpm cap:sync:ios

# 3. Install pods
cd ios/App && pod install && cd ../..

# 4. Open Xcode
pnpm cap:open:ios

# 5. In Xcode: Select target device → Click ▶ Run
```

---

## Permissions Configured

### Android (`AndroidManifest.xml`)
| Permission | Purpose |
|:-----------|:--------|
| `INTERNET` | API calls, Supabase |
| `ACCESS_NETWORK_STATE` | Network status |
| `CAMERA` | Receipt scanning, QR/barcode |
| `RECORD_AUDIO` | Voice expense input |
| `VIBRATE` | QR scanner feedback |
| `READ_MEDIA_IMAGES` | Photo picker (Android 13+) |
| `READ_EXTERNAL_STORAGE` | Legacy photo access (≤ Android 12) |
| `WRITE_EXTERNAL_STORAGE` | Save receipts (≤ Android 10) |

### iOS (`Info.plist`)
| Key | Purpose |
|:----|:--------|
| `NSCameraUsageDescription` | Receipt/QR/barcode scanning |
| `NSMicrophoneUsageDescription` | Voice expense entry |
| `NSPhotoLibraryUsageDescription` | Upload receipt images |
| `NSPhotoLibraryAddUsageDescription` | Save processed receipts |

---

## Release / Production Build

### Android (Signed APK / AAB)
1. Generate a keystore:
   ```powershell
   keytool -genkey -v -keystore expense-ai.jks -keyalg RSA -keysize 2048 -validity 10000 -alias expense-ai
   ```
2. In Android Studio → Build → Generate Signed Bundle / APK
3. Upload the `.aab` to [Google Play Console](https://play.google.com/console)

### iOS (App Store)
1. In Xcode → Signing & Capabilities → set your Team
2. Product → Archive
3. Distribute → App Store Connect
4. Complete App Store listing in [App Store Connect](https://appstoreconnect.apple.com)

---

## Troubleshooting

| Issue | Fix |
|:------|:----|
| `SDK location not found` | Set `ANDROID_HOME` env var or create `android/local.properties` with `sdk.dir=...` |
| `Minimum supported Gradle version` | Already updated to 8.13 in `gradle-wrapper.properties` |
| `pod install` fails | Run `sudo gem install cocoapods` then retry |
| Web assets not updating | Run `pnpm cap:sync` after every `pnpm build` |
| Camera not working on device | Ensure HTTPS (configured in `capacitor.config.ts`) |
| White screen on app start | Check `dist/` has files, re-run `pnpm build && pnpm cap:sync` |
