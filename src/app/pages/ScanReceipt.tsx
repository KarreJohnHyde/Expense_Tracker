import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Webcam from 'react-webcam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Camera, Upload, Scan, FileText, QrCode } from 'lucide-react';
import { api } from '../lib/api';
import { notifyUser } from '../lib/notifications';

interface ExtractedReceiptInfo {
  Description: string;
  Amount: number;
  Category: string;
  Date: string;
  PaymentMethod: string;
}

export default function ScanReceipt() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'upload' | 'camera' | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [saving, setSaving] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  const [formData, setFormData] = useState<ExtractedReceiptInfo>({
    Description: '',
    Amount: 0,
    Category: '',
    Date: new Date().toISOString().split('T')[0],
    PaymentMethod: 'Cash',
  });

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      setMode('upload');
      processImageOnBackend(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMode('upload');
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        setImage(src);
        processImageOnBackend(src);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageOnBackend = async (base64Str: string) => {
    setProcessing(true);
    setOcrText('');
    try {
      const response = await api.processReceipt(base64Str);
      if (response && response.rawText) {
        setOcrText(response.rawText);
        const data = response.extractedData || {};
        setFormData({
          Description: data.Description || 'Extracted Receipt',
          Amount: data.Amount || 0,
          Category: data.Category || 'Others',
          Date: data.Date || new Date().toISOString().split('T')[0],
          PaymentMethod: data.PaymentMethod || 'Cash'
        });
        toast.success('Successfully scanned via AWS backend!');
      } else {
        toast.error('Failed to extract text. Check backend logs.');
      }
    } catch (error) {
      toast.error('Error contacting python backend');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!formData.Description || !formData.Amount) {
      toast.error('Please verify the extracted details');
      return;
    }
    setSaving(true);
    try {
      // 1. Upload to S3 if not already
      let finalImageUrl = null;
      if (image) {
         // Create mock File object from base64 to leverage existing api spec
         const res = await fetch(image);
         const blob = await res.blob();
         const f = new File([blob], 'receipt.jpg', { type: blob.type });
         const uploadRes = await api.uploadImage(f, 'mock_id');
         finalImageUrl = uploadRes.url;
      }

      // 2. Save directly to dynamo through API
      await api.addExpense({
        description: formData.Description,
        amount: formData.Amount,
        category: formData.Category,
        paymentMethod: formData.PaymentMethod,
        date: formData.Date,
        receiptImage: finalImageUrl, // S3 link!
        source: 'receipt_scan',
        scanData: {
            type: 'ocr_receipt',
            rawText: ocrText,
            capturedAt: new Date().toISOString()
        }
      });
      toast.success('Expense saved with S3 Media!');
      notifyUser({ type: 'scan_complete', title: 'Saved', message: 'Receipt tracking updated' });
      navigate('/gallery');
    } catch (err) {
      toast.error('Failed to save to cloud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 container mx-auto max-w-4xl p-4">
      <h1 className="text-3xl font-bold flex gap-3 text-primary"><Scan /> Advanced Cloud Scanner</h1>
      <Card className="p-6 text-center border-dashed border-2">
        {!image ? (
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center py-10">
               {mode === 'camera' ? (
                   <div className="flex flex-col items-center gap-4">
                      <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="rounded-xl w-full max-w-md" />
                      <Button onClick={capturePhoto}><Camera className="mr-2"/> Capture Image</Button>
                      <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
                   </div>
               ) : (
                   <>
                   <Button size="lg" onClick={() => setMode('camera')} className="w-48"><Camera className="mr-2"/> Open Camera</Button>
                   <Label htmlFor="upload-img" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer p-3 rounded-md w-48 font-medium">
                       <Upload className="inline mr-2 size-5" /> Upload Image
                   </Label>
                   <Input id="upload-img" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                   </>
               )}
            </div>
        ) : (
            <div className="flex flex-col items-center gap-6">
                <img src={image} className="h-64 object-contain rounded border pointer-events-none" alt="Scanned document" />
                <div className="flex gap-4">
                   <Button variant="outline" onClick={() => setImage(null)} disabled={saving}>Reset</Button>
                   {processing ? (
                       <Button disabled className="animate-pulse">Analyzing with AWS...</Button>
                   ) : (
                       <Button onClick={handleSaveExpense} disabled={saving}>Save to Cloud Database</Button>
                   )}
                </div>
            </div>
        )}
      </Card>

      {/* Extracted Output Forms */}
      {image && !processing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
             <CardHeader><CardTitle>AI Extracted JSON</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                 <div>
                    <Label>Merchant / Description</Label>
                    <Input value={formData.Description} onChange={e => setFormData({...formData, Description: e.target.value})} />
                 </div>
                 <div>
                    <Label>Detected Amount ($/₹)</Label>
                    <Input type="number" value={formData.Amount || ''} onChange={e => setFormData({...formData, Amount: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                    <Label>Category</Label>
                    <Input value={formData.Category} onChange={e => setFormData({...formData, Category: e.target.value})} />
                 </div>
                 <div>
                    <Label>Date of Purchase</Label>
                    <Input type="date" value={formData.Date} onChange={e => setFormData({...formData, Date: e.target.value})} />
                 </div>
             </CardContent>
          </Card>
          <Card>
             <CardHeader><CardTitle>Raw OCR Buffer</CardTitle></CardHeader>
             <CardContent>
                 <pre className="text-xs bg-muted text-muted-foreground p-4 h-64 overflow-y-auto rounded whitespace-pre-wrap font-mono">
                    {ocrText || 'No text detected.'}
                 </pre>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
