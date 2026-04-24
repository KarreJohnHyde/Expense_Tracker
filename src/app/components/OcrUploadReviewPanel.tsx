import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CheckCircle2, QrCode, RefreshCw, UploadCloud } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '../../lib/supabaseClient';
import { getOcrLanguageHints, getOcrLanguageSettingsEvent } from '../lib/ocrPreferences';

export interface OcrWordToken {
  text: string;
  conf: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface OcrApiResult {
  raw_text: string;
  corrected_text: string;
  items: Array<{ name: string; qty?: number; unit_price?: number; total_price?: number; confidence?: number }>;
  total: number;
  date: string | null;
  qr: Array<{ type: 'qr' | 'barcode'; data: string }>;
  words: OcrWordToken[];
  processing_time_ms: number;
  job_id: string;
  storage?: { bucket: string; key: string } | null;
}

type QueueStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'failed';

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  orientation: 'portrait' | 'landscape' | 'square';
  dpiEstimate: number;
  status: QueueStatus;
  progress: number;
  attempts: number;
  error?: string;
  result?: OcrApiResult;
  editedTokens: Record<number, string>;
  confirmed: boolean;
  sourceType: 'camera' | 'upload' | 'gallery' | 'qr_scanner';
}

const API_BASE_URL = import.meta.env.VITE_OCR_API_URL || 'http://localhost:3001';
const LOW_CONF_THRESHOLD = Number(import.meta.env.VITE_LOW_CONFIDENCE_THRESHOLD || 70);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function measureImage(file: File): Promise<{ orientation: QueueItem['orientation']; dpiEstimate: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const orientation = image.width === image.height ? 'square' : image.width > image.height ? 'landscape' : 'portrait';
    const diagonalPixels = Math.sqrt(image.width ** 2 + image.height ** 2);
    const receiptDiagonalInches = 5.5;
    const dpiEstimate = Math.round(diagonalPixels / receiptDiagonalInches);

    return { orientation, dpiEstimate };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function preprocessClientSide(file: File): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });

  const maxWidth = 2200;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }

  ctx.filter = 'contrast(115%) brightness(108%)';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) {
    return file;
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

async function xhrUpload(
  url: string,
  method: 'POST' | 'PUT',
  body: FormData | File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body as XMLHttpRequestBodyInit);
  });
}

async function createSignedUpload(file: File): Promise<{
  upload_url: string;
  s3_bucket: string;
  s3_key: string;
  required_headers: Record<string, string>;
}> {
  const response = await fetch(`${API_BASE_URL}/ocr/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_name: file.name, mime_type: file.type }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function processFromS3(
  s3_bucket: string,
  s3_key: string,
  sourceType: QueueItem['sourceType'],
  langHints: string[],
): Promise<OcrApiResult> {
  const response = await fetch(`${API_BASE_URL}/ocr/process-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3_bucket, s3_key, source_type: sourceType, lang_hints: langHints }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function processMultipart(
  file: File,
  sourceType: QueueItem['sourceType'],
  langHints: string[],
  onProgress: (pct: number) => void,
): Promise<OcrApiResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('source_type', sourceType);
  form.append('lang_hints', langHints.join(','));

  const raw = await xhrUpload(`${API_BASE_URL}/ocr/process-image`, 'POST', form, {}, onProgress);
  return JSON.parse(raw) as OcrApiResult;
}

function mergeEditedTokens(words: OcrWordToken[], edits: Record<number, string>): string {
  return words
    .map((word, index) => {
      const edited = edits[index];
      return typeof edited === 'string' ? edited : word.text;
    })
    .join(' ');
}

function toDataUrl(base64: string, format = 'jpeg'): string {
  return `data:image/${format};base64,${base64}`;
}

async function captureWithCapacitorCamera(): Promise<File | null> {
  const capacitor = (window as any).Capacitor;
  const camera = capacitor?.Plugins?.Camera;

  if (!capacitor?.isNativePlatform || !camera?.getPhoto) {
    return null;
  }

  const photo = await camera.getPhoto({
    quality: 85,
    allowEditing: true,
    resultType: 'base64',
    source: 'CAMERA',
  });

  if (!photo?.base64String) {
    return null;
  }

  const response = await fetch(toDataUrl(photo.base64String, photo.format || 'jpeg'));
  const blob = await response.blob();
  return new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
}

