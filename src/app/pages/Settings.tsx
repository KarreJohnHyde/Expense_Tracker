import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Database, Shield, Bell } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useCurrency } from '../lib/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Settings() {
  const { currency, CURRENCIES, changeCurrency } = useCurrency();

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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-alerts">Budget Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when approaching budget limits
                </p>
              </div>
              <Switch id="budget-alerts" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="insights">AI Insights</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly spending insights
                </p>
              </div>
              <Switch id="insights" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="unusual">Unusual Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Alert for unusual spending patterns
                </p>
              </div>
              <Switch id="unusual" defaultChecked />
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