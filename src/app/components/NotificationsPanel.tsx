import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Wallet,
  Clock,
  Info,
  MessageSquare,
  TrendingUp,
  ScanLine,
  Filter,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  clearAllNotifications,
  AppNotification,
} from '../lib/notifications';

const ICON_MAP: Record<string, any> = {
  bill_reminder: Clock,
  budget_alert: AlertTriangle,
  large_transaction: Wallet,
  recurring_due: Clock,
  info: Info,
  sms_transaction: MessageSquare,
  trade_executed: TrendingUp,
  scan_complete: ScanLine,
  wallet_update: Wallet,
};

const COLOR_MAP: Record<string, string> = {
  bill_reminder: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
  budget_alert: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  large_transaction: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  recurring_due: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  info: 'text-gray-500 bg-gray-100 dark:bg-gray-800/30',
  sms_transaction: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  trade_executed: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
  scan_complete: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30',
  wallet_update: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'budget_alert', label: 'Budget' },
  { key: 'large_transaction', label: 'Trading' },
  { key: 'sms_transaction', label: 'SMS' },
  { key: 'trade_executed', label: 'Trades' },
  { key: 'scan_complete', label: 'Scans' },
];

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  
  // Dragging & Positioning State
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 250, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only start drag if clicking the header explicitly, not buttons
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const reload = () => {
    setNotifications(getNotifications());
    setUnreadCount(getUnreadCount());
  };

  useEffect(() => {
    reload();
    window.addEventListener('notifications-changed', reload);
    return () => window.removeEventListener('notifications-changed', reload);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleMarkRead = (id: string) => {
    markAsRead(id);
    reload();
  };

  const handleDismiss = (id: string) => {
    dismissNotification(id);
    reload();
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    reload();
  };

  const handleClearAll = () => {
    clearAllNotifications();
    reload();
  };

  const timeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n: AppNotification) => n.type === filter);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <Button
        ref={bellBtnRef}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => { 
          if (!open) {
            reload();
            if (bellBtnRef.current) {
              const rect = bellBtnRef.current.getBoundingClientRect();
              // Spawn exactly to the right of the button on Desktop, or centered on mobile
              const isMobile = window.innerWidth < 640;
              setPosition({
                x: isMobile ? 16 : rect.right + 16,
                y: isMobile ? 80 : rect.top
              });
            }
          }
          setOpen(!open); 
        }}
      >
        <Bell className={`size-5 ${unreadCount > 0 ? 'text-primary' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel — Enlarged, Dragable, and Positioned to the Right via React Portal */}
      {open && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed w-[calc(100vw-32px)] sm:w-[500px] max-h-[80vh] sm:max-h-[700px] bg-card border shadow-2xl z-[100] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            left: 0, top: 0,
            transform: `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'auto',
            borderRadius: '16px' // Modern smoothed aesthetic
          }}
        >
          {/* Drag Handle - Outer Edges (Top, Bottom, Left, Right invisibly absolute) */}
          <div className="absolute top-0 inset-x-0 h-3 cursor-grab z-50" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          <div className="absolute bottom-0 inset-x-0 h-3 cursor-grab z-50" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          <div className="absolute inset-y-0 left-0 w-3 cursor-grab z-50" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          <div className="absolute inset-y-0 right-0 w-3 cursor-grab z-50" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />

          {/* Header - Drag Handle Native Top */}
          <div 
            className="flex items-center justify-between p-4 pt-5 border-b bg-muted/30 cursor-grab active:cursor-grabbing relative z-40"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} title="Mark all read" className="text-xs h-7 px-2">
                  <CheckCheck className="size-3.5 mr-1" /> Read all
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearAll} title="Clear all" className="text-xs h-7 px-2 text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5 mr-1" /> Clear
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
            <Filter className="size-3.5 text-muted-foreground flex-shrink-0 ml-1" />
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
                onClick={() => setFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <Bell className="size-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">
                  {filter === 'all' ? 'No notifications' : `No ${filter.replace('_', ' ')} notifications`}
                </p>
                <p className="text-xs mt-1">You'll see alerts for budgets, trades, SMS, and more here</p>
              </div>
            ) : (
              filteredNotifications.map((notif: AppNotification) => {
                const IconComponent = ICON_MAP[notif.type] || Info;
                const colorClass = COLOR_MAP[notif.type] || COLOR_MAP.info;

                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-all cursor-default ${
                      !notif.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-full mt-0.5 flex-shrink-0 ${colorClass}`}>
                      <IconComponent className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-sm leading-tight ${!notif.read ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                        {notif.title}
                      </p>
                      <p className="text-secondary-foreground mt-1 line-clamp-3 text-sm">{notif.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-2 uppercase tracking-wider">{timeAgo(notif.timestamp)}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!notif.read && (
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => handleMarkRead(notif.id)} title="Mark read">
                          <Check className="size-4 text-green-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDismiss(notif.id)} title="Dismiss">
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-2 border-t bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      , document.body)}
    </div>
  );
}
