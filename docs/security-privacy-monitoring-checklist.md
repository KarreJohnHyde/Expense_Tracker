# Security, Privacy, and Monitoring Checklist

## Transport and upload security
- [x] HTTPS-only endpoints for Node API and FastAPI worker.
- [x] Signed upload URLs (`POST /ocr/upload-url`) with short TTL (300s).
- [x] File type and size validation in Lambda (`ALLOWED_MIME_TYPES`, `MAX_FILE_BYTES`).

## Data at rest protections
- [x] S3 server-side encryption (`AES256`) for upload bucket and signed uploads.
- [x] Optional GCS CMEK support in Terraform (`kms_key_name`).
- [x] Bucket public access blocked in `infra/aws/serverless.yml`.

## PII handling
- [x] Backend redaction (`[REDACTED_CARD]`, `[REDACTED_EMAIL]`) before storage.
- [x] SHA-256 hash persisted (`pii_hash`) instead of raw identifiers.
- [x] Raw OCR text limited to business usage fields.

## Auth, RBAC, and RLS
- [x] Supabase RLS enabled for `receipts`, `line_items`, `ocr_jobs`.
- [x] Per-user policies use `(select auth.uid()) = user_id`.
- [x] `line_items` policies enforce ownership through parent `receipts` row.

## Secrets and key management
- [x] Workflow expects cloud credentials from GitHub Secrets / OIDC.
- [x] No hardcoded cloud keys in repository files.
- [ ] Configure secret rotation schedule in AWS Secrets Manager / GCP Secret Manager.

## Monitoring and alerting
- [x] FastAPI exposes `/metrics` with Prometheus counters/histograms.
- [x] Grafana dashboard JSON provided (`infra/monitoring/grafana-dashboard.json`).
- [ ] Add alert rules:
  - OCR failure rate > 5% over 10m.
  - p95 processing latency > 8s over 10m.
  - average confidence < 60 over 30m.

## Audit logging
- [x] Lambda request logging includes request ID and client IP.
- [x] Worker logs job IDs and processing metadata.
- [ ] Route logs to centralized sink (CloudWatch / GCP Logging) and enable retention policy.