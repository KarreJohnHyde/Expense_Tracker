import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  QrCode,
  Download,
  Copy,
  Smartphone,
  Building2,
  IndianRupee,
  RefreshCw,
  Scan,
} from 'lucide-react';

// ── UPI app detection by VPA handle ──────────────────────────────────────────
interface UPIApp {
  id: string;
  name: string;
  handles: string[];
  color: string;
  bgColor: string;
  textColor: string;
  emoji: string;
  description: string;
}

const UPI_APPS_CONFIG: UPIApp[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    handles: ['@ybl', '@ibl', '@axl', '@ikwik'],
    color: '#5f259f',
    bgColor: '#f0e6ff',
    textColor: '#5f259f',
    emoji: '💜',
    description: 'PhonePe – India\'s Digital Payments Leader',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    handles: ['@okicici', '@okhdfcbank', '@okaxis', '@oksbi', '@okhdfcbank', '@timecosmos', '@rapl'],
    color: '#4285F4',
    bgColor: '#e8f0fe',
    textColor: '#1a73e8',
    emoji: '🔵',
    description: 'Google Pay – Fast & Secure Payments',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    handles: ['@paytm', '@ptyes', '@pthdfc', '@ptsbi', '@ptaxis', '@ptkotak'],
    color: '#00b9f1',
    bgColor: '#e6f9ff',
    textColor: '#007bb5',
    emoji: '💙',
    description: 'Paytm – India Ka Payment App',
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    handles: ['@upi', '@npci'],
    color: '#1a3c6b',
    bgColor: '#e8eef7',
    textColor: '#1a3c6b',
    emoji: '🇮🇳',
    description: 'BHIM – Bharat Interface for Money',
  },
  {
    id: 'amazonpay',
    name: 'Amazon Pay',
    handles: ['@apl', '@amazon'],
    color: '#FF9900',
    bgColor: '#fff3e0',
    textColor: '#e65c00',
    emoji: '🛒',
    description: 'Amazon Pay UPI',
  },
];

const GENERIC_APP: UPIApp = {
  id: 'generic',
  name: 'Generic UPI',
  handles: [],
  color: '#00d4aa',
  bgColor: '#e0faf4',
  textColor: '#007a5e',
  emoji: '💳',
  description: 'Generic UPI Payment',
};

function detectUPIApp(upiId: string): UPIApp {
  const lower = upiId.toLowerCase();
  for (const app of UPI_APPS_CONFIG) {
    if (app.handles.some(h => lower.endsWith(h))) return app;
  }
  return GENERIC_APP;
}

const UPI_APPS_SELECT = [
  { id: 'generic', name: 'Generic UPI', prefix: 'upi://pay' },
  { id: 'phonepe', name: 'PhonePe', prefix: 'upi://pay' },
  { id: 'gpay', name: 'Google Pay', prefix: 'upi://pay' },
  { id: 'paytm', name: 'Paytm', prefix: 'upi://pay' },
  { id: 'bhim', name: 'BHIM', prefix: 'upi://pay' },
  { id: 'cred', name: 'CRED', prefix: 'upi://pay' },
];

const BANK_TYPES = [
  { id: 'savings', name: 'Savings Account' },
  { id: 'current', name: 'Current Account' },
  { id: 'nre', name: 'NRE Account' },
  { id: 'nro', name: 'NRO Account' },
];

const BANK_HANDLES = [
  '@ybl', '@paytm', '@okhdfcbank', '@okicici', '@oksbi',
  '@axisbank', '@ibl', '@axl', '@upi', '@kotak',
];

