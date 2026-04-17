import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { runReconciliationAudit, ReconciliationMatch } from '../lib/reconciliation';
import { Expense, api } from '../lib/api';
import { CheckCircle, ShieldAlert, Sparkles, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { toast } from 'sonner';

export function ReconciliationView() {
  const { formatCurrency } = useCurrency();
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [unverified, setUnverified] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAudit = async () => {
    setLoading(true);
    const data = await runReconciliationAudit();
    setMatches(data.matches);
    setUnverified(data.unverified);
    setLoading(false);
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const handleLink = async (match: ReconciliationMatch) => {
    try {
      // Find the scan to get its image URL
      const scansRes = await api.getScans();
      const scan = scansRes.scans.find((s: any) => s.id === match.scanId);
      if (!scan) return;

      await api.updateExpense(match.expense.id, {
         receiptImage: scan.imageUrl,
         metadata: { ...match.expense.metadata, verifiedByAI: true }
      });
      toast.success('Transaction reconciled successfully! ✅');
      loadAudit();
    } catch {
      toast.error('Failed to link transaction');
    }
  };

  if (loading) return <div>Auditing financial records...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Verified Count */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
           <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-600">
                 <CheckCircle className="size-6" />
              </div>
              <div>
                 <p className="text-2xl font-bold">{matches.length + (unverified.length === 0 ? matches.length : 0)}</p>
                 <p className="text-xs text-muted-foreground">Reconciled / Linked Spends</p>
              </div>
           </CardContent>
        </Card>

        {/* Missing Proofs */}
        <Card className="bg-rose-500/5 border-rose-500/20">
           <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 rounded-full text-rose-600">
                 <ShieldAlert className="size-6" />
              </div>
              <div>
                 <p className="text-2xl font-bold">{unverified.length}</p>
                 <p className="text-xs text-muted-foreground">Missing Receipt Proofs</p>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
           <Sparkles className="size-5 text-primary" /> 
           AI Matching Suggestions
        </h3>
        
        {matches.length === 0 && (
           <p className="text-sm text-muted-foreground italic">No automatic matches found. Try scanning more receipts!</p>
        )}

        {matches.map((match, i) => (
           <Card key={i} className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                       <Badge variant="default" className="text-[10px] bg-primary">MATCH {match.confidence}%</Badge>
                       <p className="font-bold">{match.expense.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                       Digital: {formatCurrency(match.expense.amount)} on {match.expense.date}
                    </p>
                 </div>

                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleLink(match)}>
                       <LinkIcon className="size-3" /> Link Receipt
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8">
                       <ExternalLink className="size-4" />
                    </Button>
                 </div>
              </CardContent>
           </Card>
        ))}
      </div>
    </div>
  );
}
