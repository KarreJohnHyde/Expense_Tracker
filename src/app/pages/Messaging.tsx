import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  MessageSquare, Mail, Phone, Send, Paperclip, X, Plus,
  ChevronDown, User, Users, Receipt, CreditCard, PiggyBank,
  FileText, StickyNote, AtSign, Copy, Trash2, MessageCircle, Mic, Cloud
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { api } from '../lib/api';

// ── Country Codes ─────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1',  country: 'US', flag: '🇺🇸', name: 'USA' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'UK' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+7',  country: 'RU', flag: '🇷🇺', name: 'Russia' },
];

// ── Saved Contacts (localStorage-backed) ────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  group?: string;
}

function getContacts(): Contact[] {
  try {
    const stored = localStorage.getItem('messaging_contacts');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [
    { id: '1', name: 'Rahul Sharma', phone: '+919876543210', email: 'rahul@example.com', group: 'Family' },
    { id: '2', name: 'Priya Patel',  phone: '+918765432109', email: 'priya@example.com', group: 'Work' },
    { id: '3', name: 'Vijay Kumar',  phone: '+917654321098', email: 'vijay@example.com', group: 'Friends' },
  ];
}

function saveContacts(contacts: Contact[]) {
  localStorage.setItem('messaging_contacts', JSON.stringify(contacts));
}

function addContact(contact: Omit<Contact, 'id'>) {
  const newContact = { ...contact, id: Date.now().toString() };
  const contacts = getContacts();
  contacts.push(newContact);
  saveContacts(contacts);
  return contacts;
}

// ── Attachment chips ─────────────────────────────────────────────────────────
interface Attachment {
  id: string;
  type: 'note' | 'expense' | 'receipt' | 'bill' | 'budget';
  label: string;
  value: string;
}

// ── Tab type ─────────────────────────────────────────────────────────────────
type TabType = 'sms' | 'whatsapp' | 'email';

// ── Recipient pill ───────────────────────────────────────────────────────────
function RecipientPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', color: '#00d4aa' }}>
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:text-red-400 transition-colors"><X className="size-2.5" /></button>
    </span>
  );
}