// ── Branded QR frame renderer ────────────────────────────────────────────────
function BrandedQRDisplay({ qrDataUrl, app, upiId, payeeName, amount, bankType, selectedApp }: {
  qrDataUrl: string;
  app: UPIApp;
  upiId: string;
  payeeName: string;
  amount: string;
  bankType: string;
  selectedApp: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Branded frame */}
      <div
        className="relative p-4 rounded-3xl shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${app.bgColor} 0%, white 100%)`,
          border: `3px solid ${app.color}`,
          boxShadow: `0 8px 40px ${app.color}30`,
        }}
      >
        {/* App header */}
        <div
          className="flex items-center justify-center gap-2 mb-3 px-4 py-2 rounded-full text-sm font-bold"
          style={{ background: app.color, color: 'white' }}
        >
          <span className="text-base">{app.emoji}</span>
          <span>{app.name}</span>
        </div>

        {/* QR Code */}
        <div
          className="p-3 rounded-2xl inline-block"
          style={{ background: 'white', border: `2px solid ${app.color}40` }}
        >
          <img src={qrDataUrl} alt={`${app.name} QR Code`} className="w-56 h-56" />
        </div>

        {/* Scan label */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Scan className="size-3" style={{ color: app.color }} />
          <span className="text-xs font-semibold" style={{ color: app.color }}>Scan &amp; Pay</span>
        </div>

        {/* App logo mark (colored strip at bottom) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-3xl"
          style={{ background: `linear-gradient(to right, ${app.color}, ${app.color}88)` }}
        />
      </div>

      {/* Info */}
      <div className="space-y-1">
        {payeeName && <p className="font-bold text-lg">{payeeName}</p>}
        <Badge variant="outline" className="text-sm font-mono">{upiId}</Badge>
        {amount && (
          <p className="text-2xl font-bold" style={{ color: app.color }}>₹{parseFloat(amount).toLocaleString()}</p>
        )}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {BANK_TYPES.find(b => b.id === bankType)?.name}
          </Badge>
          <Badge className="text-xs" style={{ background: app.color, color: 'white' }}>
            {app.name}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{app.description}</p>
      </div>
    </div>
  );
}

