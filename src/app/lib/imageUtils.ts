/**
 * Image Utilities - Compression, Cropping, Validation, and EXIF Extraction
 */

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
  exif?: {
    date?: string;
    camera?: string;
    orientation?: number;
  };
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'webp' | 'png';
}

// ── Image Validation ──────────────────────────────────────────────
export const validateImage = (file: File): { valid: boolean; error?: string } => {
  const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!validMimeTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid image format. Supported: JPG, PNG, WebP, GIF' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `Image too large. Max size: ${maxSize / 1024 / 1024}MB` };
  }

  return { valid: true };
};

// ── Get Image Metadata ────────────────────────────────────────────
export const getImageMetadata = (file: File): Promise<ImageMetadata> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// ── Extract EXIF Data ─────────────────────────────────────────────
export const extractEXIFData = async (file: File): Promise<any> => {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Try piexifjs first if available
    try {
      const piexif = (await import('piexifjs').catch(() => null)) as any;
      if (piexif) {
        const exifDict = piexif.load(arrayBuffer);
        const exifData: Record<string, any> = {};

        // Extract common EXIF tags
        if (exifDict['0th']) {
          const ifd0 = exifDict['0th'];
          if (ifd0[271]) exifData.make = ifd0[271]; // Camera Make
          if (ifd0[272]) exifData.model = ifd0[272]; // Camera Model
          if (ifd0[306]) {
            const dateStr = Array.isArray(ifd0[306]) ? ifd0[306][0] : ifd0[306];
            exifData.dateTime = dateStr;
          }
          if (ifd0[274]) exifData.orientation = ifd0[274][0]; // Orientation
        }

        // Extract GPS data if available
        if (exifDict['GPS']) {
          const gps = exifDict['GPS'];
          if (gps[2] && gps[4]) {
            exifData.gps = {
              latitude: gps[2],
              longitude: gps[4],
            };
          }
        }

        return exifData;
      }
    } catch {
      // piexifjs not available, fallback to basic extraction
    }

    // Fallback: Extract basic JPEG EXIF from hex data
    const view = new Uint8Array(arrayBuffer);
    const exifData: Record<string, any> = {};

    // Look for EXIF marker (FFE1)
    for (let i = 0; i < view.length - 4; i++) {
      if (view[i] === 0xff && view[i + 1] === 0xe1) {
        // Found EXIF marker
        const exifLength = (view[i + 2] << 8) | view[i + 3];
        
        // Extract orientation from IFD
        for (let j = i + 4; j < i + exifLength - 2; j++) {
          // Look for orientation tag (0x0112)
          if (view[j] === 0x01 && view[j + 1] === 0x12) {
            exifData.orientation = view[j + 8];
            break;
          }
        }
        break;
      }
    }

    return Object.keys(exifData).length > 0 ? exifData : null;
  } catch {
    return null;
  }
};

// ── Extract Image Metadata from File ───────────────────────────────
export const extractImageMetadata = async (file: File): Promise<ImageMetadata & { exif?: any }> => {
  const metadata = await getImageMetadata(file);
  const exif = await extractEXIFData(file);
  
  return {
    ...metadata,
    exif,
  };
};

// ── Get Image Date from EXIF or File ──────────────────────────────
export const getImageDate = async (file: File): Promise<Date | null> => {
  try {
    const exif = await extractEXIFData(file);
    if (exif?.dateTime) {
      // Parse EXIF date format: YYYY:MM:DD HH:MM:SS
      const dateStr = exif.dateTime.replace(/:/g, '-').replace(' ', 'T');
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
  } catch {
    // fallback
  }

  // Fallback to file last modified date
  return new Date(file.lastModified);
};

// ── Auto-Rotate Image Based on EXIF ───────────────────────────────
export const autoRotateImage = async (
  dataUrl: string,
  file: File,
  outputFormat: 'jpeg' | 'png' | 'webp' = 'jpeg'
): Promise<string> => {
  try {
    const exif = await extractEXIFData(file);
    if (!exif?.orientation || exif.orientation === 1) {
      // No rotation needed
      return dataUrl;
    }

    // Map EXIF orientation to rotation degrees
    const orientationMap: Record<number, number> = {
      1: 0,    // Normal
      3: 180,  // Upside down
      6: -90,  // Rotated 90° CW
      8: 90,   // Rotated 90° CCW
    };

    const degrees = orientationMap[exif.orientation] || 0;
    if (degrees === 0) return dataUrl;

    return rotateImage(dataUrl, degrees, outputFormat);
  } catch {
    return dataUrl;
  }
};

// ── Compress Image ────────────────────────────────────────────────
export const compressImage = (
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; size: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const {
        maxWidth = 2000,
        maxHeight = 2000,
        quality = 0.8,
        format = 'jpeg',
      } = options;

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = format === 'webp' ? 'image/webp' : 
                      format === 'png' ? 'image/png' : 
                      'image/jpeg';

      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      const size = Math.round((compressedDataUrl.length * 3) / 4); // Rough estimate

      resolve({ dataUrl: compressedDataUrl, size });
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
};

// ── Crop Image ────────────────────────────────────────────────────
export const cropImage = (
  dataUrl: string,
  cropOptions: CropOptions,
  outputFormat: 'jpeg' | 'png' | 'webp' = 'jpeg'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const { x, y, width, height } = cropOptions;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      const mimeType = outputFormat === 'webp' ? 'image/webp' :
                      outputFormat === 'png' ? 'image/png' :
                      'image/jpeg';

      const croppedDataUrl = canvas.toDataURL(mimeType, 0.9);
      resolve(croppedDataUrl);
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = dataUrl;
  });
};

