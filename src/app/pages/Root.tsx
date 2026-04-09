import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { cn } from '../components/ui/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Settings,
  Sparkles,
  Menu,
  X,
  IndianRupee,
  LineChart,
  User,
  LogOut,
  ArrowRightLeft,
  ScanLine,
  Bitcoin,
  Smartphone,
  MessageSquare,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Webhook,
  Search,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { Toaster } from '../components/ui/sonner';
import { auth } from '../lib/auth';
import { toast } from 'sonner';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { runNotificationEngine } from '../lib/notifications';

const navigation = [
  { name: 'Dashboard',       href: '/',             icon: LayoutDashboard },
  { name: 'Analytics',       href: '/analytics',    icon: TrendingUp },
  { name: 'Budgets',         href: '/budgets',      icon: Wallet },
  { name: 'Stock Market',    href: '/stocks',       icon: LineChart },
  { name: 'Currency Trading',href: '/currency',     icon: ArrowRightLeft },
  { name: 'Crypto Market',   href: '/crypto',       icon: Bitcoin },
  { name: 'UPI Wallets',     href: '/wallets',      icon: Smartphone },
  { name: 'Bank SMS',        href: '/sms-parser',   icon: MessageSquare },
  { name: 'Scan Receipt',    href: '/scan-receipt', icon: ScanLine },
  { name: 'QR Generator',    href: '/qr-generator', icon: QrCode },
  { name: 'Automations',     href: '/automations',  icon: Webhook },
  { name: 'Profile',         href: '/profile',      icon: User },
  { name: 'Settings',        href: '/settings',     icon: Settings },
];

// ── Search bar component ───────────────────────────────────────────────────
function FloatingSearchBar() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="search-floating flex items-center gap-2 px-4 py-2 w-full max-w-sm">
      <Search className="size-4 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search expenses…"
        className="bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Root() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(true);
  const [isTouchLayout,  setIsTouchLayout]  = useState(false);
  const [user, _setUser] = useState(auth.getCurrentUser());

  useEffect(() => {
    document.title = 'Serverless Expense Tracker - AI-Powered Financial Management';
    runNotificationEngine();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media  = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouchLayout(media.matches);
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const sidebarWidth = isSidebarOpen ? 'lg:w-64' : 'lg:w-[72px]';
  const mainPadding  = isSidebarOpen ? 'lg:pl-64' : 'lg:pl-[72px]';

  return (
    <div className="min-h-[100svh] bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Toaster position="top-center" expand richColors />

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col',
          'glass-sidebar transition-all duration-300 z-30 overflow-hidden',
          sidebarWidth,
          isTouchLayout && 'lg:hidden'
        )}
      >
        <div className="flex flex-col h-full relative">

          {/* Logo bar */}
          <div
            className={cn(
              'flex items-center gap-3 px-5 py-5 border-b border-sidebar-border',
              !isSidebarOpen && 'justify-center px-4'
            )}
          >
            {/* Icon */}
            <div className="relative shrink-0">
              <div className="size-9 rounded-xl gradient-primary flex items-center justify-center shadow-md glow-primary-sm">
                <IndianRupee className="size-5 text-primary-foreground" />
              </div>
            </div>

            {isSidebarOpen && (
              <div className="flex-1 min-w-0 animate-fade-in-up">
                <h1 className="text-base font-bold tracking-tight leading-none">ExpenseAI</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">Serverless • AWS Native</p>
              </div>
            )}

            {isSidebarOpen && !isTouchLayout && (
              <div className="shrink-0">
                <NotificationsPanel />
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'absolute -right-3.5 top-[68px] z-50 size-7 rounded-full',
              'bg-background border border-border shadow-md hidden lg:flex',
              'hover:bg-accent hover:border-primary/30 transition-all duration-200'
            )}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen
              ? <ChevronLeft  className="size-3.5" />
              : <ChevronRight className="size-3.5" />
            }
          </Button>

          {/* Navigation list */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navigation.map((item, i) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={!isSidebarOpen ? item.name : undefined}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium',
                    'transition-all duration-200 animate-slide-in-left',
                    isSidebarOpen ? 'px-3' : 'justify-center px-2.5',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  {/* Active background */}
                  {isActive && <span className="nav-active-pill" />}

                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_6px_rgba(0,212,170,0.6)]" />
                  )}

                  <item.icon
                    className={cn(
                      'size-[18px] shrink-0 relative z-10 transition-all duration-200',
                      'group-hover:scale-110',
                      isActive ? 'text-primary' : ''
                    )}
                  />
                  {isSidebarOpen && (
                    <span className="relative z-10 whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer: user + logout */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            {user && (
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-xl transition-all duration-300',
                  isSidebarOpen ? 'p-2.5 glass' : 'justify-center'
                )}
              >
                <div className="size-8 shrink-0 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none">{user.username}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              className={cn(
                'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200',
                !isSidebarOpen && 'px-0 justify-center'
              )}
              size={isSidebarOpen ? 'sm' : 'icon'}
              onClick={handleLogout}
              title={!isSidebarOpen ? 'Logout' : undefined}
            >
              <LogOut className={cn('size-4', isSidebarOpen && 'mr-2')} />
              {isSidebarOpen && 'Logout'}
            </Button>

            {isSidebarOpen && (
              <div className="rounded-xl p-3 glass border border-primary/15 animate-pulse-glow">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="size-3.5 text-primary" />
                  <p className="text-xs font-semibold text-primary">AI Powered</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Smart insights with machine learning
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile / Touch Header ──────────────────────────────────────── */}
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-border glass',
          !isTouchLayout && 'lg:hidden'
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm glow-primary-sm">
              <IndianRupee className="size-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">ExpenseAI</p>
              <p className="text-[10px] text-muted-foreground">Smart Tracker</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {isTouchLayout && <NotificationsPanel />}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileMenuOpen && (
          <nav
            className="border-t border-border px-3 py-3 space-y-0.5 overflow-y-auto max-h-[80svh] animate-fade-in-scale"
          >
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-accent text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <item.icon className="size-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* ── Floating Top Bar (Desktop) ─────────────────────────────────── */}
      {!isTouchLayout && (
        <div
          className={cn(
            'hidden lg:flex items-center justify-between',
            'fixed top-4 right-4 z-20 gap-3 transition-all duration-300',
            isSidebarOpen ? 'left-[272px]' : 'left-[88px]'
          )}
        >
          <FloatingSearchBar />
          <div className="flex items-center gap-2 shrink-0">
            <NotificationsPanel />
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main
        className={cn(
          'transition-all duration-300',
          !isTouchLayout && mainPadding
        )}
      >
        <div
          className={cn(
            'mx-auto',
            isTouchLayout
              ? 'px-4 py-4'
              : 'px-4 py-6 sm:px-6 lg:px-8 lg:pt-20' // top padding clears floating bar
          )}
          style={{ maxWidth: '1600px' }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
