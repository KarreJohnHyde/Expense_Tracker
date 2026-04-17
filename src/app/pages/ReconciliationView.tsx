import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api, Expense } from '../lib/api';
import { runReconciliationAudit, ReconciliationMatch } from '../lib/reconciliation';
import { toast } from 'sonner';
import { 
    ShieldCheck, 
    AlertTriangle, 
    Link as LinkIcon, 
    FileText, 
    CheckCircle, 
    Search,
    RefreshCw,
    XCircle,
    ArrowRight
} from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { motion, AnimatePresence } from 'motion/react';

export default function ReconciliationView() {
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
    const [unverified, setUnverified] = useState<Expense[]>([]);
    const [stats, setStats] = useState({ verified: 0, missing: 0, score: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const results = await runReconciliationAudit();
            setMatches(results.matches);
            setUnverified(results.unverified);
            
            const total = results.matches.length + results.unverified.length;
            const score = total > 0 ? (results.matches.length / total) * 100 : 100;
            setStats({
                verified: results.matches.length,
                missing: results.unverified.length,
                score: Math.round(score)
            });
        } catch (err) {
            toast.error("Audit failed to run.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <ShieldCheck className="size-8 text-primary" />
                        Financial Audit & Reconciliation
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Verifying digital transactions against physical receipt proofs.
                    </p>
                </div>
                <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    Run Audit
                </Button>
            </div>

            {/* Audit Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Financial Trust Score</p>
                            <ShieldCheck className="size-4 text-primary" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{stats.score}%</span>
                            <span className="text-xs text-muted-foreground">Audit Confidence</span>
                        </div>
                        <div className="mt-4 h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.score}%` }}
                                className="h-full bg-primary" 
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Verified (Synced)</p>
                            <CheckCircle className="size-4 text-emerald-500" />
                        </div>
                        <div className="mt-2">
                            <span className="text-3xl font-bold">{stats.verified}</span>
                            <p className="text-xs text-muted-foreground mt-1">Backed by digital evidence</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={stats.missing > 0 ? 'bg-amber-500/5 border-amber-500/20' : ''}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Missing Proofs</p>
                            <AlertTriangle className={`size-4 ${stats.missing > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                        </div>
                        <div className="mt-2">
                            <span className="text-3xl font-bold">{stats.missing}</span>
                            <p className="text-xs text-muted-foreground mt-1">Expenses needing receipts</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Verified List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="size-5 text-emerald-500" />
                        Verified Records
                    </h3>
                    <div className="space-y-3">
                        {matches.length === 0 && !loading && (
                            <div className="text-center py-10 bg-muted/30 rounded-xl border border-dashed">
                                <Search className="size-8 mx-auto text-muted-foreground opacity-30 mb-2" />
                                <p className="text-sm text-muted-foreground">No matches found yet.</p>
                            </div>
                        )}
                        {matches.map((match, idx) => (
                            <Card key={idx} className="overflow-hidden border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-3 items-center">
                                            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                                <FileText className="size-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{match.expense.description}</p>
                                                <p className="text-xs text-muted-foreground">{match.expense.date} • {match.expense.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-600">{formatCurrency(match.expense.amount)}</p>
                                            <Badge variant="secondary" className="text-[10px] py-0 bg-emerald-100 text-emerald-700 border-emerald-200">
                                                {Math.round(match.confidence * 100)}% Match
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-dashed flex items-center justify-between text-[11px] text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <LinkIcon className="size-3" />
                                            <span>Linked with scan #{match.scanId.split('_')[1]}</span>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider">Verified</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Unverified List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <XCircle className="size-5 text-amber-500" />
                        Audit Anomalies
                    </h3>
                    <div className="space-y-3">
                        {unverified.length === 0 && !loading && (
                            <div className="text-center py-10 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                                <CheckCircle className="size-8 mx-auto text-emerald-500 mb-2" />
                                <p className="text-sm font-medium text-emerald-700">Audit Clean: All records verified!</p>
                            </div>
                        )}
                        {unverified.map((expense) => (
                            <Card key={expense.id} className="border-amber-500/20 hover:border-amber-500/40 border-l-4 border-l-amber-500 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-3 items-center">
                                            <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                                                <AlertTriangle className="size-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{expense.description}</p>
                                                <p className="text-xs text-muted-foreground">{expense.date} • {expense.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(expense.amount)}</p>
                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 hover:bg-primary/10 text-primary">
                                                Fix Audit <ArrowRight className="size-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
