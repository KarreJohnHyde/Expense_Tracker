import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Database, Shield, Bell } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useCurrency } from '../lib/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { getPreferences, savePreferences, requestNotificationPermission, NotificationType } from '../lib/notifications';

export default function Settings() {
  const { currency, CURRENCIES, changeCurrency } = useCurrency();
  const [prefs, setPrefs] = useState(getPreferences());

  useEffect(() => {
    const reload = () => setPrefs(getPreferences());
    window.addEventListener('notifications-changed', reload);
    return () => window.removeEventListener('notifications-changed', reload);
  }, []);

  const updatePrefs = (next: Partial<typeof prefs>) => {
    savePreferences(next);
    setPrefs({ ...prefs, ...next });
  };

  const toggleType = (type: NotificationType) => {
    const current = prefs.enabledTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updatePrefs({ enabledTypes: next });
  };

  const notifTypeRows: { type: NotificationType; label: string; desc: string }[] = [
    { type: 'budget_alert', label: 'Budget Alerts', desc: 'Notify when budgets approach or exceed limits' },
    { type: 'large_transaction', label: 'Large Transactions', desc: 'Get alerts for unusually large spends' },
    { type: 'bill_reminder', label: 'Bill Reminders', desc: 'Upcoming bill and due-date reminders' },
    { type: 'recurring_due', label: 'Recurring Bills', desc: 'Alerts for recurring expenses due soon' },
    { type: 'sms_transaction', label: 'SMS Transactions', desc: 'Bank SMS transaction alerts' },
    { type: 'trade_executed', label: 'Trades', desc: 'Forex/stock/crypto trade confirmations' },
    { type: 'scan_complete', label: 'Receipt Scans', desc: 'Receipt and QR/Barcode scan results' },
    { type: 'wallet_update', label: 'Wallet Updates', desc: 'UPI wallet balance changes' },
    { type: 'info', label: 'General Info', desc: 'Informational updates and insights' },
  ];

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully! 📊');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your app preferences and data
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-6">
        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Application Information
            </CardTitle>
            <CardDescription>
              Details about the expense tracker application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-semibold">2.0.0</p>
              </div>
              <div>
                <p className="text-muted-foreground">Architecture</p>
                <p className="font-semibold">Serverless (Edge)</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">Currency</p>
                <Select value={currency.code} onValueChange={changeCurrency}>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code} className="text-xs">
                        {c.code} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-muted-foreground">AI/ML</p>
                <p className="font-semibold">TensorFlow.js</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                🚀 Serverless Features
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>✓ AWS Lambda-style serverless backend (Supabase Edge Functions)</li>
                <li>✓ DynamoDB-style NoSQL data storage</li>
                <li>✓ RESTful API Gateway with full CRUD operations</li>
                <li>✓ User authentication & session management</li>
                <li>✓ Multi-account bank management system</li>
                <li>✓ Real-time stock market trading platform</li>
                <li>✓ AI-powered expense categorization with ML</li>
                <li>✓ Live portfolio tracking & P&L calculation</li>
                <li>✓ Real-time data synchronization</li>
                <li>✓ Automated budget predictions & analytics</li>
                <li>✓ Receipt OCR processing capability</li>
                <li>✓ Export to CSV/JSON for data portability</li>
                <li>✓ Responsive design for all devices</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {notifTypeRows.map(row => (
                <div key={row.type} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`notif-${row.type}`}>{row.label}</Label>
                    <p className="text-sm text-muted-foreground">{row.desc}</p>
                  </div>
                  <Switch
                    id={`notif-${row.type}`}
                    checked={prefs.enabledTypes.includes(row.type)}
                    onCheckedChange={() => toggleType(row.type)}
                  />
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop-notifs">Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show browser notifications when allowed
                  </p>
                </div>
                <Switch
                  id="desktop-notifs"
                  checked={prefs.desktopEnabled}
                  onCheckedChange={() => updatePrefs({ desktopEnabled: !prefs.desktopEnabled })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-notifs">Notification Sound</Label>
                  <p className="text-sm text-muted-foreground">
                    Play a short sound with new alerts
                  </p>
                </div>
                <Switch
                  id="sound-notifs"
                  checked={prefs.soundEnabled}
                  onCheckedChange={() => updatePrefs({ soundEnabled: !prefs.soundEnabled })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dnd">Do Not Disturb</Label>
                  <p className="text-sm text-muted-foreground">
                    Silence desktop alerts during quiet hours
                  </p>
                </div>
                <Switch
                  id="dnd"
                  checked={prefs.dndEnabled}
                  onCheckedChange={() => updatePrefs({ dndEnabled: !prefs.dndEnabled })}
                />
              </div>

              {prefs.dndEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="dnd-start">Quiet Hours Start</Label>
                    <Input
                      id="dnd-start"
                      type="time"
                      value={prefs.dndStart}
                      onChange={(e) => updatePrefs({ dndStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dnd-end">Quiet Hours End</Label>
                    <Input
                      id="dnd-end"
                      type="time"
                      value={prefs.dndEnd}
                      onChange={(e) => updatePrefs({ dndEnd: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => requestNotificationPermission()}>
                  Request Browser Permission
                </Button>
                <p className="text-xs text-muted-foreground">
                  Permission status: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="size-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Export and manage your expense data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button onClick={handleExport} className="w-full gap-2">
                <Download className="size-4" />
                Export All Data (JSON)
              </Button>
              <p className="text-xs text-muted-foreground">
                Download all your expenses and budgets in JSON format
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Your data protection and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                🔒 Data Security
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>✓ All data encrypted in transit (HTTPS)</li>
                <li>✓ Serverless architecture (Supabase)</li>
                <li>✓ No data sharing with third parties</li>
                <li>✓ Secure cloud storage</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                ⚠️ <strong>Note:</strong> This is a prototype application. For production use with sensitive financial data, additional security measures and compliance certifications would be required.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Advanced AI-powered expense tracker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is an advanced serverless expense tracking application built with:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-semibold mb-1">Frontend</p>
                <p className="text-xs text-muted-foreground">React, TypeScript, Tailwind CSS</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-semibold mb-1">Backend</p>
                <p className="text-xs text-muted-foreground">Supabase Edge Functions</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-semibold mb-1">Database</p>
                <p className="text-xs text-muted-foreground">PostgreSQL (Supabase)</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-semibold mb-1">AI/ML</p>
                <p className="text-xs text-muted-foreground">TensorFlow.js, Custom Algorithms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
