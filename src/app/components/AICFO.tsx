import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, ChevronUp, ChevronDown, Cpu, Sparkles, Brain, TrendingUp, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { advancedAI } from '@/lib/advancedAIService';
// import { useML } from '@/lib/hooks/useML'; // Temporarily disabled due to build issues
import { auth } from '../lib/auth';

export function AICFO({ isCompact = false }: { isCompact?: boolean }) {
  const { formatCurrency } = useCurrency();
  // const { mlInsights, isLoading: mlLoading } = useML(); // Temporarily disabled
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
    { role: 'ai', text: 'Hello! I am your Advanced AI CFO with deep learning capabilities. I can analyze your spending patterns, provide financial forecasts, detect anomalies, and offer personalized recommendations. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiMode, setAiMode] = useState<'basic' | 'advanced'>('advanced');
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
      if (aiMode === 'advanced' && auth.getCurrentUser()) {
        // Use advanced AI with GPT-4 and ML insights
        const db = await api.getExpenses();
        const expenses = db.expenses || [];
        const user = auth.getCurrentUser();

        const context = {
          userId: user?.id || 'anonymous',
          expenses: expenses,
          mlInsights: {} // TODO: Integrate with ML insights when available
        };

        const response = await advancedAI.chat(userMsg, context);

        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'ai', text: response.response }]);
          setIsTyping(false);
        }, 500);

      } else {
        // Fallback to basic rule-based responses
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
      }

    } catch (err) {
        console.error('AI Error:', err);
        setMessages(prev => [...prev, { role: 'ai', text: 'I encountered an error while analyzing your request. Please try again.' }]);
        setIsTyping(false);
    }
  };

  return (
    <>
      {!isCompact && (
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
      )}

      {isCompact ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-full rounded-lg bg-gradient-to-br from-primary/90 to-primary/70 hover:from-primary to-primary/80 flex items-center justify-center transition-all hover:scale-105 shadow-md hover:shadow-lg"
          title="AI Financial Assistant"
        >
          <Sparkles className="size-5 text-white" />
        </button>
      ) : null}

      <AnimatePresence>
        {isOpen && (
           <motion.div 
             initial={{ opacity: 0, y: 50, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 50, scale: 0.9 }}
             className={`fixed z-50 ${
               isCompact 
                 ? 'top-20 right-4 w-80 sm:w-96' 
                 : 'bottom-6 left-6 w-80 sm:w-96'
             } h-[500px] max-h-[80vh] bg-card border shadow-2xl rounded-2xl flex flex-col overflow-hidden`}
           >
              {/* Header */}
              <div className="gradient-primary p-4 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center gap-2">
                     <div className="p-1.5 bg-white/20 rounded-lg">
                        <Bot className="size-5" />
                     </div>
                     <div>
                        <h3 className="font-bold text-sm leading-none flex items-center gap-2">
                          {aiMode === 'advanced' ? 'Advanced AI CFO' : 'AI CFO'}
                          {aiMode === 'advanced' && <Brain className="size-4" />}
                        </h3>
                        <p className="text-[10px] text-white/80 flex items-center gap-1 mt-1">
                          <Sparkles className="size-3"/>
                          {aiMode === 'advanced' ? 'GPT-4 + ML Analysis' : 'Quick Analysis'}
                        </p>
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
                     { label: 'Deep Analysis 🧠', text: 'Provide a comprehensive analysis of my spending patterns and financial health', icon: Brain },
                     { label: 'Budget Plan 📋', text: 'Create a personalized budget plan based on my spending history', icon: Target },
                     { label: 'Anomaly Check 🚨', text: 'Check for any unusual or suspicious spending patterns', icon: AlertTriangle },
                     { label: 'Financial Forecast 🔮', text: 'Predict my spending trends and provide financial recommendations', icon: TrendingUp },
                     { label: 'Smart Insights 💡', text: 'Give me behavioral finance insights and optimization opportunities', icon: Lightbulb },
                     { label: 'Category Deep Dive 📊', text: 'Analyze spending by category with trends and recommendations', icon: TrendingUp }
                   ].map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => { setInput(chip.text); }}
                        className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary transition-colors flex items-center gap-1"
                      >
                        <chip.icon className="size-3" />
                        {chip.label}
                      </button>
                   ))}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex gap-2">
                    <select
                      value={aiMode}
                      onChange={(e) => setAiMode(e.target.value as 'basic' | 'advanced')}
                      className="text-xs px-2 py-1 rounded border bg-background"
                    >
                      <option value="advanced">🧠 Advanced AI</option>
                      <option value="basic">⚡ Quick Mode</option>
                    </select>
                    <Input
                      placeholder="Ask anything about your finances..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      className="flex-1"
                    />
                  </div>
                  <Button size="icon" onClick={handleSend} disabled={!input.trim() || isTyping}>
                    <Send className="size-4" />
                  </Button>
                </div>
                {false && ( // TODO: Re-enable when ML is integrated
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Brain className="size-3 animate-pulse" />
                    AI models analyzing your data...
                  </div>
                )}
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
