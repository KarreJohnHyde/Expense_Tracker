import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { auth, BankAccount, User } from '../lib/auth';
import { toast } from 'sonner';
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
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useCurrency } from '../lib/currency';

export default function Profile() {
  const { currency, formatCurrency } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showCardDetails, setShowCardDetails] = useState<Record<string, boolean>>({});
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', email: '' });

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
      loadAccounts(currentUser.id);
    }
  }, []);

  const loadAccounts = (userId: string) => {
    const userAccounts = auth.getBankAccounts(userId);
    setAccounts(userAccounts);
  };

  const handleSaveProfile = async () => {
    try {
      // Typically, this would update Supabase, but since user comes from auth local mock:
      const updatedUser = {
        ...user,
        fullName: editForm.fullName,
        email: editForm.email
      };
      localStorage.setItem('wallet_auth_user', JSON.stringify(updatedUser)); // using standard storage based on auth layout but let's assume it updates.
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update profile');
    }
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
      savings: 'Savings Account',
      current: 'Current Account',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      upi: 'UPI',
      net_banking: 'Net Banking',
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
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and financial information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="size-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Your account details</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={editForm.fullName} 
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                disabled={!isEditing} 
              />
            </div>

            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user.username} disabled />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={editForm.email} 
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                disabled={!isEditing} 
              />
            </div>

            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={user.id} disabled className="font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <Label>Member Since</Label>
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
                <span className="text-sm font-medium">Account Verified</span>
              </div>
              {isEditing && (
                <Button onClick={handleSaveProfile} size="sm">
                  Save Changes
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
              Account Statistics
            </CardTitle>
            <CardDescription>Your account overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0))}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800">
                <p className="text-sm text-muted-foreground">Bank Accounts</p>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.accountType === 'savings' || a.accountType === 'current').length}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-muted-foreground">Cards & UPI</p>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => ['credit_card', 'debit_card', 'upi'].includes(a.accountType)).length}
                </p>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account Security</span>
                <span className="font-semibold text-green-600">High</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }} />
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
                Financial Accounts
              </CardTitle>
              <CardDescription>Manage your bank accounts, cards, and payment methods</CardDescription>
            </div>
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-2" />
                  Add Account
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
              <p className="text-muted-foreground mb-4">No accounts added yet</p>
              <Button onClick={() => setIsAddAccountOpen(true)}>
                <Plus className="size-4 mr-2" />
                Add Your First Account
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
                          <span className="text-muted-foreground">UPI ID</span>
                          <span className="font-mono">{account.upiId}</span>
                        </div>
                      )}

                      {account.cardNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Card Number</span>
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
                          <span className="text-muted-foreground">Expires</span>
                          <span className="font-mono">{account.expiryDate}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Balance</span>
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
                        Remove
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
