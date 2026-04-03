export type NotificationType =
  | 'bill_reminder'
  | 'budget_alert'
  | 'large_transaction'
  | 'recurring_due'
  | 'info'
  | 'sms_transaction'
  | 'trade_executed'
  | 'scan_complete'
  | 'wallet_update';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: NotificationPriority;
  actionUrl?: string;
  snoozedUntil?: string | null;
}

export interface NotificationPreferences {
  enabledTypes: NotificationType[];
  soundEnabled: boolean;
  desktopEnabled: boolean;
  dndEnabled: boolean;
  dndStart: string; // HH:MM (24h)
  dndEnd: string;   // HH:MM (24h)
}

const STORAGE_KEY = 'notifications:items';
const PREFS_KEY = 'notifications:prefs';

const DEFAULT_PREFS: NotificationPreferences = {
  enabledTypes: [
    'bill_reminder',
    'budget_alert',
    'large_transaction',
    'recurring_due',
    'info',
    'sms_transaction',
    'trade_executed',
    'scan_complete',
    'wallet_update',
  ],
  soundEnabled: false,
  desktopEnabled: true,
  dndEnabled: false,
  dndStart: '22:00',
  dndEnd: '07:00',
};

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(v => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function isInQuietHours(now: Date, start: string, end: string): boolean {
  const current = now.getHours() * 60 + now.getMinutes();
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === endMin) return false;
  // Handles ranges that wrap past midnight
  if (startMin < endMin) return current >= startMin && current < endMin;
  return current >= startMin || current < endMin;
}

export function isDesktopNotificationsAllowed(): boolean {
  const prefs = getPreferences();
  if (!prefs.desktopEnabled) return false;
  if (prefs.dndEnabled && isInQuietHours(new Date(), prefs.dndStart, prefs.dndEnd)) return false;
  return true;
}

// ── Preferences ───────────────────────────────────────────────────────
export function getPreferences(): NotificationPreferences {
  try {
    const data = localStorage.getItem(PREFS_KEY);
    return data ? { ...DEFAULT_PREFS, ...JSON.parse(data) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: Partial<NotificationPreferences>) {
  const current = getPreferences();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  window.dispatchEvent(new Event('notifications-changed'));
}

// ── CRUD ──────────────────────────────────────────────────────────────
export function getNotifications(): AppNotification[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const all: AppNotification[] = data ? JSON.parse(data) : [];

    // Filter out snoozed notifications that haven't expired yet
    const now = new Date();
    return all.filter(n => {
      if (!n.snoozedUntil) return true;
      return new Date(n.snoozedUntil) <= now;
    });
  } catch {
    return [];
  }
}

export function saveNotification(
  notif: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'snoozedUntil' | 'priority'> & {
    priority?: NotificationPriority;
  }
): AppNotification | null {
  const prefs = getPreferences();
  if (!prefs.enabledTypes.includes(notif.type)) return null;

  const allRaw: AppNotification[] = (() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  })();

  const newNotif: AppNotification = {
    ...notif,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    read: false,
    priority: notif.priority ?? 'medium',
    snoozedUntil: null,
  };

  allRaw.unshift(newNotif);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allRaw.slice(0, 50)));
  window.dispatchEvent(new Event('notifications-changed'));

  // Sound effect
  if (prefs.soundEnabled) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not available
    }
  }

  return newNotif;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

export function markAsRead(id: string) {
  const all: AppNotification[] = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  })();
  const updated = all.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-changed'));
}

export function markAllAsRead() {
  const all: AppNotification[] = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  })();
  const updated = all.map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-changed'));
}

export function dismissNotification(id: string) {
  const all: AppNotification[] = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  })();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(n => n.id !== id)));
  window.dispatchEvent(new Event('notifications-changed'));
}

export function clearAllNotifications() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('notifications-changed'));
}

export function snoozeNotification(id: string, hours: number) {
  const all: AppNotification[] = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  })();
  const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const updated = all.map(n => n.id === id ? { ...n, snoozedUntil } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-changed'));
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

// ── Notification Engine ───────────────────────────────────────────────
export async function runNotificationEngine() {
  try {
    const { api } = await import('./api');

    const [budgetsRes, expensesRes] = await Promise.all([
      api.getBudgets().catch(() => ({ budgets: [] })),
      api.getExpenses().catch(() => ({ expenses: [] })),
    ]);

    const budgets = budgetsRes.budgets || [];
    const expenses = expensesRes.expenses || [];

    if (Array.isArray(budgets) && Array.isArray(expenses)) {
      const now = new Date();
      const monthExpenses = expenses.filter((e: { date: string }) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      for (const budget of budgets) {
        const spent = monthExpenses
          .filter((e: { category: string }) => e.category === budget.category)
          .reduce((s: number, e: { amount: number }) => s + (e.amount || 0), 0);

        const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        if (percent >= 100) {
          const existing = getNotifications().find(
            n => n.type === 'budget_alert' && n.title.includes(budget.category) && n.title.includes('exceeded')
          );
          if (!existing) {
            saveNotification({
              type: 'budget_alert',
              title: `🚨 Budget exceeded: ${budget.category}`,
              message: `You've spent ₹${spent.toFixed(0)} of ₹${budget.amount} budget (${percent.toFixed(0)}%)`,
              priority: 'high',
              actionUrl: '/budgets',
            });
          }
        } else if (percent >= 80) {
          const existing = getNotifications().find(
            n => n.type === 'budget_alert' && n.title.includes(budget.category) && n.title.includes('80%')
          );
          if (!existing) {
            saveNotification({
              type: 'budget_alert',
              title: `⚠️ 80% budget used: ${budget.category}`,
              message: `You've spent ₹${spent.toFixed(0)} of ₹${budget.amount} budget`,
              priority: 'medium',
              actionUrl: '/budgets',
            });
          }
        }
      }
    }

    const prefs = getPreferences();
    if (prefs.desktopEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (err) {
    console.error('Notification engine error:', err);
  }
}

export function sendBrowserNotification(title: string, body: string) {
  if (!isDesktopNotificationsAllowed()) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
}

export function notifyUser(
  notif: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'snoozedUntil' | 'priority'> & {
    priority?: NotificationPriority;
    desktopTitle?: string;
    desktopBody?: string;
  }
) {
  const saved = saveNotification({
    type: notif.type,
    title: notif.title,
    message: notif.message,
    actionUrl: notif.actionUrl,
    priority: notif.priority,
  });

  if (saved && isDesktopNotificationsAllowed()) {
    sendBrowserNotification(notif.desktopTitle || notif.title, notif.desktopBody || notif.message);
  }

  return saved;
}
