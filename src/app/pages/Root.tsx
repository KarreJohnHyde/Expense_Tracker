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
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Toaster } from '../components/ui/sonner';
import { auth } from '../lib/auth';
import { toast } from 'sonner';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { runNotificationEngine } from '../lib/notifications';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Budgets', href: '/budgets', icon: Wallet },
  { name: 'Stock Market', href: '/stocks', icon: LineChart },
  { name: 'Currency Trading', href: '/currency', icon: ArrowRightLeft },
  { name: 'Crypto Market', href: '/crypto', icon: Bitcoin },
  { name: 'UPI Wallets', href: '/wallets', icon: Smartphone },
  { name: 'Bank SMS', href: '/sms-parser', icon: MessageSquare },
  { name: 'Scan Receipt', href: '/scan-receipt', icon: ScanLine },
  { name: 'QR Generator', href: '/qr-generator', icon: QrCode },
  { name: 'Automations', href: '/automations', icon: Webhook },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, _setUser] = useState(auth.getCurrentUser());

  useEffect(() => {
    document.title = 'Serverless Expense Tracker - AI-Powered Financial Management';
    runNotificationEngine();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" expand={true} richColors />
      
      {/* Sidebar */}
      <aside className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col bg-card border-r border-border transition-all duration-300 z-30",
        isSidebarOpen ? "lg:w-64" : "lg:w-20"
      )}>
        <div className="flex flex-col h-full relative">
          {/* Logo */}
          <div className={cn("flex items-center gap-2 px-6 py-4 border-b border-border overflow-hidden whitespace-nowrap transition-all duration-300", 
            !isSidebarOpen && "px-4 justify-center"
          )}>
            <IndianRupee className="h-8 w-8 text-primary shrink-0" />
            {isSidebarOpen && (
              <div className="flex-1 opacity-100 transition-opacity duration-300">
                <h1 className="text-lg font-bold">Expense Tracker</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Management</p>
              </div>
            )}
            {isSidebarOpen && <NotificationsPanel />}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="absolute -right-4 top-6 rounded-full size-8 z-50 shadow-sm hidden lg:flex"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={!isSidebarOpen ? item.name : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200',
                    isSidebarOpen ? 'px-3' : 'justify-center',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 bg-primary/10 rounded-xl animate-fade-in-up transition-all duration-300" />
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn('size-5 shrink-0 relative z-10 transition-transform group-hover:scale-110 duration-200', isActive && 'text-primary')} />
                  {isSidebarOpen && (
                    <span className="relative z-10 whitespace-nowrap opacity-100 transition-opacity duration-300">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4 space-y-3">
            {/* User Info */}
            {user && (
              <div className={cn("flex items-center gap-3 rounded-lg overflow-hidden transition-all duration-300", isSidebarOpen ? "p-3 bg-muted" : "justify-center")}>
                <div className="size-10 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 min-w-0 opacity-100 transition-opacity duration-300">
                    <p className="text-sm font-medium truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                )}
              </div>
            )}

            <Button 
              variant="outline" 
              className={cn("w-full transition-all duration-300", !isSidebarOpen && "px-0")} 
              size={isSidebarOpen ? "sm" : "icon"}
              onClick={handleLogout}
              title={!isSidebarOpen ? "Logout" : undefined}
            >
              <LogOut className={cn("size-4", isSidebarOpen && "mr-2")} />
              {isSidebarOpen && "Logout"}
            </Button>

            {isSidebarOpen && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="size-4 text-primary" />
                  <p className="text-sm font-semibold">AI Powered</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Using machine learning for smart insights
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b bg-card lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className="font-bold">ExpenseAI</h1>
              <p className="text-xs text-muted-foreground">Smart Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsPanel />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="border-t bg-card px-4 py-4 space-y-1 overflow-y-auto max-h-[80vh]">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="size-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className={cn("transition-all duration-300", isSidebarOpen ? "lg:pl-64" : "lg:pl-20")}>
        <div className="container mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}