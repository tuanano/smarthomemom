import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { useFamilyStore } from '../stores/familyStore';
import { useNotificationStore } from '../stores/notificationStore';
import { playNotificationSound } from '../utils/notificationSound';
import {
  syncNotificationSettingsToSW,
  syncDailyStatusToSW,
  registerPeriodicSync,
} from '../utils/swStatusCache';
import { format } from 'date-fns';
import { toDate } from '../types';

async function fireNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // Play sound regardless of Notification permission (app is in foreground)
  playNotificationSound();

  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const swReady = 'serviceWorker' in navigator
      ? await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>((r) => setTimeout(() => r(null), 3000)),
        ])
      : null;

    if (swReady) {
      await swReady.showNotification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
        badge: `${import.meta.env.BASE_URL}pwa-192x192.png`,
        tag: title,
      });
    } else {
      new Notification(title, { body, icon: `${import.meta.env.BASE_URL}pwa-192x192.png` });
    }
  } catch {
    // Notification API unavailable — banner only
  }
}

export function useReminderService() {
  const { user } = useAuthStore();
  const { transactions, budgets } = useFamilyStore();
  const {
    enabled,
    expenseReminderEnabled,
    expenseReminderHour,
    expenseReminderMinute,
    menuReminderEnabled,
    menuReminderHour,
    menuReminderMinute,
    budgetAlertEnabled,
    lastExpenseReminderDate,
    lastMenuReminderDate,
    notifiedBudgetIds,
    markExpenseReminder,
    markMenuReminder,
    addNotifiedBudget,
    checkAndResetBudgetMonth,
    addBanner,
  } = useNotificationStore();

  // Keep a stable ref for async callbacks that need latest values
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;

  // ── Sync settings to Cache API for Service Worker (background notifications) ──
  useEffect(() => {
    syncNotificationSettingsToSW({
      enabled,
      expenseReminderEnabled,
      expenseReminderHour,
      expenseReminderMinute,
      menuReminderEnabled,
      menuReminderHour,
      menuReminderMinute,
    });
  }, [enabled, expenseReminderEnabled, expenseReminderHour, expenseReminderMinute,
      menuReminderEnabled, menuReminderHour, menuReminderMinute]);

  // ── Sync daily status to Cache API for Service Worker ───────────────────
  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const hasTransactionsToday = transactions.some((t) => {
      const d = toDate(t.date);
      return format(d, 'yyyy-MM-dd') === today;
    });
    // Check menu asynchronously (Firestore offline cache keeps this fast)
    // Menu is stored by day-of-week key ('monday'…'sunday'), not ISO date
    const todayDayKey = format(new Date(), 'EEEE').toLowerCase();
    getDoc(doc(db, 'families', user.uid, 'menus', 'weekly_plan'))
      .then((snap) => {
        const days = snap.exists() ? (snap.data().days ?? {}) : {};
        const todayMeals = days[todayDayKey];
        const hasMenuToday = !!(
          todayMeals &&
          (todayMeals.breakfast?.length || todayMeals.lunch?.length || todayMeals.dinner?.length)
        );
        syncDailyStatusToSW({ date: today, hasTransactionsToday, hasMenuToday });
      })
      .catch(() => {
        syncDailyStatusToSW({ date: today, hasTransactionsToday, hasMenuToday: false });
      });
  }, [user, transactions]);

  // ── Register Periodic Background Sync (fires even when app is closed) ───
  useEffect(() => {
    if (!user || !enabled) return;
    registerPeriodicSync();
  }, [user, enabled]);

  // ── Monthly budget dedup reset ──────────────────────────────────────────
  useEffect(() => {
    if (user) checkAndResetBudgetMonth();
  }, [user]);

  // ── Budget alert (reactive) ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || !enabled || !budgetAlertEnabled || budgets.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    budgets.forEach((budget) => {
      if (notifiedBudgetIds.includes(budget.budgetId)) return;

      const spent = transactions
        .filter((t) => {
          if (t.type !== 'expense' || t.category !== budget.category) return false;
          const d = toDate(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const threshold = budget.alertThreshold ?? 0.8;
      if (budget.limitAmount > 0 && spent / budget.limitAmount >= threshold) {
        const pct = Math.round((spent / budget.limitAmount) * 100);
        const body = `Danh mục "${budget.category}" đã dùng ${pct}% hạn mức tháng này!`;
        fireNotification('⚠️ Cảnh báo ngân sách', body);
        addBanner({ id: `budget_${budget.budgetId}`, message: `⚠️ ${body}`, type: 'budget' });
        addNotifiedBudget(budget.budgetId);
      }
    });
  }, [budgets, transactions, enabled, budgetAlertEnabled, user]);

  // ── Time-based reminders ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !enabled) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Helper: schedule or run immediately if time already passed today
    function scheduleAt(hour: number, minute: number, alreadyDoneDate: string | null, run: () => void) {
      const target = new Date();
      target.setHours(hour, minute, 0, 0);
      const msUntil = target.getTime() - now.getTime();

      if (msUntil > 0) {
        timers.push(setTimeout(run, msUntil));
      } else if (alreadyDoneDate !== today) {
        // Passed today but not yet notified — run immediately
        run();
      }
    }

    if (expenseReminderEnabled) {
      scheduleAt(expenseReminderHour, expenseReminderMinute, lastExpenseReminderDate, () => {
        const txToday = transactionsRef.current.filter((t) => {
          const d = toDate(t.date);
          return format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        });
        if (txToday.length === 0) {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          fireNotification('💰 Nhắc nhập chi tiêu', 'Hôm nay chưa có giao dịch nào. Đừng quên ghi lại thu chi nhé!');
          addBanner({ id: `expense_${todayStr}`, message: '💰 Hôm nay chưa có giao dịch nào. Đừng quên ghi lại thu chi nhé!', type: 'expense' });
          markExpenseReminder(todayStr);
        }
      });
    }

    if (menuReminderEnabled) {
      scheduleAt(menuReminderHour, menuReminderMinute, lastMenuReminderDate, async () => {
        if (!user) return;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        // Menu stored by day-of-week key, not ISO date
        const todayKey = format(new Date(), 'EEEE').toLowerCase();
        try {
          const snap = await getDoc(doc(db, 'families', user.uid, 'menus', 'weekly_plan'));
          const days = snap.exists() ? (snap.data().days ?? {}) : {};
          const todayMeals = days[todayKey];
          const isEmpty =
            !todayMeals ||
            (!todayMeals.breakfast?.length &&
              !todayMeals.lunch?.length &&
              !todayMeals.dinner?.length);
          if (isEmpty) {
            fireNotification('🍽️ Nhắc thực đơn', 'Hôm nay chưa có thực đơn. Hãy vào tab Thực Đơn để lên kế hoạch!');
            addBanner({ id: `menu_${todayStr}`, message: '🍽️ Hôm nay chưa có thực đơn. Hãy vào tab Thực Đơn để lên kế hoạch!', type: 'menu' });
            markMenuReminder(todayStr);
          }
        } catch {
          // Firestore unavailable — skip
        }
      });
    }

    return () => timers.forEach(clearTimeout);
  }, [user, enabled, expenseReminderEnabled, expenseReminderHour, expenseReminderMinute,
      menuReminderEnabled, menuReminderHour, menuReminderMinute,
      lastExpenseReminderDate, lastMenuReminderDate]);
}
