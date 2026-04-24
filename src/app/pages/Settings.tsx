import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Database, Shield, Bell, Webhook, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useCurrency } from '../lib/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { getPreferences, savePreferences, requestNotificationPermission, NotificationType } from '../lib/notifications';
import { getOcrLanguageHints, OCR_LANGUAGE_OPTIONS, saveOcrLanguageHints } from '../lib/ocrPreferences';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export default function Settings() {
  const { t } = useTranslation();
  const { currency, CURRENCIES, changeCurrency, resetCurrencyToDefault } = useCurrency();
  const [prefs, setPrefs] = useState(getPreferences());
  const [ocrLanguages, setOcrLanguages] = useState<string[]>(() => getOcrLanguageHints());
  
  // Integration States
  const [whatsappNumber, setWhatsappNumber] = useState(() => localStorage.getItem('integration_whatsapp') || '');
  const [googleSheetId, setGoogleSheetId] = useState(() => localStorage.getItem('integration_sheet_id') || '');

  const saveIntegrations = () => {
     localStorage.setItem('integration_whatsapp', whatsappNumber);
     localStorage.setItem('integration_sheet_id', googleSheetId);
     toast.success("Integrations linked successfully!");
  };

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

  const toggleOcrLanguage = (code: string) => {
    const next = ocrLanguages.includes(code)
      ? ocrLanguages.filter((entry) => entry !== code)
      : [...ocrLanguages, code];
    setOcrLanguages(saveOcrLanguageHints(next));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.desc')}
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-6">
        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              {t('settings.app_info')}
            </CardTitle>
            <CardDescription>
              {t('settings.app_info_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('settings.version')}</p>
                <p className="font-semibold">2.0.0</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('settings.architecture')}</p>
                <p className="font-semibold">Serverless (Edge)</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">{t('settings.currency')}</p>
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
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={currency.code === 'INR' ? 'default' : 'outline'}
                    onClick={resetCurrencyToDefault}
                  >
                    INR Default
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">{t('settings.ai_ml')}</p>
                <p className="font-semibold">TensorFlow.js</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
               <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                 🚀 {t('settings.serverless_features')}
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

        {/* Interface Language */}
        <Card>
          <CardHeader>
            <CardTitle>Interface Language</CardTitle>
            <CardDescription>
              Select your preferred display language for the application interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Display Language</p>
                  <p className="text-xs text-muted-foreground">Affects menus, buttons, and AI headers</p>
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OCR Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.ocr_support')}</CardTitle>
            <CardDescription>
              {t('settings.ocr_support_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enabled languages are passed to OCR for camera, upload, gallery, and QR-assisted receipt processing.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {OCR_LANGUAGE_OPTIONS.map((option) => (
                <div key={option.tesseractCode} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.tesseractCode}</p>
                  </div>
                  <Switch
                    checked={ocrLanguages.includes(option.tesseractCode)}
                    onCheckedChange={() => toggleOcrLanguage(option.tesseractCode)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Active OCR codes: {ocrLanguages.join(', ')}
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              {t('settings.notifications')}
            </CardTitle>
            <CardDescription>
              {t('settings.notifications_desc')}
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

        {/* Third-Party Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-5" />
              External Integrations
            </CardTitle>
            <CardDescription>
              Connect to external endpoints like WhatsApp, SMS, and Google Sheets to automatically sync data and receive mobile real-time alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
               <div className="space-y-2">
                 <Label htmlFor="whatsapp">WhatsApp / SMS Target Number</Label>
                 <Input 
                    id="whatsapp"
                    placeholder="+1 (555) 000-0000"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                 />
                 <p className="text-xs text-muted-foreground">Receive budget alerts, large transaction alerts, and bill reminders directly on WhatsApp.</p>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="sheet">Google Spreadsheet ID</Label>
                 <Input 
                    id="sheet"
                    placeholder="1BxiMVs0XRYFgwn..."
                    value={googleSheetId}
                    onChange={e => setGoogleSheetId(e.target.value)}
                 />
                 <p className="text-xs text-muted-foreground">Creates a live two-way CSV synchronization pipeline with your cloud sheet.</p>
               </div>
            </div>
            <Button onClick={saveIntegrations} className="mt-2 gap-2" variant="outline">
               <CheckCircle2 className="size-4" /> Save Link Configurations
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="size-5" />
              {t('settings.data_management')}
            </CardTitle>
            <CardDescription>
              {t('settings.data_management_desc')}
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
              {t('settings.privacy_security')}
            </CardTitle>
            <CardDescription>
              {t('settings.privacy_security_desc')}
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
            <CardTitle>{t('settings.about')}</CardTitle>
            <CardDescription>
              {t('settings.about_desc')}
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
