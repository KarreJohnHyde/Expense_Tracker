import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { api, Expense } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useCurrency } from '../lib/currency';
import {
  Search,
  Image as ImageIcon,
  QrCode,
  FileText,
  Calendar,
  Barcode,
  Camera,
  X,
  ScanLine,
  Tag,
  CreditCard,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Eye,
  Download,
  Plus,
  Layers,
  Filter,
} from 'lucide-react';

type FilterType = 'all' | 'receipt' | 'qr' | 'barcode';

export default function Gallery() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);

  useEffect(() => {
    loadGalleryData();
    window.addEventListener('expenseai:edge:expenses_updated', loadGalleryData);
    return () => window.removeEventListener('expenseai:edge:expenses_updated', loadGalleryData);
  }, []);

  const loadGalleryData = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      // Keep media entries + captured scans.
      setExpenses(data.expenses.filter(e => !!e.receiptImage || !!e.scanData?.rawText));
    } catch (error) {
      console.error('Failed to load gallery', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = expenses.filter(e => {
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.scanData?.rawText?.toLowerCase()?.includes(search.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'receipt') return matchesSearch && (e.source === 'receipt_scan' || (!e.scanData?.type || e.scanData.type === 'ocr_receipt'));
    if (filterType === 'qr') return matchesSearch && e.scanData?.type === 'qr';
    if (filterType === 'barcode') return matchesSearch && e.scanData?.type === 'barcode';
    return matchesSearch;
  });

  const lightboxExpense = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      if (lightboxIdx !== null) setLightboxIdx(null);
    } catch {
      // ignore
    }
  };

  const handleDownload = (expense: Expense) => {
    if (!expense.receiptImage) return;
    const link = document.createElement('a');
    link.href = expense.receiptImage;
    link.download = `receipt-${expense.description.replace(/\s+/g, '-').toLowerCase()}-${expense.id}.jpg`;
    link.click();
  };

  const getSourceBadge = (expense: Expense) => {
    if (expense.scanData?.type === 'barcode') return { icon: Barcode, label: 'Barcode', color: 'text-amber-400' };
    if (expense.scanData?.type === 'qr') return { icon: QrCode, label: 'QR Code', color: 'text-violet-400' };
    if (expense.source === 'receipt_scan') return { icon: Camera, label: 'Receipt', color: 'text-blue-400' };
    return { icon: FileText, label: 'Scan', color: 'text-slate-400' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <ImageIcon className="size-7 text-primary" />
            </div>
            Media Gallery
          </h1>
          <p className="text-muted-foreground mt-1">
            All your scanned receipts, bills, and QR codes in one place.
            <span className="ml-2 text-xs text-primary/70">{filtered.length} items</span>
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search gallery..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="default"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => navigate('/scan-receipt')}
          >
            <Plus className="size-4" />
            Scan New
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all', label: 'All', icon: Layers },
          { key: 'receipt', label: 'Receipts', icon: Camera },
          { key: 'qr', label: 'QR Codes', icon: QrCode },
          { key: 'barcode', label: 'Barcodes', icon: Barcode },
        ] as const).map(tab => (
          <Button
            key={tab.key}
            variant={filterType === tab.key ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setFilterType(tab.key)}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
          <div className="p-4 rounded-2xl bg-muted/30 mb-4">
            <FileText className="size-12 opacity-30" />
          </div>
          <CardTitle className="text-lg mb-2">No media found</CardTitle>
          <CardDescription className="mb-4">
            {search
              ? 'No results match your search. Try a different query.'
              : 'Images and receipts you scan will appear here.'}
          </CardDescription>
          <Button onClick={() => navigate('/scan-receipt')} className="gap-2">
            <ScanLine className="size-4" />
            Scan a Receipt
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((expense, idx) => {
            const source = getSourceBadge(expense);
            return (
              <Card
                key={expense.id}
                className="overflow-hidden group cursor-pointer border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                onClick={() => setLightboxIdx(idx)}
              >
                <div className="relative h-52 w-full bg-muted">
                  {expense.receiptImage ? (
                    <img
                      src={expense.receiptImage as string}
                      alt={expense.description}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100 px-3">
                      {expense.scanData?.type === 'barcode' ? (
                        <Barcode className="size-8 text-cyan-300" />
                      ) : (
                        <QrCode className="size-8 text-cyan-300" />
                      )}
                      <p className="text-xs text-center line-clamp-4">
                        {expense.scanData?.rawText || 'Captured scan'}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm">
                      <ZoomIn className="size-6 text-white" />
                    </div>
                  </div>

                  {/* Meta overlays */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs gap-1">
                      <source.icon className="size-3" />
                      {expense.category}
                    </Badge>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex flex-col pointer-events-none">
                    <span className="text-white font-medium text-sm truncate">
                      {expense.description}
                    </span>
                    <div className="flex justify-between items-center text-white/80 text-xs mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Lightbox Modal ──────────────────────────────────────────────── */}
      {lightboxExpense && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setLightboxIdx(null); setShowOcrText(false); }}
        >
          <div
            className="relative bg-background border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <ImageIcon className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{lightboxExpense.description}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" />
                      {lightboxExpense.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="size-3" />
                      {lightboxExpense.paymentMethod || 'Cash'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(lightboxExpense.date).toLocaleDateString()}
                    </span>
                    <span className="font-bold text-emerald-500">
                      {formatCurrency(lightboxExpense.amount)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                {lightboxExpense.scanData?.rawText && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="View OCR Text"
                    onClick={() => setShowOcrText(!showOcrText)}
                  >
                    <Eye className="size-4" />
                  </Button>
                )}
                {lightboxExpense.receiptImage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Download"
                    onClick={() => handleDownload(lightboxExpense)}
                  >
                    <Download className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  title="Delete"
                  onClick={() => handleDeleteExpense(lightboxExpense.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => { setLightboxIdx(null); setShowOcrText(false); }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Lightbox Body */}
            <div className="flex flex-col md:flex-row max-h-[calc(90vh-80px)] overflow-hidden">
              {/* Image */}
              <div className="flex-1 flex items-center justify-center bg-muted/20 p-4 min-h-[300px] overflow-auto">
                {lightboxExpense.receiptImage ? (
                  <img
                    src={lightboxExpense.receiptImage as string}
                    alt={lightboxExpense.description}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    {lightboxExpense.scanData?.type === 'barcode' ? (
                      <Barcode className="size-16 text-cyan-400" />
                    ) : (
                      <QrCode className="size-16 text-cyan-400" />
                    )}
                    <p className="text-center max-w-sm break-all text-sm">
                      {lightboxExpense.scanData?.rawText || 'No image available'}
                    </p>
                  </div>
                )}
              </div>

              {/* OCR Text Panel */}
              {showOcrText && lightboxExpense.scanData?.rawText && (
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-muted/10 overflow-auto">
                  <div className="p-3 border-b border-border flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <span className="text-sm font-medium">Extracted Text</span>
                  </div>
                  <div className="p-3">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {lightboxExpense.scanData.rawText}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation arrows */}
            {filtered.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx((lightboxIdx - 1 + filtered.length) % filtered.length);
                    setShowOcrText(false);
                  }}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx((lightboxIdx + 1) % filtered.length);
                    setShowOcrText(false);
                  }}
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
