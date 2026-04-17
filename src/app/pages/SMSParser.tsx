import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  Wallet,
  Trash2,
  Copy,
  FileText,
} from 'lucide-react';
import { parseMultipleSMS, ParsedTransaction } from '../lib/smsPatterns';
import { saveWalletTransaction, WalletName, WALLET_LIST } from '../lib/wallets';
import { useCurrency } from '../lib/currency';
import { notifyUser } from '../lib/notifications';

export default function SMSParser() {
  const { formatCurrency } = useCurrency();
  const location = useLocation();
  const [smsText, setSmsText] = useState('');
  const [results, setResults] = useState<ParsedTransaction[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  // Intercept Web Share Target API payload
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sharedText = params.get('text') || params.get('title');
    if (sharedText) {
      setSmsText(sharedText);
      // Clean up URL natively
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  const handleParse = () => {
    if (!smsText.trim()) {
      toast.error('Paste your bank SMS messages first');
      return;
    }
    const parsed = parseMultipleSMS(smsText);
    setResults(parsed);
    setSaved(new Set());
    if (parsed.length === 0) {
      toast.error('No transactions found. Make sure you pasted valid bank SMS messages.');
    } else {
      toast.success(`Found ${parsed.length} transaction(s)!`);
    }
  };

  const handleSaveAsExpense = (txn: ParsedTransaction, index: number) => {
    // Save to wallet as generic entry
    saveWalletTransaction({
      wallet: 'Paytm', // default wallet
      type: txn.type,
      amount: txn.amount,
      category: txn.category || 'Others',
      description: `${txn.bank} - ${txn.type === 'credit' ? 'Credit' : 'Debit'}${txn.accountLast4 ? ` (A/c ${txn.accountLast4})` : ''}`,
      date: txn.date,
      reference: txn.reference,
    });
    setSaved((prev: Set<number>) => new Set(prev).add(index));

    // Fire notification
    notifyUser({
      type: 'sms_transaction',
      title: `💳 SMS ${txn.type === 'credit' ? 'Credit' : 'Debit'}: ${txn.bank}`,
      message: `₹${txn.amount.toLocaleString()} ${txn.type === 'credit' ? 'credited' : 'debited'}${txn.accountLast4 ? ` (A/c ${txn.accountLast4})` : ''}`,
      desktopTitle: `${txn.type === 'credit' ? 'Credit' : 'Debit'}: ${txn.bank}`,
      desktopBody: `₹${txn.amount.toLocaleString()}`,
    });

    toast.success(`Saved ${formatCurrency(txn.amount)} ${txn.type} transaction`);
  };

  const handleSaveToWallet = (txn: ParsedTransaction, wallet: WalletName, index: number) => {
    saveWalletTransaction({
      wallet,
      type: txn.type,
      amount: txn.amount,
      category: txn.category || 'Others',
      description: `${txn.bank} - ${txn.type === 'credit' ? 'Credit' : 'Debit'}${txn.accountLast4 ? ` (A/c ${txn.accountLast4})` : ''}`,
      date: txn.date,
      reference: txn.reference,
    });
    setSaved((prev: Set<number>) => new Set(prev).add(index));
    toast.success(`Added to ${wallet} wallet`);
  };

  const loadSampleSMS = () => {
    setSmsText(
`Your a/c no. XXXXXXXX0206 is debited for Rs.600.00 on 16-03-2026 and credited to a/c no. XXXXXXXX3732 (UPI Ref no 182368770082)

Your a/c no. XXXXXXXX0206 is debited for Rs.10000.00 on 03-04-2026 and credited to a/c no. XXXXXXXX2063 (UPI Ref no 121032415875)

Rs.5,000.00 debited from A/c XX1234 on 27-Mar-26. UPI Ref: 409876543210. Avl Bal Rs.25,432.50 -SBI

INR 2,500.00 credited to your A/c XX5678 on 26-Mar-26. IMPS Ref 987654321. Available Balance: INR 45,678.90 -HDFC Bank

Rs 1,200.00 spent on POS at AMAZON using ICICI Bank Card XX9012 on 25-Mar-26. Avl Bal: Rs 18,900.00

Rs.15,000 has been credited to your A/c no. XX3456 by NEFT. Ref: NEFT123456. Avl Bal Rs.1,25,000.50 -Axis Bank`);
    toast.success('Sample SMS loaded — click "Parse Messages" to extract');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank SMS Parser</h1>
        <p className="text-muted-foreground">Paste your bank SMS messages to auto-extract transactions</p>
      </div>

      {/* Input Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                Paste Bank Messages
              </CardTitle>
              <CardDescription>Supports SBI, HDFC, ICICI, Axis, Kotak, PNB and more</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSampleSMS}>
              <Copy className="size-4 mr-2" /> Load Sample
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full min-h-[200px] p-4 rounded-lg border bg-muted text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={`Paste your bank SMS messages here...\n\nExample:\nRs.5,000.00 debited from A/c XX1234 on 27-Mar-26. UPI Ref: 409876543210. Avl Bal Rs.25,432.50 -SBI\n\nSeparate multiple messages with blank lines.`}
            value={smsText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSmsText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleParse}>
              <FileText className="size-4 mr-2" /> Parse Messages
            </Button>
            <Button variant="outline" onClick={() => { setSmsText(''); setResults([]); setSaved(new Set()); }}>
              <Trash2 className="size-4 mr-2" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Parsed Transactions ({results.length})
            </h2>
            {results.length > 0 && saved.size < results.length && (
              <Button
                onClick={() => {
                  results.forEach((txn: ParsedTransaction, i: number) => {
                    if (!saved.has(i)) {
                      handleSaveAsExpense(txn, i);
                    }
                  });
                  toast.success(`Auto-saved ${results.length - saved.size} transactions!`);
                }}
              >
                <Save className="size-4 mr-2" /> Auto-Save All ({results.length - saved.size})
              </Button>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Found</p>
                <p className="text-2xl font-bold">{results.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(results.filter((r: ParsedTransaction) => r.type === 'credit').reduce((s: number, r: ParsedTransaction) => s + r.amount, 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Debits</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(results.filter((r: ParsedTransaction) => r.type === 'debit').reduce((s: number, r: ParsedTransaction) => s + r.amount, 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Saved</p>
                <p className="text-2xl font-bold">{saved.size} / {results.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Cards */}
          {results.map((txn: ParsedTransaction, i: number) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={i}
            >
              <Card className={`transition-all ${saved.has(i) ? 'opacity-60 border-green-300' : ''}`}>
                <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full mt-1 ${txn.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {txn.type === 'credit' ? <ArrowDownRight className="size-5" /> : <ArrowUpRight className="size-5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={txn.type === 'credit' ? 'default' : 'destructive'}>{txn.type.toUpperCase()}</Badge>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">✨ AI: {txn.category}</Badge>
                        <span className="font-semibold">{txn.bank}</span>
                        {txn.accountLast4 && <span className="text-sm text-muted-foreground">A/c ****{txn.accountLast4}</span>}
                      </div>
                      <p className={`text-2xl font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>📅 {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {txn.balance !== undefined && <span>💰 Bal: {formatCurrency(txn.balance)}</span>}
                        {txn.reference && <span>🔗 Ref: {txn.reference}</span>}
                        {txn.merchant && <span>🏪 {txn.merchant}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2 max-w-lg truncate">{txn.rawMessage}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[120px]">
                    {saved.has(i) ? (
                      <Badge variant="secondary" className="justify-center py-2">✓ Saved</Badge>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => handleSaveAsExpense(txn, i)}>
                          <Save className="size-3 mr-1" /> Save
                        </Button>
                        {WALLET_LIST.slice(0, 3).map(w => (
                          <Button key={w.name} size="sm" variant="outline" onClick={() => handleSaveToWallet(txn, w.name, i)}>
                            <Wallet className="size-3 mr-1" /> {w.name}
                          </Button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* How-To */}
      {results.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <MessageSquare className="size-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">1. Copy SMS</h4>
                  <p className="text-sm text-muted-foreground">Copy your bank transaction SMS from your phone's messaging app</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <FileText className="size-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. Paste & Parse</h4>
                  <p className="text-sm text-muted-foreground">Paste into the box above and click "Parse Messages" to extract details</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <Save className="size-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Save</h4>
                  <p className="text-sm text-muted-foreground">Save extracted transactions as expenses or add them to your UPI wallets</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
