export interface OcrWord {
  text: string;
  normalized_text?: string;
  conf: number;
  confidence?: number;
  line_id?: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrRawToken {
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  line_id?: number;
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
  decoded_text?: string;
  format?: string;
  parsed_payload?: Record<string, unknown> | null;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrParsedFields {
  merchant: string | null;
  date: string | null;
  invoice_no: string | null;
  total: number;
  tax: number | null;
  currency: string | null;
  line_items: OcrLineItem[];
  raw_text: string;
}

export interface OcrFieldConfidences {
  merchant: number;
  date: number;
  invoice_no: number;
  total: number;
  tax: number;
  qr: number;
}

export interface OcrProcessResponse {
  source_type?: string;
  raw_text: string;
  corrected_text: string;
  raw_tokens: OcrRawToken[];
  parsed_fields: OcrParsedFields;
  confidences: OcrFieldConfidences;
  items: OcrLineItem[];
  total: number;
  date: string | null;
  qr: OcrQrResult[];
  qr_payload?: OcrQrResult | null;
  words: OcrWord[];
  processing_log: string[];
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