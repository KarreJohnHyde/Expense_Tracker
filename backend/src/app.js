import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';

import Busboy from 'busboy';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 12 * 1024 * 1024);
const ALLOWED_MIME_TYPES = new Set((process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,image/heic').split(','));
const WORKER_TIMEOUT_MS = Number(process.env.WORKER_TIMEOUT_MS || 60000);
const ENABLE_RATE_LIMIT = process.env.ENABLE_RATE_LIMIT === 'true';
const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 30);
const FINANCE_INTEL_CACHE_TTL = Number(process.env.FINANCE_INTEL_CACHE_TTL_MS || 3 * 60 * 1000);
const DIAMOND_PRICE_PER_CARAT_USD = Number(process.env.DIAMOND_PRICE_PER_CARAT_USD || process.env.VITE_DIAMOND_PRICE_PER_CARAT_USD || 6200);

const S3_BUCKET = process.env.RECEIPT_UPLOAD_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const OCR_WORKER_URL = process.env.OCR_WORKER_URL || '';
const OCR_CLI_COMMAND = process.env.OCR_CLI_COMMAND || 'python python_worker/app/cli_ocr.py';
const DEFAULT_OCR_LANG_HINTS = (process.env.DEFAULT_OCR_LANG_HINTS || 'eng,hin,tam,tel,nld,fra,chi_sim,jpn,kor')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const s3Client = new S3Client({ region: AWS_REGION });
const rateLimiter = new Map();
const financeIntelCache = { timestamp: 0, payload: null };

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,X-Request-Id',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

function json(statusCode, payload, requestId) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': requestId || '',
    },
    body: JSON.stringify(payload),
  };
}

function getRequestId(event, context) {
  return context?.awsRequestId || event?.requestContext?.requestId || randomUUID();
}

function log(requestId, message, extra) {
  const base = `[ocr-api][${requestId}] ${message}`;
  if (extra) {
    console.log(base, extra);
    return;
  }
  console.log(base);
}

function getHeader(event, key) {
  const headers = event?.headers || {};
  const foundKey = Object.keys(headers).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return foundKey ? headers[foundKey] : undefined;
}

function getRoutePath(event) {
  return event?.rawPath || event?.path || '/';
}

function routeMatches(routePath, target) {
  const normalizedRoute = (routePath || '/').replace(/\/+$/, '') || '/';
  const normalizedTarget = target.replace(/\/+$/, '') || '/';
  return normalizedRoute === normalizedTarget || normalizedRoute.endsWith(normalizedTarget);
}

function getHttpMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || 'GET';
}

