/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim, skipWaiting } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
skipWaiting();
clientsClaim();

// SPA navigation fallback — serves index.html for all nav requests not in precache
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(import.meta.env.BASE_URL + 'index.html'), {
    denylist: [new RegExp(`^${import.meta.env.BASE_URL}api/`)],
  })
);

// ── Web Push: receive server-sent notifications ───────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: { title: string; body: string; tag?: string; icon?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SmartHomeMom', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || import.meta.env.BASE_URL + 'pwa-192x192.png',
      badge: import.meta.env.BASE_URL + 'pwa-192x192.png',
      tag: payload.tag || 'smm-push',
    })
  );
});

// ── Open app when user taps a notification ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(import.meta.env.BASE_URL);
    })
  );
});

// ── Periodic Background Sync ──────────────────────────────────────────────
// The main app writes settings + daily status to Cache API.
// When the PWA is backgrounded/closed, the browser fires 'periodicsync' here
// and we check conditions + show notifications without React needing to be running.

const BG_CACHE = 'smm-bg-data-v1';
const SETTINGS_KEY = 'https://smm.local/notification-settings';
const STATUS_KEY = 'https://smm.local/daily-status';

interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}

self.addEventListener('periodicsync', (event) => {
  const e = event as PeriodicSyncEvent;
  if (e.tag === 'smm-reminders') {
    e.waitUntil(checkAndNotify());
  }
});

interface BgNotificationSettings {
  enabled: boolean;
  expenseReminderEnabled: boolean;
  expenseReminderHour: number;
  expenseReminderMinute: number;
  menuReminderEnabled: boolean;
  menuReminderHour: number;
  menuReminderMinute: number;
}

interface BgDailyStatus {
  date: string; // yyyy-MM-dd
  hasTransactionsToday: boolean;
  hasMenuToday: boolean;
}

async function checkAndNotify(): Promise<void> {
  try {
    const cache = await caches.open(BG_CACHE);
    const [settingsRes, statusRes] = await Promise.all([
      cache.match(SETTINGS_KEY),
      cache.match(STATUS_KEY),
    ]);
    if (!settingsRes || !statusRes) return;

    const settings = (await settingsRes.json()) as BgNotificationSettings;
    const status = (await statusRes.json()) as BgDailyStatus;

    if (!settings.enabled) return;

    const now = new Date();
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    const today = now.toISOString().split('T')[0];

    // Only act on today's cached data (app was opened today)
    if (status.date !== today) return;

    const ICON = import.meta.env.BASE_URL + 'pwa-192x192.png';

    if (settings.expenseReminderEnabled && !status.hasTransactionsToday) {
      const rH = settings.expenseReminderHour ?? 20;
      const rM = settings.expenseReminderMinute ?? 0;
      if (nowH > rH || (nowH === rH && nowM >= rM)) {
        await self.registration.showNotification('💰 Nhắc nhập chi tiêu', {
          body: 'Hôm nay chưa có giao dịch nào. Đừng quên ghi lại thu chi nhé!',
          icon: ICON,
          badge: ICON,
          tag: 'smm-expense-reminder',
        });
      }
    }

    if (settings.menuReminderEnabled && !status.hasMenuToday) {
      const rH = settings.menuReminderHour ?? 12;
      const rM = settings.menuReminderMinute ?? 0;
      if (nowH > rH || (nowH === rH && nowM >= rM)) {
        await self.registration.showNotification('🍽️ Nhắc thực đơn', {
          body: 'Hôm nay chưa có thực đơn. Hãy mở app để lên kế hoạch bữa ăn!',
          icon: ICON,
          badge: ICON,
          tag: 'smm-menu-reminder',
        });
      }
    }
  } catch {
    // Cache unavailable — skip silently
  }
}
