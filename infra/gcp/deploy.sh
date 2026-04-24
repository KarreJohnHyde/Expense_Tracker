#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
REGION="${REGION:-us-central1}"
WORKER_IMAGE="${WORKER_IMAGE:?WORKER_IMAGE is required}"
API_IMAGE="${API_IMAGE:?API_IMAGE is required}"

BUCKET="${PROJECT_ID}-expense-receipts"
TOPIC="ocr-jobs"

gcloud config set project "$PROJECT_ID"

gcloud services enable run.googleapis.com pubsub.googleapis.com storage.googleapis.com

gsutil mb -l "$REGION" "gs://${BUCKET}" || true
gsutil versioning set on "gs://${BUCKET}"

gcloud pubsub topics create "$TOPIC" || true

gcloud run deploy expense-ocr-worker \
  --image "$WORKER_IMAGE" \
  --region "$REGION" \
  --allow-unauthenticated

WORKER_URL="$(gcloud run services describe expense-ocr-worker --region "$REGION" --format='value(status.url)')"

gcloud run deploy expense-ocr-node-api \
  --image "$API_IMAGE" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "OCR_WORKER_URL=${WORKER_URL},RECEIPT_UPLOAD_BUCKET=${BUCKET}"