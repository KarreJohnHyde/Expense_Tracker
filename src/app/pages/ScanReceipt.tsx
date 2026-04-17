import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { toast } from 'sonner';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle2,
  Loader2,
  X,
  Save,
  QrCode,
  Image as ImageIcon,
  FileText,
  Eye,
  ReceiptText,
  Tag,
  CreditCard,
  CalendarDays,
  DollarSign,
  ListChecks,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Layers,
  AlignLeft,
  Zap,
  Crop,
  Wand2,
  BarChart3,
  Target,
  LayoutDashboard,
} from 'lucide-react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { notifyUser } from '../lib/notifications';
import { classifyExpense } from '../lib/classifier';
import { EXPENSE_CATEGORIES } from '../lib/expenseSchema';
import { compressImage, optimizeImageForWeb, validateImage, fileToDataUrl } from '../lib/imageUtils';
import { ImageCropper } from '../components/ImageCropper';
import { MultiImageUpload, type UploadedImage } from '../components/MultiImageUpload';
import { ImageFilter } from '../components/ImageFilter';

const CATEGORIES = [...EXPENSE_CATEGORIES];

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'];

// ── Extracted line-item interface ─────────────────────────────────────────────
interface ExtractedLineItem {
  text: string;
  amount: number | null;
  isTotal: boolean;
}

interface ExtractedReceiptInfo {
  merchant: string;
  total: string;
  date: string;
  category: string;
  paymentMethod: string;
  lineItems: ExtractedLineItem[];
  allText: string;
  aiDescription: string;
  confidence: number;
}

