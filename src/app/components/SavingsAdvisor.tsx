import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useCurrency } from '../lib/currency';
import {
  Heart, Brain, Lightbulb, ArrowRight, Wallet,
  TrendingUp, TrendingDown, Target, Sparkles,
  ChevronRight, Shield, Zap, PiggyBank
} from 'lucide-react';

interface Expense {
  amount: number;
  category: string;
  date: string;
}

interface SavingsAdvisorProps {
  expenses: Expense[];
}

/* ── Animated Gauge Ring (SVG) ──────────────────────────────────────────── */
function GaugeRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const targetOffset = circumference - (score / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedOffset(targetOffset), 100);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const getColor = () => {
    if (score > 80) return { stroke: '#10b981', glow: 'rgba(16,185,129,0.35)' };
    if (score > 60) return { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.35)' };
    return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.35)' };
  };
  const { stroke, glow } = getColor();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stroke} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="currentColor" className="text-foreground/10"
          strokeWidth="8" fill="none"
        />
        {/* Animated score arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth="8" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          filter="url(#gaugeGlow)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        {/* Decorative dots */}
        {[0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            cx={size / 2 + radius * Math.cos((deg * Math.PI) / 180)}
            cy={size / 2 + radius * Math.sin((deg * Math.PI) / 180)}
            r="2" fill={stroke} opacity={0.4}
          />
        ))}
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color: stroke }}>{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/60 mt-0.5">Score</span>
      </div>
      {/* Glow effect behind */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl -z-10"
        style={{ background: glow }}
      />
    </div>
  );
}

