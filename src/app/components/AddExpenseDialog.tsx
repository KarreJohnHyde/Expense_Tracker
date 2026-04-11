import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Camera, Plus, Sparkles, QrCode, RefreshCw, Split, Tag, MapPin, AlarmClock, Edit } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { useCurrency } from '../lib/currency';
import { classifyExpense } from '../lib/classifier';
import { EXPENSE_CATEGORIES, type ExpenseSource } from '../lib/expenseSchema';

const CATEGORIES = [...EXPENSE_CATEGORIES];

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet'];

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

const RECURRING_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

interface AddExpenseDialogProps {
  onExpenseAdded: () => void;
  onExpenseUpdated?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: Partial<ExpenseSeedData>;
  mode?: 'add' | 'edit';
  expenseId?: string;
  showTrigger?: boolean;
}

interface ExpenseSeedData {
  id: string;
  amount: number | string;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  tags: string[] | string;
  location: string;
  notes: string;
  recurring: boolean;
  recurringPeriod: string;
  splitWith: string;
  receiptImage: string | null;
  source: string;
}

export function AddExpenseDialog({
  onExpenseAdded,
  onExpenseUpdated,
  isOpen,
  onOpenChange,
  initialData,
  mode = 'add',
  expenseId,
  showTrigger = true,
}: AddExpenseDialogProps) {
  const { currency, convertToBase } = useCurrency();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const isEditMode = mode === 'edit' || Boolean(expenseId) || Boolean(initialData?.id);
  const resolvedExpenseId = expenseId || initialData?.id;

  const setOpen = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
    if (!newOpen) resetForm();
  };

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptRemoved, setReceiptRemoved] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [splitWith, setSplitWith] = useState('');
  const [entrySource, setEntrySource] = useState<ExpenseSource>('manual');

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    tags: '',
    location: '',
    notes: '',
    recurringPeriod: 'monthly',
  });

  const [aiSuggestion, setAiSuggestion] = useState<{ category: string; confidence: number } | null>(null);

  const normalizeDate = (value: unknown) => {
    if (!value) return new Date().toISOString().split('T')[0];
    if (typeof value === 'string') {
      if (value.includes('T')) return value.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    }
    const parsed = new Date(value as string);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  };

  const toInputAmount = (value: unknown) => {
    if (value == null || value === '') return '';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isFinite(num)) return '';
    const display = num * currency.rate;
    return (Math.round(display * 100) / 100).toString();
  };

  // Pre-fill from voice/initial data
  useEffect(() => {
    if (initialData && open) {
      const data = initialData;
      const incomingCategory = data.category || '';
      const knownCategory = CATEGORIES.includes(incomingCategory);

      setFormData(prev => ({
        ...prev,
        amount: toInputAmount(data.amount),
        category: knownCategory ? incomingCategory : '',
        description: data.description || '',
        date: normalizeDate(data.date),
        paymentMethod: data.paymentMethod || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
        location: data.location || '',
        notes: data.notes || '',
        recurringPeriod: data.recurringPeriod || 'monthly',
      }));

      if (incomingCategory && !knownCategory) {
        setIsCustomCategory(true);
        setCustomCategory(incomingCategory);
      } else {
        setIsCustomCategory(false);
        setCustomCategory('');
      }

      const existingReceipt = data.receiptImage || null;
      setReceiptPreview(existingReceipt);
      setReceiptRemoved(false);
      setIsRecurring(Boolean(data.recurring));
      setSplitWith(data.splitWith || '');
      setEntrySource((data.source as ExpenseSource) || 'manual');
      setAiSuggestion(null);
    }
  }, [initialData, open, currency.rate]);

  // AI auto-categorization with debounce
  useEffect(() => {
    if (formData.description && formData.description.length > 3) {
      const timer = setTimeout(() => handleAICategorization(), 800);
      return () => clearTimeout(timer);
    }
  }, [formData.description]);

  const handleAICategorization = async () => {
    if (!formData.description) return;
    setAiLoading(true);
    try {
      const amount = parseFloat(formData.amount || '0') || 0;
      const result = await api.categorizeExpense(formData.description, amount);
      if (result?.category) {
        setAiSuggestion({ category: result.category, confidence: result.confidence || 0 });
      } else {
        const fallback = classifyExpense(formData.description);
        setAiSuggestion(fallback);
      }
    } catch {
      const fallback = classifyExpense(formData.description);
      setAiSuggestion(fallback);
    } finally {
      setAiLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      tags: '',
      location: '',
      notes: '',
      recurringPeriod: 'monthly',
    });
    setAiSuggestion(null);
    setReceiptPreview(null);
    setReceiptRemoved(false);
    setIsRecurring(false);
    setSplitWith('');
    setEntrySource('manual');
    setCustomCategory('');
    setIsCustomCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const finalCategory = isCustomCategory ? customCategory : (formData.category || aiSuggestion?.category || 'Others');
      const receiptImage = receiptRemoved ? null : receiptPreview;

      if (isEditMode) {
        if (!resolvedExpenseId) throw new Error('Missing expense id');
        await api.updateExpense(resolvedExpenseId, {
          ...formData,
          amount: convertToBase(parseFloat(formData.amount)),
          tags: tagsArray,
          category: finalCategory,
          receiptImage,
          source: entrySource,
          ...(isRecurring && { recurring: true, recurringPeriod: formData.recurringPeriod }),
          ...(splitWith && { splitWith }),
        });
        toast.success('Expense updated successfully! ✅');
        (onExpenseUpdated || onExpenseAdded)();
      } else {
        await api.addExpense({
          ...formData,
          amount: convertToBase(parseFloat(formData.amount)),
          tags: tagsArray,
          category: finalCategory,
          receiptImage,
          source: entrySource,
          ...(isRecurring && { recurring: true, recurringPeriod: formData.recurringPeriod }),
          ...(splitWith && { splitWith }),
        });
        toast.success('Expense added successfully! 🎉');
        onExpenseAdded();
      }

      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error((error as Error).message || (isEditMode ? 'Failed to update expense' : 'Failed to add expense'));
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageWithTesseract = async (imageSrc: string) => {
    setReceiptPreview(imageSrc);
    setReceiptRemoved(false);
    setEntrySource('receipt_scan');
    setLoading(true);
    try {
      const tesseractMod = await import('tesseract.js');
      const recognize = tesseractMod.recognize || (tesseractMod as { default?: { recognize?: unknown } }).default?.recognize || (tesseractMod as unknown as { default: unknown }).default;
      const result = await (recognize as (src: string, lang: string, opts: Record<string, unknown>) => Promise<{ data: { text: string } }>)(imageSrc, 'eng', { logger: () => {} });
      const text = result.data.text;

      const amountMatch = text.match(/(?:total|amount|rs|₹|\$)\s*:?\s*([\d,]+(?:\.\d{2})?)/i) ||
        text.match(/[\d,]+\.\d{2}/);

      const newFormData = { ...formData, description: text.slice(0, 50).trim() + '...' };
      if (amountMatch && parseFloat(amountMatch[amountMatch.length > 1 ? 1 : 0].replace(',', '')) > 0) {
        newFormData.amount = parseFloat(amountMatch[amountMatch.length > 1 ? 1 : 0].replace(',', '')).toString();
      }
      setFormData(newFormData);
      toast.success('Extracted info from receipt!');
      setTimeout(() => handleAICategorization(), 500);
    } catch {
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
        if (e.target?.result) processImageWithTesseract(e.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [qrScanning, setQrScanning] = useState(false);

  const buildScanPreview = (decodedText: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 520;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('QR / Barcode Capture', 36, 58);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Arial';
    ctx.fillText(new Date().toLocaleString(), 36, 90);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(28, 120, canvas.width - 56, canvas.height - 160);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '20px monospace';
    const lines = decodedText.match(/.{1,58}/g) || [decodedText];
    lines.slice(0, 10).forEach((line, idx) => ctx.fillText(line, 48, 164 + idx * 30));
    return canvas.toDataURL('image/jpeg', 0.9);
  };

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
            if (decodedText.startsWith('upi://')) {
              const url = new URL(decodedText);
              const pn = url.searchParams.get('pn') || '';
              const am = url.searchParams.get('am') || '';
              setFormData({ ...formData, description: `UPI: ${pn}`, amount: am, paymentMethod: 'UPI' });
              setEntrySource('qr_scan');
              const scanPreview = buildScanPreview(decodedText);
              if (scanPreview) {
                setReceiptPreview(scanPreview);
                setReceiptRemoved(false);
              }
              toast.success('Extracted UPI details from QR!');
            } else {
              setFormData({ ...formData, description: decodedText });
              setEntrySource(/^\d+$/.test(decodedText.trim()) ? 'barcode_scan' : 'qr_scan');
              const scanPreview = buildScanPreview(decodedText);
              if (scanPreview) {
                setReceiptPreview(scanPreview);
                setReceiptRemoved(false);
              }
              toast.success('Scanned Barcode/QR successfully');
            }
          },
          () => {}
        );
      }, 500);
    } catch {
      toast.error('Could not start QR scanner. Ensure cameras are unblocked.');
      setQrScanning(false);
    }
  };

  const effectiveCategory = isCustomCategory ? customCategory : (formData.category || aiSuggestion?.category || '');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2">
            <Plus className="size-5" />
            Add Expense
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              {isEditMode ? <Edit className="size-4 text-primary" /> : <Plus className="size-4 text-primary" />}
            </div>
            {isEditMode ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details of this expense' : 'Track your spending with AI-powered categorization'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Amount + Quick Presets ─────────────────────────── */}
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
              className="text-lg font-semibold"
            />
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    formData.amount === amt.toString()
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary hover:text-primary bg-muted'
                  }`}
                >
                  {currency.symbol}{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Description + AI ──────────────────────────────── */}
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
                <Sparkles className="size-4 animate-pulse text-primary" />
                AI analyzing...
              </div>
            )}
            {aiSuggestion && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => { setFormData({ ...formData, category: aiSuggestion.category }); setIsCustomCategory(false); }}
                >
                  <Sparkles className="size-3" />
                  AI: {aiSuggestion.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {(aiSuggestion.confidence * 100).toFixed(0)}% confident
                </span>
              </div>
            )}
          </div>

          {/* ── Category ──────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Category</Label>
            {!isCustomCategory ? (
              <div className="flex gap-2">
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="flex-1" id="category">
                    <SelectValue placeholder={aiSuggestion ? `AI: ${aiSuggestion.category}` : 'Select category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => setIsCustomCategory(true)}>
                  Custom
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Type custom category..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => { setIsCustomCategory(false); setCustomCategory(''); }}>
                  Back
                </Button>
              </div>
            )}
          </div>

          {/* ── Date + Payment Method (2-col) ─────────────────── */}
          <div className="grid grid-cols-2 gap-3">
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
              <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Tags + Location (2-col) ───────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tags" className="flex items-center gap-1">
                <Tag className="size-3" /> Tags
              </Label>
              <Input
                id="tags"
                placeholder="work, travel..."
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="size-3" /> Location
              </Label>
              <Input
                id="location"
                placeholder="Mumbai, MH"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details or context..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* ── Split Expense ─────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="splitWith" className="flex items-center gap-1">
              <Split className="size-3" /> Split With (optional)
            </Label>
            <Input
              id="splitWith"
              placeholder="e.g., Rahul, Priya"
              value={splitWith}
              onChange={(e) => setSplitWith(e.target.value)}
            />
          </div>

          {/* ── Recurring Toggle ──────────────────────────────── */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="flex items-center gap-2">
              <AlarmClock className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Recurring Expense</p>
                <p className="text-xs text-muted-foreground">Repeat this expense automatically</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {isRecurring && (
            <Select value={formData.recurringPeriod} onValueChange={(v) => setFormData({ ...formData, recurringPeriod: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Repeat every..." />
              </SelectTrigger>
              <SelectContent>
                {RECURRING_PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* ── Receipt Preview ───────────────────────────────── */}
          {receiptPreview && (
            <div className="relative">
              <img src={receiptPreview} alt="Receipt" className="w-full h-32 object-cover rounded-xl border" />
              <button
                type="button"
                onClick={() => { setReceiptPreview(null); setReceiptRemoved(true); }}
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1 text-destructive hover:bg-destructive hover:text-white transition-colors"
              >
                ×
              </button>
              <Badge className="absolute bottom-2 left-2 text-xs" variant="secondary">
                <RefreshCw className="size-3 mr-1" /> Receipt attached
              </Badge>
            </div>
          )}

          {/* ── Scan Buttons ──────────────────────────────────── */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
              <Camera className="size-4" />
              Upload Receipt
            </Button>
            <Button type="button" variant="outline" className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={startQRScanner}>
              <QrCode className="size-4" />
              Scan QR / Barcode
            </Button>
          </div>

          {qrScanning && (
            <div className="mt-2 p-2 border rounded-xl overflow-hidden bg-muted">
              <div id="qr-reader-dialog" className="w-full" />
              <Button variant="ghost" size="sm" type="button" className="w-full mt-2 text-destructive" onClick={() => setQrScanning(false)}>
                Cancel Scanning
              </Button>
            </div>
          )}

          {/* ── AI Category Preview ────────────────────────────── */}
          {effectiveCategory && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Will be filed under:</span>
              <Badge variant="secondary" className="text-xs">{effectiveCategory}</Badge>
            </div>
          )}

          {/* ── Action Buttons ────────────────────────────────── */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading}>
              {loading ? (
                <><RefreshCw className="size-4 animate-spin" /> {isEditMode ? 'Saving...' : 'Adding...'}</>
              ) : (
                <>
                  {isEditMode ? <Edit className="size-4" /> : <Plus className="size-4" />}
                  {isEditMode ? 'Save Changes' : 'Add Expense'}
                </>
              )}
            </Button>
          </div>
        </form>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