// ── QR Scanner / Detector panel ───────────────────────────────────────────────
function QRDetector() {
  const [upiInput, setUpiInput] = useState('');
  const [detected, setDetected] = useState<UPIApp | null>(null);

  const detect = () => {
    const app = detectUPIApp(upiInput);
    setDetected(app);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="size-5 text-primary" />
          UPI App Identifier
        </CardTitle>
        <CardDescription>Paste a UPI ID or VPA to identify which app it belongs to</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. user@ybl or name@paytm"
            value={upiInput}
            onChange={e => setUpiInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && detect()}
            className="flex-1"
          />
          <Button onClick={detect}>Identify</Button>
        </div>

        {detected && (
          <div
            className="p-4 rounded-xl border-2 flex items-center gap-4"
            style={{ background: detected.bgColor, borderColor: detected.color }}
          >
            <div
              className="size-12 rounded-full flex items-center justify-center text-2xl shrink-0"
              style={{ background: detected.color }}
            >
              {detected.emoji}
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: detected.textColor }}>{detected.name}</p>
              <p className="text-sm text-muted-foreground">{detected.description}</p>
              {detected.handles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {detected.handles.map(h => (
                    <Badge key={h} variant="secondary" className="text-[10px] font-mono">{h}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Known apps quick reference */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Known UPI Apps</p>
          <div className="grid grid-cols-2 gap-2">
            {UPI_APPS_CONFIG.map(app => (
              <div
                key={app.id}
                className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:scale-[1.02] transition-transform"
                style={{ borderColor: `${app.color}40`, background: app.bgColor }}
                onClick={() => { setUpiInput(app.handles[0] ? `example${app.handles[0]}` : ''); }}
              >
                <span className="text-lg">{app.emoji}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: app.textColor }}>{app.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{app.handles.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function QRGenerator() {
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedApp, setSelectedApp] = useState('generic');
  const [bankType, setBankType] = useState('savings');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const detectedApp = upiId ? detectUPIApp(upiId) : GENERIC_APP;
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const generateQR = async () => {
    if (!upiId) {
      toast.error('Please enter a UPI ID');
      return;
    }

    setGenerating(true);
    try {
      let upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}`;
      if (payeeName) upiUrl += `&pn=${encodeURIComponent(payeeName)}`;
      if (amount && parseFloat(amount) > 0) upiUrl += `&am=${amount}`;
      if (note) upiUrl += `&tn=${encodeURIComponent(note)}`;
      upiUrl += `&cu=INR`;

      try {
        const QRCode = (await import('qrcode')).default;
        const app = detectUPIApp(upiId);
        const dataUrl = await QRCode.toDataURL(upiUrl, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H', // High correction for logo overlay
        });
        setQrDataUrl(dataUrl);
      } catch {
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUrl)}`;
        setQrDataUrl(apiUrl);
      }
      toast.success(`QR Code generated for ${detectedApp.name}!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `${detectedApp.id}-upi-qr-${upiId.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success('QR Code downloaded!');
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    toast.success('UPI ID copied!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">UPI QR Generator</h1>
        <p className="text-muted-foreground">Generate branded QR codes for PhonePe, Google Pay, Paytm &amp; more</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-5 text-primary" />
              Payment Details
              {upiId && (
                <Badge style={{ background: detectedApp.color, color: 'white' }} className="ml-auto">
                  {detectedApp.emoji} {detectedApp.name}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Enter your UPI or bank details to generate a branded QR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* UPI App */}
            <div className="space-y-2">
              <Label>UPI App / Platform</Label>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UPI_APPS_SELECT.map((app) => (
                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UPI ID */}
            <div className="space-y-2">
              <Label>UPI ID *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="username@bankhandle"
                  value={upiId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpiId(e.target.value)}
                  className="flex-1"
                  style={upiId ? { borderColor: detectedApp.color } : {}}
                />
                <Button variant="outline" size="icon" onClick={copyUpiId} title="Copy UPI ID">
                  <Copy className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {BANK_HANDLES.map((handle) => (
                  <button
                    key={handle}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 text-muted-foreground"
                    onClick={() => {
                      const base = upiId.split('@')[0] || '';
                      setUpiId(base + handle);
                    }}
                  >
                    {handle}
                  </button>
                ))}
              </div>
              {/* Live detection */}
              {upiId && (
                <div
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium"
                  style={{ background: detectedApp.bgColor, color: detectedApp.textColor }}
                >
                  <span>{detectedApp.emoji}</span>
                  <span>Detected: <strong>{detectedApp.name}</strong></span>
                  <span className="ml-auto opacity-70">{detectedApp.description}</span>
                </div>
              )}
            </div>

            {/* Payee Name */}
            <div className="space-y-2">
              <Label>Payee Name</Label>
              <Input
                placeholder="Your name or business name"
                value={payeeName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayeeName(e.target.value)}
              />
            </div>

            {/* Bank Account Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 className="size-3" /> Account Type
              </Label>
              <Select value={bankType} onValueChange={setBankType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BANK_TYPES.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <IndianRupee className="size-3" /> Amount (optional)
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Transaction Note (optional)</Label>
              <Input
                placeholder="Payment for..."
                value={note}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={generateQR} disabled={generating}
              style={upiId ? { background: detectedApp.color } : {}}>
              {generating ? (
                <><RefreshCw className="size-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><QrCode className="size-4 mr-2" /> Generate {detectedApp.name} QR Code</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* QR Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              QR Code Preview
            </CardTitle>
            <CardDescription>Branded QR code with app-specific design</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px]" ref={qrContainerRef}>
            {qrDataUrl ? (
              <div className="space-y-4 w-full">
                <BrandedQRDisplay
                  qrDataUrl={qrDataUrl}
                  app={detectedApp}
                  upiId={upiId}
                  payeeName={payeeName}
                  amount={amount}
                  bankType={bankType}
                  selectedApp={selectedApp}
                />
                <Button onClick={downloadQR} className="w-full">
                  <Download className="size-4 mr-2" /> Download Branded PNG
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="size-24 mx-auto mb-4 opacity-15" />
                <p className="font-medium">No QR code generated yet</p>
                <p className="text-sm mt-1">Fill in the details and click Generate</p>
                {/* App preview chips */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {UPI_APPS_CONFIG.map(app => (
                    <span key={app.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={{ background: app.bgColor, color: app.textColor, border: `1px solid ${app.color}30` }}>
                      {app.emoji} {app.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR App Identifier */}
      <QRDetector />
    </div>
  );
}
