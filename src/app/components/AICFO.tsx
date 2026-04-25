import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, X, Cpu, Sparkles, Brain, TrendingUp,
  AlertTriangle, Target, Lightbulb, RefreshCw, ChevronDown,
  BarChart2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { processLocalAI } from '@/lib/localAIEngine';

// ─── Markdown-style renderer ─────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      elements.push(
        <p key={i} className="font-bold text-primary text-sm mt-2 mb-1 flex items-center gap-1.5">
          {line.replace('## ', '')}
        </p>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <p key={i} className="font-semibold text-foreground text-xs mt-2 mb-0.5">
          {line.replace('### ', '')}
        </p>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.replace(/^[-*] /, '');
      elements.push(
        <p key={i} className="text-xs text-muted-foreground pl-2 flex gap-1.5 items-start">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
        </p>
      );
    } else if (/^\d+\. /.test(line)) {
      const content = line.replace(/^\d+\. /, '');
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <p key={i} className="text-xs text-muted-foreground pl-2 flex gap-1.5 items-start">
          <span className="text-primary font-bold mt-0.5 shrink-0">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
        </p>
      );
    } else if (line.startsWith('`') && line.endsWith('`')) {
      elements.push(
        <code key={i} className="block text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground overflow-x-auto">
          {line.replace(/`/g, '')}
        </code>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-xs text-foreground/90 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
  });
  return <div className="space-y-0.5">{elements}</div>;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/_(.+?)_/g, '<em class="text-muted-foreground">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-[10px] font-mono">$1</code>');
}

// ─── Quick chips ──────────────────────────────────────────────────────────────
const CHIPS = [
  { label: 'Deep Analysis', text: 'Deep analysis of my spending patterns', icon: Brain },
  { label: 'Budget Plan', text: 'Build me a personalized budget plan', icon: Target },
  { label: 'Anomaly Check', text: 'Check for anomalies and suspicious charges', icon: AlertTriangle },
  { label: 'Forecast', text: 'Forecast my spending for next month', icon: TrendingUp },
  { label: 'Behavioral', text: 'Behavioral finance insights and impulse analysis', icon: Lightbulb },
  { label: 'Categories', text: 'Category deep dive analysis', icon: BarChart2 },
  { label: 'This Month', text: 'How much have I spent this month?', icon: Zap },
  { label: 'Trust Score', text: 'Run a financial integrity audit', icon: RefreshCw },
];

// ─── Component ───────────────────────────────────────────────────────────────
interface Message {
  role: 'ai' | 'user';
  text: string;
  ts: Date;
}

const WELCOME: Message = {
  role: 'ai',
  text: `👋 Hello! I'm your **AI CFO** — fully local, instant analysis, no internet needed.\n\nTap a chip below or ask me anything about your finances!`,
  ts: new Date(),
};

export function AICFO({ isCompact = false }: { isCompact?: boolean }) {
  const { formatCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // suppress unused warning
  void formatCurrency;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideText?: string) => {
    const userMsg = (overrideText ?? input).trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, ts: new Date() }]);
    setIsTyping(true);

    try {
      const db = await api.getExpenses();
      const expenses = db.expenses || [];

      // Small delay for UX
      await new Promise(r => setTimeout(r, 400));
      const response = processLocalAI(userMsg, expenses as any);

      setMessages(prev => [...prev, { role: 'ai', text: response, ts: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: '⚠️ Couldn\'t load expense data. Please make sure you have expenses recorded.',
        ts: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => setMessages([WELCOME]);

  return (
    <>
      {/* ── Floating trigger (non-compact / mobile) ── */}
      {!isCompact && (
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="fixed bottom-24 right-4 z-50 size-14 rounded-full gradient-primary shadow-xl hover:shadow-primary/40 flex items-center justify-center transition-all hover:scale-110"
            >
              <Cpu className="size-6 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* ── Compact trigger (desktop top-bar) ── */}
      {isCompact && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-full rounded-lg bg-gradient-to-br from-primary/90 to-primary/70 hover:from-primary to-primary/80 flex items-center justify-center transition-all hover:scale-105 shadow-md hover:shadow-lg"
          title="AI Financial Assistant"
        >
          <Sparkles className="size-5 text-white" />
        </button>
      )}

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            className={`fixed z-50 flex flex-col bg-card border shadow-2xl rounded-2xl overflow-hidden ${
              isCompact
                ? 'top-20 right-4 w-80 sm:w-[400px]'
                : 'bottom-24 right-2 left-2 sm:left-auto sm:right-6 sm:w-[400px]'
            } h-[560px] max-h-[85vh]`}
          >
            {/* Header */}
            <div className="gradient-primary px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Bot className="size-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-none flex items-center gap-1.5">
                    AI CFO <Brain className="size-3.5 opacity-80" />
                  </h3>
                  <p className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5">
                    <Sparkles className="size-2.5" /> Local · Instant · Private
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white/70 hover:text-white"
                  title="Clear chat"
                >
                  <RefreshCw className="size-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white/70 hover:text-white"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-muted/20"
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="size-6 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5 mr-2">
                      <Bot className="size-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm text-xs'
                        : 'bg-background border rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'ai' ? renderMarkdown(msg.text) : <span className="text-xs">{msg.text}</span>}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start items-center gap-2">
                  <div className="size-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <Bot className="size-3.5 text-white" />
                  </div>
                  <div className="bg-background border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                    <span className="size-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="size-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="size-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick chips */}
            <div className="px-3 pt-2 pb-1 border-t bg-card">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => handleSend(chip.text)}
                    disabled={isTyping}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-primary/8 hover:bg-primary/15 border border-primary/20 text-primary whitespace-nowrap transition-colors disabled:opacity-50 shrink-0"
                  >
                    <chip.icon className="size-2.5" />
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-1 bg-card flex gap-2 items-center">
              <Input
                placeholder="Ask about your finances..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isTyping && handleSend()}
                className="flex-1 text-sm h-9"
                disabled={isTyping}
              />
              <Button
                size="icon"
                className="size-9 shrink-0"
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