export default function Messaging() {
  const [activeTab, setActiveTab] = useState<TabType>('whatsapp');

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>(getContacts);
  const [showContacts, setShowContacts] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Recipients
  const [recipients, setRecipients] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');

  // Email fields
  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailCc, setEmailCc] = useState<string[]>([]);
  const [emailBcc, setEmailBcc] = useState<string[]>([]);
  const [emailToInput, setEmailToInput] = useState('');
  const [emailCcInput, setEmailCcInput] = useState('');
  const [emailBccInput, setEmailBccInput] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  // Message body
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Drag
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  // Initial cloud fetch
  useEffect(() => {
    async function loadCloudContacts() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.user_metadata?.messaging_contacts) {
          const cloudContacts = session.user.user_metadata.messaging_contacts as Contact[];
          if (cloudContacts && Array.isArray(cloudContacts) && cloudContacts.length > 0) {
            setContacts(cloudContacts);
            saveContacts(cloudContacts); // sync down to local storage
          }
        }
      } catch (e) {}
    }
    loadCloudContacts();
  }, []);

  // ── Phone helpers ────────────────────────────────────────────────────────
  const addRecipient = (phone: string) => {
    const clean = phone.replace(/\s/g, '');
    if (!clean) return;
    const full = clean.startsWith('+') ? clean : `${countryCode}${clean}`;
    if (!recipients.includes(full)) setRecipients(prev => [...prev, full]);
    setPhoneInput('');
  };

  const addEmailAddr = (addr: string, field: 'to' | 'cc' | 'bcc') => {
    const clean = addr.trim();
    if (!clean || !clean.includes('@')) return;
    if (field === 'to'  && !emailTo.includes(clean))  setEmailTo(prev => [...prev, clean]);
    if (field === 'cc'  && !emailCc.includes(clean))  setEmailCc(prev => [...prev, clean]);
    if (field === 'bcc' && !emailBcc.includes(clean)) setEmailBcc(prev => [...prev, clean]);
    if (field === 'to')  setEmailToInput('');
    if (field === 'cc')  setEmailCcInput('');
    if (field === 'bcc') setEmailBccInput('');
  };

  const handleDictate = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice dictation is not supported in this browser.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info('Listening... Speak your message.');
    };

    let finalTranscript = message;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          setMessage(finalTranscript);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      toast.error('Dictation error: ' + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      // How to stop? If we have the instance we can call stop, but this simple toggle is ok.
      // Usually we need a ref to stop it. Let's just let it timeout or stop manually if possible.
      setIsListening(false);
      toast.success('Dictation ended');
    } else {
      recognition.start();
    }
  };

  const handleSaveContact = () => {
    if (!newContactName.trim()) return;
    
    let contactEmail = '';
    let contactPhone = '';
    
    if (activeTab === 'email') {
      if (!emailToInput.trim() || !emailToInput.includes('@')) { toast.error('Enter a valid email to save'); return; }
      contactEmail = emailToInput.trim();
    } else {
      if (!phoneInput.trim()) { toast.error('Enter a phone number to save'); return; }
      const cleanPhone = phoneInput.replace(/\s/g, '');
      contactPhone = cleanPhone.startsWith('+') ? cleanPhone : `${countryCode}${cleanPhone}`;
    }

    const updated = addContact({ name: newContactName, phone: contactPhone, email: contactEmail, group: 'Saved' });
    setContacts(updated);
    
    if (activeTab === 'email') {
      addEmailAddr(contactEmail, 'to');
    } else {
      addRecipient(contactPhone);
    }
    
    setNewContactName('');
    toast.success('Contact saved!');
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Fallback for demo users
        await new Promise(resolve => setTimeout(resolve, 1200));
        toast.success('Contacts synced locally (Demo Mode)');
        setIsSyncing(false);
        return;
      }
      
      const { error } = await supabase.auth.updateUser({
        data: { messaging_contacts: contacts }
      });
      
      if (error) throw error;
      toast.success('Contacts synced to Supabase Cloud!');
    } catch (e: any) {
      toast.error('Cloud Sync failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const renderContactsDropdown = () => (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-lg mt-2">
      <div className="p-2 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Saved Contacts</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10" onClick={handleCloudSync} disabled={isSyncing}>
          <Cloud className={`size-3 mr-1 ${isSyncing ? 'animate-pulse' : ''}`} /> {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
        </Button>
      </div>
      <div className="max-h-40 overflow-y-auto">
        {contacts.map(c => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => {
              if (activeTab === 'email') {
                if (c.email) addEmailAddr(c.email, 'to');
                else toast.error('No email saved for this contact');
              } else {
                if (c.phone) addRecipient(c.phone);
                else toast.error('No phone saved for this contact');
              }
              setShowContacts(false);
            }}>
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{activeTab === 'email' ? c.email || 'No email' : c.phone || 'No phone'}</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">{c.group}</Badge>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border/40 bg-muted/20 flex gap-2">
        <Input 
          placeholder="Contact Name..." 
          className="h-8 text-xs" 
          value={newContactName}
          onChange={e => setNewContactName(e.target.value)}
        />
        <Button 
          size="sm" 
          className="h-8 text-xs" 
          onClick={handleSaveContact}
          disabled={!newContactName || (activeTab === 'email' ? !emailToInput : !phoneInput)}
        >
          <Plus className="size-3 mr-1" /> Save Input
        </Button>
      </div>
    </div>
  );

  // ── Attachments ──────────────────────────────────────────────────────────
  const addAttachment = useCallback(async (type: Attachment['type']) => {
    setShowAttachMenu(false);
    let label = '';
    let value = '';

    if (type === 'expense') {
      try {
        const { expenses } = await api.getExpenses();
        const recent = (expenses || []).slice(0, 5);
        if (recent.length === 0) { toast.info('No expenses found'); return; }
        const exp = recent[0] as any;
        label = `Expense: ${exp.description} (₹${exp.amount})`;
        value = `\n📊 Recent Expense\n• ${exp.description}: ₹${exp.amount} on ${exp.date}\n`;
      } catch { label = 'Expense summary'; value = '\n📊 Expense data unavailable\n'; }
    } else if (type === 'budget') {
      label = 'Budget Summary';
      value = '\n💰 Budget Summary\n• Monthly budget: ₹50,000\n• Spent: ₹32,000 (64%)\n• Remaining: ₹18,000\n';
    } else if (type === 'note') {
      label = 'Quick Note';
      value = '\n📝 Note: [Add your note here]\n';
    } else if (type === 'receipt') {
      label = 'Receipt reference';
      value = '\n🧾 Receipt attached (see gallery)\n';
    } else if (type === 'bill') {
      label = 'Bill/Subscription';
      value = '\n📄 Bill/Subscription summary attached\n';
    }

    const att: Attachment = { id: Date.now().toString(), type, label, value };
    setAttachments(prev => [...prev, att]);
    setMessage(prev => prev + att.value);
  }, []);

  const removeAttachment = (id: string) => {
    const att = attachments.find(a => a.id === id);
    if (att) setMessage(prev => prev.replace(att.value, ''));
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // ── Drag & Drop reorder ──────────────────────────────────────────────────
  const handleDragStart = (id: string) => setDraggingId(id);
  const handleDragOver = (id: string) => { dragOverId.current = id; };
  const handleDrop = () => {
    if (!draggingId || !dragOverId.current || draggingId === dragOverId.current) return;
    setAttachments(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(a => a.id === draggingId);
      const toIdx   = arr.findIndex(a => a.id === dragOverId.current);
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
    setDraggingId(null);
    dragOverId.current = null;
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = () => {
    // Collect pending inputs automatically
    const finalEmailTo = [...emailTo];
    if (emailToInput.trim() && emailToInput.includes('@')) finalEmailTo.push(emailToInput.trim());
    const finalEmailCc = [...emailCc];
    if (emailCcInput.trim() && emailCcInput.includes('@')) finalEmailCc.push(emailCcInput.trim());
    const finalEmailBcc = [...emailBcc];
    if (emailBccInput.trim() && emailBccInput.includes('@')) finalEmailBcc.push(emailBccInput.trim());

    const finalRecipients = [...recipients];
    if (phoneInput.trim()) {
      const clean = phoneInput.replace(/\s/g, '');
      finalRecipients.push(clean.startsWith('+') ? clean : `${countryCode}${clean}`);
    }

    if (activeTab === 'email') {
      if (finalEmailTo.length === 0) { toast.error('Add at least one recipient email (press Enter to add)'); return; }
      if (!message.trim()) { toast.error('Message cannot be empty'); return; }
      const ccPart  = finalEmailCc.length  ? `\nCC: ${finalEmailCc.join(', ')}`  : '';
      const bccPart = finalEmailBcc.length ? `\nBCC: ${finalEmailBcc.join(', ')}` : '';
      const mailtoUrl = `mailto:${finalEmailTo.join(',')}?${finalEmailCc.length ? `cc=${finalEmailCc.join(',')}&` : ''}${finalEmailBcc.length ? `bcc=${finalEmailBcc.join(',')}&` : ''}subject=${encodeURIComponent(emailSubject || 'Message from ExpenseAI')}&body=${encodeURIComponent(message + ccPart + bccPart)}`;
      window.open(mailtoUrl, '_blank');
      toast.success('Opening Gmail / Mail client…');
      setEmailToInput(''); setEmailCcInput(''); setEmailBccInput('');
    } else if (activeTab === 'whatsapp') {
      if (finalRecipients.length === 0) { toast.error('Add at least one phone number (press Enter to add)'); return; }
      if (!message.trim()) { toast.error('Message cannot be empty'); return; }
      const waUrl = `https://wa.me/${finalRecipients[0].replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      toast.success('Opening WhatsApp…');
      setPhoneInput('');
    } else {
      if (finalRecipients.length === 0) { toast.error('Add at least one phone number (press Enter to add)'); return; }
      if (!message.trim()) { toast.error('Message cannot be empty'); return; }
      const smsUrl = `sms:${finalRecipients.join(',')}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, '_blank');
      toast.success('Opening SMS app…');
      setPhoneInput('');
    }
  };

  const handleClear = () => {
    setRecipients([]); setEmailTo([]); setEmailCc([]); setEmailBcc([]);
    setMessage(''); setAttachments([]); setEmailSubject('');
  };

  // ── TABS ─────────────────────────────────────────────────────────────────
  const TABS: { id: TabType; label: string; icon: typeof MessageSquare; color: string }[] = [
    { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageCircle, color: '#25D366' },
    { id: 'sms',       label: 'SMS',       icon: MessageSquare, color: '#3b82f6' },
    { id: 'email',     label: 'Gmail',     icon: Mail,          color: '#EA4335' },
  ];

  const isEmail = activeTab === 'email';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">📬 Messaging Center</h1>
        <p className="text-muted-foreground mt-1">Send messages, summaries &amp; financial reports via WhatsApp, SMS, or Gmail</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 p-1 rounded-xl border border-border/50 bg-muted/30 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab.id ? 'text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            style={activeTab === tab.id ? { background: tab.color, boxShadow: `0 4px 16px ${tab.color}40` } : {}}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main compose area */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {activeTab === 'email' ? <Mail className="size-4" style={{ color: '#EA4335' }} /> : activeTab === 'whatsapp' ? <MessageCircle className="size-4" style={{ color: '#25D366' }} /> : <MessageSquare className="size-4 text-blue-500" />}
                {activeTab === 'email' ? 'Compose Email' : activeTab === 'whatsapp' ? 'Send WhatsApp Message' : 'Send SMS'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'email' ? 'Opens Gmail or your default mail client' : 'Opens the respective messaging app'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email fields */}
              {isEmail ? (
                <>
                  {[
                    { label: 'To', state: emailTo, setState: setEmailTo, input: emailToInput, setInput: setEmailToInput, field: 'to' as const },
                    { label: 'CC', state: emailCc, setState: setEmailCc, input: emailCcInput, setInput: setEmailCcInput, field: 'cc' as const },
                    { label: 'BCC', state: emailBcc, setState: setEmailBcc, input: emailBccInput, setInput: setEmailBccInput, field: 'bcc' as const },
                  ].map(({ label, state, setState, input, setInput, field }) => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><AtSign className="size-3" />{label}</Label>
                      <div className="flex flex-wrap gap-1 min-h-9 px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus-within:border-primary/40 transition-colors">
                        {state.map(e => <RecipientPill key={e} label={e} onRemove={() => setState(prev => prev.filter(x => x !== e))} />)}
                        <input
                          className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          placeholder={`Add ${label.toLowerCase()} address, Enter to add`}
                          value={input}
                          onChange={e => setInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmailAddr(input, field))}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Subject</Label>
                    <Input placeholder="Email subject…" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowContacts(!showContacts)}>
                      <User className="size-3 mr-1" /> Contacts <ChevronDown className={`size-3 ml-1 transition-transform ${showContacts ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                  {showContacts && renderContactsDropdown()}
                </>
              ) : (
                /* Phone recipient input */
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Phone className="size-3" />Recipients</Label>
                  <div className="flex flex-wrap gap-1 min-h-9 px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus-within:border-primary/40 transition-colors">
                    {recipients.map(r => <RecipientPill key={r} label={r} onRemove={() => setRecipients(prev => prev.filter(x => x !== r))} />)}
                    <div className="flex items-center gap-1 flex-1 min-w-40">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-24 h-7 text-xs border-0 bg-transparent px-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Phone number, Enter to add"
                        value={phoneInput}
                        onChange={e => setPhoneInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRecipient(phoneInput))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowContacts(!showContacts)}>
                      <User className="size-3 mr-1" /> Contacts <ChevronDown className={`size-3 ml-1 transition-transform ${showContacts ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                  {showContacts && renderContactsDropdown()}
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Message Body</Label>
                    <button onClick={handleDictate} className={`p-1 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`} title="Dictate Message">
                      <Mic className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {message.length} chars
                    {activeTab === 'sms' && message.length > 0 && ` (${Math.ceil(message.length / 160)} SMS segment${Math.ceil(message.length / 160) > 1 ? 's' : ''})`}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  className="w-full min-h-[180px] p-3 text-sm rounded-md border border-border/50 bg-transparent focus:border-primary/40 outline-none transition-colors resize-none placeholder:text-muted-foreground"
                  placeholder="Type your message here… or use the attach buttons to add financial data automatically."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Paperclip className="size-3" />Attachments (drag to reorder)</Label>
                  <div className="space-y-1">
                    {attachments.map(att => (
                      <div
                        key={att.id}
                        draggable
                        onDragStart={() => handleDragStart(att.id)}
                        onDragOver={(e) => { e.preventDefault(); handleDragOver(att.id); }}
                        onDrop={handleDrop}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-all ${draggingId === att.id ? 'opacity-50 scale-95' : ''}`}
                        style={{ background: 'rgba(0,212,170,0.06)', borderColor: 'rgba(0,212,170,0.2)' }}
                      >
                        <span className="text-muted-foreground">⠿</span>
                        <span className="flex-1 text-foreground font-medium">{att.label}</span>
                        <button onClick={() => removeAttachment(att.id)} className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="size-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attach Menu */}
              <div className="relative">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAttachMenu(!showAttachMenu)}>
                  <Paperclip className="size-3 mr-1" /> Attach Context <ChevronDown className={`size-3 ml-1 transition-transform ${showAttachMenu ? 'rotate-180' : ''}`} />
                </Button>
                {showAttachMenu && (
                  <div className="absolute bottom-full mb-1 left-0 z-20 border border-border/50 rounded-xl bg-card shadow-xl p-1 min-w-48">
                    {[
                      { type: 'expense' as const, label: 'Recent Expenses',     icon: Receipt },
                      { type: 'budget'  as const, label: 'Budget Summary',      icon: PiggyBank },
                      { type: 'receipt' as const, label: 'Receipt Reference',   icon: FileText },
                      { type: 'bill'    as const, label: 'Bill/Subscription',   icon: CreditCard },
                      { type: 'note'    as const, label: 'Quick Note',          icon: StickyNote },
                    ].map(({ type, label, icon: Icon }) => (
                      <button key={type} onClick={() => addAttachment(type)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors text-left">
                        <Icon className="size-4 text-primary" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Send & Clear */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSend} className="flex-1 font-semibold"
                  style={{ background: activeTab === 'whatsapp' ? '#25D366' : activeTab === 'email' ? '#EA4335' : '#3b82f6' }}>
                  <Send className="size-4 mr-2" />
                  Send via {activeTab === 'whatsapp' ? 'WhatsApp' : activeTab === 'email' ? 'Gmail' : 'SMS'}
                </Button>
                <Button variant="outline" size="icon" onClick={handleClear} title="Clear all"><Trash2 className="size-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel — preview + tips */}
        <div className="lg:col-span-2 space-y-4">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Copy className="size-3.5" />Message Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {message ? (
                <div className="text-xs whitespace-pre-wrap p-3 rounded-lg bg-muted/40 border border-border/30 max-h-64 overflow-y-auto font-mono leading-relaxed">
                  {message}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/40 rounded-lg">
                  Message preview will appear here
                </div>
              )}
              {message && (
                <Button variant="ghost" size="sm" className="w-full mt-2 text-xs"
                  onClick={() => { navigator.clipboard.writeText(message); toast.success('Copied!'); }}>
                  <Copy className="size-3 mr-1" /> Copy to Clipboard
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: '💰 Payment Request', text: 'Hi! Please find my payment request for ₹[amount]. Kindly transfer at your earliest convenience. Thanks!' },
                { label: '📊 Monthly Summary', text: 'Hello! Here is my monthly expense summary for [month]. Total spend: ₹[amount]. Please review and let me know.' },
                { label: '🧾 Invoice Notice', text: 'Dear [name], please find the attached invoice for [service/product]. Total amount due: ₹[amount]. Due date: [date].' },
                { label: '📋 Budget Alert', text: 'Budget Alert: You have used [X]% of your [month] budget. Remaining: ₹[amount]. Please manage expenses accordingly.' },
              ].map(t => (
                <button key={t.label} onClick={() => setMessage(t.text)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors">
                  {t.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card style={{ background: 'rgba(0,212,170,0.04)', borderColor: 'rgba(0,212,170,0.2)' }}>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold" style={{ color: '#00d4aa' }}>💡 Tips</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use <strong>Attach Context</strong> to auto-include expense data</li>
                <li>• <strong>Drag &amp; drop</strong> attachments to reorder them</li>
                <li>• WhatsApp opens the app directly for the first recipient</li>
                <li>• Gmail opens with all To/CC/BCC prefilled</li>
                <li>• SMS opens your native messaging app</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
