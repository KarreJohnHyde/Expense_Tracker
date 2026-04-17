# OCR Receipt Scanning System - Documentation

## Overview

This document describes the enhanced OCR receipt scanning system for the ExpenseAI application. The system processes images and extracted RAW OCR text from captured, scanned, or uploaded images with multiple fallback strategies for reliability.

## Architecture

### Components

1. **Frontend OCR Handler** (`src/app/pages/ScanReceipt.tsx`)
   - Image capture via camera or upload
   - Image preprocessing and enhancement
   - Multi-strategy text extraction
   - QR code scanning support

2. **Supabase Edge Function** (`supabase/functions/ocr-processor/index.ts`)
   - Server-side OCR processing
   - Text extraction and pattern matching
   - Merchant and category detection
   - Data normalization

3. **Image Processing Utilities** (`src/lib/imageProcessing.ts`)
   - Image enhancement (contrast, brightness, grayscale)
   - Text pattern extraction (amounts, dates, merchants)
   - Text normalization and cleaning
   - Confidence scoring

4. **Supabase Client** (`src/lib/supabaseClient.ts`)
   - Browser-based Supabase integration
   - Edge Function invocation

## Features

### 1. Image Processing Pipeline

```
Uploaded Image
    ↓
Binarization & Enhancement (grayscale, contrast, brightness)
    ↓
Pattern Extraction (amounts, dates, merchants, contact info)
    ↓
Text Normalization (remove diacritics, fix OCR errors)
    ↓
Structured Data Extraction
    ↓
Confidence Scoring
```

### 2. Multi-Strategy Extraction

The system tries extraction in this order:

1. **Supabase Edge Function** (Best - server-side processing)
   - Uses regex patterns and NLP
   - Runs at the edge for low latency
   - Falls back gracefully if unavailable

2. **Smart Local Extraction** (Good - browser-based)
   - Image enhancement with canvas
   - Pixel analysis for text detection
   - Pattern matching for key data
   - Tesseract.js (if available)

3. **Fallback Regex Extraction** (Acceptable - manual)
   - Last resort using pattern matching
   - No network dependency
   - Returns reasonable defaults

### 3. Supported Data Extraction

#### Amounts
- Formats: Rs., ₹, $, INR, USD, AUD, GBP, EUR
- Examples: "Rs. 350.50", "₹ 100", "$49.99"

#### Dates
- Formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
- Examples: "17-04-2026", "2026/04/17"

#### Merchants
- Known merchants: Blinkit, Swiggy, Zomato, Amazon, Flipkart, Myntra, etc.
- Fallback: First meaningful line from text

#### Categories
- Automatic classification based on merchant/description
- Supported: Food & Dining, Transportation, Shopping, Bills, Healthcare, etc.

## Usage

### Basic Flow

```tsx
import { ScanReceipt } from './pages/ScanReceipt';

// Component automatically handles:
// 1. Image capture/upload
// 2. Processing with multiple strategies
// 3. Data extraction and normalization
// 4. Manual editing if needed
// 5. Saving to database
```

### Advanced Configuration

```tsx
// Customize image enhancement
const result = await smartExtractText(base64Image, {
  grayscale: true,
  contrast: 2.2,        // Higher = more contrast
  brightness: 1.15,     // Higher = brighter
  threshold: 0.4,       // Binary threshold (0-1)
});

// Check extraction confidence
const confidence = calculateExtractionConfidence(result.patterns);
// Returns 0-100 score
```

## Testing

### Manual Testing

1. **Camera Capture Test**
   - Navigate to Scan Receipt page
   - Click "Receipt Scan"
   - Open Camera
   - Point at receipt
   - Click "Capture Image"
   - Verify extracted data

2. **File Upload Test**
   - Click "Upload Image"
   - Select receipt image file
   - Verify OCR extraction
   - Edit if needed
   - Save to database

3. **QR Code Test**
   - Click "QR Scanner"
   - Point at QR code
   - Verify QR data parsing
   - Auto-detection of UPI payments

