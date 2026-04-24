# Capacitor and Flutter Bridge Notes

## Shared API and auth
- Set one OCR API base URL in both apps (`VITE_OCR_API_URL` for web, `OCR_API_BASE_URL` for Flutter).
- Forward the same Supabase user JWT in `Authorization` header.
- Keep service role keys server-side only.

## Capacitor camera/media permissions

Android (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

iOS (`ios/App/App/Info.plist`):

```xml
<key>NSCameraUsageDescription</key>
<string>Capture receipt photos for OCR expense tracking.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Select receipt photos from your media gallery.</string>
```

## Flutter camera/media permissions

Android and iOS permissions mirror the same keys above when using `image_picker` and `mobile_scanner`.

## Endpoint contract parity

Both web and Flutter should call:
- `POST /ocr/upload-url`
- signed `PUT` to storage
- `POST /ocr/process-image` with `{ s3_bucket, s3_key }`

This keeps batch upload and QR scan behavior consistent across clients.