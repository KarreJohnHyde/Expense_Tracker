export type VoiceActionType = 'navigate' | 'open_add_expense' | 'unknown';

export interface VoiceAction {
  type: VoiceActionType;
  route?: string;
  message: string;
}

const ROUTE_COMMANDS: Array<{ route: string; phrases: string[]; message: string }> = [
  { route: '/', phrases: ['dashboard', 'home'], message: 'Opening dashboard' },
  { route: '/subscriptions', phrases: ['subscription', 'subscriptions'], message: 'Opening subscriptions' },
  { route: '/analytics', phrases: ['analytics', 'reports', 'insights page'], message: 'Opening analytics' },
  { route: '/budgets', phrases: ['budget', 'budgets'], message: 'Opening budgets' },
  { route: '/stocks', phrases: ['stock', 'stocks', 'stock market', 'share market'], message: 'Opening stock market' },
  { route: '/currency', phrases: ['currency', 'forex', 'exchange rate', 'fx trading'], message: 'Opening currency trading' },
  { route: '/crypto', phrases: ['crypto', 'bitcoin', 'ethereum'], message: 'Opening crypto market' },
  { route: '/wallets', phrases: ['wallet', 'wallets', 'upi wallet'], message: 'Opening wallets' },
  { route: '/sms-parser', phrases: ['sms', 'bank sms', 'message parser'], message: 'Opening SMS parser' },
  { route: '/messaging', phrases: ['messaging', 'chat', 'messages'], message: 'Opening messaging' },
  { route: '/scan-receipt', phrases: ['scan receipt', 'receipt scanner', 'scan bill'], message: 'Opening receipt scanner' },
  { route: '/gallery', phrases: ['gallery', 'photos'], message: 'Opening gallery' },
  { route: '/qr-generator', phrases: ['qr', 'qr generator', 'barcode generator'], message: 'Opening QR generator' },
  { route: '/reconciliation', phrases: ['reconciliation', 'reconcile'], message: 'Opening reconciliation' },
  { route: '/automations', phrases: ['automation', 'automations', 'webhook', 'webhooks'], message: 'Opening automations' },
  { route: '/profile', phrases: ['profile', 'account profile'], message: 'Opening profile' },
  { route: '/about', phrases: ['about', 'about app'], message: 'Opening about page' },
  { route: '/settings', phrases: ['settings', 'preferences'], message: 'Opening settings' },
];

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

export function parseVoiceAction(rawText: string): VoiceAction {
  const text = rawText.toLowerCase().trim();

  const openExpenseIntent = hasAny(text, ['add expense', 'new expense', 'open expense', 'record expense', 'log expense']) &&
    !hasAny(text, ['stock', 'crypto', 'settings', 'profile', 'scan receipt', 'analytics', 'budget']);

  if (openExpenseIntent) {
    return {
      type: 'open_add_expense',
      route: '/',
      message: 'Opening expense entry',
    };
  }

  if (hasAny(text, ['open ', 'go to ', 'show ', 'take me to ', 'navigate to ', 'switch to '])) {
    for (const route of ROUTE_COMMANDS) {
      if (hasAny(text, route.phrases)) {
        return {
          type: 'navigate',
          route: route.route,
          message: route.message,
        };
      }
    }
  }

  return {
    type: 'unknown',
    message: 'No app command detected',
  };
}
