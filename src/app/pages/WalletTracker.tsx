import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

import { toast } from 'sonner';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Trash2,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import {
  WalletTransaction,
  WalletName,
  WALLET_LIST,
  getWalletTransactions,
  saveWalletTransaction,
  deleteWalletTransaction,
  getWalletBalance,
} from '../lib/wallets';
import { useCurrency } from '../lib/currency';

export default function WalletTracker() {
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletName>('PhonePe');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTxn, setNewTxn] = useState({
    type: 'credit' as 'credit' | 'debit',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  });

  const reload = () => setTransactions(getWalletTransactions());

  useEffect(() => {
    reload();
    window.addEventListener('wallets-changed', reload);
    return () => window.removeEventListener('wallets-changed', reload);
  }, []);

  const handleAdd = () => {
    if (!newTxn.amount || parseFloat(newTxn.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    saveWalletTransaction({
      wallet: selectedWallet,
      type: newTxn.type,
      amount: parseFloat(newTxn.amount),
      description: newTxn.description || `${newTxn.type === 'credit' ? 'Received' : 'Paid'} via ${selectedWallet}`,
      date: newTxn.date,
      reference: newTxn.reference,
    });
    toast.success(`${newTxn.type === 'credit' ? 'Credit' : 'Debit'} of ${formatCurrency(parseFloat(newTxn.amount))} added to ${selectedWallet}`);
    setDialogOpen(false);
    setNewTxn({ type: 'credit', amount: '', description: '', date: new Date().toISOString().split('T')[0], reference: '' });
    reload();
  };

  const handleDelete = (id: string) => {
    deleteWalletTransaction(id);
    toast.success('Transaction deleted');
    reload();
  };

  const walletTxns = transactions.filter((t: WalletTransaction) => t.wallet === selectedWallet);
  const { balance, totalCredit, totalDebit } = getWalletBalance(selectedWallet);
  const walletInfo = WALLET_LIST.find(w => w.name === selectedWallet)!;

  const totalBalance = WALLET_LIST.reduce((sum, w) => sum + getWalletBalance(w.name).balance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">UPI Wallets</h1>
        <p className="text-muted-foreground">Track your PhonePe, Paytm, GPay, SuperPay & CRED transactions</p>
      </div>

      {/* Total Balance */}
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Wallet Balance</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
            </div>
            <Wallet className="size-10 opacity-80" />
          </div>
        </CardContent>
      </Card>

      {/* Wallet Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {WALLET_LIST.map(w => {
          const bal = getWalletBalance(w.name);
          const isActive = selectedWallet === w.name;
          return (
            <Card
              key={w.name}
              className={`cursor-pointer transition-all hover:scale-105 ${isActive ? 'ring-2 ring-primary shadow-lg' : ''}`}
              onClick={() => setSelectedWallet(w.name)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-1">{w.icon}</div>
                <p className="font-semibold text-sm">{w.name}</p>
                <p className={`text-lg font-bold mt-1 ${bal.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(bal.balance)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Wallet Detail */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="size-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Total Credited</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="size-4 text-red-600" />
              <p className="text-sm text-muted-foreground">Total Debited</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span>{walletInfo.icon}</span> {selectedWallet} Transactions
        </h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 mr-2" /> Add Transaction
        </Button>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {walletTxns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Smartphone className="size-12 mx-auto mb-3 opacity-40" />
              <p>No transactions yet for {selectedWallet}</p>
              <p className="text-sm mt-1">Add your first transaction to start tracking</p>
            </CardContent>
          </Card>
        ) : (
          walletTxns.map((txn: WalletTransaction) => (
            <Card key={txn.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${txn.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {txn.type === 'credit' ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-sm text-muted-foreground">{new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {txn.reference && <p className="text-xs text-muted-foreground">Ref: {txn.reference}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      <Badge variant={txn.type === 'credit' ? 'default' : 'destructive'} className="text-xs">
                        {txn.type.toUpperCase()}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(txn.id)}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5" /> Add {selectedWallet} Transaction
            </DialogTitle>
            <DialogDescription>Record a credit or debit for {selectedWallet}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={newTxn.type === 'credit' ? 'default' : 'outline'}
                className={newTxn.type === 'credit' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setNewTxn({ ...newTxn, type: 'credit' })}
              >
                <ArrowDownRight className="size-4 mr-2" /> Credit
              </Button>
              <Button
                variant={newTxn.type === 'debit' ? 'default' : 'outline'}
                className={newTxn.type === 'debit' ? 'bg-red-600 hover:bg-red-700' : ''}
                onClick={() => setNewTxn({ ...newTxn, type: 'debit' })}
              >
                <ArrowUpRight className="size-4 mr-2" /> Debit
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newTxn.amount}
                onChange={(e: any) => setNewTxn({ ...newTxn, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                placeholder="e.g. Payment to merchant"
                value={newTxn.description}
                onChange={(e: any) => setNewTxn({ ...newTxn, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input
                type="date"
                value={newTxn.date}
                onChange={(e: any) => setNewTxn({ ...newTxn, date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Reference (Optional)</label>
              <Input
                placeholder="e.g. UPI Ref: 123456"
                value={newTxn.reference}
                onChange={(e: any) => setNewTxn({ ...newTxn, reference: e.target.value })}
              />
            </div>

            <Button className="w-full" onClick={handleAdd}>
              <Plus className="size-4 mr-2" /> Add Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