export function OcrUploadReviewPanel(): ReactElement {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qrEnabled, setQrEnabled] = useState(false);
  const [qrPayloads, setQrPayloads] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [langHints, setLangHints] = useState<string[]>(() => getOcrLanguageHints());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeItem = useMemo(() => queue.find((item) => item.id === activeId) || null, [queue, activeId]);

  useEffect(() => {
    if (!qrEnabled) {
      return;
    }

    const scanner = new Html5QrcodeScanner(
      'ocr-qr-reader',
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        setQrPayloads((prev) => Array.from(new Set([decodedText, ...prev])).slice(0, 20));
      },
      () => undefined,
    );

    return () => {
      scanner.clear().catch(() => undefined);
    };
  }, [qrEnabled]);

  useEffect(() => {
    const reload = () => setLangHints(getOcrLanguageHints());
    const eventName = getOcrLanguageSettingsEvent();
    window.addEventListener(eventName, reload);
    return () => window.removeEventListener(eventName, reload);
  }, []);

  useEffect(() => {
    return () => {
      queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [queue]);

  const enqueueFiles = async (files: FileList | File[], sourceType: QueueItem['sourceType']) => {
    const normalized = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const entries: QueueItem[] = [];

    for (const file of normalized) {
      const { orientation, dpiEstimate } = await measureImage(file);
      entries.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        orientation,
        dpiEstimate,
        status: 'queued',
        progress: 0,
        attempts: 0,
        editedTokens: {},
        confirmed: false,
        sourceType,
      });
    }

    setQueue((prev) => [...entries, ...prev]);
    setActiveId((prev) => prev || entries[0]?.id || null);
  };

  const captureNative = async () => {
    const file = await captureWithCapacitorCamera();
    if (!file) {
      fileInputRef.current?.click();
      return;
    }
    await enqueueFiles([file], 'camera');
  };

  const setItemPatch = (id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadOne = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      setItemPatch(id, { status: 'uploading', attempts: attempt, progress: 0, error: undefined });

      try {
        const preprocessed = await preprocessClientSide(item.file);
        const preferSignedUrl = Boolean(import.meta.env.VITE_USE_SIGNED_UPLOAD || true);
        let result: OcrApiResult;

        if (preferSignedUrl) {
          const signed = await createSignedUpload(preprocessed);
          await xhrUpload(
            signed.upload_url,
            'PUT',
            preprocessed,
            signed.required_headers,
            (pct) => setItemPatch(id, { progress: Math.min(75, Math.round(pct * 0.75)) }),
          );

          setItemPatch(id, { status: 'processing', progress: 80 });
          result = await processFromS3(signed.s3_bucket, signed.s3_key, item.sourceType, langHints);
          setItemPatch(id, { progress: 100, status: 'done', result });
          return;
        }

        setItemPatch(id, { status: 'processing', progress: 20 });
        result = await processMultipart(preprocessed, item.sourceType, langHints, (pct) => setItemPatch(id, { progress: pct }));
        setItemPatch(id, { progress: 100, status: 'done', result });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        setItemPatch(id, { status: 'failed', error: message });
        if (attempt < maxAttempts) {
          await sleep(500 * 2 ** (attempt - 1));
          continue;
        }
      }
    }
  };

  const processBatch = async () => {
    for (const item of queue) {
      if (item.status === 'done') continue;
      // Sequential processing avoids network spikes on serverless tiers.
      await uploadOne(item.id);
    }
  };

  const saveReceipt = async (item: QueueItem) => {
    if (!item.result || !item.confirmed) {
      return;
    }

    setSavingId(item.id);
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      if (!userId) {
        throw new Error('User is not authenticated');
      }

      const finalCorrectedText = mergeEditedTokens(item.result.words, item.editedTokens);

      const { data: receiptRows, error: receiptError } = await supabase
        .from('receipts')
        .upsert(
          {
            id: item.result.job_id,
            user_id: userId,
            vendor: finalCorrectedText.split(/\n|\s{2,}/)[0]?.slice(0, 120) || 'Receipt',
            date: item.result.date,
            total: item.result.total,
            raw_text: item.result.raw_text,
            corrected_text: finalCorrectedText,
            qr_data: item.result.qr,
            image_metadata: {
              orientation: item.orientation,
              dpi_estimate: item.dpiEstimate,
              processing_time_ms: item.result.processing_time_ms,
              storage: item.result.storage,
            },
          },
          { onConflict: 'id' },
        )
        .select('id');

      if (receiptError) throw receiptError;

      const receiptId = receiptRows?.[0]?.id || item.result.job_id;
      const lineItems = (item.result.items || []).map((line) => ({
        receipt_id: receiptId,
        name: line.name,
        qty: line.qty ?? 1,
        unit_price: line.unit_price ?? line.total_price ?? 0,
        total_price: line.total_price ?? line.unit_price ?? 0,
      }));

      if (lineItems.length > 0) {
        const { error: lineError } = await supabase.from('line_items').insert(lineItems);
        if (lineError) throw lineError;
      }

      setItemPatch(item.id, { confirmed: true });
    } finally {
      setSavingId(null);
    }
  };

  const lowConfidenceIndices = useMemo(() => {
    if (!activeItem?.result?.words) return [] as number[];
    return activeItem.result.words
      .map((word, index) => ({ word, index }))
      .filter((entry) => entry.word.conf >= 0 && entry.word.conf < LOW_CONF_THRESHOLD)
      .map((entry) => entry.index);
  }, [activeItem]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Receipt Capture and OCR Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="mr-2 h-4 w-4" /> Add from Gallery
            </Button>
            <Button variant="outline" onClick={captureNative}>
              <Camera className="mr-2 h-4 w-4" /> Capture Image
            </Button>
            <Button variant={qrEnabled ? 'default' : 'outline'} onClick={() => setQrEnabled((v) => !v)}>
              <QrCode className="mr-2 h-4 w-4" /> QR Scanner
            </Button>
            <Button variant="secondary" onClick={processBatch} disabled={queue.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" /> Process Batch
            </Button>
          </div>

          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) {
                enqueueFiles(event.target.files, 'gallery');
              }
            }}
          />

          {qrEnabled && (
            <div className="grid gap-3 md:grid-cols-2">
              <div id="ocr-qr-reader" className="overflow-hidden rounded border bg-white p-2" />
              <div className="rounded border p-3">
                <Label>Decoded QR payloads</Label>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs">
                  {qrPayloads.length ? qrPayloads.join('\n\n') : 'No QR payload yet'}
                </pre>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded border p-2 text-left ${activeId === item.id ? 'border-primary' : 'border-border'}`}
                onClick={() => setActiveId(item.id)}
              >
                <img src={item.previewUrl} alt={item.file.name} className="h-36 w-full rounded object-cover" />
                <p className="mt-1 truncate text-xs">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.orientation}, ~{item.dpiEstimate} DPI
                </p>
                <p className="text-xs">{item.status}</p>
                <div className="mt-1 h-1 w-full rounded bg-slate-200">
                  <div className="h-1 rounded bg-emerald-500" style={{ width: `${item.progress}%` }} />
                </div>
                {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeItem?.result && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Total</Label>
                <Input value={activeItem.result.total} readOnly />
              </div>
              <div>
                <Label>Date</Label>
                <Input value={activeItem.result.date || ''} readOnly />
              </div>
              <div>
                <Label>Job ID</Label>
                <Input value={activeItem.result.job_id} readOnly />
              </div>
            </div>

            <div>
              <Label>Low-confidence tokens (&lt; {LOW_CONF_THRESHOLD})</Label>
              {lowConfidenceIndices.length === 0 && <p className="text-sm text-emerald-600">No low-confidence tokens found.</p>}
              <div className="grid gap-2 md:grid-cols-2">
                {lowConfidenceIndices.map((index) => {
                  const token = activeItem.result!.words[index];
                  return (
                    <div key={`${activeItem.id}-${index}`} className="rounded border border-amber-300 p-2">
                      <p className="mb-1 text-xs text-amber-700">Confidence: {token.conf.toFixed(1)}</p>
                      <Input
                        value={activeItem.editedTokens[index] ?? token.text}
                        onChange={(event) => {
                          const next = { ...activeItem.editedTokens, [index]: event.target.value };
                          setItemPatch(activeItem.id, { editedTokens: next, confirmed: false });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Detected QR data</Label>
              <pre className="mt-1 rounded border p-2 text-xs">
                {activeItem.result.qr.length ? JSON.stringify(activeItem.result.qr, null, 2) : 'No QR payloads on this receipt'}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={activeItem.confirmed}
                  onChange={(event) => setItemPatch(activeItem.id, { confirmed: event.target.checked })}
                />
                I verified extracted data and want to save it.
              </label>

              <Button onClick={() => saveReceipt(activeItem)} disabled={!activeItem.confirmed || savingId === activeItem.id}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {savingId === activeItem.id ? 'Saving...' : 'Save to Supabase'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OcrUploadReviewPanel;
