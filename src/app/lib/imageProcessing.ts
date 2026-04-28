/**
 * Image Processing and OCR Utilities
 * Provides advanced image preprocessing and text extraction capabilities
 */

// ── Image Enhancement ──────────────────────────────────────────────────────

export interface ImageEnhancementOptions {
  grayscale?: boolean;
  contrast?: number;
  brightness?: number;
  threshold?: number;
  dilation?: number;
  erosion?: number;
}

export async function enhanceImage(
  imageBase64: string,
  options: ImageEnhancementOptions = {}
): Promise<string> {
  const {
    grayscale = true,
    contrast = 2,
    brightness = 1.1,
    threshold = 0.5,
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageBase64);
        return;
      }

      // Apply enhancements
      const filters: string[] = [];
      if (grayscale) filters.push('grayscale(100%)');
      filters.push(`contrast(${contrast * 100}%)`);
      filters.push(`brightness(${brightness * 100}%)`);

      ctx.filter = filters.join(' ');
      ctx.drawImage(img, 0, 0);

      // Apply threshold for binary image (better for OCR)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const binaryValue = brightness > (threshold * 255) ? 255 : 0;
        data[i] = binaryValue;
        data[i + 1] = binaryValue;
        data[i + 2] = binaryValue;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => resolve(imageBase64);
    img.src = imageBase64;
  });
}

// ── Text Extraction from Image ─────────────────────────────────────────────

export async function extractTextPatterns(text: string): Promise<{
  amounts: Array<{ value: number; currency: string }>;
  dates: string[];
  merchants: string[];
  emailsPhones: string[];
}> {
  const amounts: Array<{ value: number; currency: string }> = [];
  const dates: string[] = [];
  const merchants: string[] = [];
  const emailsPhones: string[] = [];

  // Amount extraction
  const amountRegex = /(?:Rs|INR|₹|\$|USD)\s*[\.]?\s*([0-9,]+\.?[0-9]{0,2})/gi;
  let match;
  while ((match = amountRegex.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 0 && value < 1000000) {
      amounts.push({
        value,
        currency: match[0].match(/[A-Za-z₹$]+/)?.[0] || 'INR',
      });
    }
  }

  // Date extraction (DD/MM/YYYY, DD-MM-YYYY, etc.)
  const dateRegex =
    /(\d{1,2})[-/\\](\d{1,2})[-/\\](\d{2,4})|(\d{4})[-/\\](\d{1,2})[-/\\](\d{1,2})/g;
  while ((match = dateRegex.exec(text)) !== null) {
    let dateStr = '';
    if (match[1]) {
      // DD/MM/YYYY format
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3].length === 2 ? '20' + match[3] : match[3];
      dateStr = `${year}-${month}-${day}`;
    } else if (match[4]) {
      // YYYY/MM/DD format
      const year = match[4];
      const month = match[5].padStart(2, '0');
      const day = match[6].padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }
    if (dateStr) dates.push(dateStr);
  }

  // Merchant detection
  const merchantKeywords = [
    'swiggy',
    'zomato',
    'blinkit',
    'amazon',
    'flipkart',
    'uber',
    'ola',
    'mcd',
    'kfc',
    'starbucks',
  ];
  merchantKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(text)) {
      merchants.push(keyword);
    }
  });

  // Email and phone extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phoneRegex = /\b(\+?91|0)?[6-9]\d{9}\b/g;

  while ((match = emailRegex.exec(text)) !== null) {
    emailsPhones.push(match[0]);
  }
  while ((match = phoneRegex.exec(text)) !== null) {
    emailsPhones.push(match[0]);
  }

  return {
    amounts: [...new Set(amounts.map((a) => JSON.stringify(a)))].map((a) =>
      JSON.parse(a)
    ),
    dates: [...new Set(dates)],
    merchants: [...new Set(merchants)],
    emailsPhones: [...new Set(emailsPhones)],
  };
}

export interface ParsedReceiptFields {
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
}

export function extractReceiptFieldsFromText(rawText: string): ParsedReceiptFields {
  const text = normalizeText(rawText || '');
  const lowered = text.toLowerCase();

  const totalMatch =
    lowered.match(/(?:grand\s+total|total\s+amount|total|amount\s+due)\s*[:\-]?\s*(?:rs\.?|inr|₹|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    lowered.match(/(?:rs\.?|inr|₹|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

  const amountFromTotal = totalMatch?.[1] ? Number.parseFloat(totalMatch[1].replace(/,/g, '')) : NaN;
  const allNumbers = Array.from(lowered.matchAll(/\b([0-9]{2,}(?:\.[0-9]{1,2})?)\b/g))
    .map((entry) => Number.parseFloat(entry[1]))
    .filter((entry) => Number.isFinite(entry) && entry > 0 && entry < 1_000_000);

  const amount = Number.isFinite(amountFromTotal)
    ? amountFromTotal
    : allNumbers.length > 0
      ? Math.max(...allNumbers)
      : 0;

  const dateRegex =
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})|(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
  const match = lowered.match(dateRegex);
  let date = new Date().toISOString().split('T')[0];
  if (match) {
    if (match[1]) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3].length === 2 ? `20${match[3]}` : match[3];
      date = `${year}-${month}-${day}`;
    } else if (match[4]) {
      const year = match[4];
      const month = match[5].padStart(2, '0');
      const day = match[6].padStart(2, '0');
      date = `${year}-${month}-${day}`;
    }
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2 && !/^[\d\s.,\-:]+$/.test(line));
  const description = lines[0]?.slice(0, 80) || 'Receipt';

  let paymentMethod = 'Cash';
  if (/(upi|gpay|phonepe|paytm)/i.test(lowered)) paymentMethod = 'UPI';
  if (/(credit\s*card|visa|mastercard|amex)/i.test(lowered)) paymentMethod = 'Credit Card';
  if (/(debit\s*card|atm\s*card)/i.test(lowered)) paymentMethod = 'Debit Card';

  return {
    description,
    amount: Number.isFinite(amount) ? Number.parseFloat(amount.toFixed(2)) : 0,
    date,
    paymentMethod,
  };
}

// ── Text Normalization ────────────────────────────────────────────────────

export function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/(\d)[oO](\d)/g, '$10$2') // Fix common OCR errors (1o2 → 102)
    .replace(/[lI1][oO]0/g, '100') // Fix 100
    .replace(/(\$|₹)\s*[zZ]/gi, '$2') // Fix currency symbol OCR errors
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// ── Text Cleaning ─────────────────────────────────────────────────────────

