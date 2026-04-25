import { useEffect, useRef } from 'react';

// ── Financial data for the ticker ────────────────────────────────────────────
const TICKER_ROW_1 = [
  { label: 'SENSEX', value: '74,248.22', change: '+0.68%', up: true },
  { label: 'NIFTY 50', value: '22,530.70', change: '+0.72%', up: true },
  { label: 'S&P 500', value: '5,218.19', change: '-0.21%', up: false },
  { label: 'NASDAQ', value: '16,302.76', change: '-0.38%', up: false },
  { label: 'Dow Jones', value: '39,069.59', change: '+0.11%', up: true },
  { label: 'FTSE 100', value: '8,078.86', change: '+0.53%', up: true },
  { label: 'Nikkei 225', value: '38,460.08', change: '-0.34%', up: false },
  { label: 'DAX', value: '18,322.41', change: '+0.27%', up: true },
  { label: 'CAC 40', value: '8,219.14', change: '+0.15%', up: true },
  { label: 'Hang Seng', value: '16,541.42', change: '-0.88%', up: false },
  { label: 'Shanghai', value: '3,065.26', change: '+0.45%', up: true },
  { label: 'KOSPI', value: '2,724.62', change: '-0.12%', up: false },
];

const TICKER_ROW_2 = [
  { label: 'Gold (oz)', value: '$2,329.40', change: '+0.89%', up: true },
  { label: 'Silver (oz)', value: '$27.42', change: '+1.24%', up: true },
  { label: 'Crude Oil (WTI)', value: '$83.57', change: '-0.46%', up: false },
  { label: 'Brent Crude', value: '$87.12', change: '-0.38%', up: false },
  { label: 'EUR/USD', value: '1.0721', change: '+0.14%', up: true },
  { label: 'GBP/USD', value: '1.2681', change: '+0.09%', up: true },
  { label: 'USD/JPY', value: '154.72', change: '+0.32%', up: true },
  { label: 'USD/INR', value: '83.47', change: '-0.08%', up: false },
  { label: 'Bitcoin', value: '$64,220', change: '+2.14%', up: true },
  { label: 'Ethereum', value: '$3,448', change: '+1.88%', up: true },
  { label: 'World GDP Growth', value: '3.2%', change: 'IMF Forecast', up: true },
  { label: 'India GDP Growth', value: '7.8%', change: 'FY2024', up: true },
  { label: 'US CPI Inflation', value: '3.5%', change: 'YoY Mar', up: false },
  { label: 'India CPI', value: '4.85%', change: 'Mar 2024', up: false },
  { label: 'US Fed Rate', value: '5.25–5.5%', change: 'Unchanged', up: true },
  { label: 'RBI Repo Rate', value: '6.50%', change: 'Unchanged', up: true },
];

interface TickerItem {
  label: string;
  value: string;
  change: string;
  up: boolean;
}

function TickerRow({ items, direction }: { items: TickerItem[]; direction: 'ltr' | 'rtl' }) {
  // Duplicate items so scroll loops seamlessly
  const doubled = [...items, ...items];
  const animClass = direction === 'ltr' ? 'animate-ticker-ltr' : 'animate-ticker-rtl';

  return (
    <div className="overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
      <div
        className={`flex gap-0 ${animClass} shrink-0`}
        style={{ width: 'max-content' }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-4 border-r border-white/10 shrink-0"
            style={{ minWidth: 'max-content' }}
          >
            <span className="text-[11px] font-semibold text-white/60 tracking-wide">{item.label}</span>
            <span className="text-[12px] font-bold text-white">{item.value}</span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                color: item.up ? '#00d4aa' : '#f87171',
                background: item.up ? 'rgba(0,212,170,0.12)' : 'rgba(248,113,113,0.12)',
              }}
            >
              {item.up ? '▲' : '▼'} {item.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function FinancialTicker() {
  const styleRef = useRef(false);
  
  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ticker-ltr {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes ticker-rtl {
        0%   { transform: translateX(-50%); }
        100% { transform: translateX(0); }
      }
      .animate-ticker-ltr {
        animation: ticker-ltr 60s linear infinite;
      }
      .animate-ticker-rtl {
        animation: ticker-rtl 70s linear infinite;
      }
      .animate-ticker-ltr:hover,
      .animate-ticker-rtl:hover {
        animation-play-state: paused;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden space-y-0"
      style={{
        background: 'linear-gradient(135deg, rgba(0,30,22,0.95) 0%, rgba(10,10,40,0.95) 100%)',
        border: '1px solid rgba(0,212,170,0.15)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/8">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
          <span className="text-[10px] font-bold text-[#00d4aa] uppercase tracking-widest">Live Markets</span>
        </span>
        <span className="ml-auto text-[10px] text-white/30">World Financial &amp; Economic Data • Indices • Commodities • FX • Crypto</span>
      </div>

      {/* Row 1 — left to right */}
      <div className="py-1.5">
        <TickerRow items={TICKER_ROW_1} direction="ltr" />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-4" />

      {/* Row 2 — right to left */}
      <div className="py-1.5">
        <TickerRow items={TICKER_ROW_2} direction="rtl" />
      </div>
    </div>
  );
}
