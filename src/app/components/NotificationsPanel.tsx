import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Bell,
  BellOff,
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
  Settings,
  Volume2,
  VolumeX,
  Moon,
} from 'lucide-react';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  clearAllNotifications,
  snoozeNotification,
  getPreferences,
  savePreferences,
  requestNotificationPermission,
  AppNotification,
  NotificationType,
} from '../lib/notifications';

const ICON_MAP: Record<string, React.ElementType> = {
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

const PRIORITY_MAP: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'budget_alert', label: 'Budget' },
  { key: 'sms_transaction', label: 'SMS' },
  { key: 'trade_executed', label: 'Trades' },
  { key: 'scan_complete', label: 'Scans' },
  { key: 'bill_reminder', label: 'Bills' },
];

const TYPE_LABELS: Record<string, string> = {
  bill_reminder: 'Bill Reminders',
  budget_alert: 'Budget Alerts',
  large_transaction: 'Large Transactions',
  recurring_due: 'Recurring Bills',
  info: 'Info Notices',
  sms_transaction: 'SMS Transactions',
  trade_executed: 'Trade Executed',
  scan_complete: 'Scan Results',
  wallet_update: 'Wallet Updates',
};

function groupByDate(notifications: AppNotification[]): Record<string, AppNotification[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, AppNotification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.timestamp);
    let label: string;
    if (d >= today) label = 'Today';
    else if (d >= yesterday) label = 'Yesterday';
    else if (d >= weekAgo) label = 'This Week';
    else label = 'Older';
    groups[label] = [...(groups[label] || []), n];
  }
  return groups;
}