/* ── Animated Progress Bar ──────────────────────────────────────────────── */
function AnimatedBar({
  percent, color, label, delay = 0
}: { percent: number; color: string; label: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(Math.min(percent, 100)), 200 + delay);
    return () => clearTimeout(timer);
  }, [percent, delay]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold text-foreground/80">{label}</span>
        <span className="font-bold" style={{ color }}>{percent.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="absolute inset-0 rounded-full opacity-40"
            style={{
              background: `linear-gradient(90deg, transparent 60%, rgba(255,255,255,0.3))`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Pulsing Dot ────────────────────────────────────────────────────────── */
function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export function SavingsAdvisor({ expenses }: SavingsAdvisorProps) {
  const { formatCurrency } = useCurrency();
  const now = new Date();
  const [showTip, setShowTip] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState(0);

  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 50/30/20 heuristic
  const needs = monthlyExpenses
    .filter(e => ['Bills & Utilities', 'Transportation', 'Food & Dining'].includes(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const wants = monthlyExpenses
    .filter(e => ['Shopping', 'Entertainment', 'Others'].includes(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const goodSpend = monthlyExpenses
    .filter(e => ['Investments & Savings'].includes(e.category))
    .reduce((s, e) => s + e.amount, 0);

  const needsPercent = totalSpent > 0 ? (needs / totalSpent) * 100 : 0;
  const wantsPercent = totalSpent > 0 ? (wants / totalSpent) * 100 : 0;
  const savingsPercent = totalSpent > 0 ? (goodSpend / totalSpent) * 100 : 0;

  let healthScore = 100;
  if (needsPercent > 60) healthScore -= 20;
  if (wantsPercent > 40) healthScore -= 15;
  if (goodSpend === 0) healthScore -= 10;

  const getAdvice = () => {
    if (wantsPercent > 40) return {
      title: "Target the 'Wants'",
      message: "Your discretionary spending is high. Try implementing a 48-hour rule for non-essential purchases.",
      icon: Target, iconColor: '#f59e0b'
    };
    if (needsPercent > 60) return {
      title: "Fixed Cost Alert",
      message: "Your recurring bills are taking up a large slice. Can you negotiate any utility rates or switch subscriptions?",
      icon: Shield, iconColor: '#ef4444'
    };
    if (goodSpend === 0) return {
      title: "Start Small",
      message: "You haven't recorded any savings or investments yet. Aim for ₹500 next week to build the habit.",
      icon: PiggyBank, iconColor: '#3b82f6'
    };
    return {
      title: "Mastering the Flow",
      message: "Your distribution looks healthy! You are maintaining a balanced financial lifestyle.",
      icon: Sparkles, iconColor: '#10b981'
    };
  };

  const advice = getAdvice();
  const AdviceIcon = advice.icon;

  const strategies = [
    { label: 'Automate SIPs', desc: 'Set up recurring investments to build wealth effortlessly', icon: Zap },
    { label: '50/30/20 Rule', desc: 'Allocate 50% needs, 30% wants, 20% savings from income', icon: Target },
    { label: 'Emergency Fund', desc: 'Build 6 months of expenses as safety net before investing', icon: Shield },
  ];

  // Auto-rotate strategies
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStrategy(prev => (prev + 1) % strategies.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const estimatedAnnualSavings = totalSpent * 0.15 * 12;

  return (
    <Card className="h-full border border-gray-200 dark:border-border/40 bg-white dark:bg-card shadow-sm overflow-hidden relative group">
      {/* Subtle animated background orb */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-700"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
      />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-[0.05] group-hover:opacity-[0.10] transition-opacity duration-700"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
      />

      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-foreground">
          <div className="p-1.5 rounded-lg bg-blue-500 text-white shadow-sm">
            <Brain className="size-4 text-white" />
          </div>
          AI Savings Advisor
          <PulseDot color="#10b981" />
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-slate-600 dark:text-foreground/70 font-medium">
          <Sparkles className="size-3 text-amber-500" />
          Machine learning insights into your lifestyle
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        {/* ── Health Score + Badge Row ─────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <GaugeRing score={healthScore} size={100} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-foreground/70">Financial Health</span>
              <Badge
                variant={healthScore > 80 ? 'default' : 'secondary'}
                className={`text-[10px] ${healthScore > 80 ? 'bg-emerald-500/90 hover:bg-emerald-500' : ''}`}
                style={healthScore > 80 ? { boxShadow: '0 0 12px rgba(16,185,129,0.3)' } : {}}
              >
                {healthScore > 80 ? '✦ Excellent' : healthScore > 60 ? 'On Track' : '⚠ Needs Review'}
              </Badge>
            </div>
            <p className="text-xs text-slate-700 dark:text-foreground/80 leading-relaxed font-medium">
              {healthScore > 80
                ? 'Your spending patterns show strong financial discipline.'
                : healthScore > 60
                  ? 'Good progress. Small optimizations can boost your score further.'
                  : 'Consider reviewing your spending categories for improvements.'}
            </p>
          </div>
        </div>

        {/* ── Expenditure Split Bars ───────────────────────────────────── */}
        <div className="p-3 rounded-xl border border-gray-200 dark:border-border/30 bg-slate-50 dark:bg-background/80 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Expenditure Split</span>
            <span className="text-[10px] font-bold text-blue-500 italic px-2 py-0.5 rounded-full bg-blue-500/10">
              50/30/20 Optimal Blend
            </span>
          </div>

          <AnimatedBar percent={needsPercent} color="#3b82f6" label="🏠 Needs (Bills, Transport, Food)" delay={0} />
          <AnimatedBar percent={wantsPercent} color="#f59e0b" label="🛍 Wants (Shopping, Fun)" delay={200} />
          <AnimatedBar percent={savingsPercent} color="#10b981" label="💰 Savings & Investments" delay={400} />

          {/* Combined visual bar */}
          <div className="flex w-full h-2.5 rounded-full overflow-hidden mt-1" style={{
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)'
          }}>
            <div className="h-full transition-all duration-1000" style={{ width: `${needsPercent}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
            <div className="h-full transition-all duration-1000" style={{ width: `${wantsPercent}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
            <div className="h-full flex-1 transition-all duration-1000" style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
          </div>
        </div>

        {/* ── AI Advice Card ───────────────────────────────────────────── */}
        <div
          className="p-4 rounded-xl relative cursor-pointer hover:shadow-lg transition-all duration-300 mt-4 bg-slate-50 dark:bg-card/40 border border-gray-200 dark:border-blue-500/30"
          onClick={() => setShowTip(!showTip)}
        >
          <div className="absolute -top-3 left-4 bg-white dark:bg-background px-2.5 py-0.5 rounded-full z-10 shadow-sm border border-gray-200 dark:border-blue-500/25">
            <div className="flex items-center gap-1">
              <AdviceIcon className="size-3.5" style={{ color: advice.iconColor }} />
              <span className="text-[10px] font-bold tracking-wide" style={{ color: advice.iconColor }}>AI INSIGHT</span>
            </div>
          </div>
          <p className="font-bold text-sm mb-1 mt-1 text-slate-900 dark:text-foreground">{advice.title}</p>
          <p className="text-xs text-slate-700 dark:text-foreground/80 leading-relaxed font-medium">{advice.message}</p>

          {showTip && (
            <div className="mt-3 p-3 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border/40 animate-fade-in-up text-xs text-slate-700 dark:text-foreground/80 shadow-sm">
              <p className="font-semibold text-slate-900 dark:text-foreground mb-1">💡 Pro Tip</p>
              <p className="font-medium">Track every expense for 30 days to get a complete picture. Even small daily purchases add up significantly over a year.</p>
            </div>
          )}

          <Button variant="link" className="p-0 h-auto text-xs mt-2 text-blue-500 group/link">
            Read strategy guide
            <ArrowRight className="size-3 ml-1 group-hover/link:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* ── Strategy Carousel ────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-border/30 bg-slate-50 dark:bg-background/80 shadow-sm">
          <div className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeStrategy * 100}%)` }}
          >
            {strategies.map((strategy, idx) => {
              const StratIcon = strategy.icon;
              return (
                <div key={idx} className="min-w-full p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <StratIcon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-foreground truncate">{strategy.label}</p>
                    <p className="text-[11px] text-slate-600 dark:text-foreground/70 leading-snug font-medium">{strategy.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Dots indicator */}
          <div className="flex justify-center gap-1.5 pb-2">
            {strategies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStrategy(idx)}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: activeStrategy === idx ? '16px' : '6px',
                  background: activeStrategy === idx ? '#3b82f6' : 'rgba(59,130,246,0.25)',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Annual Potential ──────────────────────────────────────────── */}
        <div className="flex gap-3 items-center p-3 rounded-xl transition-colors hover:shadow-md bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/15">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
            <Wallet className="size-5 text-emerald-700 dark:text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-emerald-900/70 dark:text-emerald-100/70">Estimated Annual Potential</p>
            <p className="text-base font-extrabold text-emerald-600 flex items-center gap-1.5">
              <TrendingUp className="size-3.5" />
              Save up to {formatCurrency(estimatedAnnualSavings)} / yr
            </p>
          </div>
          <ChevronRight className="size-4 text-emerald-900/60 dark:text-emerald-100/60" />
        </div>
      </CardContent>
    </Card>
  );
}
