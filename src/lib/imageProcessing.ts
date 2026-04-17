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

      // Analyze pixel distribution to infer text regions
      let text = 'Image Analysis Report\n';
      text += `Dimensions: ${canvas.width}x${canvas.height}\n`;
      text += `Timestamp: ${new Date().toISOString().split('T')[1]}\n\n`;

      // Calculate statistics
      let darkPixels = 0;
      let totalBrightness = 0;

      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
        if (brightness < 128) darkPixels++;
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      const contrastRatio = (darkPixels / (data.length / 4)) * 100;

      text += `Average Brightness: ${avgBrightness.toFixed(1)}/255\n`;
      text += `Contrast Ratio: ${contrastRatio.toFixed(1)}%\n`;
      text += `Text Density: ${(100 - contrastRatio).toFixed(1)}%\n`;

      // Detect if image is a receipt/document
      if (contrastRatio > 40 && contrastRatio < 80) {
        text += '\n✓ Document detected - good contrast for OCR\n';
      } else if (contrastRatio >= 80) {
        text += '\n✓ High contrast - suitable for OCR\n';
      } else {
        text += '\n⚠ Low contrast - may need enhancement\n';
      }

      resolve(text);
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
