import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Camera, Plus, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import Tesseract from 'tesseract.js';
import { useCurrency } from '../lib/currency';

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Others',
];

const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'Net Banking',
  'Wallet',
];

interface AddExpenseDialogProps {
  onExpenseAdded: () => void;
}

export function AddExpenseDialog({ onExpenseAdded }: AddExpenseDialogProps) {
  const { currency, convertToBase } = useCurrency();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    tags: '',
    location: '',
  });
  const [aiSuggestion, setAiSuggestion] = useState<{ category: string; confidence: number } | null>(null);

  // AI Auto-categorization
  useEffect(() => {
    if (formData.description && formData.description.length > 3) {
      const timer = setTimeout(() => {
        handleAICategorization();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.description]);

  const handleAICategorization = async () => {
    if (!formData.description) return;
    
    setAiLoading(true);
    try {
      const amountVal = parseFloat(formData.amount) || 0;
      const result = await api.categorizeExpense(formData.description, convertToBase(amountVal));
      setAiSuggestion(result);
    } catch (error) {
      console.error('AI categorization error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      await api.addExpense({
        ...formData,
        amount: convertToBase(parseFloat(formData.amount)),
        tags: tagsArray,
        category: formData.category || aiSuggestion?.category || 'Others',
      });

      toast.success('Expense added successfully! 🎉');
      setOpen(false);
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        tags: '',
        location: '',
      });
      setAiSuggestion(null);
      onExpenseAdded();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageWithTesseract = async (imageSrc: string) => {
    setLoading(true);
    try {
      const result = await Tesseract.recognize(imageSrc, 'eng', { logger: m => console.log(m) });
      const text = result.data.text;
      
      // Simple extraction regexes
      let amountMatch = text.match(/(?:total|amount|rs|₹|\$)\s*:?\s*([\d,]+(?:\.\d{2})?)/i) || 
                        text.match(/[\d,]+\.\d{2}/);
      
      let newFormData = { ...formData, description: text.slice(0, 50).trim() + "..." };
      if (amountMatch && parseFloat(amountMatch[amountMatch.length > 1 ? 1 : 0].replace(',', '')) > 0) {
        newFormData.amount = parseFloat(amountMatch[amountMatch.length > 1 ? 1 : 0].replace(',', '')).toString();
      }
      setFormData(newFormData);
      toast.success('Extracted info from receipt!');
      // Trigger AI categorization with the extracted text
      setTimeout(() => handleAICategorization(), 500);
    } catch (error) {
      toast.error('Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          processImageWithTesseract(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReceiptScan = () => {
    fileInputRef.current?.click();
  };

  const [qrScanning, setQrScanning] = useState(false);

  const startQRScanner = async () => {
    setQrScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setTimeout(async () => {
        const scanner = new Html5Qrcode('qr-reader-dialog');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            scanner.stop();
            setQrScanning(false);
            
            // Check UPI vs barcode text
            if (decodedText.startsWith('upi://')) {
              const url = new URL(decodedText);
              const pn = url.searchParams.get('pn') || '';
              const am = url.searchParams.get('am') || '';
              setFormData({ ...formData, description: `UPI: ${pn}`, amount: am, paymentMethod: 'UPI' });
              toast.success('Extracted UPI details from QR!');
            } else {
              setFormData({ ...formData, description: decodedText });
              toast.success('Scanned Barcode/QR successfully');
            }
          },
          () => {} // handle error
        );
      }, 500);
    } catch {
      toast.error('Could not start QR scanner. Ensure cameras are unblocked.');
      setQrScanning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="size-5" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Track your spending with AI-powered categorization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency.symbol}) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="e.g., Lunch at Cafe Coffee Day"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={2}
            />
            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 animate-pulse" />
                AI analyzing...
              </div>
            )}
            {aiSuggestion && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="size-3" />
                  AI suggests: {aiSuggestion.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {(aiSuggestion.confidence * 100).toFixed(0)}% confident
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger id="category">
                <SelectValue placeholder={aiSuggestion ? `Use AI: ${aiSuggestion.category}` : "Select category"} />
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
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
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
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., work, travel, weekend"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Mumbai, Maharashtra"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleReceiptScan}
            >
              <Camera className="size-4" />
              Upload Receipt
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 border-primary text-primary hover:bg-primary/10"
              onClick={startQRScanner}
            >
              <Camera className="size-4" />
              Scan QR / Barcode
            </Button>
          </div>

          {qrScanning && (
            <div className="mt-4 p-2 border rounded-xl overflow-hidden bg-muted">
              <div id="qr-reader-dialog" className="w-full" />
              <Button variant="ghost" size="sm" type="button" className="w-full mt-2 text-destructive" onClick={() => setQrScanning(false)}>
                Cancel Scanning
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}