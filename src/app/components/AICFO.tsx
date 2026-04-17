import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, ChevronUp, ChevronDown, Cpu, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function AICFO() {
  const { formatCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
    { role: 'ai', text: 'Hello! I am your AI CFO. Ask me anything about your expenses, budgets, or trends.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
        const db = await api.getExpenses();
        const expenses = db.expenses || [];
        
        let aiResponse = "I'm still analyzing your query.";
        
        const q = userMsg.toLowerCase();
        
        // Date range helpers
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        if (q.includes('audit')) {
            const { runReconciliationAudit } = await import('../lib/reconciliation');
            const audit = await runReconciliationAudit();
            const verifiedCount = audit.matches.length;
            const totalCount = expenses.length;
            const score = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 100;

            aiResponse = `🧐 **Financial Integrity Audit:**\n\n• **Trust Score**: ${score.toFixed(0)}%\n• **Verified**: ${verifiedCount}\n• **Missing Evidence**: ${audit.unverified.length}\n\n`;
            
            if (audit.unverified.length > 0) {
                aiResponse += `High-priority items needing receipts:\n- ${audit.unverified[0].description} (₹${audit.unverified[0].amount})`;
            } else {
                aiResponse += `Excellent! All records are backed by evidence. 🏆`;
            }
        } else if (q.includes('how much') || q.includes('total') || q.includes('spend')) {
           let total = 0;
           let categoryFilter = '';
           let dateFilter: (d: string) => boolean = () => true;

           // Time Window detection
           if (q.includes('this month')) {
               dateFilter = (d) => new Date(d) >= startOfMonth;
           } else if (q.includes('last 7 days') || q.includes('last week')) {
               dateFilter = (d) => new Date(d) >= sevenDaysAgo;
           } else if (q.includes('today')) {
               dateFilter = (d) => new Date(d).toDateString() === now.toDateString();
           }
           
           if (q.includes('food')) categoryFilter = 'Food & Dining';
           else if (q.includes('transport') || q.includes('uber')) categoryFilter = 'Transportation';
           else if (q.includes('shop') || q.includes('amazon')) categoryFilter = 'Shopping';
           else if (q.includes('entertain') || q.includes('netflix')) categoryFilter = 'Entertainment';

           const filtered = expenses.filter((e:any) => {
               const matchesCat = categoryFilter ? e.category === categoryFilter : true;
               const matchesDate = dateFilter(e.date);
               return matchesCat && matchesDate;
           });

           total = filtered.reduce((sum:number, e:any) => sum + e.amount, 0);

           let timeLabel = q.includes('month') ? 'this month' : q.includes('week') || q.includes('7 days') ? 'in the last 7 days' : q.includes('today') ? 'today' : 'historically';
           
           if (categoryFilter) {
               aiResponse = `You have spent ${formatCurrency(total)} on ${categoryFilter} ${timeLabel}.`;
           } else {
               aiResponse = `Your total spending ${timeLabel} is ${formatCurrency(total)} across ${filtered.length} transactions.`;
           }
        } 
        else if (q.includes('summary') || q.includes('overview') || q.includes('report')) {
            const thisMonth = expenses.filter((e:any) => new Date(e.date) >= startOfMonth);
            const total = thisMonth.reduce((sum:number, e:any) => sum + e.amount, 0);
            aiResponse = `Here is your current Month Summary:\n• Total Spend: ${formatCurrency(total)}\n• Transactions: ${thisMonth.length}\n• Top Category: ${thisMonth.length > 0 ? [...new Set(thisMonth.map((e:any) => e.category))].sort((a,b) => thisMonth.filter((x:any) => x.category === b).length - thisMonth.filter((x:any) => x.category === a).length)[0] : 'None'}`;
        }
        else if (q.includes('highest') || q.includes('biggest') || q.includes('most expensive')) {
            if (expenses.length === 0) {
                aiResponse = "You haven't recorded any expenses yet.";
            } else {
                const max = expenses.reduce((prev:any, current:any) => (prev.amount > current.amount) ? prev : current);
                aiResponse = `Your most expensive recorded transaction was ${formatCurrency(max.amount)} for "${max.description}" on ${max.date}.`;
            }
        } 
        else if (q.includes('hi') || q.includes('hello')) {
            aiResponse = "Greetings! I'm ready to run financial analysis algorithms. What do you need to know?";
        }
        else {
            aiResponse = "Based on my semantic analysis of your database, I couldn't find an exact match for that metric. Try asking for your 'total spending' or 'highest transaction'.";
        }

        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
            setIsTyping(false);
        }, 800); // simulate LLM thinking

    } catch (err) {
        setMessages(prev => [...prev, { role: 'ai', text: 'Error accessing database context.' }]);
        setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="fixed bottom-6 left-6 z-40 size-14 rounded-full gradient-primary shadow-xl hover:shadow-primary/40 flex items-center justify-center transition-all hover:scale-110"
            >
              <Cpu className="size-6 text-white" />
            </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
           <motion.div 
             initial={{ opacity: 0, y: 50, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 50, scale: 0.9 }}
             className="fixed bottom-6 left-6 z-50 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-card border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
           >
              {/* Header */}
              <div className="gradient-primary p-4 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center gap-2">
                     <div className="p-1.5 bg-white/20 rounded-lg">
                        <Bot className="size-5" />
                     </div>
                     <div>
                        <h3 className="font-bold text-sm leading-none">AI CFO</h3>
                        <p className="text-[10px] text-white/80 flex items-center gap-1 mt-1"><Sparkles className="size-3"/> Connected to DB</p>
                     </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-md transition-colors"><ChevronDown className="size-5" /></button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30" ref={scrollRef}>
                 {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-background border rounded-tl-sm'}`}>
                            {msg.text}
                        </div>
                    </div>
                 ))}
                 {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-background border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                           <span className="size-1.5 bg-primary/50 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                           <span className="size-1.5 bg-primary/50 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                           <span className="size-1.5 bg-primary/50 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                        </div>
                    </div>
                 )}
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-card">
                <div className="flex flex-wrap gap-2 mb-3">
                   {[
                     { label: 'Summary 📊', text: 'Give me a summary report' },
                     { label: 'Audit 🧐', text: 'Audit my month' },
                     { label: 'Last 7 Days 📅', text: 'How much did I spend last 7 days?' },
                     { label: 'Forecast 🔮', text: 'What is my month-end forecast?' }
                   ].map((chip) => (
                      <button 
                        key={chip.label} 
                        onClick={() => { setInput(chip.text); }}
                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary transition-colors"
                      >
                        {chip.label}
                      </button>
                   ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask anything about your expenses..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