export function NotificationsPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [prefs, setPrefs] = useState(getPreferences());
  const [snoozeMenu, setSnoozeMenu] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelPortalRef = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);

  // Dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Touch swipe-to-dismiss per item
  const touchStart = useRef<Record<string, number>>({});
  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    touchStart.current[id] = e.touches[0].clientX;
  };
  const handleTouchEnd = (id: string, e: React.TouchEvent) => {
    const startX = touchStart.current[id];
    if (startX === undefined) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (diff > 80) dismissNotification(id);
    delete touchStart.current[id];
  };

  const reload = () => {
    setNotifications(getNotifications());
    setUnreadCount(getUnreadCount());
    setPrefs(getPreferences());
  };

  useEffect(() => {
    reload();
    window.addEventListener('notifications-changed', reload);
    return () => window.removeEventListener('notifications-changed', reload);
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      const portalEl = panelPortalRef.current;
      const anchorEl = panelRef.current;

      const isInsidePortal = portalEl ? path.includes(portalEl) : false;
      const isInsideAnchor = anchorEl ? path.includes(anchorEl) : false;
      if (isInsidePortal || isInsideAnchor) return;

      setOpen(false);
      setShowSettings(false);
    };

    if (open) {
      document.addEventListener('pointerdown', handlePointerDown);
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
      };
    }
  }, [open]);

  const openPanel = () => {
    if (!open && bellBtnRef.current) {
      const rect = bellBtnRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 640 || window.matchMedia('(pointer: coarse)').matches;
      setPosition({
        x: isMobile ? 8 : Math.min(rect.right + 12, window.innerWidth - 520),
        y: isMobile ? 72 : rect.top,
      });
    }
    reload();
    setOpen(!open);
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);
  const grouped = groupByDate(filteredNotifications);
  const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Older'];

  const handleNotifClick = (notif: AppNotification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.actionUrl) {
      setOpen(false);
      navigate(notif.actionUrl);
    }
  };

  const toggleType = (type: NotificationType) => {
    const current = prefs.enabledTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    savePreferences({ enabledTypes: next });
    setPrefs({ ...prefs, enabledTypes: next });
  };

  const updatePrefs = (next: Partial<typeof prefs>) => {
    savePreferences(next);
    setPrefs({ ...prefs, ...next });
  };

  const dndActive = (() => {
    if (!prefs.dndEnabled) return false;
    const [sh, sm] = prefs.dndStart.split(':').map(Number);
    const [eh, em] = prefs.dndEnd.split(':').map(Number);
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return false;
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (start === end) return false;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
  })();

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <Button
        ref={bellBtnRef}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={openPanel}
      >
        <Bell className={`size-5 ${unreadCount > 0 ? 'text-primary animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Portal Panel */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelPortalRef}
          className="fixed w-[calc(100vw-16px)] sm:w-[480px] max-h-[85vh] bg-card border shadow-2xl z-[100] flex flex-col overflow-hidden rounded-2xl"
          style={{
            left: 0, top: 0,
            transform: `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }}
        >
          {/* Drag handles */}
          {(['top', 'bottom', 'left', 'right'] as const).map(d => (
            <div key={d} className={`absolute cursor-grab z-50 ${d === 'top' ? 'top-0 inset-x-0 h-3' : d === 'bottom' ? 'bottom-0 inset-x-0 h-3' : d === 'left' ? 'inset-y-0 left-0 w-3' : 'inset-y-0 right-0 w-3'}`}
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          ))}

          {/* Header */}
          <div
            className="flex items-center justify-between p-4 pt-5 border-b bg-muted/30 cursor-grab active:cursor-grabbing relative z-40"
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
          >
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{unreadCount}</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { markAllAsRead(); reload(); }} className="text-xs h-7 px-2">
                  <CheckCheck className="size-3.5 mr-1" /> Read all
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { clearAllNotifications(); reload(); }} className="text-xs h-7 px-2 text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5 mr-1" /> Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                <Settings className="size-3.5" />
                Settings
              </Button>
              {dndActive && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  DND
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-b bg-muted/10 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Notification Settings</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={async () => { await requestNotificationPermission(); reload(); }}
                >
                  Request Permission
                </Button>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Sound Alerts</Label>
                    <p className="text-[11px] text-muted-foreground">Play a short sound on new alerts</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {prefs.soundEnabled ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 text-muted-foreground" />}
                    <Switch
                      checked={prefs.soundEnabled}
                      onCheckedChange={() => updatePrefs({ soundEnabled: !prefs.soundEnabled })}
                      aria-label="Toggle notification sound"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Desktop Notifications</Label>
                    <p className="text-[11px] text-muted-foreground">Show browser notifications</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {prefs.desktopEnabled ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
                    <Switch
                      checked={prefs.desktopEnabled}
                      onCheckedChange={() => updatePrefs({ desktopEnabled: !prefs.desktopEnabled })}
                      aria-label="Toggle desktop notifications"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Do Not Disturb</Label>
                    <p className="text-[11px] text-muted-foreground">Silence alerts during quiet hours</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className={`size-4 ${prefs.dndEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Switch
                      checked={prefs.dndEnabled}
                      onCheckedChange={() => updatePrefs({ dndEnabled: !prefs.dndEnabled })}
                      aria-label="Toggle do not disturb"
                    />
                  </div>
                </div>
              </div>

              {prefs.dndEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">From</label>
                    <Input
                      type="time"
                      value={prefs.dndStart}
                      onChange={(e) => updatePrefs({ dndStart: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">To</label>
                    <Input
                      type="time"
                      value={prefs.dndEnd}
                      onChange={(e) => updatePrefs({ dndEnd: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">Toggle notification types:</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TYPE_LABELS) as NotificationType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    aria-pressed={prefs.enabledTypes.includes(type)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      prefs.enabledTypes.includes(type)
                        ? 'bg-primary/10 border-primary/50 text-primary'
                        : 'bg-muted/60 border-transparent text-muted-foreground'
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar */}
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
              GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
                <div key={group}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/20 border-b sticky top-0">
                    {group}
                  </div>
                  {grouped[group].map((notif) => {
                    const IconComponent = ICON_MAP[notif.type] || Info;
                    const colorClass = COLOR_MAP[notif.type] || COLOR_MAP.info;
                    const priorityDot = PRIORITY_MAP[notif.priority] || PRIORITY_MAP.medium;

                    return (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 p-3 border-b last:border-b-0 transition-all select-none ${
                          !notif.read ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'
                        } ${notif.actionUrl ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => handleNotifClick(notif)}
                        onTouchStart={(e) => handleTouchStart(notif.id, e)}
                        onTouchEnd={(e) => handleTouchEnd(notif.id, e)}
                      >
                        <div className="relative">
                          <div className={`p-2 rounded-full mt-0.5 flex-shrink-0 ${colorClass}`}>
                            <IconComponent className="size-4" />
                          </div>
                          <span className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card ${priorityDot}`} title={`${notif.priority} priority`} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={`text-sm leading-tight ${!notif.read ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                            {notif.title}
                          </p>
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{timeAgo(notif.timestamp)}</p>
                            {notif.actionUrl && (
                              <span className="text-[10px] text-primary">Tap to view →</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          {!notif.read && (
                            <Button
                              variant="ghost" size="icon" className="size-7"
                              onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); reload(); }}
                              title="Mark read"
                            >
                              <Check className="size-3.5 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="size-7 relative"
                            onClick={(e) => { e.stopPropagation(); setSnoozeMenu(snoozeMenu === notif.id ? null : notif.id); }}
                            title="Snooze"
                          >
                            <Moon className="size-3.5 text-muted-foreground" />
                            {snoozeMenu === notif.id && (
                              <div className="absolute right-8 top-0 bg-popover border rounded-lg shadow-lg p-1 z-10 w-28" onClick={e => e.stopPropagation()}>
                                <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium">Snooze for:</p>
                                {[{ label: '1 hour', hrs: 1 }, { label: '4 hours', hrs: 4 }, { label: '1 day', hrs: 24 }].map(opt => (
                                  <button
                                    key={opt.hrs}
                                    className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded"
                                    onClick={() => { snoozeNotification(notif.id, opt.hrs); setSnoozeMenu(null); reload(); }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); reload(); }}
                            title="Dismiss"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-2 border-t bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">
                Showing {filteredNotifications.length} of {notifications.length} • Swipe left on mobile to dismiss
              </p>
            </div>
          )}
        </div>
        , document.body)}
    </div>
  );
}
