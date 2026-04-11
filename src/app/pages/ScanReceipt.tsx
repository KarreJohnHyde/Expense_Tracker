import { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { notifyUser } from '../lib/notifications';
import { classifyExpense } from '../lib/classifier';
import { EXPENSE_CATEGORIES } from '../lib/expenseSchema';

const CATEGORIES = [...EXPENSE_CATEGORIES];

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'];

export default function ScanReceipt() {
  const { currency } = useCurrency();
  const [mode, setMode] = useState<'upload' | 'camera' | 'qr' | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [_extractedData, setExtractedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [qrResult, setQrResult] = useState<string>('');
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setScanSource('receipt_scan');
        setImage(imageSrc);
        processImage(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageSrc: string) => {
    setProcessing(true);
    setOcrText('');
    setExtractedData(null);

    try {
      // Perform OCR
      const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
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

      // Extract information from OCR text
      const extracted = extractReceiptData(text);
      setExtractedData(extracted);

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
        message: `Scanned receipt: ${extracted.merchant || 'Unknown'} — ₹${extracted.total || '0'}`,
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

  const extractReceiptData = (text: string): any => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract merchant name (usually first line or contains specific keywords)
    const merchant = lines[0] || 'Unknown Merchant';
    
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
    
    // Extract date
    let date = new Date().toISOString().split('T')[0];
    const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
    for (const line of lines) {
      const match = line.match(dateRegex);
      if (match) {
        const dateStr = match[0];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
        }
        break;
      }
    }
    
    // Guess category using local ML classifier
    const mlResult = classifyExpense(text);
    let category = mlResult.category;
    const textLower = text.toLowerCase();
    
    // Fallback if confidence is low, though classifyExpense handles it
    if (category === 'Others' || mlResult.confidence < 0.3) {
      if (textLower.includes('restaurant') || textLower.includes('cafe') || textLower.includes('food')) {
        category = 'Food & Dining';
      } else if (textLower.includes('uber') || textLower.includes('taxi') || textLower.includes('transport')) {
        category = 'Transportation';
      } else if (textLower.includes('shop') || textLower.includes('store') || textLower.includes('market')) {
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
    
    return { merchant, total, date, category, paymentMethod };
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
      // Parse WiFi QR Codes: WIFI:T:WPA;P:password;S:SSID;H:false;
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
      // URL: prefill as expense + open
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
      // General Barcode / Product Code / Single line String
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

      toast.success('Expense saved successfully! 💰');
      
      // Reset form
      setImage(null);
      setOcrText('');
      setExtractedData(null);
      setMode(null);
      setScanMetadata(null);
      setScanSource('manual');
      setFormData({
        description: '',
        amount: '',
        category: '',
        paymentMethod: '',
        date: new Date().toISOString().split('T')[0],
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
    setExtractedData(null);
    setShowWebcam(false);
    setMode(null);
    setScanMetadata(null);
    setScanSource('manual');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan Receipt</h1>
        <p className="text-muted-foreground">
          Camera capture, file upload, or scan barcodes/QR codes on receipts
        </p>
      </div>

      {/* Mode Selection */}
      {!mode && !image && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
            setMode('camera');
            setShowWebcam(true);
          }}>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Camera className="size-16 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Take Photo</h3>
              <p className="text-muted-foreground text-center text-sm">
                Use your webcam to capture a receipt
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
            setMode('upload');
            fileInputRef.current?.click();
          }}>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="size-16 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Upload Image</h3>
              <p className="text-muted-foreground text-center text-sm">
                Upload a receipt photo or screenshot
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={startQRScanner}>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <QrCode className="size-16 text-primary mb-4" />
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Capture Receipt</CardTitle>
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
                <Button size="lg" onClick={capturePhoto}>
                  <Camera className="size-5 mr-2" />
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

      {/* Processing / Results */}
      {image && !showWebcam && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Image Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Receipt Image</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <img src={image} alt="Receipt" className="w-full rounded-lg border" />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setImage(null);
                    setMode('camera');
                    setShowWebcam(true);
                  }}
                >
                  <Camera className="size-4 mr-2" />
                  Retake
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-2" />
                  Upload New
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Data Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                {processing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    Processing Receipt...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-green-600" />
                    Extracted Data
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {processing ? 'Analyzing receipt with OCR...' : 'Review and edit the extracted information'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="size-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Scanning receipt...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter merchant name or description"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ({currency.symbol}) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e: any) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                      <SelectTrigger id="paymentMethod">
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

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  {ocrText && (
                    <div className="space-y-2">
                      <Label>Raw OCR Text</Label>
                      <div className="p-3 rounded-lg bg-muted text-xs max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{ocrText}</pre>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      className="flex-1"
                      onClick={handleSaveExpense}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-4 mr-2" />
                          Save Expense
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Section */}
      {!mode && !image && (
        <Card>
          <CardHeader>
            <CardTitle>How it Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <Camera className="size-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">1. Capture or Upload</h4>
                  <p className="text-sm text-muted-foreground">
                    Take a photo with your camera or upload an existing receipt image
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <Scan className="size-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. AI Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Our OCR technology automatically extracts merchant, amount, and date
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <CheckCircle2 className="size-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Review & Save</h4>
                  <p className="text-sm text-muted-foreground">
                    Verify the extracted data and save it as an expense
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
