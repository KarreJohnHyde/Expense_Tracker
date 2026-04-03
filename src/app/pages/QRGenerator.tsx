import { useState } from 'react';
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
} from 'lucide-react';

const UPI_APPS = [
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

export default function QRGenerator() {
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedApp, setSelectedApp] = useState('generic');
  const [bankType, setBankType] = useState('savings');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateQR = async () => {
    if (!upiId) {
      toast.error('Please enter a UPI ID');
      return;
    }

    setGenerating(true);
    try {
      // Build UPI URL
      let upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}`;
      if (payeeName) upiUrl += `&pn=${encodeURIComponent(payeeName)}`;
      if (amount && parseFloat(amount) > 0) upiUrl += `&am=${amount}`;
      if (note) upiUrl += `&tn=${encodeURIComponent(note)}`;
      upiUrl += `&cu=INR`;

      // Try to use qrcode library, fallback to API
      try {
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(upiUrl, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch {
        // Fallback: use free QR API
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUrl)}`;
        setQrDataUrl(apiUrl);
      }
      toast.success('QR Code generated!');
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
    link.download = `upi-qr-${upiId.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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
        <p className="text-muted-foreground">Generate QR codes for UPI payments and net banking</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-5 text-primary" />
              Payment Details
            </CardTitle>
            <CardDescription>Enter your UPI or bank details to generate a QR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* UPI App */}
            <div className="space-y-2">
              <Label>UPI App / Platform</Label>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UPI_APPS.map((app) => (
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

            <Button className="w-full" onClick={generateQR} disabled={generating}>
              {generating ? (
                <><RefreshCw className="size-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><QrCode className="size-4 mr-2" /> Generate QR Code</>
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
            <CardDescription>Scan this QR code with any UPI app to pay</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
            {qrDataUrl ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-white rounded-2xl shadow-lg inline-block">
                  <img src={qrDataUrl} alt="UPI QR Code" className="w-64 h-64" />
                </div>

                <div className="space-y-1">
                  {payeeName && <p className="font-semibold text-lg">{payeeName}</p>}
                  <Badge variant="outline" className="text-sm">{upiId}</Badge>
                  {amount && (
                    <p className="text-2xl font-bold text-primary">₹{parseFloat(amount).toLocaleString()}</p>
                  )}
                  <Badge variant="secondary" className="text-xs mt-1">
                    {BANK_TYPES.find(b => b.id === bankType)?.name} • {UPI_APPS.find(a => a.id === selectedApp)?.name}
                  </Badge>
                </div>

                <Button onClick={downloadQR} className="w-full">
                  <Download className="size-4 mr-2" /> Download PNG
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="size-24 mx-auto mb-4 opacity-15" />
                <p className="font-medium">No QR code generated yet</p>
                <p className="text-sm mt-1">Fill in the details and click Generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
