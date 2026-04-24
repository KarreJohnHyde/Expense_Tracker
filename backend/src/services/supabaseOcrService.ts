import crypto from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { OcrProcessResponse } from '../contracts/ocr-api-contract';

export interface UpsertOcrPayload {
  userId: string;
  result: OcrProcessResponse;
  imageMetadata?: Record<string, unknown>;
}

interface ReceiptInsert {
  id: string;
  user_id: string;
  vendor: string | null;
  date: string | null;
  total: number;
  raw_text: string;
  corrected_text: string;
  qr_data: unknown[];
  image_metadata: Record<string, unknown>;
  pii_hash: string;
}

const CARD_LIKE_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function redactText(raw: string): string {
  return raw.replace(CARD_LIKE_PATTERN, '[REDACTED_CARD]').replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
}

export function hashSensitive(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export class SupabaseOcrService {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client =
      client ||
      createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        {
          auth: { persistSession: false },
        },
      );
  }

  async upsertParsedReceipt(payload: UpsertOcrPayload): Promise<{ receiptId: string; jobId: string }> {
    const receiptId = payload.result.job_id;
    const redactedRaw = redactText(payload.result.raw_text || '');
    const redactedCorrected = redactText(payload.result.corrected_text || '');

    const record: ReceiptInsert = {
      id: receiptId,
      user_id: payload.userId,
      vendor: this.extractVendor(redactedCorrected),
      date: payload.result.date,
      total: Number(payload.result.total || 0),
      raw_text: redactedRaw,
      corrected_text: redactedCorrected,
      qr_data: payload.result.qr,
      image_metadata: {
        ...payload.imageMetadata,
        processing_time_ms: payload.result.processing_time_ms,
        storage: payload.result.storage,
      },
      pii_hash: hashSensitive(redactedRaw),
    };

    const { error: receiptError } = await this.client
      .from('receipts')
      .upsert(record, { onConflict: 'id' });

    if (receiptError) {
      throw new Error(`Failed to upsert receipt: ${receiptError.message}`);
    }

    const { error: deleteLineError } = await this.client
      .from('line_items')
      .delete()
      .eq('receipt_id', receiptId);

    if (deleteLineError) {
      throw new Error(`Failed to clear line items: ${deleteLineError.message}`);
    }

    const lineItems = payload.result.items.map((item) => ({
      receipt_id: receiptId,
      name: item.name || 'Item',
      qty: item.qty ?? 1,
      unit_price: item.unit_price ?? item.total_price ?? 0,
      total_price: item.total_price ?? item.unit_price ?? 0,
    }));

    if (lineItems.length > 0) {
      const { error: lineInsertError } = await this.client.from('line_items').insert(lineItems);
      if (lineInsertError) {
        throw new Error(`Failed to insert line items: ${lineInsertError.message}`);
      }
    }

    const confidenceValues = payload.result.words
      .map((word) => Number(word.conf))
      .filter((value) => Number.isFinite(value) && value >= 0);

    const averageConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : 0;

    const { error: jobError } = await this.client.from('ocr_jobs').upsert({
      job_id: payload.result.job_id,
      user_id: payload.userId,
      status: 'completed',
      confidence_metrics: {
        avg: Number(averageConfidence.toFixed(2)),
        min: confidenceValues.length > 0 ? Math.min(...confidenceValues) : 0,
        max: confidenceValues.length > 0 ? Math.max(...confidenceValues) : 0,
        token_count: payload.result.words.length,
      },
      worker_metadata: payload.result.metadata || {},
      completed_at: new Date().toISOString(),
    });

    if (jobError) {
      throw new Error(`Failed to upsert ocr job: ${jobError.message}`);
    }

    return { receiptId, jobId: payload.result.job_id };
  }

  private extractVendor(correctedText: string): string | null {
    const line = correctedText
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 2);

    return line ? line.slice(0, 120) : null;
  }
}