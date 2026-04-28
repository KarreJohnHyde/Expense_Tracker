import { getOcrLanguageHints } from './ocrPreferences';

export function getOcrLanguageBundle(maxLanguages = 3): string {
  const hints = getOcrLanguageHints();
  const ordered = ['eng', ...hints.filter((code) => code !== 'eng')];
  const unique = Array.from(new Set(ordered)).slice(0, Math.max(1, maxLanguages));
  return unique.join('+');
}

export async function runLocalOcr(
  imageBase64: string,
  options?: {
    maxLanguages?: number;
    onProgress?: (progress: number, status: string) => void;
  },
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const langs = getOcrLanguageBundle(options?.maxLanguages ?? 3);

  const worker = await createWorker(langs, 1, {
    logger: (message: { progress?: number; status?: string }) => {
      if (options?.onProgress && typeof message.progress === 'number') {
        options.onProgress(Math.round(message.progress * 100), message.status || 'processing');
      }
    },
  });

  try {
    const result = await worker.recognize(imageBase64);
    return (result?.data?.text || '').trim();
  } finally {
    await worker.terminate();
  }
}