export default function ScanReceipt() {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [mode, setMode] = useState<'upload' | 'camera' | 'qr' | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [extractedInfo, setExtractedInfo] = useState<ExtractedReceiptInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [qrResult, setQrResult] = useState<string>('');
  const [showRawText, setShowRawText] = useState(false);
  const [scanSource, setScanSource] = useState<'manual' | 'receipt_scan' | 'qr_scan' | 'barcode_scan'>('manual');
  const [scanMetadata, setScanMetadata] = useState<{
    type: 'ocr_receipt' | 'qr' | 'barcode';
    rawText: string;
    format?: string;
    capturedAt: string;
  } | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showMultiUpload, setShowMultiUpload] = useState(false);
  const [showImageFilter, setShowImageFilter] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [batchResults, setBatchResults] = useState<Array<{ image: UploadedImage; ocrText: string; extractedInfo: ExtractedReceiptInfo }>>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrScannerRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0],
  });

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'environment', // Use back camera on mobile
  };

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setScanSource('receipt_scan');
      setImage(imageSrc);
      setShowWebcam(false);
      processImage(imageSrc);
    }
  }, [webcamRef]);

  const stopQRScanner = useCallback(async () => {
    try {
      if (qrScannerRef.current) {
        await qrScannerRef.current.stop();
        await qrScannerRef.current.clear();
      }
    } catch {
      // scanner may already be stopped
    } finally {
      qrScannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopQRScanner();
    };
  }, [stopQRScanner]);

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setMode('upload');
    setShowWebcam(false);

    let file: File | null = null;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      file = e.dataTransfer.files[0];
    } else if (e.dataTransfer.items) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === 'file') {
          const droppedFile = item.getAsFile();
          if (droppedFile) {
            file = droppedFile;
            break;
          }
        }
      }
    }

    if (file) {
      if (file.type.startsWith('image/')) {
        handleFile(file);
      } else {
        toast.error('Please drop an image file (e.g., JPG, PNG)');
      }
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setScanSource('receipt_scan');
      setImage(imageSrc);
      setMode('upload');
      setShowWebcam(false);
      setSaved(false);
      processImage(imageSrc);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMode('upload');
      setShowWebcam(false);
      handleFile(file);
    }
  };

  const recognizeReceiptImage = async (
    imageSrc: string,
    onProgress?: (progress: number) => void
  ): Promise<{ text: string; extractedInfo: ExtractedReceiptInfo }> => {
    // Always convert to JPEG for Tesseract — WebP causes failures in some browsers
    let processImageSrc = imageSrc;
    try {
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageSrc;
      });
      const canvas = document.createElement('canvas');
      // Cap at 3000px for OCR quality vs speed balance
      const maxDim = 3000;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        processImageSrc = canvas.toDataURL('image/jpeg', 0.92);
      }
    } catch {
      // Fallback to original if conversion fails
    }

    const result = await Tesseract.recognize(processImageSrc, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round(m.progress * 100);
          onProgress?.(progress);
        }
      },
    });
    const text = result.data.text;
    const extracted = extractReceiptData(text);
    return { text, extractedInfo: extracted };
  };

  const processImage = async (imageSrc: string) => {
    setProcessing(true);
    setOcrText('');
    setOcrProgress(0);
    setExtractedInfo(null);
    setSaved(false);

    try {
      const { text, extractedInfo: extracted } = await recognizeReceiptImage(imageSrc, (progress) => {
        setOcrProgress(progress);
      });

      setOcrText(text);
      setScanMetadata({
        type: 'ocr_receipt',
        rawText: text,
        capturedAt: new Date().toISOString(),
      });

      setExtractedInfo(extracted);
      setFormData({
        description: extracted.merchant || '',
        amount: extracted.total || '',
        category: extracted.category || '',
        paymentMethod: extracted.paymentMethod || '',
        date: extracted.date || new Date().toISOString().split('T')[0],
      });

      toast.success('Receipt scanned successfully! ✅');
      notifyUser({
        type: 'scan_complete',
        title: '📸 Receipt Scanned',
        message: `Scanned receipt: ${extracted.merchant || 'Unknown'} — ${currency.symbol}${extracted.total || '0'}`,
        desktopTitle: 'Receipt Scanned',
        desktopBody: `${extracted.merchant || 'Receipt'} processed`,
      });
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Failed to process receipt');
    } finally {
      setProcessing(false);
    }
  };

  const applyBatchResult = (index: number, results: Array<{ image: UploadedImage; ocrText: string; extractedInfo: ExtractedReceiptInfo }> = batchResults) => {
    const batchResult = results[index];
    if (!batchResult) return;

    setActiveBatchIndex(index);
    setImage(batchResult.image.dataUrl);
    setOcrText(batchResult.ocrText);
    setExtractedInfo(batchResult.extractedInfo);
    setFormData({
      description: batchResult.extractedInfo.merchant || '',
      amount: batchResult.extractedInfo.total || '',
      category: batchResult.extractedInfo.category || '',
      paymentMethod: batchResult.extractedInfo.paymentMethod || '',
      date: batchResult.extractedInfo.date || new Date().toISOString().split('T')[0],
    });
    setScanMetadata({
      type: 'ocr_receipt',
      rawText: batchResult.ocrText,
      capturedAt: new Date().toISOString(),
    });
  };

  const processBatchImages = async (images: UploadedImage[]) => {
    setUploadedImages(images);
    setBatchResults([]);
    setBatchProcessing(true);
    setBatchProgress(0);
    setSaved(false);

    const results: Array<{ image: UploadedImage; ocrText: string; extractedInfo: ExtractedReceiptInfo }> = [];

    for (let i = 0; i < images.length; i++) {
      const imageItem = images[i];
      setImage(imageItem.dataUrl);
      setScanSource('receipt_scan');
      setProcessing(true);
      setOcrText('');
      setExtractedInfo(null);
      setOcrProgress(0);

      try {
        const { text, extractedInfo } = await recognizeReceiptImage(imageItem.dataUrl, (progress) => {
          setOcrProgress(progress);
        });

        results.push({ image: imageItem, ocrText: text, extractedInfo });
        setBatchProgress(Math.round(((i + 1) / images.length) * 100));
      } catch (error) {
        console.error('Batch OCR Error:', error, imageItem.file.name);
        toast.error(`Failed to process ${imageItem.file.name}`);
      } finally {
        setProcessing(false);
      }
    }

    setBatchResults(results);
    setBatchProcessing(false);
    if (results.length > 0) {
      applyBatchResult(0, results);
      toast.success(`${results.length} receipt(s) processed automatically`);
    }
  };

  // ── Advanced receipt data extraction ─────────────────────────────────────────
  const extractReceiptData = (text: string): ExtractedReceiptInfo => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const textLower = text.toLowerCase();

    // ── Extract merchant name ─────────────────────────────────────────────
    // Strategy: First meaningful non-date, non-number line, skip common headers
    const skipPatterns = /^(duplicate|copy|original|tax\s*invoice|invoice|receipt|cash\s*memo|bill|gst|gstin|cin|pan|fssai|date|time|sr\.?\s*no|s\.?\s*no)/i;
    let merchant = '';
    for (const line of lines.slice(0, 10)) {
      const cleaned = line.replace(/[^a-zA-Z0-9\s&.,'-]/g, '').trim();
      if (
        cleaned.length > 2 &&
        !skipPatterns.test(cleaned) &&
        !/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(cleaned) &&
        !/^\d+$/.test(cleaned)
      ) {
        merchant = cleaned;
        break;
      }
    }
    if (!merchant) merchant = lines[0] || 'Unknown Merchant';

    // ── Extract all amounts from text ─────────────────────────────────────
    const lineItems: ExtractedLineItem[] = [];
    const amountPatterns = [
      /(?:₹|rs\.?|inr\.?)\s*([0-9,]+\.?\d{0,2})/gi,
      /([0-9,]+\.\d{2})\s*$/,
      /(?:amt|amount|price|mrp|total|sum|net|payable|balance|due|charge|fee|cost)\s*[:\-]?\s*(?:₹|rs\.?|inr\.?)?\s*([0-9,]+\.?\d{0,2})/gi,
    ];
    const totalKeywords = ['total', 'grand total', 'net amount', 'amount due', 'balance', 'sum', 'payable', 'net payable', 'amount payable', 'bill amount', 'invoice total', 'total amount', 'total amt', 'total rs', 'total payable', 'you pay', 'to pay'];

    for (const line of lines) {
      // Try to find amounts in each line
      const amountsFound: number[] = [];
      for (const pattern of amountPatterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(line)) !== null) {
          const amountStr = (match[1] || match[0]).replace(/[₹,rs\.inr\s]/gi, '').trim();
          const amount = parseFloat(amountStr);
          if (!isNaN(amount) && amount > 0 && amount < 10000000) {
            amountsFound.push(amount);
          }
        }
      }

      if (amountsFound.length > 0) {
        const maxAmount = Math.max(...amountsFound);
        const lineLower = line.toLowerCase();
        const isTotal = totalKeywords.some(kw => lineLower.includes(kw));
        lineItems.push({
          text: line,
          amount: maxAmount,
          isTotal,
        });
      }
    }

    // ── Extract total amount ──────────────────────────────────────────────
    let total = '';

    // Priority 1: Lines with "total" keywords
    const totalLines = lineItems.filter(item => item.isTotal);
    if (totalLines.length > 0) {
      // Pick the last total (usually the final grand total)
      const lastTotal = totalLines[totalLines.length - 1];
      if (lastTotal.amount) total = lastTotal.amount.toFixed(2);
    }

    // Priority 2: Scan for specific total patterns across all text
    if (!total) {
      const totalPatterns = [
        /(?:grand\s*total|net\s*(?:amount|payable)|total\s*(?:amount|amt|rs|payable)|bill\s*amount|you\s*pay|to\s*pay|amount\s*(?:due|payable))\s*[:\-]?\s*(?:₹|rs\.?|inr\.?)?\s*([0-9,]+\.?\d{0,2})/i,
        /(?:total)\s*[:\-]?\s*(?:₹|rs\.?|inr\.?)?\s*([0-9,]+\.?\d{0,2})/i,
        /(?:₹|rs\.?)\s*([0-9,]+\.\d{2})/i,
      ];
      for (const pattern of totalPatterns) {
        const allMatches: string[] = [];
        for (const line of lines) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const val = match[1].replace(/,/g, '');
            if (parseFloat(val) > 0) allMatches.push(val);
          }
        }
        if (allMatches.length > 0) {
          // Use the last match (usually the grand total at the bottom)
          total = parseFloat(allMatches[allMatches.length - 1]).toFixed(2);
          break;
        }
      }
    }

    // Priority 3: If still no total, use the largest amount found
    if (!total && lineItems.length > 0) {
      const maxItem = lineItems.reduce((max, item) =>
        (item.amount || 0) > (max.amount || 0) ? item : max
      );
      if (maxItem.amount) total = maxItem.amount.toFixed(2);
    }

    // ── Extract date ─────────────────────────────────────────────────────
    let date = new Date().toISOString().split('T')[0];
    const datePatterns = [
      // DD/MM/YYYY or DD-MM-YYYY
      /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/, 
      // DD/MM/YY or DD-MM-YY
      /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})(?!\d)/,
      // YYYY-MM-DD
      /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/,
      // Month name formats: 17 Apr 2026, Apr 17 2026
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    ];
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };

    for (const line of lines) {
      let matched = false;
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            let parsedDate: Date | null = null;
            if (/^\d{4}$/.test(match[1])) {
              // YYYY-MM-DD
              parsedDate = new Date(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`);
            } else if (/^[A-Za-z]/.test(match[1])) {
              // Month DD, YYYY
              const m = monthMap[match[1].toLowerCase().substring(0, 3)];
              if (m) parsedDate = new Date(`${match[3]}-${m}-${match[2].padStart(2, '0')}`);
            } else if (match[4] && /^[A-Za-z]/.test(match[2] || '')) {
              // DD Month YYYY — captured differently
            } else {
              // DD/MM/YYYY or DD/MM/YY
              const day = match[1].padStart(2, '0');
              const month = match[2].padStart(2, '0');
              let year = match[3];
              if (year.length === 2) year = '20' + year;
              if (parseInt(day) <= 31 && parseInt(month) <= 12) {
                parsedDate = new Date(`${year}-${month}-${day}`);
              }
            }
            if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
              date = parsedDate.toISOString().split('T')[0];
              matched = true;
            }
          } catch { /* skip invalid dates */ }
          if (matched) break;
        }
      }
      if (matched) break;
    }

    // ── Guess category using local ML classifier ─────────────────────────
    const mlResult = classifyExpense(text);
    let category = mlResult.category;
    
    // Enhanced keyword-based fallback for Indian receipts
    if (category === 'Others' || mlResult.confidence < 0.3) {
      const categoryKeywords: [string, string[]][] = [
        ['Food & Dining', ['restaurant', 'cafe', 'food', 'swiggy', 'zomato', 'dining', 'biryani', 'pizza', 'burger', 'kitchen', 'bakery', 'hotel', 'dhaba', 'canteen', 'mess', 'tiffin', 'snacks']],
        ['Transportation', ['uber', 'ola', 'taxi', 'transport', 'petrol', 'diesel', 'fuel', 'metro', 'bus', 'railway', 'flight', 'parking', 'toll', 'auto', 'rapido']],
        ['Shopping', ['shop', 'store', 'market', 'mall', 'retail', 'mart', 'bazaar', 'amazon', 'flipkart', 'myntra', 'reliance', 'dmart', 'bigbasket', 'supermarket', 'hypermarket', 'wholesale']],
        ['Bills & Utilities', ['electric', 'water', 'utility', 'bill', 'recharge', 'airtel', 'jio', 'bsnl', 'vodafone', 'gas', 'broadband', 'wifi', 'internet', 'dth']],
        ['Entertainment', ['movie', 'entertainment', 'ticket', 'pvr', 'inox', 'cinema', 'netflix', 'spotify', 'gaming', 'park', 'amusement']],
        ['Healthcare', ['hospital', 'pharmacy', 'medical', 'clinic', 'doctor', 'health', 'medicine', 'apollo', 'medplus', 'lab', 'diagnostic', 'dental']],
        ['Education', ['school', 'college', 'university', 'course', 'training', 'book', 'stationery', 'education', 'tuition', 'coaching', 'udemy', 'coursera']],
      ];
      for (const [cat, keywords] of categoryKeywords) {
        if (keywords.some(kw => textLower.includes(kw))) {
          category = cat;
          break;
        }
      }
    }

    // ── Guess payment method ─────────────────────────────────────────────
    let paymentMethod = 'Cash';
    if (textLower.includes('credit card') || textLower.includes('credit')) {
      paymentMethod = 'Credit Card';
    } else if (textLower.includes('debit card') || textLower.includes('debit')) {
      paymentMethod = 'Debit Card';
    } else if (textLower.includes('upi') || textLower.includes('paytm') || textLower.includes('gpay') || textLower.includes('phonepe') || textLower.includes('google pay') || textLower.includes('phone pe')) {
      paymentMethod = 'UPI';
    } else if (textLower.includes('net banking') || textLower.includes('netbanking') || textLower.includes('neft') || textLower.includes('imps')) {
      paymentMethod = 'Net Banking';
    } else if (textLower.includes('card') && (textLower.includes('visa') || textLower.includes('mastercard') || textLower.includes('rupay'))) {
      paymentMethod = 'Debit Card';
    }

    const aiDescription = merchant !== 'Unknown Merchant'
      ? `Detected receipt from ${merchant} with ${lineItems.length} item${lineItems.length === 1 ? '' : 's'}, total ${currency.symbol}${total || '0.00'}, categorized as ${category}.`
      : `Detected receipt with ${lineItems.length} item${lineItems.length === 1 ? '' : 's'} and total ${currency.symbol}${total || '0.00'}.`;

    return {
      merchant,
      total,
      date,
      category,
      paymentMethod,
      lineItems,
      allText: text,
      aiDescription,
      confidence: mlResult.confidence,
    };
  };

  const captureScannerFrame = (): string | null => {
    try {
      const video = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
      if (!video || !video.videoWidth || !video.videoHeight) return null;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch {
      return null;
    }
  };

  const generateScanPlaceholder = (decodedText: string, format?: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#111827');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 34px Arial';
    ctx.fillText(format ? `${format} Captured` : 'QR/Barcode Captured', 48, 72);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px Arial';
    ctx.fillText(new Date().toLocaleString(), 48, 112);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 150, canvas.width - 80, canvas.height - 200);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px monospace';
    const wrapped = decodedText.match(/.{1,70}/g) || [decodedText];
    wrapped.slice(0, 12).forEach((line, idx) => {
      ctx.fillText(line, 60, 200 + idx * 34);
    });

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // QR/Barcode scan handler
  const handleQRScan = (decodedText: string, format?: string) => {
    const frame = captureScannerFrame() || generateScanPlaceholder(decodedText, format);
    setImage(frame);
    setMode(null);
    setScanSource(/qr/i.test(format || '') ? 'qr_scan' : 'barcode_scan');
    setScanMetadata({
      type: /qr/i.test(format || '') ? 'qr' : 'barcode',
      rawText: decodedText,
      format,
      capturedAt: new Date().toISOString(),
    });
    setQrResult(decodedText);
    toast.success('Code scanned successfully!');

    // Check if it's a multiline receipt text embedded in QR
    if (decodedText.includes('\n') && (decodedText.toLowerCase().includes('total') || decodedText.toLowerCase().includes('amount') || decodedText.toLowerCase().includes('merchant') || decodedText.toLowerCase().includes('tax'))) {
      const extracted = extractReceiptData(decodedText);
      setExtractedInfo(extracted);
      setFormData({
        description: extracted.merchant || 'QR Receipt Scan',
        amount: extracted.total || '',
        category: extracted.category || 'Others',
        paymentMethod: extracted.paymentMethod || 'Cash',
        date: extracted.date || new Date().toISOString().split('T')[0],
      });
      toast.success('Receipt Data Extracted from QR Code');
    } 
    // Intelligent AI-like pattern detection
    else if (decodedText.toLowerCase().startsWith('upi://pay')) {
      try {
        const url = new URL(decodedText);
        const pa = url.searchParams.get('pa') || '';
        const pn = url.searchParams.get('pn') || '';
        const am = url.searchParams.get('am') || '';
        const tn = url.searchParams.get('tn') || '';
        setFormData({
          description: tn || `UPI Payment to ${pn || pa}`,
          amount: am,
          category: 'Others',
          paymentMethod: 'UPI',
          date: new Date().toISOString().split('T')[0],
        });
        toast.success(`UPI Payment Detected: ${pn || pa} (₹${am || 'Various'})`);
      } catch { /* not a valid URL */ }
    } else if (decodedText.toLowerCase().startsWith('wifi:')) {
      const ssidMatch = decodedText.match(/S:([^;]+);/);
      const ssid = ssidMatch ? ssidMatch[1] : 'Unknown Network';
      
      setFormData({
        description: `WiFi Hotspot: ${ssid}`,
        amount: '0',
        category: 'Bills & Utilities',
        paymentMethod: 'Cash',
        date: new Date().toISOString().split('T')[0],
      });
      toast.info(`WiFi Network Detected: ${ssid}`);
    } else if (decodedText.toLowerCase().startsWith('vcard:') || decodedText.toLowerCase().startsWith('mecard:')) {
      setFormData({
        description: `Contact Sync / Business Card`,
        amount: '0',
        category: 'Others',
        paymentMethod: 'Cash',
        date: new Date().toISOString().split('T')[0],
      });
      toast.info('Contact Card Detected');
    } else if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
      window.open(decodedText, '_blank');
      try {
        const urlObj = new URL(decodedText);
        setFormData({
          description: `Website Scan: ${urlObj.hostname}`,
          amount: '',
          category: 'Others',
          paymentMethod: 'Cash',
          date: new Date().toISOString().split('T')[0],
        });
        toast.success(`URL Captured & Opened: ${urlObj.hostname}`);
      } catch {
        toast.success('Navigated to URL');
      }
    } else {
      const codeType = /^\d+$/.test(decodedText.trim()) ? 'Barcode' : 'QR Scan';
      setFormData({
        description: `${codeType}: ${decodedText.length > 50 ? decodedText.slice(0, 50) + '...' : decodedText}`,
        amount: '',
        category: 'Shopping',
        paymentMethod: 'Cash',
        date: new Date().toISOString().split('T')[0],
      });
      toast.success(`${codeType} Detected and Captured`);
    }

    notifyUser({
      type: 'scan_complete',
      title: '🔍 QR/Barcode Analyzed',
      message: decodedText.length > 50 ? decodedText.slice(0, 50) + '...' : decodedText,
      desktopTitle: 'QR/Barcode Scanned',
      desktopBody: decodedText.length > 50 ? decodedText.slice(0, 50) + '...' : decodedText,
    });
  };

  // Start QR scanner using webcam
  const startQRScanner = async () => {
    setMode('qr');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      // Small delay to ensure DOM element exists
      setTimeout(async () => {
        const scanner = new Html5Qrcode('qr-reader');
        qrScannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string, decodedResult: any) => {
            const format = decodedResult?.result?.format?.formatName || decodedResult?.result?.format?.toString?.();
            handleQRScan(decodedText, format);
            await stopQRScanner();
          },
          () => {} // ignore errors during scanning
        );
      }, 500);
    } catch {
      toast.error('QR scanner not available. Install html5-qrcode: pnpm add html5-qrcode');
    }
  };

  const handleSaveExpense = async () => {
    if (!formData.description || !formData.amount || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await api.addExpense({
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        date: formData.date,
        receiptImage: image,
        source: scanSource,
        scanData: scanMetadata,
      });

      toast.success('Expense saved & added to Gallery! 💰');
      setSaved(true);

      notifyUser({
        type: 'scan_complete',
        title: '💾 Expense Saved',
        message: `${formData.description} — ${currency.symbol}${formData.amount}`,
        desktopTitle: 'Expense Saved',
        desktopBody: `${formData.description} saved to gallery`,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    stopQRScanner();
    setImage(null);
    setOcrText('');
    setExtractedInfo(null);
    setShowWebcam(false);
    setMode(null);
    setScanMetadata(null);
    setScanSource('manual');
    setSaved(false);
    setOcrProgress(0);
    setShowRawText(false);
    setFormData({
      description: '',
      amount: '',
      category: '',
      paymentMethod: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleScanAnother = () => {
    handleReset();
  };

  // ── Category icon + color helper ─────────────────────────────────────────
  const getCategoryStyle = (cat: string) => {
    const map: Record<string, { color: string; bg: string }> = {
      'Food & Dining': { color: 'text-orange-400', bg: 'bg-orange-500/10' },
      'Shopping': { color: 'text-pink-400', bg: 'bg-pink-500/10' },
      'Transportation': { color: 'text-blue-400', bg: 'bg-blue-500/10' },
      'Bills & Utilities': { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
      'Entertainment': { color: 'text-purple-400', bg: 'bg-purple-500/10' },
      'Healthcare': { color: 'text-red-400', bg: 'bg-red-500/10' },
      'Education': { color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
      'Investments & Savings': { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      'Travel & Holidays': { color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    };
    return map[cat] || { color: 'text-slate-400', bg: 'bg-slate-500/10' };
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Scan className="size-7 text-primary" />
            </div>
            Scan Receipt
          </h1>
          <p className="text-muted-foreground mt-1">
            Camera capture, batch upload, or scan barcodes/QR codes — AI extracts text, amounts, and categories automatically
          </p>
        </div>
        {image && !saved && (
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="size-4" />
            Start Over
          </Button>
        )}
      </div>

      {/* Mode Selection */}
      {!mode && !image && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            onClick={() => {
              setMode('camera');
              setShowWebcam(true);
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="flex flex-col items-center justify-center py-12 relative">
              <div className="p-4 rounded-2xl bg-blue-500/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <Camera className="size-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Take Photo</h3>
              <p className="text-muted-foreground text-center text-sm">
                Use your webcam to capture a receipt
              </p>
            </CardContent>
          </Card>


          <Card
            className="cursor-pointer group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            onClick={startQRScanner}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="flex flex-col items-center justify-center py-12 relative">
              <div className="p-4 rounded-2xl bg-violet-500/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <QrCode className="size-10 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Scan QR / Barcode</h3>
              <p className="text-muted-foreground text-center text-sm">
                Scan QR codes or barcodes on bills
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            onClick={() => setShowMultiUpload(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="flex flex-col items-center justify-center py-12 relative">
              <div className="p-4 rounded-2xl bg-pink-500/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <ImageIcon className="size-10 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Batch Upload</h3>
              <p className="text-muted-foreground text-center text-sm">
                Upload multiple receipts at once
              </p>
            </CardContent>
          </Card>

        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera View */}
      {showWebcam && (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-5 text-primary" />
                Capture Receipt
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowWebcam(false);
                setMode(null);
              }}>
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full rounded-lg"
              />
              <div className="flex justify-center gap-4 mt-4">
                <Button size="lg" onClick={capturePhoto} className="gap-2">
                  <Camera className="size-5" />
                  Capture Photo
                </Button>
                <Button size="lg" variant="outline" onClick={() => {
                  setShowWebcam(false);
                  setMode(null);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Scanner View */}
      {mode === 'qr' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5" /> QR / Barcode Scanner
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => {
                stopQRScanner();
                setMode(null);
              }}>
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div id="qr-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden" />
            {qrResult && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Scanned Result:</p>
                <p className="text-sm mt-1 break-all">{qrResult}</p>
                {qrResult.startsWith('http') && (
                  <Button size="sm" className="mt-2" onClick={() => window.open(qrResult, '_blank')}>
                    Open Link
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Processing State ───────────────────────────────────────────── */}
      {batchProcessing && (
        <Card className="border-primary/30 overflow-hidden">
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-300 ease-out"
              style={{ width: `${batchProgress}%` }}
            />
          </div>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="size-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <Loader2 className="size-10 animate-spin text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {batchProgress}%
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-1">Processing batch receipts...</h3>
              <p className="text-muted-foreground text-sm">Automatically scanning all uploaded images</p>
            </div>
          </CardContent>
        </Card>
      )}

      {processing && image && (
        <Card className="border-primary/30 overflow-hidden">
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-300 ease-out"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="size-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <Loader2 className="size-10 animate-spin text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {ocrProgress}%
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-1">Extracting Receipt Data...</h3>
              <p className="text-muted-foreground text-sm">AI is reading text, amounts, and categories</p>
              <div className="flex gap-3 mt-4">
                {['Reading text...', 'Finding amounts...', 'Categorizing...'].map((step, i) => (
                  <span
                    key={step}
                    className={`text-xs px-3 py-1 rounded-full ${
                      ocrProgress > (i + 1) * 30
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    } transition-colors duration-300`}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Results: Image + Extracted Data + Form ─────────────────────── */}
      {image && !showWebcam && !processing && (
        <div className="space-y-6">
          {/* Success state after save */}
          {saved && (
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center">
                  <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="size-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">Expense Saved Successfully!</h3>
                  <p className="text-muted-foreground mb-6">
                    Your receipt has been saved and linked to your Dashboard, Analytics & Budgets.
                  </p>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button onClick={() => navigate('/')} className="gap-2">
                      <LayoutDashboard className="size-4" />
                      Dashboard
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/analytics')} className="gap-2">
                      <BarChart3 className="size-4" />
                      Analytics
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/budgets')} className="gap-2">
                      <Target className="size-4" />
                      Budgets
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/gallery')} className="gap-2">
                      <ImageIcon className="size-4" />
                      Gallery
                    </Button>
                    <Button variant="ghost" onClick={handleScanAnother} className="gap-2">
                      <Scan className="size-4" />
                      Scan Another
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main two-column layout */}
          {!saved && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column: Image + Extracted Text + Line Items */}
              <div className="space-y-4">
                {/* Image Preview */}
              {batchResults.length > 1 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ImageIcon className="size-5 text-pink-400" />
                      Batch Receipt Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-2">
                      {batchResults.map((result, index) => (
                        <button
                          key={result.image.id}
                          type="button"
                          onClick={() => applyBatchResult(index)}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${
                            index === activeBatchIndex
                              ? 'border-primary bg-primary/5'
                              : 'border-border/50 bg-muted/70 hover:border-primary hover:bg-muted/90'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 overflow-hidden rounded-lg bg-slate-900">
                              <img src={result.image.dataUrl} alt={result.image.file.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {result.extractedInfo.merchant || result.image.file.name}
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                <span>{currency.symbol}{result.extractedInfo.total || '0.00'}</span>
                                <span>{result.extractedInfo.category || 'Others'}</span>
                                <span>{formatDisplayDate(result.extractedInfo.date)}</span>
                              </div>
                              {result.ocrText && (
                                <div className="mt-1 text-[10px] font-mono text-slate-500 line-clamp-2 leading-tight">
                                  {result.ocrText.split('\n').filter(l => l.trim()).slice(0, 3).join(' · ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ReceiptText className="size-5 text-primary" />
                        Receipt Image
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={handleReset} className="size-8">
                        <X className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="relative group rounded-lg overflow-hidden border border-border/50">
                      <img src={image} alt="Receipt" className="w-full rounded-lg" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => {
                          setImage(null);
                          setMode('camera');
                          setShowWebcam(true);
                        }}
                      >
                        <Camera className="size-3.5" />
                        Retake
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => setShowCropper(true)}
                      >
                        <Crop className="size-3.5" />
                        Crop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => setShowImageFilter(true)}
                      >
                        <Wand2 className="size-3.5" />
                        Filter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="size-3.5" />
                        Replace
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Extracted Text Panel — OCR receipts AND QR/barcode decoded text */}
                {(ocrText || scanMetadata?.rawText) && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <AlignLeft className="size-5 text-cyan-400" />
                          {scanMetadata?.type === 'qr' ? 'QR Code Data' : scanMetadata?.type === 'barcode' ? 'Barcode Data' : 'Raw OCR Text'}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-normal">
                            {(ocrText || scanMetadata?.rawText || '').split('\n').filter(l => l.trim()).length} lines
                          </span>
                          {scanMetadata?.type && scanMetadata.type !== 'ocr_receipt' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-normal">
                              {scanMetadata.type === 'qr' ? '🔍 QR' : '📊 Barcode'}
                            </span>
                          )}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRawText(!showRawText)}
                          className="gap-1 text-xs h-7"
                        >
                          <Eye className="size-3.5" />
                          {showRawText ? 'Collapse' : 'Expand'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div
                        className={`rounded-lg bg-slate-950/50 border border-slate-800/60 overflow-hidden transition-all duration-300 ${
                          showRawText ? 'max-h-[500px]' : 'max-h-32'
                        }`}
                      >
                        <div className="p-3 overflow-y-auto max-h-[500px]">
                          {(ocrText || scanMetadata?.rawText || '').split('\n').filter(l => l.trim()).map((line, i) => {
                            // Highlight lines with amounts
                            const hasAmount = /[0-9,]+\.\d{2}/.test(line) || /(?:₹|rs\.?|\$)\s*[0-9]/i.test(line);
                            const isTotal = /total|amount|sum|payable|balance/i.test(line);
                            return (
                              <div
                                key={i}
                                className={`text-xs font-mono py-0.5 px-2 rounded flex items-start gap-2 ${
                                  isTotal
                                    ? 'bg-emerald-500/10 text-emerald-300 font-semibold'
                                    : hasAmount
                                    ? 'bg-primary/5 text-primary/90'
                                    : 'text-slate-400'
                                }`}
                              >
                                <span className="text-slate-600 select-none shrink-0 w-5 text-right">{i + 1}</span>
                                <span className="break-all">{line}</span>
                                {isTotal && (
                                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                                    TOTAL
                                  </span>
                                )}
                                {hasAmount && !isTotal && (
                                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 shrink-0">
                                    AMOUNT
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Line Items Breakdown */}
                {extractedInfo && extractedInfo.lineItems.length > 0 && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ListChecks className="size-5 text-amber-400" />
                        Detected Items
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-normal">
                          {extractedInfo.lineItems.length} items
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {extractedInfo.lineItems.map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                              item.isTotal
                                ? 'bg-emerald-500/10 border border-emerald-500/20 font-semibold'
                                : 'bg-muted/30 hover:bg-muted/50'
                            } transition-colors`}
                          >
                            <span className={`truncate flex-1 mr-3 ${item.isTotal ? 'text-emerald-400' : ''}`}>
                              {item.isTotal && <Zap className="size-3.5 inline mr-1.5" />}
                              {item.text}
                            </span>
                            <span className={`font-mono font-medium shrink-0 ${
                              item.isTotal ? 'text-emerald-400' : 'text-foreground'
                            }`}>
                              {currency.symbol}{item.amount?.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Editable Form */}
              <div className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-emerald-500" />
                        Extracted Data
                      </div>
                      {extractedInfo && (
                        <span className="ml-auto flex items-center gap-1.5 text-xs font-normal">
                          <Sparkles className="size-3.5 text-amber-400" />
                          <span className="text-muted-foreground">
                            {Math.round(extractedInfo.confidence * 100)}% confidence
                          </span>
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Review and edit the extracted information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {extractedInfo?.aiDescription && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Sparkles className="size-4" />
                          AI Description
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {extractedInfo.aiDescription}
                        </p>
                      </div>
                    )}
                    <div className="space-y-5">
                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description" className="flex items-center gap-2 text-sm">
                          <FileText className="size-3.5 text-muted-foreground" />
                          Description *
                        </Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Enter merchant name or description"
                          className="h-11"
                          required
                        />
                      </div>

                      {/* Amount */}
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="flex items-center gap-2 text-sm">
                          <DollarSign className="size-3.5 text-muted-foreground" />
                          Amount ({currency.symbol}) *
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                            {currency.symbol}
                          </span>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e: any) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                            className="pl-8 h-11 text-lg font-semibold"
                            required
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category" className="flex items-center gap-2 text-sm">
                          <Tag className="size-3.5 text-muted-foreground" />
                          Category *
                        </Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger id="category" className="h-11">
                            <SelectValue placeholder="Select category">
                              {formData.category && (
                                <span className="flex items-center gap-2">
                                  <span className={`size-2.5 rounded-full ${getCategoryStyle(formData.category).bg.replace('/10', '/60')}`} />
                                  {formData.category}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                <span className="flex items-center gap-2">
                                  <span className={`size-2 rounded-full ${getCategoryStyle(cat).bg.replace('/10', '/60')}`} />
                                  {cat}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod" className="flex items-center gap-2 text-sm">
                          <CreditCard className="size-3.5 text-muted-foreground" />
                          Payment Method
                        </Label>
                        <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                          <SelectTrigger id="paymentMethod" className="h-11">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date */}
                      <div className="space-y-2">
                        <Label htmlFor="date" className="flex items-center gap-2 text-sm">
                          <CalendarDays className="size-3.5 text-muted-foreground" />
                          Date *
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                          className="h-11"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          {formatDisplayDate(formData.date)}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-border/50">
                        <Button
                          className="flex-1 h-11 gap-2 text-base"
                          onClick={handleSaveExpense}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="size-4" />
                              Save Expense
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleReset} className="h-11 gap-2">
                          <X className="size-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gallery Preview Card */}
                <Card className="border-dashed border-border/40 bg-muted/10">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <Layers className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Gallery Integration</p>
                        <p className="text-xs">
                          This receipt will be saved to your{' '}
                          <button
                            onClick={() => navigate('/gallery')}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Media Gallery <ArrowRight className="size-3" />
                          </button>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      {!mode && !image && (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              How it Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 h-fit shrink-0">
                  <Camera className="size-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">1. Capture or Batch Upload</h4>
                  <p className="text-sm text-muted-foreground">
                    Take a photo with your camera or upload multiple receipt images at once
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 h-fit shrink-0">
                  <Scan className="size-5 text-violet-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. AI Extraction</h4>
                  <p className="text-sm text-muted-foreground">
                    OCR reads all text, amounts, line items, and dates from the receipt
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 h-fit shrink-0">
                  <Tag className="size-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Smart Categorize</h4>
                  <p className="text-sm text-muted-foreground">
                    AI classifies the expense category and payment method automatically
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 h-fit shrink-0">
                  <CheckCircle2 className="size-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">4. Review & Save</h4>
                  <p className="text-sm text-muted-foreground">
                    Edit the data if needed and save — receipt goes to your Gallery
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Cropper Dialog */}
      {image && (
        <ImageCropper
          imageSrc={image}
          isOpen={showCropper}
          onCancel={() => setShowCropper(false)}
          onCrop={(croppedImage) => {
            setImage(croppedImage);
            setShowCropper(false);
            toast.success('Image cropped! Reprocessing...');
            processImage(croppedImage);
          }}
        />
      )}

      {/* Image Filter Dialog */}
      {image && (
        <ImageFilter
          imageSrc={image}
          isOpen={showImageFilter}
          onCancel={() => setShowImageFilter(false)}
          onApply={(filtered) => {
            setImage(filtered);
            setShowImageFilter(false);
            toast.success('Filters applied! Reprocessing...');
            processImage(filtered);
          }}
        />
      )}

      {/* Multi-Image Upload Dialog */}
      <MultiImageUpload
        isOpen={showMultiUpload}
        onClose={() => setShowMultiUpload(false)}
        onImagesSelected={(images) => {
          setShowMultiUpload(false);
          processBatchImages(images);
        }}
        maxImages={10}
        compressionOptions={{ maxWidth: 2000, maxHeight: 2000, quality: 0.85 }}
      />
    </div>
  );
}
