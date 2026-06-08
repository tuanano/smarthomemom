// Writes notification settings + daily status into Cache API so the Service Worker
// can read them during Periodic Background Sync (when React is NOT running).

const BG_CACHE = 'smm-bg-data-v1';
const SETTINGS_KEY = 'https://smm.local/notification-settings';
const STATUS_KEY = 'https://smm.local/daily-status';

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function syncNotificationSettingsToSW(settings: {
  enabled: boolean;
  expenseReminderEnabled: boolean;
  expenseReminderHour: number;
  expenseReminderMinute: number;
  menuReminderEnabled: boolean;
  menuReminderHour: number;
  menuReminderMinute: number;
}): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(BG_CACHE);
    await cache.put(new Request(SETTINGS_KEY), jsonResponse(settings));
  } catch {
    // Cache API unavailable
  }
}

export async function syncDailyStatusToSW(status: {
  date: string;            // yyyy-MM-dd
  hasTransactionsToday: boolean;
  hasMenuToday: boolean;
}): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(BG_CACHE);
    await cache.put(new Request(STATUS_KEY), jsonResponse(status));
  } catch {
    // Cache API unavailable
  }
}

// Register Periodic Background Sync (Chrome Android / Desktop).
// Gracefully no-ops if browser doesn't support it.
export async function registerPeriodicSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ps = (reg as any).periodicSync;
    if (!ps) return;
    const tags: string[] = await ps.getTags();
    if (!tags.includes('smm-reminders')) {
      await ps.register('smm-reminders', {
        minInterval: 60 * 60 * 1000, // hint: 1 hour (browser decides actual frequency)
      });
    }
  } catch {
    // PeriodicSync permission denied or not supported — falls back to foreground-only
  }
}
