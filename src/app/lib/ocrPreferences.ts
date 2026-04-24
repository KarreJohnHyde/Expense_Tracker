export interface OcrLanguageOption {
  key: string;
  label: string;
  tesseractCode: string;
}

export const OCR_LANGUAGE_OPTIONS: OcrLanguageOption[] = [
  { key: 'english', label: 'English', tesseractCode: 'eng' },
  { key: 'hindi', label: 'Hindi', tesseractCode: 'hin' },
  { key: 'tamil', label: 'Tamil', tesseractCode: 'tam' },
  { key: 'telugu', label: 'Telugu', tesseractCode: 'tel' },
  { key: 'dutch', label: 'Dutch', tesseractCode: 'nld' },
  { key: 'french', label: 'French', tesseractCode: 'fra' },
  { key: 'chinese_mandarin', label: 'Chinese (Mandarin)', tesseractCode: 'chi_sim' },
  { key: 'japanese', label: 'Japanese', tesseractCode: 'jpn' },
  { key: 'korean', label: 'Korean', tesseractCode: 'kor' },
];

const SETTINGS_KEY = 'settings:ocr_languages';
const SETTINGS_EVENT = 'ocr-languages-changed';

const DEFAULT_LANGUAGES = OCR_LANGUAGE_OPTIONS.map((option) => option.tesseractCode);

export function getOcrLanguageHints(): string[] {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_LANGUAGES;
    }

    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_LANGUAGES;
    }

    const validCodes = new Set(OCR_LANGUAGE_OPTIONS.map((entry) => entry.tesseractCode));
    const clean = parsed.map((entry) => String(entry)).filter((entry) => validCodes.has(entry));
    return clean.length > 0 ? clean : DEFAULT_LANGUAGES;
  } catch {
    return DEFAULT_LANGUAGES;
  }
}

export function saveOcrLanguageHints(codes: string[]): string[] {
  const validCodes = new Set(OCR_LANGUAGE_OPTIONS.map((entry) => entry.tesseractCode));
  const unique = Array.from(new Set(codes.map((entry) => String(entry)).filter((entry) => validCodes.has(entry))));
  const toSave = unique.length > 0 ? unique : DEFAULT_LANGUAGES;

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
  return toSave;
}

export function getOcrLanguageSettingsEvent(): string {
  return SETTINGS_EVENT;
}