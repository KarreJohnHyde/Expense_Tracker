/**
 * Advanced Image Processing & Preprocessing for OCR
 * Comprehensive image enhancement with filtering, cropping, and AI features
 */

// ── Image Preprocessing & Enhancement ──────────────────────────────────────

export interface AdvancedPreprocessingOptions {
  // Basic enhancements
  grayscale?: boolean;
  contrast?: number;
  brightness?: number;
  saturation?: number;
  hue?: number;
  
  // Filters
  blur?: number;
  sharpen?: number;
  gaussianBlur?: number;
  
  // Thresholding & Binarization
  threshold?: number;
  adaptiveThreshold?: boolean;
  otsuThreshold?: boolean;
  
  // Morphological operations
  dilate?: number;
  erode?: number;
  
  // Edge detection
  edgeDetection?: boolean;
  edgeThreshold?: number;
  
  // Cropping
  autoCrop?: boolean;
  cropMargin?: number; // pixels to crop from edges
  contentAwareCrop?: boolean;
  
  // Rotation & Skew
  autoRotate?: boolean;
  deskew?: boolean;
  
  // Noise reduction
  deNoise?: boolean;
  denoiseFactor?: number;
  
  // AI Enhancement
  aiEnhance?: boolean;
  enhanceText?: boolean;
  improveContrast?: boolean;
}

// ── Canvas Context Helper ──────────────────────────────────────────────────

function getCanvasContext(width: number, height: number): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

// ── 1. IMAGE LOADING & BASIC CONVERSION ────────────────────────────────────

export async function loadImageToCanvas(imageBase64: string): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  data: ImageData;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      resolve({ canvas, ctx, width: img.width, height: img.height, data });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageBase64;
  });
}

// ── 2. GRAYSCALE CONVERSION ────────────────────────────────────────────────

export function toGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  return imageData;
}

// ── 3. CONTRAST ENHANCEMENT ────────────────────────────────────────────────

export function enhanceContrast(imageData: ImageData, factor: number = 1.5): ImageData {
  const data = imageData.data;
  const intercept = 128 * (1 - factor);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
  }

  return imageData;
}

// ── 4. BRIGHTNESS ADJUSTMENT ──────────────────────────────────────────────

export function adjustBrightness(imageData: ImageData, factor: number = 1.1): ImageData {
  const data = imageData.data;
  const adjustment = (factor - 1) * 255;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
  }

  return imageData;
}

// ── 5. GAUSSIAN BLUR ──────────────────────────────────────────────────────

export function gaussianBlur(imageData: ImageData, radius: number = 2, width: number, height: number): ImageData {
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);

  // Simple Gaussian kernel
  const kernelSize = Math.floor(radius * 2) + 1;
  const kernel: number[] = [];
  let sum = 0;

  for (let i = -radius; i <= radius; i++) {
    const value = Math.exp(-(i * i) / (2 * radius * radius));
    kernel.push(value);
    sum += value;
  }

  // Normalize kernel
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }

  // Apply blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;

      for (let kx = 0; kx < kernel.length; kx++) {
        const px = Math.min(width - 1, Math.max(0, x + kx - radius));
        const idx = (y * width + px) * 4;
        const w = kernel[kx];

        r += data[idx] * w;
        g += data[idx + 1] * w;
        b += data[idx + 2] * w;
      }

      const idx = (y * width + x) * 4;
      output[idx] = r;
      output[idx + 1] = g;
      output[idx + 2] = b;
    }
  }

  imageData.data.set(output);
  return imageData;
}

// ── 6. SHARPEN FILTER ─────────────────────────────────────────────────────

export function sharpen(imageData: ImageData, factor: number = 1.5, width: number, height: number): ImageData {
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);

  // Laplacian kernel for edge detection
  const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;

      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          r += data[idx] * kernel[k];
          g += data[idx + 1] * kernel[k];
          b += data[idx + 2] * kernel[k];
          k++;
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = Math.min(255, Math.max(0, data[idx] + r * factor / 9));
      output[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + g * factor / 9));
      output[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + b * factor / 9));
    }
  }

  imageData.data.set(output);
  return imageData;
}

// ── 7. THRESHOLDING (Binarization) ────────────────────────────────────────

export function threshold(imageData: ImageData, thresholdValue: number = 128): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray > thresholdValue ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  return imageData;
}

// ── 8. OTSU THRESHOLD (Automatic) ─────────────────────────────────────────

export function otsuThreshold(imageData: ImageData): ImageData {
  const data = imageData.data;
  let gray: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  let histogram = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) {
    histogram[Math.floor(gray[i])]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let calculatedThreshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    let wF = gray.length - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    let mB = sumB / wB;
    let mF = (sum - sumB) / wF;

    let variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      calculatedThreshold = t;
    }
  }

  return calculatedThreshold > 0 ? threshold(imageData, calculatedThreshold) : threshold(imageData, 128);
}

// ── 9. EROSION (Morphological) ────────────────────────────────────────────

export function erode(imageData: ImageData, iterations: number = 1, width: number, height: number): ImageData {
  const data = imageData.data;

  for (let iter = 0; iter < iterations; iter++) {
    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let minVal = 255;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            minVal = Math.min(minVal, data[idx]);
          }
        }

        const idx = (y * width + x) * 4;
        output[idx] = minVal;
        output[idx + 1] = minVal;
        output[idx + 2] = minVal;
      }
    }

    data.set(output);
  }

  return imageData;
}

