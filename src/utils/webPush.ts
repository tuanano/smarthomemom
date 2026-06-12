import { api } from './apiClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export interface NotificationSettings {
  expenseReminderEnabled?: boolean;
  expenseReminderHour?: number;
  expenseReminderMinute?: number;
  menuReminderEnabled?: boolean;
  menuReminderHour?: number;
  menuReminderMinute?: number;
}

/** Subscribe to Web Push and register subscription with backend. Returns true on success. */
export async function subscribeToWebPush(settings: NotificationSettings): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await api.post('/push/subscribe', { endpoint, keys, notificationSettings: settings });
    return true;
  } catch (err) {
    console.warn('[WebPush] Subscribe failed', err);
    return false;
  }
}

/** Update notification settings on an existing subscription without re-subscribing. */
export async function updateWebPushSettings(settings: NotificationSettings): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
    await api.post('/push/subscribe', { endpoint, keys, notificationSettings: settings });
  } catch (err) {
    console.warn('[WebPush] Update settings failed', err);
  }
}

/** Unsubscribe from Web Push and remove from backend. */
export async function unsubscribeFromWebPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await api.delete('/push/subscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  } catch (err) {
    console.warn('[WebPush] Unsubscribe failed', err);
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}
