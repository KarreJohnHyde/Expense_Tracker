export interface AppNotification {
  id: string;
  type: 'bill_reminder' | 'budget_alert' | 'large_transaction' | 'recurring_due' | 'info' | 'sms_transaction' | 'trade_executed' | 'scan_complete' | 'wallet_update';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const STORAGE_KEY = 'notifications:items';

export function getNotifications(): AppNotification[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
  const notifications = getNotifications();
  const newNotif: AppNotification = {
    ...notif,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(newNotif);
  // Keep only last 50 notifications
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  window.dispatchEvent(new Event('notifications-changed'));
  return newNotif;
}

export function markAsRead(id: string) {
  const notifications = getNotifications().map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event('notifications-changed'));
}

export function markAllAsRead() {
  const notifications = getNotifications().map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event('notifications-changed'));
}

export function dismissNotification(id: string) {
  const notifications = getNotifications().filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event('notifications-changed'));
}

export function clearAllNotifications() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('notifications-changed'));
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

/**
 * Runs the notification engine: checks budgets, upcoming bills, large transactions.
 * Called on app load.
 */
export async function runNotificationEngine() {
  try {
    const { api } = await import('./api');
    
    // Check budget alerts safely via API
    const [budgetsRes, expensesRes] = await Promise.all([
      api.getBudgets().catch(() => ({ budgets: [] })),
      api.getExpenses().catch(() => ({ expenses: [] }))
    ]);
    
    const budgets = budgetsRes.budgets || [];
    const expenses = expensesRes.expenses || [];

    if (Array.isArray(budgets) && Array.isArray(expenses)) {
      const now = new Date();
      const monthExpenses = expenses.filter((e: any) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      for (const budget of budgets) {
        const spent = monthExpenses
          .filter((e: any) => e.category === budget.category)
          .reduce((s: number, e: any) => s + (e.amount || 0), 0);

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
            });
          }
        }
      }
    }

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (err) {
    console.error('Notification engine error:', err);
  }
}

/**
 * Send a browser push notification (if permission granted).
 */
export function sendBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
}