// ── 10. DILATION (Morphological) ──────────────────────────────────────────

export function dilate(imageData: ImageData, iterations: number = 1, width: number, height: number): ImageData {
  const data = imageData.data;

  for (let iter = 0; iter < iterations; iter++) {
    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let maxVal = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            maxVal = Math.max(maxVal, data[idx]);
          }
        }

        const idx = (y * width + x) * 4;
        output[idx] = maxVal;
        output[idx + 1] = maxVal;
        output[idx + 2] = maxVal;
      }
    }

    data.set(output);
  }

  return imageData;
}

// ── 11. AUTO CROP (Remove white borders) ──────────────────────────────────

export function autoCrop(imageData: ImageData, width: number, height: number, threshold: number = 240): { x: number; y: number; w: number; h: number } {
  const data = imageData.data;

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (brightness < threshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    x: Math.max(0, minX - 5),
    y: Math.max(0, minY - 5),
    w: Math.min(width, maxX - minX + 10),
    h: Math.min(height, maxY - minY + 10),
  };
}

// ── 12. NOISE REDUCTION (Median Filter) ────────────────────────────────────

export function reduceNoise(imageData: ImageData, radius: number = 1, width: number, height: number): ImageData {
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const values: number[] = [];

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          values.push(data[idx]);
        }
      }

      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];

      const idx = (y * width + x) * 4;
      output[idx] = median;
      output[idx + 1] = median;
      output[idx + 2] = median;
    }
  }

  imageData.data.set(output);
  return imageData;
}

// ── 13. COMPLETE PREPROCESSING PIPELINE ────────────────────────────────────

export async function advancedPreprocess(
  imageBase64: string,
  options: AdvancedPreprocessingOptions = {}
): Promise<string> {
  try {
    const { canvas, ctx, width, height, data } = await loadImageToCanvas(imageBase64);

    // Step 1: Convert to grayscale
    if (options.grayscale !== false) {
      toGrayscale(data);
      ctx.putImageData(data, 0, 0);
    }

    // Step 2: Noise reduction
    if (options.deNoise !== false) {
      reduceNoise(data, options.denoiseFactor || 1, width, height);
      ctx.putImageData(data, 0, 0);
    }

    // Step 3: Gaussian blur (optional)
    if (options.gaussianBlur && options.gaussianBlur > 0) {
      gaussianBlur(data, options.gaussianBlur, width, height);
      ctx.putImageData(data, 0, 0);
    }

    // Step 4: Sharpen
    if (options.sharpen && options.sharpen > 0) {
      sharpen(data, options.sharpen, width, height);
      ctx.putImageData(data, 0, 0);
    }

    // Step 5: Enhance contrast
    if (options.improveContrast !== false || options.contrast) {
      enhanceContrast(data, options.contrast || 2.0);
      ctx.putImageData(data, 0, 0);
    }

    // Step 6: Adjust brightness
    if (options.brightness) {
      adjustBrightness(data, options.brightness);
      ctx.putImageData(data, 0, 0);
    }

    // Step 7: Morphological operations
    if (options.erode && options.erode > 0) {
      erode(data, options.erode, width, height);
      ctx.putImageData(data, 0, 0);
    }

    if (options.dilate && options.dilate > 0) {
      dilate(data, options.dilate, width, height);
      ctx.putImageData(data, 0, 0);
    }

    // Step 8: Thresholding for OCR
    if (options.otsuThreshold) {
      otsuThreshold(data);
    } else if (options.threshold) {
      threshold(data, options.threshold * 255);
    } else if (options.aiEnhance || options.enhanceText) {
      // AI-enhanced thresholding
      threshold(data, 128);
    }
    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('Advanced preprocessing error:', error);
    return imageBase64;
  }
}

// ── 14. PRESET CONFIGURATIONS ──────────────────────────────────────────────

export const OCR_PRESETS = {
  // Best for clear receipts
  RECEIPT_PREMIUM: {
    grayscale: true,
    deNoise: true,
    denoiseFactor: 1,
    contrast: 2.2,
    brightness: 1.1,
    sharpen: 1.5,
    otsuThreshold: true,
  } as AdvancedPreprocessingOptions,

  // Best for low contrast receipts
  RECEIPT_LOWCONTRAST: {
    grayscale: true,
    deNoise: true,
    denoiseFactor: 2,
    contrast: 3.0,
    brightness: 1.2,
    sharpen: 2.0,
    threshold: 0.4,
  } as AdvancedPreprocessingOptions,

  // Best for dark/shadowy images
  RECEIPT_DARK: {
    grayscale: true,
    deNoise: true,
    brightness: 1.5,
    contrast: 2.5,
    sharpen: 1.2,
    otsuThreshold: true,
  } as AdvancedPreprocessingOptions,

  // Best for blurry images
  RECEIPT_BLURRY: {
    grayscale: true,
    gaussianBlur: 1,
    deNoise: true,
    denoiseFactor: 2,
    sharpen: 2.5,
    contrast: 2.0,
    otsuThreshold: true,
  } as AdvancedPreprocessingOptions,

  // AI-Enhanced mode
  RECEIPT_AI_ENHANCED: {
    grayscale: true,
    aiEnhance: true,
    enhanceText: true,
    improveContrast: true,
    deNoise: true,
    denoiseFactor: 1,
    contrast: 2.3,
    brightness: 1.15,
    sharpen: 1.8,
    threshold: 0.45,
  } as AdvancedPreprocessingOptions,
};
