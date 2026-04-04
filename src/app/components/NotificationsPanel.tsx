import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import {
  Bell,
  BellOff,
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
  MoreVertical,
  CheckCircle2,
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
  high: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  medium: 'bg-yellow-500',
  low: 'bg-slate-400',
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


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative focus-visible:ring-1 focus-visible:ring-offset-1 ring-primary overflow-visible">
          <Bell className={`size-5 transition-transform ${unreadCount > 0 ? 'text-primary animate-pulse' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold shadow-sm shadow-red-500/50">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        align="end" 
        className="w-[calc(100vw-32px)] sm:w-[480px] p-0 overflow-hidden shadow-xl border-border rounded-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex flex-col border-b bg-card">
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Bell className="size-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground tracking-tight text-base">Notifications</h3>
              {unreadCount > 0 && <Badge variant="default" className="text-[10px] ml-1 h-5 px-1.5 shadow-sm">{unreadCount} unread</Badge>}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 text-xs flex items-center gap-1.5 ${showSettings ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                <Settings className={`size-3.5 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
                Settings
              </Button>
            </div>
          </div>
          
          {/* Controls sub-header (hidden if settings open) */}
          {!showSettings && (
            <div className="flex items-center justify-between px-4 pb-3 pt-0">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-muted-foreground mr-1" />
                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto snap-x no-scrollbar">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setFilter(opt.key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 snap-start ${
                        filter === opt.key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/50 hover:bg-muted text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings ? (
          <ScrollArea className="h-[350px] sm:h-[450px]">
            <div className="p-5 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">General Preferences</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage how you receive alerts.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-3"
                    onClick={async () => { await requestNotificationPermission(); reload(); }}
                  >
                    OS Permission
                  </Button>
                </div>
                
                <div className="grid gap-3 bg-muted/30 p-4 border rounded-xl">
                  {/* Sound */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-full flex-shrink-0 size-8 flex items-center justify-center ${prefs.soundEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {prefs.soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Sound Alerts</Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">Play a short chime on new notifications.</p>
                      </div>
                    </div>
                    <Switch
                      checked={prefs.soundEnabled}
                      onCheckedChange={(checked) => updatePrefs({ soundEnabled: checked })}
                    />
                  </div>

                  <div className="w-full h-px bg-border my-1" />

                  {/* Desktop */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-full flex-shrink-0 size-8 flex items-center justify-center ${prefs.desktopEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {prefs.desktopEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Desktop Notifications</Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">Show native browser OS notifications.</p>
                      </div>
                    </div>
                    <Switch
                      checked={prefs.desktopEnabled}
                      onCheckedChange={(checked) => updatePrefs({ desktopEnabled: checked })}
                    />
                  </div>

                  <div className="w-full h-px bg-border my-1" />

                  {/* DND */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-full flex-shrink-0 size-8 flex items-center justify-center ${prefs.dndEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Moon className="size-4" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Do Not Disturb</Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">Silence alerts during quiet hours.</p>
                      </div>
                    </div>
                    <Switch
                      checked={prefs.dndEnabled}
                      onCheckedChange={(checked) => updatePrefs({ dndEnabled: checked })}
                    />
                  </div>
                </div>

                {/* DND Time Pickers */}
                {prefs.dndEnabled && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-muted/20 border border-primary/20 rounded-xl relative overflow-hidden animate-in slide-in-from-top-2">
                    <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                    <div className="space-y-1.5 relative z-10">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Start Time</label>
                      <Input
                        type="time"
                        value={prefs.dndStart}
                        onChange={(e) => updatePrefs({ dndStart: e.target.value })}
                        className="h-8 text-sm focus-visible:ring-1"
                      />
                    </div>
                    <div className="space-y-1.5 relative z-10">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">End Time</label>
                      <Input
                        type="time"
                        value={prefs.dndEnd}
                        onChange={(e) => updatePrefs({ dndEnd: e.target.value })}
                        className="h-8 text-sm focus-visible:ring-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Types */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">Notification Types</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Select which types of events trigger an alert.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TYPE_LABELS) as NotificationType[]).map(type => {
                    const isEnabled = prefs.enabledTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                          isEnabled
                            ? 'bg-primary/10 border-primary/30 text-primary shadow-sm hover:bg-primary/20'
                            : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {isEnabled ? <CheckCircle2 className="size-3.5" /> : <div className="size-3.5 rounded-full border border-current opacity-50" />}
                        {TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          /* Notifications List */
          <ScrollArea className="h-[350px] sm:h-[450px]">
            <div className="p-2">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center px-4 animate-in fade-in zoom-in-95">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="size-8 text-muted-foreground/40" />
                  </div>
                  <h4 className="text-base font-semibold">All caught up!</h4>
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] leading-relaxed">
                    {filter === 'all' ? "You don't have any new notifications to show." : `No matched notifications for the "${filter.replace('_', ' ')}" filter.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  {GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
                    <div key={group} className="space-y-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-popover/90 backdrop-blur-sm z-10">
                        {group}
                      </div>
                      
                      <div className="space-y-1 px-1">
                        {grouped[group].map((notif) => {
                          const IconComponent = ICON_MAP[notif.type] || Info;
                          const colorClass = COLOR_MAP[notif.type] || COLOR_MAP.info;
                          const priorityDot = PRIORITY_MAP[notif.priority] || PRIORITY_MAP.medium;

                          return (
                            <div
                              key={notif.id}
                              className={`group relative flex items-start gap-3 p-3 rounded-lg transition-all duration-200 select-none ${
                                !notif.read ? 'bg-primary/5 border border-primary/20 shadow-sm' : 'hover:bg-muted/50 border border-transparent'
                              } ${notif.actionUrl ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
                              onClick={() => handleNotifClick(notif)}
                            >
                              <div className="relative mt-0.5 shadow-sm rounded-full bg-background">
                                <div className={`p-2.5 rounded-full flex-shrink-0 ${colorClass}`}>
                                  <IconComponent className="size-4" />
                                </div>
                                <span className={`absolute -top-1 -right-1 size-3 rounded-full border-2 border-background ${priorityDot}`} title={`${notif.priority} priority`} />
                              </div>
                              
                              <div className="flex-1 min-w-0 pr-8">
                                <p className={`text-[13px] leading-tight ${!notif.read ? 'font-bold' : 'font-medium text-foreground/80'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-muted-foreground/90 mt-1 line-clamp-2 text-xs leading-snug">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <p className="text-[10px] font-medium text-muted-foreground">
                                    {timeAgo(notif.timestamp)}
                                  </p>
                                  {notif.actionUrl && (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
                                      View details
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Actions Dropdown */}
                              <div className="absolute right-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="size-8 rounded-full bg-background shadow-xs hover:bg-muted">
                                      <MoreVertical className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 z-[150]" onClick={e => e.stopPropagation()}>
                                    {!notif.read && (
                                      <DropdownMenuItem onClick={() => { markAsRead(notif.id); reload(); }}>
                                        <Check className="size-3.5 mr-2 text-primary" /> Mark as Read
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => { snoozeNotification(notif.id, 1); reload(); }}>
                                      <Moon className="size-3.5 mr-2" /> Snooze 1 hour
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { snoozeNotification(notif.id, 24); reload(); }}>
                                      <Clock className="size-3.5 mr-2" /> Snooze 1 day
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => { dismissNotification(notif.id); reload(); }}>
                                      <Trash2 className="size-3.5 mr-2" /> Dismiss
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer actions */}
        {!showSettings && notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/10 flex items-center justify-between z-10 relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
              onClick={() => { markAllAsRead(); reload(); }}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="size-3.5 mr-1.5" /> 
              {unreadCount === 0 ? 'All Read' : 'Mark all read'}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 text-destructive hover:bg-destructive/10"
              onClick={() => { clearAllNotifications(); reload(); }}
            >
              <Trash2 className="size-3.5 mr-1.5" /> Clear All
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
