# Serverless Expense OCR and QR Pipeline

This package adds an end-to-end receipt pipeline:

1. Capture image (web React/Capacitor or Flutter).
2. Upload by multipart or signed URL.
3. Node serverless API dispatches to FastAPI worker (or CLI fallback).
4. OCR + QR extraction returns structured JSON with confidence and bounding boxes.
5. User reviews low-confidence tokens.
6. Confirmed result is persisted in Supabase with RLS isolation.

## Added artifacts

- Node OCR Lambda API: `backend/src/app.js`
- Node Cloud Run adapter: `backend/src/cloudrun-server.js`
- API contract types: `backend/src/contracts/ocr-api-contract.d.ts`
- API example client: `backend/src/examples/client-upload.ts`
- Supabase upsert service: `backend/src/services/supabaseOcrService.ts`
- OCR worker (FastAPI + CLI): `python_worker/`
- React panel (capture/batch/gallery/QR/review): `src/app/components/OcrUploadReviewPanel.tsx`
- React page route: `/ocr-pipeline` via `src/app/pages/OcrPipeline.tsx`
- Flutter OCR module: `mobile_app/lib/modules/ocr/`
- Supabase migration + RLS: `supabase/migrations/20260421_ocr_pipeline_schema.sql`
- CI/CD workflow: `.github/workflows/ocr-pipeline.yml`
- AWS deploy config: `serverless.yml` (root) and `infra/aws/serverless.yml` (infra variant)
- GCP deploy config: `infra/gcp/main.tf` and `infra/gcp/deploy.sh`
- Monitoring dashboard: `infra/monitoring/grafana-dashboard.json`
- Security checklist: `docs/security-privacy-monitoring-checklist.md`
- Integration tests + fixture: `tests/integration/ocr.integration.test.mjs`, `tests/fixtures/receipts/`

## Node API endpoints

- `GET /health`
- `POST /ocr/upload-url`
- `POST /ocr/process-image`
  - multipart form-data (`file`)
  - JSON with `image_url` or `signed_upload_url`
  - JSON with `s3_bucket` + `s3_key`

Response schema:

```json
{
  "raw_text": "...",
  "corrected_text": "...",
  "items": [{ "name": "Milk", "qty": 1, "unit_price": 2.5, "total_price": 2.5 }],
  "total": 12.35,
  "date": "2026-04-21",
  "qr": [{ "type": "qr", "data": "upi://pay?..." }],
  "words": [{ "text": "TOTAL", "conf": 92.1, "bbox": { "x": 10, "y": 20, "width": 120, "height": 28 } }],
  "processing_time_ms": 713,
  "job_id": "7b902f8f-0ad4-4d67-bd42-5a3153af0baf"
}
```

## Local development

### 1) Start FastAPI worker

```bash
cd python_worker
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

### 2) Run Node OCR API locally

```bash
cd backend/src
npm install
set OCR_WORKER_URL=http://127.0.0.1:8080
set RECEIPT_UPLOAD_BUCKET=your-local-or-dev-bucket
node app.js
```

### 3) Web UI

Set `VITE_OCR_API_URL` in `.env.local` and run:

```bash
pnpm dev
```

Open `/ocr-pipeline`.

## FastAPI worker usage

### curl upload

```bash
curl -X POST http://127.0.0.1:8080/process-image \
  -F "file=@tests/fixtures/receipts/sample-receipt.png" \
  -F "psm=6" -F "oem=3" -F "mask_qr=true"
```

### CLI fallback

```bash
python python_worker/cli_ocr.py --input tests/fixtures/receipts/sample-receipt.png --psm 6 --oem 3 --mask-qr
```

## Signed URL flow (client fetch)

```ts
const signed = await fetch(`${API}/ocr/upload-url`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ file_name: file.name, mime_type: file.type }),
}).then((r) => r.json());

await fetch(signed.upload_url, {
  method: 'PUT',
  headers: signed.required_headers,
  body: file,
});

const result = await fetch(`${API}/ocr/process-image`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ s3_bucket: signed.s3_bucket, s3_key: signed.s3_key }),
}).then((r) => r.json());
```

## Supabase migration and RLS

Apply:

```bash
supabase migration up
```

Tables:

- `receipts(id, user_id, vendor, date, total, raw_text, corrected_text, qr_data, created_at, image_metadata, pii_hash)`
- `line_items(id, receipt_id, name, qty, unit_price, total_price, created_at)`
- `ocr_jobs(job_id, user_id, status, confidence_metrics, created_at, completed_at)`

RLS is enabled on all three tables with per-user isolation policies.

## Flutter module integration

Use `ReceiptCaptureReviewScreen` with shared endpoint/token:

```dart
final service = ReceiptOcrService(
  apiBaseUrl: const String.fromEnvironment('OCR_API_BASE_URL'),
  authToken: supabaseAccessToken,
);
Navigator.push(
  context,
  MaterialPageRoute(builder: (_) => ReceiptCaptureReviewScreen(service: service)),
);
```

Bridging strategy with Capacitor web app:

- Store one API base URL in remote config/env.
- Share Supabase JWT from your auth backend; do not share service-role keys.
- Use the same `Authorization: Bearer <user_jwt>` on both web and Flutter.

## Deployment

### AWS Lambda + S3

```bash
serverless deploy --stage prod
```

### Cloud Run + Pub/Sub + GCS

Terraform:

```bash
cd infra/gcp
terraform init
terraform apply -var-file=terraform.tfvars
```

or gcloud script:

```bash
PROJECT_ID=... REGION=us-central1 WORKER_IMAGE=... API_IMAGE=... ./deploy.sh
```

## CI pipeline

`.github/workflows/ocr-pipeline.yml` runs:

- TypeScript checks
- Python lint + unit tests
- Worker/API container builds
- Integration tests (when `OCR_API_BASE_URL` secret is configured)
- Optional deploy jobs (AWS + GCP)

## Troubleshooting

- Tesseract not found:
  - Linux: install `tesseract-ocr`
  - Windows: install Tesseract and set `TESSERACT_CMD` env var.
- `pyzbar` decode errors:
  - install `libzbar0` (Linux) or ZBar binaries (Windows/macOS).
- 403 on signed upload:
  - ensure request uses `PUT` and includes required headers from `/ocr/upload-url`.
- Supabase insert blocked:
  - verify user JWT is present and `auth.uid()` matches `user_id`.
- Poor OCR quality:
  - recapture with flat perspective, avoid shadows, ensure text fills frame.
  - use crop + auto-contrast before upload.