function getClientIp(event) {
  return (
    event?.requestContext?.http?.sourceIp ||
    getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function getQueryParam(event, key) {
  const direct = event?.queryStringParameters?.[key];
  if (direct !== undefined && direct !== null) return String(direct);
  const raw = event?.rawQueryString || '';
  if (!raw) return '';
  const params = new URLSearchParams(raw);
  return params.get(key) || '';
}

async function fetchWithTimeout(url, timeoutMs = 12000, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeXmlEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function extractTag(block, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const matched = block.match(regex);
  return decodeXmlEntities(matched?.[1] || '');
}

function parseRss(xml, maxItems = 10) {
  const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  return matches.slice(0, maxItems)
    .map((match) => {
      const item = match[1];
      const title = extractTag(item, 'title').replace(/\s+/g, ' ');
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');
      const source = extractTag(item, 'source');
      let sourceLabel = source || 'finance';
      if (!source && link) {
        try {
          sourceLabel = new URL(link).hostname.replace(/^www\./, '');
        } catch {
          sourceLabel = 'finance';
        }
      }
      return {
        title,
        link,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source: sourceLabel,
      };
    })
    .filter((item) => item.title && item.link);
}

async function fetchGoogleFinanceNews() {
  const queries = [
    'finance stock market banking ecommerce gold silver platinum diamond gdp per capita income',
    'nasdaq dow sp500 fed reserve rbi crude oil commodities macro economy',
  ];

  const jobs = queries.map(async (query) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetchWithTimeout(url, 12000, { headers: { Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' } });
    if (!res.ok) throw new Error(`RSS request failed (${res.status})`);
    const text = await res.text();
    return parseRss(text, 8);
  });

  const settled = await Promise.allSettled(jobs);
  const merged = [];
  settled.forEach((entry) => {
    if (entry.status === 'fulfilled') merged.push(...entry.value);
  });

  const deduped = Array.from(new Map(merged.map((item) => [item.link, item])).values());
  return deduped
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10);
}

function formatCompactNumber(value, fractionDigits = 1) {
  return Number(value).toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: fractionDigits,
  });
}

async function fetchWorldBankMetric({ country, indicator, label, type = 'percent', note }) {
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=60`;
  const res = await fetchWithTimeout(url, 12000, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`World Bank request failed (${res.status})`);
  const payload = await res.json();
  const series = Array.isArray(payload?.[1]) ? payload[1] : [];
  const latest = series.find((row) => row && row.value !== null && row.value !== undefined);
  if (!latest) throw new Error(`No World Bank data for ${country}:${indicator}`);
  const raw = Number(latest.value);

  let value = String(raw);
  if (type === 'percent') value = `${raw.toFixed(1)}%`;
  if (type === 'currency') value = `$${raw.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (type === 'number') value = raw.toLocaleString('en-US');

  return {
    key: `${country}_${indicator}`,
    label,
    value,
    note: `${note} (${latest.date})`,
    raw,
    source: 'World Bank',
  };
}

async function fetchNetWorthSnapshot() {
  const url = 'https://www.forbes.com/forbesapi/person/rtb/0/position/true.json?fields=personName,finalWorth,countryOfCitizenship,industries';
  const res = await fetchWithTimeout(url, 12000, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Forbes request failed (${res.status})`);
  const payload = await res.json();
  const people = Array.isArray(payload?.personList?.personsLists) ? payload.personList.personsLists : [];
  const top = people.slice(0, 100);
  const totalBillions = top.reduce((sum, person) => {
    const amount = Number(person?.finalWorth || 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  return {
    combinedTop100Usd: Math.round(totalBillions * 1e9),
    combinedTop100Formatted: `$${formatCompactNumber(totalBillions, 2)}B`,
    leaders: top.slice(0, 5).map((person) => ({
      name: person.personName || 'Unknown',
      netWorthUsd: Math.round(Number(person.finalWorth || 0) * 1e9),
      netWorthFormatted: `$${Number(person.finalWorth || 0).toFixed(1)}B`,
      country: person.countryOfCitizenship || 'N/A',
    })),
    source: 'Forbes Real-Time Billionaires',
    asOf: new Date().toISOString(),
  };
}

async function buildFinanceIntelPayload() {
  const [newsResult, macroResult, netWorthResult] = await Promise.allSettled([
    fetchGoogleFinanceNews(),
    Promise.all([
      fetchWorldBankMetric({
        country: 'WLD',
        indicator: 'NY.GDP.MKTP.KD.ZG',
        label: 'World GDP Growth',
        type: 'percent',
        note: 'Annual growth',
      }),
      fetchWorldBankMetric({
        country: 'IN',
        indicator: 'NY.GDP.MKTP.KD.ZG',
        label: 'India GDP Growth',
        type: 'percent',
        note: 'Annual growth',
      }),
      fetchWorldBankMetric({
        country: 'US',
        indicator: 'NY.GDP.MKTP.KD.ZG',
        label: 'US GDP Growth',
        type: 'percent',
        note: 'Annual growth',
      }),
      fetchWorldBankMetric({
        country: 'IN',
        indicator: 'NY.GDP.PCAP.CD',
        label: 'India Per-Capita Income',
        type: 'currency',
        note: 'Current US$',
      }),
      fetchWorldBankMetric({
        country: 'US',
        indicator: 'NY.GDP.PCAP.CD',
        label: 'US Per-Capita Income',
        type: 'currency',
        note: 'Current US$',
      }),
    ]),
    fetchNetWorthSnapshot(),
  ]);

  const macro = macroResult.status === 'fulfilled' ? macroResult.value : [];
  const news = newsResult.status === 'fulfilled' && newsResult.value.length > 0 ? newsResult.value : [];
  const netWorth = netWorthResult.status === 'fulfilled' ? netWorthResult.value : null;

  return {
    asOf: new Date().toISOString(),
    news,
    macro,
    netWorth,
    resources: {
      diamond: {
        perCaratUsd: DIAMOND_PRICE_PER_CARAT_USD,
        source: process.env.DIAMOND_PRICE_PER_CARAT_USD ? 'env' : 'default',
      },
    },
    providerStatus: {
      news: newsResult.status,
      macro: macroResult.status,
      netWorth: netWorthResult.status,
    },
  };
}

async function getFinanceIntel(forceRefresh = false) {
  const now = Date.now();
  const isFresh =
    financeIntelCache.payload &&
    now - financeIntelCache.timestamp < FINANCE_INTEL_CACHE_TTL;

  if (!forceRefresh && isFresh) {
    return { ...financeIntelCache.payload, cache: 'hit' };
  }

  const payload = await buildFinanceIntelPayload();
  financeIntelCache.timestamp = now;
  financeIntelCache.payload = payload;
  return { ...payload, cache: 'miss' };
}

function normalizeWorkerPayload(workerResponse, jobId, processingTimeMs) {
  const words = Array.isArray(workerResponse?.words) ? workerResponse.words : [];
  const rawTokens = Array.isArray(workerResponse?.raw_tokens) ? workerResponse.raw_tokens : [];
  const qr = Array.isArray(workerResponse?.qr) ? workerResponse.qr : [];
  const items = Array.isArray(workerResponse?.items) ? workerResponse.items : [];
  const processingLog = Array.isArray(workerResponse?.processing_log) ? workerResponse.processing_log : [];
  const parsedFields = workerResponse?.parsed_fields || {};
  const confidences = workerResponse?.confidences || {};

  return {
    source_type: workerResponse?.source_type || null,
    raw_text: workerResponse?.raw_text || '',
    corrected_text: workerResponse?.corrected_text || workerResponse?.raw_text || '',
    raw_tokens: rawTokens,
    parsed_fields: parsedFields,
    confidences,
    items,
    total: Number(workerResponse?.total || 0),
    date: workerResponse?.date || null,
    qr,
    qr_payload: workerResponse?.qr_payload || (qr.length > 0 ? qr[0] : null),
    words,
    processing_log: processingLog,
    processing_time_ms: Number(workerResponse?.processing_time_ms || processingTimeMs),
    job_id: workerResponse?.job_id || jobId,
    metadata: workerResponse?.metadata || {},
  };
}

function getRateLimitStatus(ip) {
  if (!ENABLE_RATE_LIMIT) {
    return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE };
  }

  const now = Date.now();
  const minuteStart = Math.floor(now / 60000) * 60000;
  const existing = rateLimiter.get(ip);

  if (!existing || existing.windowStart !== minuteStart) {
    rateLimiter.set(ip, { windowStart: minuteStart, count: 1 });
    return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - 1 };
  }

  existing.count += 1;
  if (existing.count > RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - existing.count };
}

function parseJsonBody(event) {
  if (!event?.body) {
    return {};
  }

  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw || '{}');
}

function sanitizeFilename(name = 'upload.bin') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload.bin';
}

function fileExtensionForMime(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
  };
  return map[mimeType] || '.bin';
}

function validateUploadedFile({ mimeType, size }) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  if (!size || size <= 0) {
    throw new Error('File is empty');
  }
  if (size > MAX_FILE_BYTES) {
    throw new Error(`File exceeds max size (${MAX_FILE_BYTES} bytes)`);
  }
}

async function parseMultipart(event, requestId) {
  const contentType = getHeader(event, 'content-type');
  if (!contentType?.includes('multipart/form-data')) {
    throw new Error('Invalid multipart content type');
  }

  const bodyBuffer = event?.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64')
    : Buffer.from(event.body || '', 'utf8');

  return new Promise((resolve, reject) => {
    const fields = {};
    let file = null;

    const bb = Busboy({ headers: { 'content-type': contentType } });

    bb.on('file', (fieldName, stream, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      let size = 0;

      stream.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_FILE_BYTES) {
          stream.unpipe();
          reject(new Error(`Uploaded file is larger than ${MAX_FILE_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });

      stream.on('end', () => {
        file = {
          fieldName,
          filename: sanitizeFilename(filename),
          mimeType,
          size,
          buffer: Buffer.concat(chunks),
        };
      });
    });

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('finish', () => {
      log(requestId, 'Parsed multipart payload', {
        hasFile: Boolean(file),
        fieldCount: Object.keys(fields).length,
      });
      resolve({ file, fields });
    });

    bb.on('error', reject);
    bb.end(bodyBuffer);
  });
}

