import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Webhook, Copy, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { auth } from '../lib/auth';

export default function Webhooks() {
  const user = auth.getCurrentUser();
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(
    user?.id ? `exp_${btoa(user.id).replace(/=/g, '')}_${Date.now().toString(36)}` : 'exp_demo_key_xyz123'
  );

  const [baseUrl, setBaseUrl] = useState('http://localhost:3001');

  useEffect(() => {
    fetch('http://localhost:3001/api/webhook-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.url) {
          setBaseUrl(data.url);
        }
      })
      .catch(() => {
        console.warn('Webhook server might not be running. Run: npm run webhook');
      });
  }, []);

  const webhookUrl = `${baseUrl}/v1/webhooks/sms-sync?token=${apiKey}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Webhook URL copied to clipboard!', { description: 'Paste this into your automation app.' });
    setTimeout(() => setCopied(false), 3000);
  };

  const regenerateKey = () => {
    setApiKey(`exp_${btoa(user?.id || 'demo').replace(/=/g, '')}_${Date.now().toString(36)}`);
    toast.success('Generated new Webhook security token');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Auto-Sync integrations</h1>
        <p className="text-muted-foreground">
          Automatically pull bank SMS and emails from your Android or iOS device in the background.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="size-5 text-primary" />
                Your Secret Sync URL
              </CardTitle>
              <CardDescription>
                Send a POST request with your SMS text to this endpoint to silently categorize it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook API Endpoint</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs text-muted-foreground bg-muted" />
                  <Button onClick={copyToClipboard} variant={copied ? "default" : "secondary"} className="shrink-0">
                    {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                Keep this URL secret. Anyone with this link can push expenses to your account.
              </p>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 py-3">
              <Button variant="ghost" size="sm" onClick={regenerateKey} className="text-muted-foreground">
                <RefreshCw className="size-3.5 mr-2" /> Regenerate Token
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>JSON Payload Format</CardTitle>
              <CardDescription>Format for pushing payloads automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto text-green-600 dark:text-green-400">
{`{
  "sender": "HP-HDFCBK",
  "text": "Rs.5000 debited from A/c XX1234 on 14-Aug.",
  "timestamp": "${new Date().toISOString()}"
}`}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="size-5" />
                How to setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">1. Download an Automation App</h4>
                <p>On Android, install apps like <strong>Tasker</strong> or <strong>MacroDroid</strong>. On iOS, use Apple's <strong>Shortcuts</strong> app.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">2. Create a Trigger</h4>
                <p>Set the trigger to "Incoming SMS" or "Incoming Email". Filter sender strictly to your bank headers (e.g. <i>HDFCBK, ICICI</i>).</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">3. Create the Action</h4>
                <p>Build an "HTTP Request" (POST action) using the unique Webhook link provided on the left.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
