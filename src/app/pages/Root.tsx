import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
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
  Info,
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
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeft,
  Repeat
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from '../components/ui/sonner';
import { auth } from '../lib/auth';
import { toast } from 'sonner';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { runNotificationEngine } from '../lib/notifications';
import { LiveTime } from '../components/LiveTime';
import { ThemeToggle } from '../components/ThemeToggle';
import { AIVoiceCapture } from '../components/AIVoiceCapture';
import { AppLock } from '../components/AppLock';
import { AICFO } from '../components/AICFO';

const navigation = [
  { name: 'nav.dashboard',     href: '/',             icon: LayoutDashboard },
  { name: 'nav.subscriptions', href: '/subscriptions',icon: Repeat },
  { name: 'nav.analytics',     href: '/analytics',    icon: TrendingUp },
  { name: 'nav.budgets',       href: '/budgets',      icon: Wallet },
  { name: 'nav.stocks',        href: '/stocks',       icon: LineChart },
  { name: 'nav.currency',      href: '/currency',     icon: ArrowRightLeft },
  { name: 'nav.crypto',        href: '/crypto',       icon: Bitcoin },
  { name: 'nav.wallets',       href: '/wallets',      icon: Smartphone },
  { name: 'nav.sms',           href: '/sms-parser',   icon: MessageSquare },
  { name: 'nav.scan',          href: '/scan-receipt', icon: ScanLine },
  { name: 'nav.gallery',       href: '/gallery',      icon: ImageIcon },
  { name: 'nav.qr',            href: '/qr-generator', icon: QrCode },
  { name: 'nav.automations',   href: '/automations',  icon: Webhook },
  { name: 'nav.profile',       href: '/profile',      icon: User },
  { name: 'nav.about',         href: '/about',        icon: Info },
  { name: 'nav.settings',      href: '/settings',     icon: Settings },
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
  const { t, i18n } = useTranslation();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(true);
  const [isTouchLayout,  setIsTouchLayout]  = useState(false);
  const [user, _setUser] = useState(auth.getCurrentUser());
  const isRTL = i18n.dir() === 'rtl';

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
  const mainPadding  = isSidebarOpen 
    ? (isRTL ? 'lg:pr-64' : 'lg:pl-64') 
    : (isRTL ? 'lg:pr-[72px]' : 'lg:pl-[72px]');

  return (
    <div className="min-h-[100svh] bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Toaster position="top-center" expand richColors />

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <motion.aside
        layout
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col',
          isRTL ? 'lg:right-0' : 'lg:left-0',
          'glass-sidebar z-30 overflow-hidden',
          sidebarWidth,
          isTouchLayout && 'lg:hidden'
        )}
      >
        <div className="flex flex-col h-full relative">

          {/* Logo bar */}
          <div
            className={cn(
              'flex items-center gap-3 px-5 py-5 border-b border-sidebar-border h-[77px]',
              !isSidebarOpen && 'justify-center px-4'
            )}
          >
            {/* Logo — click to toggle sidebar */}
            <motion.button
              layout
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="relative shrink-0 cursor-pointer group"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              whileHover={{ scale: 1.08, rotateY: 15 }}
              whileTap={{ scale: 0.92, rotateY: -10 }}
              style={{ perspective: 600 }}
            >
              <div className="size-9 rounded-xl gradient-primary flex items-center justify-center shadow-md glow-primary-sm transition-shadow group-hover:shadow-lg group-hover:shadow-primary/30">
                <IndianRupee className="size-5 text-primary-foreground" />
              </div>
            </motion.button>

            <AnimatePresence initial={false}>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10, display: 'none' }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <h1 className="text-base font-bold tracking-tight leading-none whitespace-nowrap">ExpenseAI</h1>
                  <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap">Serverless • AWS Native</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sidebar panel toggle icon */}
            <AnimatePresence initial={false}>
              {isSidebarOpen && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="size-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Live Time - Advanced Dashboard Feel */}
          <motion.div layout className={cn("px-4 py-3 shrink-0", !isSidebarOpen && "flex justify-center px-2")}>
            <LiveTime showIcon={isSidebarOpen} className={!isSidebarOpen ? "p-1.5" : ""} />
          </motion.div>



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
                    <span className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary shadow-[0_0_6px_rgba(0,212,170,0.6)]",
                      isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
                    )} />
                  )}

                  <motion.div layout className="relative z-10 size-[18px] flex items-center justify-center shrink-0">
                    <item.icon
                      className={cn(
                        'size-[18px] transition-all duration-200',
                        'group-hover:scale-110',
                        isActive ? 'text-primary' : ''
                      )}
                    />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -5, width: 0 }}
                        animate={{ opacity: 1, x: 0, width: 'auto' }}
                        exit={{ opacity: 0, x: -5, width: 0 }}
                        className="relative z-10 whitespace-nowrap overflow-hidden block"
                      >
                        {t(item.name)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </nav>

          {/* Footer: user + logout */}
          <div className="border-t border-sidebar-border p-3 space-y-2 shrink-0">
            {user && (
              <motion.div
                layout
                className={cn(
                  'flex items-center gap-2.5 rounded-xl transition-all duration-300',
                  isSidebarOpen ? 'p-2.5 glass' : 'justify-center p-1 border border-transparent'
                )}
              >
                <motion.div layout className="size-8 shrink-0 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </motion.div>
                <AnimatePresence initial={false}>
                  {isSidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 min-w-0 overflow-hidden"
                    >
                      <p className="text-sm font-medium truncate leading-none">{user.username}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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
              <LogOut className={cn('size-4 shrink-0', isSidebarOpen && 'mr-2')} />
              <AnimatePresence initial={false}>
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {t('nav.logout')}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            <AnimatePresence initial={false}>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl p-3 glass border border-primary/15">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="size-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary">AI Powered</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Smart insights with machine learning
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

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
            <LanguageSwitcher isCompact className="mr-1" />
            <ThemeToggle />
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
                  {t(item.name)}
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
            'fixed top-4 z-20 gap-3 transition-all duration-300',
            isRTL ? 'left-4' : 'right-4',
            isSidebarOpen 
              ? (isRTL ? 'right-[272px]' : 'left-[272px]') 
              : (isRTL ? 'right-[88px]' : 'left-[88px]')
          )}
        >
          <FloatingSearchBar />
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationsPanel />
            <div className="w-12 h-12 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center" title="AI Assistant">
              <div className="w-10 h-10">
                <AICFO isCompact={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <motion.main
        layout
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className={cn(
          !isTouchLayout && mainPadding
        )}
      >
        <div
          className={cn(
            'mx-auto w-full transition-all duration-300',
            isTouchLayout
              ? 'px-4 py-4'
              : 'px-4 py-6 sm:px-6 lg:px-8 lg:pt-20' // top padding clears floating bar
          )}
          style={{ maxWidth: '1600px' }}
        >
          <Outlet />
        </div>
      </motion.main>
      <AIVoiceCapture />
      <AppLock />
    </div>
  );
}
