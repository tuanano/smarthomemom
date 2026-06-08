import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncNotificationSettingsToSW } from '../utils/swStatusCache';

export interface NotificationBanner {
  id: string;
  message: string;
  type: 'expense' | 'menu' | 'budget';
}

interface NotificationState {
  // Settings (persisted)
  enabled: boolean;
  expenseReminderEnabled: boolean;
  expenseReminderHour: number;
  expenseReminderMinute: number;
  menuReminderEnabled: boolean;
  menuReminderHour: number;
  menuReminderMinute: number;
  budgetAlertEnabled: boolean;

  // Dedup tracking (persisted)
  lastExpenseReminderDate: string | null;
  lastMenuReminderDate: string | null;
  notifiedBudgetIds: string[];
  notifiedBudgetMonth: number; // 0-11, reset notifiedBudgetIds when month changes

  // In-app banners (in-memory only, not persisted)
  banners: NotificationBanner[];

  // Actions
  updateSettings: (s: Partial<Pick<NotificationState,
    'enabled' | 'expenseReminderEnabled' | 'expenseReminderHour' | 'expenseReminderMinute' |
    'menuReminderEnabled' | 'menuReminderHour' | 'menuReminderMinute' | 'budgetAlertEnabled'
  >>) => void;
  markExpenseReminder: (date: string) => void;
  markMenuReminder: (date: string) => void;
  addNotifiedBudget: (budgetId: string) => void;
  checkAndResetBudgetMonth: () => void;
  addBanner: (banner: NotificationBanner) => void;
  dismissBanner: (id: string) => void;
  clearBanners: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      enabled: false,
      expenseReminderEnabled: true,
      expenseReminderHour: 20,
      expenseReminderMinute: 0,
      menuReminderEnabled: true,
      menuReminderHour: 12,
      menuReminderMinute: 0,
      budgetAlertEnabled: true,

      lastExpenseReminderDate: null,
      lastMenuReminderDate: null,
      notifiedBudgetIds: [],
      notifiedBudgetMonth: new Date().getMonth(),

      banners: [],

      updateSettings: (s) => {
        const prev = get();
        const next = { ...prev, ...s };
        set(next);
        syncNotificationSettingsToSW({
          enabled: next.enabled,
          expenseReminderEnabled: next.expenseReminderEnabled,
          expenseReminderHour: next.expenseReminderHour,
          expenseReminderMinute: next.expenseReminderMinute,
          menuReminderEnabled: next.menuReminderEnabled,
          menuReminderHour: next.menuReminderHour,
          menuReminderMinute: next.menuReminderMinute,
        });
      },

      markExpenseReminder: (date) => set({ lastExpenseReminderDate: date }),

      markMenuReminder: (date) => set({ lastMenuReminderDate: date }),

      addNotifiedBudget: (budgetId) => set((state) => ({
        notifiedBudgetIds: state.notifiedBudgetIds.includes(budgetId)
          ? state.notifiedBudgetIds
          : [...state.notifiedBudgetIds, budgetId],
      })),

      checkAndResetBudgetMonth: () => {
        const currentMonth = new Date().getMonth();
        if (get().notifiedBudgetMonth !== currentMonth) {
          set({ notifiedBudgetIds: [], notifiedBudgetMonth: currentMonth });
        }
      },

      addBanner: (banner) => set((state) => {
        if (state.banners.some(b => b.type === banner.type && b.id === banner.id)) {
          return state;
        }
        return { banners: [...state.banners, banner] };
      }),

      dismissBanner: (id) => set((state) => ({
        banners: state.banners.filter(b => b.id !== id),
      })),

      clearBanners: () => set({ banners: [] }),
    }),
    {
      name: 'smm_notifications',
      // Don't persist in-memory banners
      partialize: (state) => ({
        enabled: state.enabled,
        expenseReminderEnabled: state.expenseReminderEnabled,
        expenseReminderHour: state.expenseReminderHour,
        expenseReminderMinute: state.expenseReminderMinute,
        menuReminderEnabled: state.menuReminderEnabled,
        menuReminderHour: state.menuReminderHour,
        menuReminderMinute: state.menuReminderMinute,
        budgetAlertEnabled: state.budgetAlertEnabled,
        lastExpenseReminderDate: state.lastExpenseReminderDate,
        lastMenuReminderDate: state.lastMenuReminderDate,
        notifiedBudgetIds: state.notifiedBudgetIds,
        notifiedBudgetMonth: state.notifiedBudgetMonth,
      }),
    }
  )
);