// ── Rotate Image ──────────────────────────────────────────────────
export const rotateImage = (
  dataUrl: string,
  degrees: number,
  outputFormat: 'jpeg' | 'png' | 'webp' = 'jpeg'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const radians = (degrees * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);

      const newWidth = Math.round(Math.abs(img.width * cos) + Math.abs(img.height * sin));
      const newHeight = Math.round(Math.abs(img.width * sin) + Math.abs(img.height * cos));

      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const mimeType = outputFormat === 'webp' ? 'image/webp' :
                      outputFormat === 'png' ? 'image/png' :
                      'image/jpeg';

      const rotatedDataUrl = canvas.toDataURL(mimeType, 0.9);
      resolve(rotatedDataUrl);
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = dataUrl;
  });
};

// ── Optimize Image for Web ────────────────────────────────────────
export const optimizeImageForWeb = (
  dataUrl: string,
  targetSize: number = 500000 // 500KB by default
): Promise<{ dataUrl: string; size: number; optimized: boolean }> => {
  return new Promise(async (resolve) => {
    let currentDataUrl = dataUrl;
    let quality = 0.9;
    let format: 'jpeg' | 'webp' = 'jpeg';

    try {
      // First try with the original format
      let result = await compressImage(currentDataUrl, {
        maxWidth: 3000,
        maxHeight: 3000,
        quality,
        format,
      });

      // If still too large, try WebP
      if (result.size > targetSize) {
        format = 'webp';
        result = await compressImage(currentDataUrl, {
          maxWidth: 3000,
          maxHeight: 3000,
          quality,
          format,
        });
      }

      // If still too large, reduce quality incrementally
      while (result.size > targetSize && quality > 0.3) {
        quality -= 0.1;
        result = await compressImage(result.dataUrl, {
          maxWidth: 3000,
          maxHeight: 3000,
          quality,
          format,
        });
      }

      resolve({
        dataUrl: result.dataUrl,
        size: result.size,
        optimized: result.size <= targetSize,
      });
    } catch {
      resolve({
        dataUrl,
        size: Math.round((dataUrl.length * 3) / 4),
        optimized: false,
      });
    }
  });
};

// ── Convert File to Data URL ──────────────────────────────────────
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// ── Convert Data URL to Blob ──────────────────────────────────────
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: contentType });
};

// ── Batch Process Images ──────────────────────────────────────────
export const batchProcessImages = async (
  files: File[],
  compressionOptions: CompressionOptions = {}
): Promise<{ success: Array<{ file: File; dataUrl: string; size: number }>; errors: Array<{ file: File; error: string }> }> => {
  const success = [];
  const errors = [];

  for (const file of files) {
    try {
      const validation = validateImage(file);
      if (!validation.valid) {
        errors.push({ file, error: validation.error || 'Invalid image' });
        continue;
      }

      const dataUrl = await fileToDataUrl(file);
      const { dataUrl: compressedDataUrl, size } = await compressImage(dataUrl, compressionOptions);
      success.push({ file, dataUrl: compressedDataUrl, size });
    } catch (error) {
      errors.push({ file, error: (error as Error).message });
    }
  }

  return { success, errors };
};

// ── Calculate Image Dimensions Ratio ──────────────────────────────
export const getImageAspectRatio = (dataUrl: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.width / img.height);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};

// ── Generate Thumbnail ────────────────────────────────────────────
export const generateThumbnail = (
  dataUrl: string,
  width: number = 200,
  height: number = 200
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Maintain aspect ratio with letterboxing
      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > canvasAspect) {
        drawHeight = width / imgAspect;
        offsetY = (height - drawHeight) / 2;
      } else {
        drawWidth = height * imgAspect;
        offsetX = (width - drawWidth) / 2;
      }

      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};