async function bufferFromStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function fetchImageFromUrl(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image URL: ${response.status}`);
  }
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

async function fetchImageFromS3(bucket, key) {
  const output = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const buffer = await bufferFromStream(output.Body);
  return {
    buffer,
    mimeType: output.ContentType || 'application/octet-stream',
  };
}

async function writeTempFile({ buffer, mimeType, filename, jobId }) {
  const extension = fileExtensionForMime(mimeType);
  const tempFilename = `${jobId}_${sanitizeFilename(filename || 'receipt')}${extension}`;
  const tempPath = path.join(tmpdir(), tempFilename);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

async function maybeUploadOriginalToS3({ buffer, mimeType, jobId, filename, requestId }) {
  if (!S3_BUCKET) {
    return null;
  }

  const key = `receipts/${jobId}/${sanitizeFilename(filename || `upload${fileExtensionForMime(mimeType)}`)}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    }),
  );

  log(requestId, 'Uploaded original image to S3', { bucket: S3_BUCKET, key });
  return { bucket: S3_BUCKET, key };
}

async function invokeFastApiWorker({ buffer, mimeType, filename, blobPath, jobId, requestId, sourceType, langHints }) {
  const baseUrl = OCR_WORKER_URL.replace(/\/$/, '');
  const endpoint = blobPath ? `${baseUrl}/process-image-from-path` : `${baseUrl}/process-image`;
  let body;
  const headers = { 'x-job-id': jobId };

  if (blobPath) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify({
      blob_path: blobPath,
      job_id: jobId,
      source_type: sourceType || 'signed_url',
      lang_hints: Array.isArray(langHints) && langHints.length > 0 ? langHints : DEFAULT_OCR_LANG_HINTS,
    });
  } else {
    const form = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    form.append('file', blob, filename || 'receipt.jpg');
    form.append('job_id', jobId);
    form.append('source_type', sourceType || 'upload');
    if (Array.isArray(langHints) && langHints.length > 0) {
      form.append('lang_hints', langHints.join(','));
    }
    body = form;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OCR worker returned ${response.status}: ${text}`);
  }

  const payload = await response.json();
  log(requestId, 'FastAPI worker completed', { endpoint });
  return payload;
}

function parseCommand(command) {
  const tokens = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  if (tokens.length === 0) {
    throw new Error('OCR_CLI_COMMAND is empty');
  }
  return tokens.map((token) => token.replace(/^"|"$/g, ''));
}

async function invokeCliWorker({ imagePath, jobId, requestId }) {
  const [cmd, ...baseArgs] = parseCommand(OCR_CLI_COMMAND);
  const args = [...baseArgs, '--input', imagePath, '--job-id', jobId];

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`CLI worker timed out after ${WORKER_TIMEOUT_MS}ms`));
    }, WORKER_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      text
        .split('\n')
        .filter(Boolean)
        .forEach((line) => log(requestId, `[cli:stdout] ${line}`));
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      text
        .split('\n')
        .filter(Boolean)
        .forEach((line) => log(requestId, `[cli:stderr] ${line}`));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`CLI worker failed (exit ${code}): ${stderr || stdout}`));
        return;
      }

      try {
        const jsonPayload = JSON.parse(stdout.trim());
        resolve(jsonPayload);
      } catch {
        reject(new Error('CLI worker output is not valid JSON'));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function processImageRequest(event, requestId) {
  const contentType = getHeader(event, 'content-type') || '';
  let tempFilePath;
  const jobId = randomUUID();

  const startedAt = Date.now();
  let imageBuffer;
  let mimeType;
  let filename = `receipt-${jobId}.jpg`;
  let blobPath = null;
  let sourceType = 'upload';
  let langHints = [...DEFAULT_OCR_LANG_HINTS];

  try {
    if (contentType.includes('multipart/form-data')) {
      const { file, fields } = await parseMultipart(event, requestId);
      if (!file) {
        throw new Error('Multipart request did not include a file');
      }
      sourceType = fields.source_type || sourceType;
      if (fields.lang_hints) {
        langHints = String(fields.lang_hints)
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }

      validateUploadedFile({ mimeType: file.mimeType, size: file.size });
      imageBuffer = file.buffer;
      mimeType = file.mimeType;
      filename = file.filename;
    } else {
      const payload = parseJsonBody(event);
      sourceType = payload.source_type || sourceType;
      if (Array.isArray(payload.lang_hints) && payload.lang_hints.length > 0) {
        langHints = payload.lang_hints.map((entry) => String(entry));
      }

      if (payload.blob_path) {
        blobPath = payload.blob_path;
      } else if (payload.image_url || payload.signed_upload_url) {
        const fetched = await fetchImageFromUrl(payload.image_url || payload.signed_upload_url);
        imageBuffer = fetched.buffer;
        mimeType = fetched.mimeType;
      } else if (payload.s3_bucket && payload.s3_key) {
        const fetched = await fetchImageFromS3(payload.s3_bucket, payload.s3_key);
        imageBuffer = fetched.buffer;
        mimeType = fetched.mimeType;
        filename = path.basename(payload.s3_key);
      } else {
        throw new Error('Provide multipart file upload, image_url, signed_upload_url, blob_path, or s3_bucket/s3_key');
      }

      if (imageBuffer) {
        validateUploadedFile({ mimeType, size: imageBuffer.length });
      }
    }

    let uploadedAsset = null;
    if (imageBuffer) {
      uploadedAsset = await maybeUploadOriginalToS3({
        buffer: imageBuffer,
        mimeType,
        jobId,
        filename,
        requestId,
      });

      tempFilePath = await writeTempFile({
        buffer: imageBuffer,
        mimeType,
        filename,
        jobId,
      });
      log(requestId, 'Saved temp image', { tempFilePath });
    }

    const workerResult = OCR_WORKER_URL
      ? await invokeFastApiWorker({
          buffer: imageBuffer,
          mimeType,
          filename,
          blobPath,
          jobId,
          requestId,
          sourceType,
          langHints,
        })
      : await invokeCliWorker({ imagePath: tempFilePath, jobId, requestId });

    const normalized = normalizeWorkerPayload(workerResult, jobId, Date.now() - startedAt);
    normalized.storage = uploadedAsset;
    return normalized;
  } finally {
    if (tempFilePath) {
      await fs.rm(tempFilePath, { force: true }).catch(() => undefined);
      log(requestId, 'Deleted temp image', { tempFilePath });
    }
  }
}

async function createSignedUploadUrl(event, requestId) {
  if (!S3_BUCKET) {
    throw new Error('RECEIPT_UPLOAD_BUCKET is not configured');
  }

  const payload = parseJsonBody(event);
  const mimeType = payload.mime_type || payload.content_type || 'image/jpeg';

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported upload MIME type: ${mimeType}`);
  }

  const originalName = sanitizeFilename(payload.file_name || `receipt-${Date.now()}`);
  const key = `incoming/${randomUUID()}-${originalName}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  log(requestId, 'Issued signed upload URL', { key, mimeType });

  return {
    upload_url: uploadUrl,
    s3_bucket: S3_BUCKET,
    s3_key: key,
    expires_in_seconds: 300,
    method: 'PUT',
    required_headers: {
      'Content-Type': mimeType,
      'x-amz-server-side-encryption': 'AES256',
    },
  };
}

export const handler = async (event, context) => {
  const requestId = getRequestId(event, context);
  const method = getHttpMethod(event);
  const routePath = getRoutePath(event);
  const clientIp = getClientIp(event);

  log(requestId, `Incoming request ${method} ${routePath}`, { clientIp });

  if (method === 'OPTIONS') {
    return json(200, { ok: true }, requestId);
  }

  const limiter = getRateLimitStatus(clientIp);
  if (!limiter.allowed) {
    return json(
      429,
      {
        error: 'Too many requests',
        request_id: requestId,
      },
      requestId,
    );
  }

  try {
    if (method === 'GET' && routeMatches(routePath, '/health')) {
      return json(
        200,
        {
          ok: true,
          service: 'expense-ocr-node-api',
          worker_mode: OCR_WORKER_URL ? 'http-fastapi' : 'cli-spawn',
          request_id: requestId,
        },
        requestId,
      );
    }

    if (method === 'GET' && routeMatches(routePath, '/market/news-macro')) {
      const refreshHint = getQueryParam(event, 'refresh');
      const forceRefresh = String(refreshHint).toLowerCase() === '1' || String(refreshHint).toLowerCase() === 'true';
      const payload = await getFinanceIntel(forceRefresh);
      return json(200, payload, requestId);
    }

    if (method === 'POST' && routeMatches(routePath, '/ocr/upload-url')) {
      const payload = await createSignedUploadUrl(event, requestId);
      return json(200, payload, requestId);
    }

    if (method === 'POST' && routeMatches(routePath, '/ocr/process-image')) {
      const result = await processImageRequest(event, requestId);
      return json(200, result, requestId);
    }

    return json(404, { error: `Route not found: ${method} ${routePath}`, request_id: requestId }, requestId);
  } catch (error) {
    log(requestId, 'Request failed', { message: error?.message, stack: error?.stack });
    return json(
      500,
      {
        error: error?.message || 'Internal server error',
        request_id: requestId,
      },
      requestId,
    );
  }
};
