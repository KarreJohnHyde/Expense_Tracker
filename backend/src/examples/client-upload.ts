import type {
  OcrProcessResponse,
  SignedUploadUrlResponse,
} from '../contracts/ocr-api-contract';

const API_BASE_URL = import.meta.env.VITE_OCR_API_URL ?? 'https://<api-id>.execute-api.<region>.amazonaws.com';

export async function getSignedUploadUrl(file: File): Promise<SignedUploadUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/ocr/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_name: file.name, mime_type: file.type }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create signed URL: ${response.status}`);
  }

  return response.json();
}

export async function uploadToSignedUrl(file: File, signed: SignedUploadUrlResponse): Promise<void> {
  const uploadResponse = await fetch(signed.upload_url, {
    method: signed.method,
    headers: signed.required_headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Signed upload failed: ${uploadResponse.status}`);
  }
}

export async function processUploadedImage(s3Bucket: string, s3Key: string): Promise<OcrProcessResponse> {
  const response = await fetch(`${API_BASE_URL}/ocr/process-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3_bucket: s3Bucket, s3_key: s3Key }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OCR process failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function processMultipartImage(file: File): Promise<OcrProcessResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/ocr/process-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OCR multipart request failed: ${response.status} ${body}`);
  }

  return response.json();
}