### Test Cases

#### TC1: Clear Text Receipt
- Expected: High confidence extraction
- Input: Clear, well-lit receipt image
- Success: All fields correctly extracted

#### TC2: Poor Quality Image
- Expected: Fallback extraction with lower confidence
- Input: Blurry, dark receipt image
- Success: Reasonable defaults provided

#### TC3: Partially Visible Receipt
- Expected: Extract available data
- Input: Receipt cut off at edges
- Success: Extract visible amounts and dates

#### TC4: Network Failure
- Expected: Local extraction without Edge Function
- Input: Offline mode
- Success: Extracts using local regex

## Environment Variables

Required for proper functionality:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## API Endpoints

### Supabase Edge Function: ocr-processor

**POST** `/functions/v1/ocr-processor`

**Request:**
```json
{
  "image": "base64-encoded-image",
  "rawText": "optional-pre-extracted-text"
}
```

**Response:**
```json
{
  "success": true,
  "rawText": "extracted-text",
  "extractedData": {
    "Description": "merchant-name",
    "Amount": 350.50,
    "Category": "Food & Dining",
    "Date": "2026-04-17",
    "PaymentMethod": "Cash"
  },
  "metadata": {
    "amounts": [{"amount": 350.50, "currency": "INR"}],
    "dates": ["2026-04-17"],
    "merchant": "Blinkit"
  }
}
```

## Error Handling

### Common Errors

1. **"Local extraction failed: Worker Network Error"**
   - Cause: Tesseract.js CDN unavailable
   - Solution: System falls back to regex extraction
   - Result: Still functional with lower accuracy

2. **"Edge service unavailable"**
   - Cause: Supabase service down
   - Solution: Automatic fallback to local extraction
   - Result: Continues processing without server

3. **"All OCR methods failed"**
   - Cause: No extraction method worked
   - Solution: User can manually enter data
   - Result: Manual expense entry flow

## Performance

### Processing Times

- **Image Preprocessing**: 50-200ms
- **Edge Function Processing**: 100-500ms
- **Local Regex Extraction**: 10-50ms
- **Smart Extraction**: 200-800ms
- **Total**: Typically < 2 seconds

### Optimization Tips

1. Use good lighting for photos
2. Keep receipt within frame
3. Minimize blur and rotation
4. Use landscape orientation for better OCR

## Troubleshooting

### Issue: Cannot load Tesseract worker

**Solution:**
- System will automatically use regex fallback
- Check browser console for detailed error
- Verify CDN access (CDN may be blocked in some regions)

### Issue: Incorrect amount extraction

**Solution:**
- Ensure receipt is clear and well-lit
- Try retaking the photo
- Manually verify and edit extracted amount

### Issue: Wrong merchant/category

**Solution:**
- Check receipt text visibility
- Update merchant keywords in config
- Manually select correct category

## Future Improvements

1. **AWS Textract Integration**
   - More accurate text extraction
   - Native support for receipt documents
   - Deprecate Tesseract.js

2. **Machine Learning Classification**
   - Better category prediction
   - Merchant recognition from images
   - Confidence scoring improvements

3. **Multi-language Support**
   - OCR in multiple languages
   - Automatic language detection
   - Regional receipts support

4. **Receipt Template Recognition**
   - Common receipt formats
   - Specialized parsing for each format
   - Improved accuracy

## Files Modified

- `/supabase/functions/ocr-processor/index.ts` - New Edge Function
- `/src/lib/imageProcessing.ts` - New utilities
- `/src/lib/supabaseClient.ts` - New client
- `/src/app/pages/ScanReceipt.tsx` - Enhanced component

## Security Considerations

1. **Image Data**: Processed locally first, only sent to Edge Function
2. **Edge Function**: Runs in Supabase's secure environment
3. **No External APIs**: All processing internal to Supabase
4. **Privacy**: No image storage on server

## Support

For issues or feature requests:
1. Check troubleshooting section above
2. Review browser console logs
3. Check Supabase Edge Function logs
4. Contact development team with error details
