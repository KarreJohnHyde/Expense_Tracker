import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const API_BASE_URL = process.env.OCR_API_BASE_URL;
const fixturePath = path.resolve('tests/fixtures/receipts/sample-receipt.png');

const hasApi = Boolean(API_BASE_URL);

function skipIfNoApi(t) {
  if (!hasApi) {
    t.skip('Set OCR_API_BASE_URL to run integration tests against deployed API');
    return true;
  }
  return false;
}

test('multipart upload returns structured OCR payload', async (t) => {
  if (skipIfNoApi(t)) return;

  const bytes = await fs.readFile(fixturePath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'sample-receipt.png');

  const response = await fetch(`${API_BASE_URL}/ocr/process-image`, {
    method: 'POST',
    body: form,
  });

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(typeof payload.job_id, 'string');
  assert.equal(Array.isArray(payload.words), true);
  assert.equal(Array.isArray(payload.qr), true);
  assert.equal(typeof payload.processing_time_ms, 'number');
});

test('signed URL flow: create URL, upload asset, process from s3 key', async (t) => {
  if (skipIfNoApi(t)) return;

  const createResponse = await fetch(`${API_BASE_URL}/ocr/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_name: 'sample-receipt.png', mime_type: 'image/png' }),
  });

  assert.equal(createResponse.status, 200);
  const signed = await createResponse.json();

  const bytes = await fs.readFile(fixturePath);
  const uploadResponse = await fetch(signed.upload_url, {
    method: signed.method || 'PUT',
    headers: signed.required_headers,
    body: bytes,
  });

  assert.equal(uploadResponse.ok, true);

  const processResponse = await fetch(`${API_BASE_URL}/ocr/process-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3_bucket: signed.s3_bucket, s3_key: signed.s3_key }),
  });

  assert.equal(processResponse.status, 200);
  const payload = await processResponse.json();
  assert.equal(typeof payload.corrected_text, 'string');
});
