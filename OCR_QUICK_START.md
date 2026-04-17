# Quick Start: OCR Receipt Scanning

## Setup

### 1. Ensure Dependencies are Installed

```bash
pnpm install
```

### 2. Verify Supabase Configuration

The application requires Supabase credentials in environment variables:

```env
# .env.local or vite.config.ts
VITE_SUPABASE_URL=https://yghrnwlwfdadlnzhqhdp.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

## Testing the OCR Feature

### Option 1: Start Development Server

```bash
pnpm dev
```

Then navigate to: `http://localhost:5174` (or your dev port)

### Option 2: Build and Preview

```bash
pnpm build
pnpm preview
```

## Using the Scanner

### Step 1: Navigate to Scan Receipt

1. Open the application
2. Go to "Scan Receipt" from the menu
3. Click on "Advanced Cloud Scanner"

### Step 2: Choose Input Method

- **Receipt Scan**: Use device camera to photograph receipt
- **Upload Image**: Select image from device storage
- **QR Scanner**: Scan QR codes from receipts

### Step 3: Capture/Upload Image

**Camera Method:**
1. Click "Open Camera"
2. Position receipt in frame
3. Click "Capture Image"
4. Wait for OCR processing

**Upload Method:**
1. Click "Upload Image"
2. Select receipt image file
3. Wait for processing

### Step 4: Review Extracted Data

The system will display:

- **Raw Character Buffer**: Full extracted text
- **AI Extracted JSON**: Structured data
  - Merchant/Description
  - Detected Amount (₹)
  - Category
  - Date of Purchase

### Step 5: Verify and Edit

- Review all extracted fields
- Manually edit any incorrect data
- Correct amounts, dates, categories as needed

### Step 6: Save to Database

Click "Save to Database / Cloud" to:
1. Upload receipt image
2. Save expense record
3. Sync with backend
4. Navigate to Gallery

## Test Scenarios

### Scenario 1: Clear Blinkit Receipt

**What to do:**
1. Find or photograph a Blinkit receipt
2. Ensure text is clearly visible
3. Good lighting, no blur

**Expected Results:**
- Merchant: "Blinkit"
- Amount: Correctly extracted
- Category: "Food & Dining"
- Date: Extracted from receipt

### Scenario 2: Restaurant Receipt

**What to do:**
1. Use a restaurant/café receipt
2. Capture with phone camera
3. Accept default if unclear

**Expected Results:**
- Merchant: Restaurant name
- Category: "Food & Dining"
- Amount: Bill total
- Date: Current date (if not on receipt)

### Scenario 3: Blurry Image

**What to do:**
1. Intentionally blur the photo
2. Proceed with processing

**Expected Results:**
- Partial extraction
- Lower confidence score
- Ability to manually edit

### Scenario 4: No Internet

**What to do:**
1. Disconnect network (or use offline mode)
2. Upload image
3. Proceed with extraction

**Expected Results:**
- Local extraction only (no Edge Function)
- Still provides text extraction
- Regex-based data matching
- App remains functional

## Features to Verify

### ✓ Image Processing
- [ ] Binarization (grayscale conversion)
- [ ] Contrast enhancement
- [ ] Brightness adjustment
- [ ] Result visible in Raw Character Buffer

### ✓ Text Extraction
- [ ] Merchant detection
- [ ] Amount extraction
- [ ] Date parsing
- [ ] Category classification

### ✓ Fallback Handling
- [ ] Supabase Edge Function (if available)
- [ ] Local smart extraction
- [ ] Regex fallback
- [ ] Manual entry fallback

### ✓ Data Accuracy
- [ ] Correct merchant names
- [ ] Accurate amounts
- [ ] Proper date formats
- [ ] Correct categories

### ✓ Error Handling
- [ ] Network errors
- [ ] Invalid images
- [ ] Missing data fields
- [ ] Graceful degradation

## Command Reference

```bash
# Development
pnpm dev              # Start dev server
pnpm dev:host        # Dev server accessible on network

# Building
pnpm build           # Production build
pnpm build:native    # Native mobile build

# Testing
pnpm preview         # Preview production build

# Deployment
pnpm deploy:vercel   # Deploy to Vercel
```

## Troubleshooting

### "Local extraction failed: Worker Network Error"

**Cause:** Tesseract.js CDN not accessible

**Fix:**
1. Check internet connection
2. Try again - system will use regex fallback
3. Image may still be extracted successfully

**Verify:**
1. Check "Raw Character Buffer" section
2. Review extracted amounts/dates
3. Manually verify if needed

### "Edge service unavailable"

**Cause:** Supabase service temporarily down

**Fix:**
1. System automatically switches to local extraction
2. Try again after a moment
3. Manual entry is always available

### Empty "Raw Character Buffer"

**Cause:** Image too dark/blurry or completely blank

**Fix:**
1. Retake photo with better lighting
2. Ensure receipt is in frame
3. Avoid shadows and reflections
4. Manually enter amounts

### Wrong Category Classification

**Cause:** Merchant name not recognized or unclear

**Fix:**
1. Verify merchant name is correct
2. Manually select correct category from dropdown
3. Save - system will learn pattern

## Advanced: Local Testing Without Cloud

You can test the regex extraction locally:

```javascript
// In browser console
const testText = `
Blinkit - India's Last Minute App
Order #12345
Date: 17-04-2026 01:56 PM

Items:
Milk - 65.00
Bread - 45.00
Butter - 55.00

Total: ₹ 165.00
Payment: Cash
`;

// Test extraction
const result = fallbackRegexExtraction(testText);
console.log(result);
// Output: { Description: 'Blinkit', Amount: 165, Category: 'Food & Dining', ... }
```

## Next Steps

After successful testing:

1. **Configure in Production**
   - Set Supabase environment variables
   - Deploy Edge Functions
   - Test with real users

2. **Gather Feedback**
   - Monitor extraction accuracy
   - Track user corrections
   - Identify patterns

3. **Improve Recognition**
   - Add more merchant keywords
   - Fine-tune regex patterns
   - Consider ML model training

## Support Resources

- Documentation: See `OCR_RECEIPT_SCANNING.md`
- Browser Console: Check for detailed error logs
- Network Tab: Inspect Edge Function calls
- Application Logs: Check Supabase console

---

**Last Updated:** April 17, 2026
**System Status:** ✓ Operational
