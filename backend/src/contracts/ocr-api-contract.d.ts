export interface OcrWord {
  text: string;
  conf: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrLineItem {
  name: string;
  qty?: number;
  unit_price?: number;
  total_price?: number;
  confidence?: number;
}

export interface OcrQrResult {
  type: 'qr' | 'barcode';
  data: string;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrProcessResponse {
  raw_text: string;
  corrected_text: string;
  items: OcrLineItem[];
  total: number;
  date: string | null;
  qr: OcrQrResult[];
  words: OcrWord[];
  processing_time_ms: number;
  job_id: string;
  metadata?: Record<string, unknown>;
  storage?: {
    bucket: string;
    key: string;
  } | null;
}

export interface SignedUploadUrlResponse {
  upload_url: string;
  s3_bucket: string;
  s3_key: string;
  expires_in_seconds: number;
  method: 'PUT';
  required_headers: Record<string, string>;
}

export interface ProcessImageFromS3Request {
  s3_bucket: string;
  s3_key: string;
}

export interface ProcessImageFromUrlRequest {
  image_url: string;
}