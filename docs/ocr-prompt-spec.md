# OCR Prompt and Implementation Spec

This project now exposes a receipt OCR/QR schema aligned to:
- input sources: `camera`, `upload`, `gallery`, `qr_scanner`
- output objects: `raw_tokens`, `parsed_fields`, `confidences`, `processing_log`, `qr_payload`

## API request examples

### Multipart upload

```bash
curl -X POST http://localhost:8080/process-image \
  -F "file=@tests/fixtures/receipts/sample-receipt.png" \
  -F "source_type=upload" \
  -F "lang_hints=eng,hin" \
  -F "psm=6" -F "oem=3" -F "mask_qr=true"
```

### Blob path (JSON)

```bash
curl -X POST http://localhost:8080/process-image-from-path \
  -H "Content-Type: application/json" \
  -d '{"blob_path":"s3://bucket/key.png","source_type":"camera","lang_hints":["eng"],"psm":6,"oem":3,"mask_qr":true}'
```

## Response shape

```json
{
  "source_type": "upload",
  "raw_tokens": [{ "text": "Total", "bbox": {"x": 10, "y": 20, "width": 60, "height": 20}, "confidence": 0.95, "line_id": 12 }],
  "qr_payload": { "decoded_text": "upi://pay?...", "format": "QRCODE", "bbox": {"x": 100, "y": 80, "width": 120, "height": 120} },
  "parsed_fields": {
    "merchant": "ACME Store",
    "date": "2026-04-21",
    "invoice_no": "INV-2026/001",
    "total": 1234.5,
    "tax": 34.5,
    "currency": "INR",
    "line_items": [],
    "raw_text": "..."
  },
  "confidences": { "merchant": 0.94, "date": 0.88, "invoice_no": 0.89, "total": 0.95, "tax": 0.72, "qr": 1.0 },
  "processing_log": ["perspective_correction: applied=true", "deskew: angle=-1.2", "ocr: engine=pytesseract,lang=eng,psm=6,oem=3"]
}
```

## Regex rules used

- Date: `\b(?:\d{1,2}[\/\-.\s]\d{1,2}[\/\-.\s]\d{2,4}|\d{4}[\/\-.\s]\d{1,2}[\/\-.\s]\d{1,2})\b`
- Amount/currency: `(?P<currency>INR|Rs\.?|USD|EUR|GBP|AUD|CAD|SGD|JPY|\$|€|£|₹)?\s*(?P<amount>\d{1,3}(?:[ ,]\d{2,3})*(?:\.\d{1,2})?)`
- Invoice: `(?i)\b(?:invoice|inv|bill)\s*[:#]?\s*([A-Z0-9\-/]+)\b`

## Human-in-the-loop hook

Low-confidence tokens are emitted in metadata as:

- `metadata.low_confidence_threshold`
- `metadata.low_confidence_tokens`

This enables UI review workflows before persistence.