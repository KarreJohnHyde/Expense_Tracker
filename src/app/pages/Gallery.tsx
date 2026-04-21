import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardTitle, CardDescription } from '../components/ui/card';
import { api, Expense } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useCurrency } from '../lib/currency';
import { toast } from 'sonner';
import {
  Search, Image as ImageIcon, QrCode, FileText, Calendar,
  Barcode, Camera, X, ScanLine, Tag, CreditCard,
  Trash2, ChevronLeft, ChevronRight, ZoomIn, Eye,
  Download, Plus, Layers, Edit2, Save, Wand2, AlertTriangle
} from 'lucide-react';
import { ImageFilter } from '../components/ImageFilter';

type FilterType = 'all' | 'receipt' | 'qr' | 'barcode';
type ConfirmActionType = 'delete' | 'clearAll';

export default function Gallery() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  
  const [editForm, setEditForm] = useState<Partial<Expense>>({});

  // --- Confirmation Modal State ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    actionType: ConfirmActionType | null;
    itemId: string | null;
  }>({
    isOpen: false,
    actionType: null,
    itemId: null,
  });

  useEffect(() => {
    loadGalleryData();
  }, []);

  const loadGalleryData = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      // Keep only entries with images or scan text.
      setExpenses(data.expenses.filter((e: Expense) => !!e.receiptImage || !!e.scanData?.rawText));
    } catch (error) {
      console.error('Failed to load gallery', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Modal Handlers ---
  const openDeleteConfirm = (itemId: string) => {
    setConfirmModal({ isOpen: true, actionType: 'delete', itemId });
  };

  const openClearAllConfirm = () => {
    setConfirmModal({ isOpen: true, actionType: 'clearAll', itemId: null });
  };

  const closeModal = () => {
    setConfirmModal({ isOpen: false, actionType: null, itemId: null });
  };

  const handleConfirmAction = async () => {
    if (confirmModal.actionType === 'delete' && confirmModal.itemId) {
      try {
        await api.deleteExpense(confirmModal.itemId);
        setExpenses(prev => prev.filter(e => e.id !== confirmModal.itemId));
        if (lightboxIdx !== null) setLightboxIdx(null);
        toast.success('Deleted successfully');
      } catch {
        toast.error('Failed to delete item.');
      }
    } else if (confirmModal.actionType === 'clearAll') {
      try {
        // Delete all expenses
        const deletePromises = expenses.map(e => api.deleteExpense(e.id));
        await Promise.all(deletePromises);
        setExpenses([]);
        if (lightboxIdx !== null) setLightboxIdx(null);
        toast.success('All records cleared successfully');
      } catch {
        toast.error('Failed to clear all records.');
      }
    }
    closeModal();
  };

  const handleDeleteExpense = async (id: string) => {
    openDeleteConfirm(id);
  };

  const filtered = expenses.filter(e => {
    const matchesSearch =
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase()) ||
      e.scanData?.rawText?.toLowerCase().includes(search.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'receipt') return matchesSearch && (e.source === 'receipt_scan' || e.scanData?.type === 'ocr_receipt');
    if (filterType === 'qr') return matchesSearch && e.scanData?.type === 'qr';
    if (filterType === 'barcode') return matchesSearch && e.scanData?.type === 'barcode';
    return matchesSearch;
  });

  const lightboxExpense = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  const handleApplyFilter = async (filteredImg: string) => {
    if (!lightboxExpense) return;
    try {
      const resp = await fetch(filteredImg);
      const blob = await resp.blob();
      const newFile = new File([blob], 'filtered_receipt.jpg', { type: 'image/jpeg' });
      
      const uploadResp = await api.uploadImage(newFile, lightboxExpense.id);
      await api.updateExpense(lightboxExpense.id, { receiptImage: uploadResp.url });
      
      setExpenses(prev => prev.map(e => e.id === lightboxExpense.id ? {...e, receiptImage: uploadResp.url} : e));
      setShowFilterOptions(false);
      
      toast.success("Image enhanced and re-synced to cloud!");
    } catch {
      toast.error('Failed to sync filtered image');
    }
  };

  const handleUpdateExpense = async () => {
    if (!lightboxExpense) return;
    try {
      const updated = await api.updateExpense(lightboxExpense.id, editForm);
      toast.success('Updated successfully');
      
      setExpenses(prev => prev.map(e => e.id === lightboxExpense.id ? {...e, ...editForm} : e));
      setEditing(false);
    } catch {
      toast.error('Failed to update DB');
    }
  };

  const handleDownload = (expense: Expense) => {
    if (!expense.receiptImage) return;
    const link = document.createElement('a');
    link.href = expense.receiptImage; // Uses pre-signed S3 URLs or data uris 
    link.download = `receipt-${expense.description.replace(/\\s+/g, '-').toLowerCase()}-${expense.id}.jpg`;
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <ImageIcon className="size-7 text-primary" />
            </div>
            Cloud Media Gallery
          </h1>
          <p className="text-muted-foreground mt-1">
            All your scanned receipts securely stored on AWS.
          </p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search records..." className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          {filtered.length > 0 && (
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700" onClick={openClearAllConfirm}>
              <Trash2 className="mr-2 size-4" /> Clear All
            </Button>
          )}
          <Button onClick={() => navigate('/scan-receipt')}><Plus className="mr-2 size-4"/> Scan</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All', icon: Layers },
          { key: 'receipt', label: 'Receipts', icon: Camera },
          { key: 'qr', label: 'QR Codes', icon: QrCode },
        ].map(tab => (
          <Button key={tab.key} variant={filterType === tab.key ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(tab.key as any)}>
            <tab.icon className="mr-2 size-3.5" /> {tab.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-16 text-muted-foreground">
          <FileText className="size-12 mb-4 opacity-40" />
          <CardTitle>No records found</CardTitle>
          <CardDescription className="mt-2">Use the scanner to digitize your receipts and sync to the cloud database.</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((expense, idx) => {
            const BadgeSource = getSourceBadge(expense);
            return (
              <Card key={expense.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-transform" onClick={() => {
                 setLightboxIdx(idx); 
                 setEditForm({ description: expense.description, amount: expense.amount, category: expense.category }); 
              }}>
                <div className="relative h-52 bg-slate-900 border-b">
                  {expense.receiptImage ? (
                    <img src={expense.receiptImage} alt={expense.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="flex w-full h-full justify-center items-center">
                        <BadgeSource.icon className="size-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                     <Badge variant="secondary" className="backdrop-blur bg-black/40 text-white"><BadgeSource.icon className="mr-1 size-3"/> {expense.category}</Badge>
                  </div>
                  {/* Card Action Buttons - Edit & Delete on Hover */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-white/90 hover:bg-white backdrop-blur-sm border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIdx(idx);
                        setEditForm({ description: expense.description, amount: expense.amount, category: expense.category });
                        setEditing(true);
                      }}
                      title="Edit"
                    >
                      <Edit2 className="size-4 text-gray-700" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-white/90 hover:bg-red-50 backdrop-blur-sm border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExpense(expense.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none text-white">
                      <p className="font-semibold text-sm line-clamp-1">{expense.description}</p>
                      <div className="flex justify-between text-xs mt-1">
                          <span>{expense.date}</span>
                          <span className="text-emerald-400 font-bold">{formatCurrency(expense.amount)}</span>
                      </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxExpense && lightboxIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => { setLightboxIdx(null); setEditing(false); setIsZoomed(false); }}>
          <div className="bg-background border rounded-xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* Image Pane */}
            <div className={`flex-1 bg-black/5 flex items-center justify-center p-4 ${isZoomed ? 'overflow-auto block' : 'overflow-hidden'}`}>
               {lightboxExpense.receiptImage ? (
                  <img 
                      src={lightboxExpense.receiptImage} 
                      alt="receipt" 
                      onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
                      className={`shadow-md cursor-zoom-in transition-all duration-300 ${isZoomed ? 'max-w-none w-auto' : 'max-w-full max-h-[70vh] object-contain'}`} 
                  />
               ) : (
                  <div className="text-muted-foreground"><FileText className="size-20 opacity-30 mx-auto"/><p className="mt-4">No Image</p></div>
               )}
            </div>
            
            {/* Context Pane */}
            <div className="w-full md:w-96 p-6 border-l overflow-y-auto flex flex-col bg-card">
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="font-bold text-xl">Receipt Details</h2>
                    <p className="text-sm text-muted-foreground">ID: {lightboxExpense.id.split('_')[0]}...</p>
                 </div>
                 <div className="flex gap-1">
                    {lightboxExpense?.receiptImage && (
                       <Button variant="ghost" size="icon" onClick={() => setShowFilterOptions(true)} title="Enhance Image"><Wand2 className="size-4 text-purple-500" /></Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}><Edit2 className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowOcrText(!showOcrText)}><Eye className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteExpense(lightboxExpense.id)}><Trash2 className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setLightboxIdx(null)}><X className="size-4" /></Button>
                 </div>
               </div>

               {showOcrText && lightboxExpense.scanData ? (
                 <div className="flex-1 space-y-4">
                    <h3 className="font-semibold text-sm flex gap-2"><ScanLine className="size-4 text-primary" /> RAW API Extraction</h3>
                    <pre className="text-xs bg-muted p-3 rounded font-mono overflow-auto h-64 border">
                       {lightboxExpense.scanData.rawText}
                    </pre>
                 </div>
               ) : (
                 <div className="space-y-4 flex-1">
                   <div>
                     <label className="text-xs text-muted-foreground">Description</label>
                     {editing ? <Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /> : <p className="font-medium text-lg">{lightboxExpense.description}</p>}
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs text-muted-foreground">Amount</label>
                       {editing ? <Input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} /> : <p className="font-bold text-emerald-600 text-lg">{formatCurrency(lightboxExpense.amount)}</p>}
                     </div>
                     <div>
                       <label className="text-xs text-muted-foreground">Date</label>
                       <p className="font-medium">{lightboxExpense.date}</p>
                     </div>
                   </div>
                   <div>
                     <label className="text-xs text-muted-foreground">Category</label>
                     {editing ? <Input value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} /> : <Badge variant="outline" className="mt-1">{lightboxExpense.category}</Badge>}
                   </div>
                   
                   {editing && (
                     <Button className="w-full mt-4" onClick={handleUpdateExpense}><Save className="mr-2 size-4" /> Save Cloud Changes</Button>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
          <Card className="w-full max-w-sm shadow-2xl border-red-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-50">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {confirmModal.actionType === 'clearAll' ? 'Clear All Records' : 'Delete Record'}
                </h3>
              </div>

              {/* Modal Body */}
              <p className="text-sm text-gray-600 mb-6">
                {confirmModal.actionType === 'clearAll'
                  ? 'Are you absolutely sure you want to delete ALL records? This action cannot be undone and will remove all media from your AWS storage.'
                  : 'Are you sure you want to delete this record? This action cannot be undone.'}
              </p>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal} className="text-gray-700">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmAction}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="mr-2 size-4" />
                  Yes, {confirmModal.actionType === 'clearAll' ? 'Clear All' : 'Delete'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showFilterOptions && lightboxExpense?.receiptImage && (
         <ImageFilter 
            imageSrc={lightboxExpense.receiptImage} 
            onApply={handleApplyFilter} 
            onCancel={() => setShowFilterOptions(false)} 
            isOpen={showFilterOptions} 
         />
      )}
    </div>
  );
}