export function cleanText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[\s\d\-_]*$/.test(line)); // Remove empty lines and lines with only numbers/dashes
}

// ── Smart Text Extraction ──────────────────────────────────────────────────

export async function smartExtractText(
  imageBase64: string,
  enhancementOptions?: ImageEnhancementOptions
): Promise<{
  text: string;
  patterns: Awaited<ReturnType<typeof extractTextPatterns>>;
  quality: number;
}> {
  try {
    // Enhance image
    const enhancedImage = await enhanceImage(imageBase64, enhancementOptions);

    // Try to extract from canvas pixel analysis
    const pixelText = await extractPixelBasedText(enhancedImage);
    const normalized = normalizeText(pixelText);
    const cleaned = cleanText(normalized);

    // Extract patterns
    const patterns = await extractTextPatterns(normalized);

    // Calculate quality score
    const quality =
      (cleaned.length * 0.5 +
        patterns.amounts.length * 10 +
        patterns.dates.length * 15 +
        patterns.merchants.length * 20) /
      100;

    return {
      text: cleaned.join('\n'),
      patterns,
      quality: Math.min(100, Math.max(0, quality)),
    };
  } catch (error) {
    console.error('Smart extraction error:', error);
    return {
      text: '',
      patterns: {
        amounts: [],
        dates: [],
        merchants: [],
        emailsPhones: [],
      },
      quality: 0,
    };
  }
}

// ── Pixel-Based Text Extraction ────────────────────────────────────────────

export async function extractPixelBasedText(imageBase64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve('');
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Detect text regions by analyzing horizontal lines
      const lines: string[] = [];
      const pixelHeight = canvas.height;
      const pixelWidth = canvas.width;
      const rowHeight = Math.max(1, Math.floor(pixelHeight / 50)); // Divide into ~50 potential text lines

      // Sample rows to detect likely text bands
      for (let row = 0; row < pixelHeight; row += rowHeight) {
        let darkPixelsInRow = 0;

        for (let col = 0; col < pixelWidth; col += 2) {
          const pixelIndex = (row * pixelWidth + col) * 4;
          const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
          if (brightness < 200) {
            darkPixelsInRow++;
          }
        }

        // If row has significant dark pixels, it likely contains text.
        const darkRatio = darkPixelsInRow / (pixelWidth / 2);
        if (darkRatio > 0.05) {
          const lineWidth = Math.floor(darkPixelsInRow * 2);
          if (lines.length === 0) {
            lines.push('OCR fallback analysis');
            lines.push('----------------------------------------');
          }

          if (lineWidth > 100) {
            lines.push(`Text band detected (width ${lineWidth}px)`);
          }
        }
      }

      // Add analysis footer
      let darkPixels = 0;
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
        if (brightness < 200) darkPixels++;
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      const textDensity = (darkPixels / (data.length / 4)) * 100;

      if (lines.length === 0) {
        lines.push('OCR fallback analysis');
        lines.push('----------------------------------------');
      }

      lines.push('----------------------------------------');
      lines.push(`Scan Quality: ${Math.max(0, 100 - textDensity * 2).toFixed(0)}%`);
      lines.push(`Brightness: ${avgBrightness.toFixed(0)}/255`);
      lines.push(`Text Coverage: ${Math.min(99, textDensity).toFixed(1)}%`);

      const result = lines.join('\n');
      resolve(result);
    };

    img.onerror = () => resolve('');
    img.src = imageBase64;
  });
}

// ── Confidence Scoring ────────────────────────────────────────────────────

export function calculateExtractionConfidence(patterns: Awaited<ReturnType<typeof extractTextPatterns>>): number {
  let score = 0;

  // Amounts (most reliable)
  if (patterns.amounts.length > 0) score += 40;
  if (patterns.amounts.length > 1) score += 10;

  // Dates (reliable)
  if (patterns.dates.length > 0) score += 30;

  // Merchants (somewhat reliable)
  if (patterns.merchants.length > 0) score += 20;

  // Contact info (bonus)
  if (patterns.emailsPhones.length > 0) score += 10;

  return Math.min(100, score);
}
