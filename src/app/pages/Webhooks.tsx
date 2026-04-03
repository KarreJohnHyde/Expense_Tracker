import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Webhook, Copy, CheckCircle2, AlertCircle, RefreshCw, Layers,
  Activity, Send, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { auth } from '../lib/auth';

interface WebhookLog {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  status: string;
  token: string;
}

export default function Webhooks() {
  const user = auth.getCurrentUser();
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(
    user?.id ? `exp_${btoa(user.id).replace(/=/g, '')}_${Date.now().toString(36)}` : 'exp_demo_key_xyz123'
  );
  const [baseUrl, setBaseUrl] = useState('http://localhost:3001');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const webhookUrl = `${baseUrl}/v1/webhooks/sms-sync?token=${apiKey}`;

  const checkServerStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/webhook-info', { cache: 'no-store' });
      const data = await res.json();
      if (data && data.url) setBaseUrl(data.url);
      setServerStatus('online');
    } catch {
      setServerStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 15000); // re-check every 15s
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/webhook-logs', { cache: 'no-store' });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (showLogs) fetchLogs();
  }, [showLogs]);

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

  const testWebhook = async () => {
    if (serverStatus !== 'online') {
      toast.error('Webhook server is offline. Run: npm run webhook');
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'HP-HDFCBK',
          text: 'Rs.5000 debited from A/c XX1234 on 14-Aug. Avl Bal: Rs.23,456. If not done by you, call 1800-XXX-XXXX.',
          timestamp: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: `✅ Success! Log ID: ${data.id}` });
        toast.success('Test payload sent successfully!');
        if (showLogs) fetchLogs();
      } else {
        setTestResult({ success: false, message: data.error || 'Server returned an error' });
        toast.error('Webhook test failed');
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Could not reach server. Is it running?' });
      toast.error('Connection refused');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Auto-Sync Integrations</h1>
        <p className="text-muted-foreground">
          Automatically pull bank SMS and emails from your Android or iOS device in the background.
        </p>
      </div>

      {/* Status banner */}
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${
        serverStatus === 'online' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
          : serverStatus === 'offline' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : 'bg-muted border-border'
      }`}>
        {serverStatus === 'checking' && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {serverStatus === 'online' && <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />}
        {serverStatus === 'offline' && <div className="size-3 rounded-full bg-red-500" />}
        <p className="text-sm font-medium">
          Webhook Server:&nbsp;
          <span className={
            serverStatus === 'online' ? 'text-emerald-600 dark:text-emerald-400'
              : serverStatus === 'offline' ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground'
          }>
            {serverStatus === 'checking' ? 'Checking...' : serverStatus === 'online' ? 'Online & Tunneling via ngrok' : 'Offline — run: npm run webhook'}
          </span>
        </p>
        <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={checkServerStatus}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Secret Sync URL */}
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
                  <Button onClick={copyToClipboard} variant={copied ? 'default' : 'secondary'} className="shrink-0">
                    {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                Keep this URL secret. Anyone with this link can push expenses to your account.
              </p>

              {/* Test Webhook */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={testWebhook}
                  disabled={testLoading}
                >
                  {testLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {testLoading ? 'Sending test payload...' : 'Send Test SMS Payload'}
                </Button>
                {testResult && (
                  <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                    testResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {testResult.success ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
                    {testResult.message}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 py-3">
              <Button variant="ghost" size="sm" onClick={regenerateKey} className="text-muted-foreground">
                <RefreshCw className="size-3.5 mr-2" /> Regenerate Token
              </Button>
            </CardFooter>
          </Card>

          {/* JSON Payload Format */}
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

          {/* Webhook Logs */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowLogs(!showLogs)}>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Recent Webhook Logs
                  {logs.length > 0 && <Badge variant="secondary">{logs.length}</Badge>}
                </div>
                {showLogs ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </CardTitle>
            </CardHeader>
            {showLogs && (
              <CardContent className="space-y-2 pt-0">
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={logsLoading} className="text-xs h-7">
                    <RefreshCw className={`size-3 mr-1 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No webhooks received yet. Send a test!</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {logs.map(log => (
                      <div key={log.id} className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">{log.sender}</Badge>
                          <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-muted-foreground line-clamp-1">{log.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
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
                <p>On Android, install <strong>Tasker</strong> or <strong>MacroDroid</strong>. On iOS, use Apple's <strong>Shortcuts</strong> app.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">2. Create a Trigger</h4>
                <p>Set the trigger to "Incoming SMS". Filter sender strictly to your bank headers (e.g. <i>HDFCBK, ICICI</i>).</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">3. Create the HTTP Action</h4>
                <p>Build a <strong>POST</strong> action using your Secret Sync URL above with the JSON format shown.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">4. Test It</h4>
                <p>Click <strong>"Send Test SMS Payload"</strong> to verify the connection is working, then check Recent Logs.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span>☁️</span> AWS Architecture
              </p>
              <p className="text-xs text-muted-foreground">
                This app can deploy to AWS Lambda + DynamoDB + API Gateway. Check <code className="bg-muted px-1 rounded">aws-lambda/handler.py</code> in your repo for the serverless function code.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
