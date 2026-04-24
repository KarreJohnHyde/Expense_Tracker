import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { auth, BankAccount, User } from '../lib/auth';
import { toast } from 'sonner';
import { messaging } from '../lib/messaging';
import { 
  User as UserIcon, 
  CreditCard, 
  Building2, 
  Smartphone,
  Globe,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  MessageSquare,
  Send
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useCurrency } from '../lib/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../lib/api';
import { FileText } from 'lucide-react';

export default function Profile() {
  const { t } = useTranslation();
  const { currency, formatCurrency } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showCardDetails, setShowCardDetails] = useState<Record<string, boolean>>({});
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phoneNumber: '' });
  const [vaultPin, setVaultPin] = useState(localStorage.getItem('expenseai_vault_pin') || '1234');
  const [isPinEditing, setIsPinEditing] = useState(false);
  const [newPin, setNewPin] = useState('');

  // New account form state
  const [newAccount, setNewAccount] = useState({
    accountType: 'savings' as BankAccount['accountType'],
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    upiId: '',
    cardNumber: '',
    cvv: '',
    expiryDate: '',
    balance: 0,
  });

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setEditForm({
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || ''
      });
      loadAccounts(currentUser.id);
    }
  }, []);

  const loadAccounts = (userId: string) => {
    const userAccounts = auth.getBankAccounts(userId);
    setAccounts(userAccounts);
  };

  const handleSaveProfile = async () => {
    try {
      if (!user) return;
      const updatedUser = {
        ...user,
        fullName: editForm.fullName,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber
      };
      localStorage.setItem('user', JSON.stringify(updatedUser)); 
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleTestWhatsApp = async () => {
    if (!editForm.phoneNumber) {
      toast.error('Please enter a phone number first');
      return;
    }
    toast.info('Sending test WhatsApp...');
    const res = await messaging.sendWhatsApp(editForm.phoneNumber, 'Hello from ExpenseAI! This is a test message. 🚀');
    if (res.success) {
      toast.success('WhatsApp sent via API!');
    } else {
      toast.warning('API failed. Opening WhatsApp Web fallback...');
      messaging.openWhatsAppLink(editForm.phoneNumber, 'Hello from ExpenseAI! (Manual fallback)');
    }
  };

  const handleTestSMS = async () => {
    if (!editForm.phoneNumber) {
      toast.error('Please enter a phone number first');
      return;
    }
    toast.info('Sending test SMS...');
    const res = await messaging.sendSMS(editForm.phoneNumber, 'ExpenseAI: This is a test SMS notification.');
    if (res.success) {
      toast.success('SMS sent successfully!');
    } else {
      toast.warning('API failed. Opening default SMS app...');
      messaging.openSMSLink(editForm.phoneNumber, 'ExpenseAI: This is a test SMS notification.');
    }
  };

  const handleUpdatePin = () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    localStorage.setItem('expenseai_vault_pin', newPin);
    setVaultPin(newPin);
    setIsPinEditing(false);
    setNewPin('');
    toast.success('Security PIN updated! 🔐');
  };

  const handleAddAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    const { account, error } = await auth.addBankAccount({
      ...newAccount,
      userId: user.id,
      isDefault: accounts.length === 0,
    });

    if (error) {
      toast.error('Failed to add account');
    } else if (account) {
      toast.success('Account added successfully! 🎉');
      loadAccounts(user.id);
      setIsAddAccountOpen(false);
      setNewAccount({
        accountType: 'savings',
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        upiId: '',
        cardNumber: '',
        cvv: '',
        expiryDate: '',
        balance: 0,
      });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user) return;

    const { error } = await auth.deleteBankAccount(accountId);
    if (error) {
      toast.error('Failed to delete account');
    } else {
      toast.success('Account deleted');
      loadAccounts(user.id);
    }
  };

  const handleExportPDF = async () => {
    try {
      const data = await api.getExpenses();
      const expenses = data.expenses || [];
      
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("ExpenseAI Official Tax Report", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} | User: ${user?.username}`, 14, 30);
      
      const tableData = expenses.map((e: any) => [
         e.date,
         e.description?.substring(0, 30) || 'Unknown',
         e.category || 'Others',
         e.paymentMethod || 'Cash',
         formatCurrency(e.amount)
      ]);
      
      autoTable(doc, {
         startY: 40,
         head: [['Date', 'Merchant', 'Category', 'Method', 'Amount']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: [0, 212, 170] }
      });
      
      doc.save(`ExpenseAI_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Official PDF Generated and Downloaded!");
    } catch {
      toast.error("Failed to compile PDF report.");
    }
  };

  const toggleShowCard = (accountId: string) => {
    setShowCardDetails(prev => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  const maskCardNumber = (cardNumber: string) => {
    return cardNumber.replace(/\d(?=\d{4})/g, '*');
  };

  const getAccountIcon = (type: BankAccount['accountType']) => {
    switch (type) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="size-5" />;
      case 'upi':
        return <Smartphone className="size-5" />;
      case 'net_banking':
        return <Globe className="size-5" />;
      default:
        return <Building2 className="size-5" />;
    }
  };

  const getAccountTypeName = (type: BankAccount['accountType']) => {
    const names = {
      savings: t('profile.account_types.savings'),
      current: t('profile.account_types.current'),
      credit_card: t('profile.account_types.credit_card'),
      debit_card: t('profile.account_types.debit_card'),
      upi: t('profile.account_types.upi'),
      net_banking: t('profile.account_types.net_banking'),
    };
    return names[type];
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground">
          {t('profile.desc')}
        </p>
      </div>
      <div className="flex gap-4">
          <Button onClick={handleExportPDF} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
             <FileText className="size-4 mr-2" /> {t('profile.tax_report')}
          </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="size-5" />
                  {t('profile.personal_info')}
                </CardTitle>
                <CardDescription>{t('profile.personal_info_desc')}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? t('profile.cancel_edit') : t('profile.edit_profile')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.full_name')}</Label>
              <Input 
                value={editForm.fullName} 
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                disabled={!isEditing} 
              />
            </div>

            <div className="space-y-2">
              <Label>{t('profile.username')}</Label>
              <Input value={user.username} disabled />
            </div>

            <div className="space-y-2">
              <Label>{t('profile.email')}</Label>
              <Input 
                value={editForm.email} 
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                disabled={!isEditing} 
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number (with Country Code)</Label>
              <Input 
                placeholder="+91 9876543210"
                value={editForm.phoneNumber} 
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                disabled={!isEditing} 
              />
              <p className="text-[10px] text-muted-foreground italic">Use E.164 format: +[country_code][number]</p>
            </div>

            <div className="space-y-2">
              <Label>{t('profile.user_id')}</Label>
              <Input value={user.id} disabled className="font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <Label>{t('profile.member_since')}</Label>
              <Input 
                value={new Date(user.createdAt).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} 
                disabled 
              />
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">{t('profile.verified')}</span>
              </div>
              {isEditing && (
                <Button onClick={handleSaveProfile} size="sm">
                  {t('profile.save_changes')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              {t('profile.stats')}
            </CardTitle>
            <CardDescription>{t('profile.stats_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-muted-foreground">{t('profile.total_accounts')}</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground">{t('profile.total_balance')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0))}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800">
                <p className="text-sm text-muted-foreground">{t('profile.bank_accounts')}</p>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.accountType === 'savings' || a.accountType === 'current').length}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-muted-foreground">{t('profile.cards_upi')}</p>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => ['credit_card', 'debit_card', 'upi'].includes(a.accountType)).length}
                </p>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('profile.security')}</span>
                <span className="font-semibold text-green-600">{t('profile.high')}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communications & Notifications */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Communications & Notifications
            </CardTitle>
            <CardDescription>Configure how you receive alerts for budgets, bills, and large transactions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
               <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                        <MessageSquare className="size-4 text-emerald-600" />
                      </div>
                      <h4 className="font-semibold text-sm">WhatsApp Integration</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Receive budget alerts and transaction summaries directly on WhatsApp.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={handleTestWhatsApp}
                  >
                    <Send className="size-3 mr-2" /> Send Test WhatsApp
                  </Button>
               </div>

               <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <Smartphone className="size-4 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-sm">SMS Alerts</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Get critical security alerts and large transaction warnings via standard SMS.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-blue-500/30 hover:bg-blue-500/10"
                    onClick={handleTestSMS}
                  >
                    <Send className="size-3 mr-2" /> Send Test SMS
                  </Button>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Vault Settings */}
        <Card className="md:col-span-2 border-orange-500/20 bg-orange-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5 text-orange-500" />
                  {t('profile.vault')}
                </CardTitle>
                <CardDescription>{t('profile.vault_desc')}</CardDescription>
              </div>
              {!isPinEditing ? (
                 <Button variant="outline" size="sm" onClick={() => setIsPinEditing(true)}>{t('profile.change_pin')}</Button>
              ) : (
                 <Button variant="ghost" size="sm" onClick={() => setIsPinEditing(false)}>{t('profile.cancel_edit')}</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
               <div className="space-y-1">
                  <p className="text-sm font-medium">{t('profile.vault_status')}</p>
                  <Badge variant="outline" className="text-green-600 border-green-600/20 bg-green-600/10">{t('profile.encrypted')}</Badge>
               </div>
               <div className="h-10 w-px bg-border"></div>
               <div className="flex-1 max-w-xs">
                  {isPinEditing ? (
                     <div className="flex gap-2">
                        <Input 
                           type="password" 
                           placeholder="New 4-digit PIN" 
                           maxLength={4} 
                           value={newPin} 
                           onChange={e => setNewPin(e.target.value)}
                           className="font-mono text-center tracking-[0.5em]"
                        />
                        <Button onClick={handleUpdatePin}>Save</Button>
                     </div>
                  ) : (
                     <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Current PIN:</p>
                        <p className="font-mono font-bold tracking-widest text-lg">****</p>
                     </div>
                  )}
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                {t('profile.financial_accounts')}
              </CardTitle>
              <CardDescription>{t('profile.financial_accounts_desc')}</CardDescription>
            </div>
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-2" />
                  {t('profile.add_account')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Financial Account</DialogTitle>
                  <DialogDescription>
                    Add a new bank account, card, or payment method
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select 
                      value={newAccount.accountType} 
                      onValueChange={(value: BankAccount['accountType']) => 
                        setNewAccount({ ...newAccount, accountType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings Account</SelectItem>
                        <SelectItem value="current">Current Account</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="net_banking">Net Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bank/Provider Name</Label>
                    <Input
                      placeholder="e.g., HDFC Bank, PhonePe"
                      value={newAccount.bankName}
                      onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input
                      placeholder="Your name"
                      value={newAccount.accountHolderName}
                      onChange={(e) => setNewAccount({ ...newAccount, accountHolderName: e.target.value })}
                    />
                  </div>

                  {(newAccount.accountType === 'savings' || newAccount.accountType === 'current') && (
                    <>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          placeholder="1234567890"
                          value={newAccount.accountNumber}
                          onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IFSC Code</Label>
                        <Input
                          placeholder="HDFC0001234"
                          value={newAccount.ifscCode}
                          onChange={(e) => setNewAccount({ ...newAccount, ifscCode: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {newAccount.accountType === 'upi' && (
                    <div className="space-y-2">
                      <Label>UPI ID</Label>
                      <Input
                        placeholder="yourname@paytm"
                        value={newAccount.upiId}
                        onChange={(e) => setNewAccount({ ...newAccount, upiId: e.target.value })}
                      />
                    </div>
                  )}

                  {(newAccount.accountType === 'credit_card' || newAccount.accountType === 'debit_card') && (
                    <>
                      <div className="space-y-2">
                        <Label>Card Number</Label>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          value={newAccount.cardNumber}
                          onChange={(e) => setNewAccount({ ...newAccount, cardNumber: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input
                            placeholder="MM/YY"
                            value={newAccount.expiryDate}
                            onChange={(e) => setNewAccount({ ...newAccount, expiryDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CVV</Label>
                          <Input
                            placeholder="123"
                            type="password"
                            maxLength={3}
                            value={newAccount.cvv}
                            onChange={(e) => setNewAccount({ ...newAccount, cvv: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Initial Balance ({currency.symbol})</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newAccount.balance || ''}
                      onChange={(e) => setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <Button onClick={handleAddAccount} className="w-full">
                    Add Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t('profile.no_accounts')}</p>
              <Button onClick={() => setIsAddAccountOpen(true)}>
                <Plus className="size-4 mr-2" />
                {t('profile.add_first')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {accounts.map((account) => (
                <Card key={account.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {getAccountIcon(account.accountType)}
                        </div>
                        <div>
                          <p className="font-semibold">{account.bankName}</p>
                          <p className="text-sm text-muted-foreground">
                            {getAccountTypeName(account.accountType)}
                          </p>
                        </div>
                      </div>
                      {account.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Holder</span>
                        <span className="font-medium">{account.accountHolderName}</span>
                      </div>

                      {account.accountNumber && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account Number</span>
                          <span className="font-mono">{account.accountNumber}</span>
                        </div>
                      )}

                      {account.ifscCode && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IFSC Code</span>
                          <span className="font-mono">{account.ifscCode}</span>
                        </div>
                      )}

                      {account.upiId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('profile.upi_id')}</span>
                          <span className="font-mono">{account.upiId}</span>
                        </div>
                      )}

                      {account.cardNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('profile.card_number')}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {showCardDetails[account.id] 
                                ? account.cardNumber 
                                : maskCardNumber(account.cardNumber)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleShowCard(account.id)}
                            >
                              {showCardDetails[account.id] ? (
                                <EyeOff className="size-3" />
                              ) : (
                                <Eye className="size-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {account.expiryDate && showCardDetails[account.id] && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('profile.expires')}</span>
                          <span className="font-mono">{account.expiryDate}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">{t('profile.balance')}</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(account.balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="size-3 mr-2" />
                        {t('profile.remove')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
