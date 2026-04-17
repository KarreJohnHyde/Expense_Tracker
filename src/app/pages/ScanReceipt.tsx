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
} from 'lucide-react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { notifyUser } from '../lib/notifications';
import { classifyExpense } from '../lib/classifier';
import { EXPENSE_CATEGORIES } from '../lib/expenseSchema';

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
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
      processImage(imageSrc);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const processImage = async (imageSrc: string) => {
    setProcessing(true);
    setOcrText('');
    setOcrProgress(0);
    setExtractedInfo(null);
    setSaved(false);

    try {
      // Perform OCR with progress tracking
      const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      setOcrText(text);
      setScanMetadata({
        type: 'ocr_receipt',
        rawText: text,
        capturedAt: new Date().toISOString(),
      });

      // Extract comprehensive receipt data
      const extracted = extractReceiptData(text);
      setExtractedInfo(extracted);

      // Pre-fill form with extracted data
      setFormData({
        description: extracted.merchant || '',
        amount: extracted.total || '',
        category: extracted.category || '',
        paymentMethod: extracted.paymentMethod || '',
        date: extracted.date || new Date().toISOString().split('T')[0],
      });

      toast.success('Receipt scanned successfully! ✅');

      // Send notification
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

  // ── Advanced receipt data extraction ─────────────────────────────────────────
  const extractReceiptData = (text: string): ExtractedReceiptInfo => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract merchant name (usually first non-empty line or largest text)
    const merchant = lines[0] || 'Unknown Merchant';
    
    // Extract all line items with amounts
    const lineItems: ExtractedLineItem[] = [];
    const amountRegex = /([0-9,]+\.?\d{0,2})\s*$/;
    const totalKeywords = ['total', 'grand total', 'net amount', 'amount due', 'balance', 'sum', 'payable'];

    for (const line of lines) {
      const match = line.match(amountRegex);
      if (match) {
        const amountStr = match[1].replace(',', '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          const isTotal = totalKeywords.some(kw => line.toLowerCase().includes(kw));
          lineItems.push({
            text: line.replace(match[0], '').trim() || line,
            amount,
            isTotal,
          });
        }
      }
    }

    // Extract total amount (look for "total", "amount", "₹", "$" keywords)
    let total = '';
    const totalRegex = /(?:total|amount|₹|rs\.?|inr|usd|\$)\s*:?\s*([0-9,]+\.?\d{0,2})/i;
    for (const line of lines) {
      const match = line.match(totalRegex);
      if (match) {
        total = match[1].replace(',', '');
        break;
      }
    }

    // If no total found from keywords, use the largest amount
    if (!total && lineItems.length > 0) {
      const totalItem = lineItems.find(item => item.isTotal);
      if (totalItem && totalItem.amount !== null) {
        total = totalItem.amount.toString();
      } else {
        const maxItem = lineItems.reduce((max, item) =>
          (item.amount || 0) > (max.amount || 0) ? item : max
        );
        if (maxItem.amount) total = maxItem.amount.toString();
      }
    }
    
    // Extract date
    let date = new Date().toISOString().split('T')[0];
    const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
    for (const line of lines) {
      const match = line.match(dateRegex);
      if (match) {
        const dateStr = match[0];
        // Try DD-MM-YYYY format first (common in Indian receipts)
        const parts = dateStr.split(/[-\/]/);
        if (parts.length === 3) {
          let parsedDate: Date | null = null;
          // DD-MM-YYYY
          if (parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            parsedDate = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          }
          // YYYY-MM-DD
          if (!parsedDate || isNaN(parsedDate.getTime())) {
            parsedDate = new Date(dateStr);
          }
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
          }
        }
        break;
      }
    }
    
    // Guess category using local ML classifier
    const mlResult = classifyExpense(text);
    let category = mlResult.category;
    const textLower = text.toLowerCase();
    
    // Fallback if confidence is low
    if (category === 'Others' || mlResult.confidence < 0.3) {
      if (textLower.includes('restaurant') || textLower.includes('cafe') || textLower.includes('food')) {
        category = 'Food & Dining';
      } else if (textLower.includes('uber') || textLower.includes('taxi') || textLower.includes('transport')) {
        category = 'Transportation';
      } else if (textLower.includes('shop') || textLower.includes('store') || textLower.includes('market') || textLower.includes('mall')) {
        category = 'Shopping';
      } else if (textLower.includes('electric') || textLower.includes('water') || textLower.includes('utility')) {
        category = 'Bills & Utilities';
      } else if (textLower.includes('movie') || textLower.includes('entertainment') || textLower.includes('ticket')) {
        category = 'Entertainment';
      } else if (textLower.includes('hospital') || textLower.includes('pharmacy') || textLower.includes('medical')) {
        category = 'Healthcare';
      }
    }
    
    // Guess payment method
    let paymentMethod = 'Cash';
    if (textLower.includes('card') || textLower.includes('credit') || textLower.includes('debit')) {
      paymentMethod = textLower.includes('credit') ? 'Credit Card' : 'Debit Card';
    } else if (textLower.includes('upi') || textLower.includes('paytm') || textLower.includes('gpay') || textLower.includes('phonepe')) {
      paymentMethod = 'UPI';
    } else if (textLower.includes('net banking') || textLower.includes('netbanking')) {
      paymentMethod = 'Net Banking';
    }
    
    return {
      merchant,
      total,
      date,
      category,
      paymentMethod,
      lineItems,
      allText: text,
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
            Camera capture, file upload, or scan barcodes/QR codes — AI extracts all data automatically
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
        <div className="grid gap-4 md:grid-cols-3">
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
            className={`cursor-pointer group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${
              dragActive 
                ? 'border-primary border-2 border-dashed bg-primary/5' 
                : 'border-border/50 hover:border-primary/50'
            }`}
            onClick={() => {
              setMode('upload');
              fileInputRef.current?.click();
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="flex flex-col items-center justify-center py-12 relative">
              <div className="p-4 rounded-2xl bg-emerald-500/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <Upload className={`size-10 ${dragActive ? 'text-primary animate-bounce' : 'text-emerald-400'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Image</h3>
              <p className="text-muted-foreground text-center text-sm px-4">
                {dragActive ? 'Drop your receipt here...' : 'Upload or drag and drop a receipt photo'}
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

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
                    Your receipt has been saved and is now visible in the Gallery.
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => navigate('/gallery')} className="gap-2">
                      <ImageIcon className="size-4" />
                      View in Gallery
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button variant="outline" onClick={handleScanAnother} className="gap-2">
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
                    <div className="flex gap-2 mt-3">
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
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="size-3.5" />
                        Upload New
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Extracted Text Panel */}
                {ocrText && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <AlignLeft className="size-5 text-cyan-400" />
                          Extracted Text
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-normal">
                            {ocrText.split('\n').filter(l => l.trim()).length} lines
                          </span>
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
                          {ocrText.split('\n').filter(l => l.trim()).map((line, i) => {
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
                  <h4 className="font-semibold mb-1">1. Capture or Upload</h4>
                  <p className="text-sm text-muted-foreground">
                    Take a photo with your camera or upload an existing receipt image
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
    </div>
  );
}
