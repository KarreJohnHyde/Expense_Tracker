import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { api, Expense } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { Search, Image as ImageIcon, QrCode, FileText, Calendar } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useCurrency } from '../lib/currency';

export default function Gallery() {
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadGalleryData();
    window.addEventListener('expenseai:edge:expenses_updated', loadGalleryData);
    return () => window.removeEventListener('expenseai:edge:expenses_updated', loadGalleryData);
  }, []);

  const loadGalleryData = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      // Only keep expenses that have an image
      setExpenses(data.expenses.filter(e => !!e.receiptImage));
    } catch (error) {
      console.error('Failed to load gallery', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="size-8 text-primary" />
            Media Gallery
          </h1>
          <p className="text-muted-foreground mt-1">
            All your scanned receipts, bills, and QR codes in one place.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search by description..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <FileText className="size-12 mb-4 opacity-20" />
          <CardTitle className="text-lg">No media found</CardTitle>
          <CardDescription>
            Images and receipts you upload will appear here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(expense => (
            <Card key={expense.id} className="overflow-hidden group card-hover glass border-border/40">
              <div className="relative h-48 w-full bg-muted">
                {/* Image */}
                <img 
                  src={expense.receiptImage as string} 
                  alt={expense.description}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                
                {/* Meta overlays */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                    {expense.description.includes('UPI') || expense.description.includes('QR') ? (
                       <QrCode className="size-3 mr-1" />
                    ) : (
                       <FileText className="size-3 mr-1" />
                    )}
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
          ))}
        </div>
      )}
    </div>
  );
}
