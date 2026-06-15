import { create } from 'zustand';
import { db } from '../firebase';
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import type { Family, Wallet, Transaction, Budget, CustomCategory, CustomIngredient, FavoriteMenu } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_INGREDIENTS } from '../core/constants';
import { api, serializeDates } from '../utils/apiClient';

interface FamilyState {
  family: Family | null;
  familyLoading: boolean;
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  availableIngredients: string[];

  // Setters
  setFamily: (family: Family | null) => void;
  setWallets: (wallets: Wallet[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  setAvailableIngredients: (ingredients: string[]) => void;
  
  subscriptionError: string | null;
  clearSubscriptionError: () => void;

  // Realtime Subscriptions
  subscribeFamily: (familyId: string) => () => void;
  subscribeWallets: (familyId: string) => () => void;
  subscribeTransactions: (familyId: string) => () => void;
  subscribeBudgets: (familyId: string) => () => void;
  subscribeIngredients: (familyId: string) => () => void;
  // Note: customCategories, customIngredients, favoriteMenus are embedded in the family
  // document and loaded by subscribeFamily — no separate subscriptions needed.
  
  // Database Actions
  saveFamily: (family: Family) => Promise<void>;
  createWallet: (familyId: string, wallet: Omit<Wallet, 'createdAt'>) => Promise<void>;
  createTransaction: (familyId: string, transaction: Transaction) => Promise<void>;
  deleteTransaction: (familyId: string, transaction: Transaction) => Promise<void>;
  updateTransaction: (familyId: string, oldTx: Transaction, newTx: Transaction) => Promise<void>;
  saveBudget: (familyId: string, budget: Budget) => Promise<void>;
  deleteWallet: (familyId: string, walletId: string) => Promise<void>;
  updateWallet: (familyId: string, walletId: string, updates: Partial<Pick<Wallet, 'name' | 'colorCode' | 'iconName' | 'includeInBalance' | 'balance'>>) => Promise<void>;
  deleteBudget: (familyId: string, budgetId: string) => Promise<void>;
  saveIngredients: (familyId: string, ingredients: string[]) => Promise<void>;
  
  customCategories: CustomCategory[];
  customIngredients: CustomIngredient[];
  favoriteMenus: FavoriteMenu[];

  setCustomCategories: (categories: CustomCategory[]) => void;
  setCustomIngredients: (ingredients: CustomIngredient[]) => void;
  setFavoriteMenus: (menus: FavoriteMenu[]) => void;

  addCustomCategory: (familyId: string, category: CustomCategory) => Promise<void>;
  deleteCustomCategory: (familyId: string, catId: string) => Promise<void>;

  addCustomIngredient: (familyId: string, ingredient: CustomIngredient) => Promise<void>;
  deleteCustomIngredient: (familyId: string, ingId: string) => Promise<void>;

  saveFavoriteMenu: (familyId: string, favMenu: FavoriteMenu) => Promise<void>;
  deleteFavoriteMenu: (familyId: string, favMenuId: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  familyLoading: true,
  wallets: [],
  transactions: [],
  budgets: [],
  availableIngredients: [],
  customCategories: [],
  customIngredients: [],
  favoriteMenus: [],
  
  subscriptionError: null,
  clearSubscriptionError: () => set({ subscriptionError: null }),

  setFamily: (family) => set({ family }),
  setWallets: (wallets) => set({ wallets }),
  setTransactions: (transactions) => set({ transactions }),
  setBudgets: (budgets) => set({ budgets }),
  setAvailableIngredients: (ingredients) => set({ availableIngredients: ingredients }),
  setCustomCategories: (customCategories) => set({ customCategories }),
  setCustomIngredients: (customIngredients) => set({ customIngredients }),
  setFavoriteMenus: (favoriteMenus) => set({ favoriteMenus }),
  
  subscribeFamily: (familyId) => {
    let active = true;
    set({ familyLoading: true });
    const unsub = onSnapshot(
      doc(db, 'families', familyId),
      (docSnap) => {
        if (!active) return;
        if (!docSnap.exists()) {
          set({
            family: null,
            customCategories: [],
            customIngredients: [],
            favoriteMenus: [],
            familyLoading: false,
          });
          return;
        }
        const familyData = docSnap.data() as Family;
        const categories = familyData.customCategories && familyData.customCategories.length > 0
          ? familyData.customCategories
          : DEFAULT_CATEGORIES;
        const ingredients = familyData.customIngredients && familyData.customIngredients.length > 0
          ? familyData.customIngredients
          : DEFAULT_INGREDIENTS;
        set({
          family: {
            ...familyData,
            customCategories: categories,
            customIngredients: ingredients
          },
          customCategories: categories,
          customIngredients: ingredients,
          favoriteMenus: familyData.favoriteMenus || [],
          familyLoading: false,
        });
      },
      (error) => {
        if (!active) return;
        console.error('[subscribeFamily] Firestore error:', error);
        set({ familyLoading: false, subscriptionError: 'Không thể tải dữ liệu gia đình. Vui lòng kiểm tra kết nối mạng.' });
      }
    );
    return () => { active = false; unsub(); };
  },
  
  subscribeWallets: (familyId) => {
    let active = true;
    const q = query(collection(db, 'families', familyId, 'wallets'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        set({ wallets: snapshot.docs.map(d => d.data() as Wallet) });
      },
      (error) => {
        if (!active) return;
        console.error('[subscribeWallets] Firestore error:', error);
      }
    );
    return () => { active = false; unsub(); };
  },

  subscribeTransactions: (familyId) => {
    let active = true;
    const q = query(
      collection(db, 'families', familyId, 'transactions'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        set({ transactions: snapshot.docs.map(d => d.data() as Transaction) });
      },
      (error) => {
        if (!active) return;
        console.error('[subscribeTransactions] Firestore error:', error);
      }
    );
    return () => { active = false; unsub(); };
  },

  subscribeBudgets: (familyId) => {
    let active = true;
    const unsub = onSnapshot(
      collection(db, 'families', familyId, 'budgets'),
      (snapshot) => {
        if (!active) return;
        set({ budgets: snapshot.docs.map(d => d.data() as Budget) });
      },
      (error) => {
        if (!active) return;
        console.error('[subscribeBudgets] Firestore error:', error);
      }
    );
    return () => { active = false; unsub(); };
  },

  subscribeIngredients: (familyId) => {
    let active = true;
    const unsub = onSnapshot(
      doc(db, 'families', familyId, 'settings', 'ingredients'),
      (docSnap) => {
        if (!active) return;
        set({ availableIngredients: docSnap.exists() ? (docSnap.data().availableIngredients || []) : [] });
      },
      (error) => {
        if (!active) return;
        console.error('[subscribeIngredients] Firestore error:', error);
      }
    );
    return () => { active = false; unsub(); };
  },

  saveFamily: async (family) => {
    await api.put('/families/me', family);
    set({ family });
  },

  createWallet: async (_familyId, wallet) => {
    await api.post('/families/me/wallets', wallet);
  },

  updateWallet: async (_familyId, walletId, updates) => {
    await api.put(`/families/me/wallets/${walletId}`, updates);
    set(state => ({
      wallets: state.wallets.map(w => w.walletId === walletId ? { ...w, ...updates } : w),
    }));
  },

  createTransaction: async (_familyId, transaction) => {
    await api.post('/families/me/transactions', serializeDates(transaction));
  },

  deleteTransaction: async (_familyId, transaction) => {
    await api.delete(`/families/me/transactions/${transaction.transactionId}`);
  },

  updateTransaction: async (_familyId, oldTx, newTx) => {
    await api.put(`/families/me/transactions/${oldTx.transactionId}`, serializeDates(newTx));
  },

  saveBudget: async (_familyId, budget) => {
    await api.post('/families/me/budgets', serializeDates(budget));
  },

  deleteWallet: async (_familyId, walletId) => {
    const { family, wallets } = get();
    await api.delete(`/families/me/wallets/${walletId}`);
    if (family?.defaultWalletId === walletId) {
      const remaining = wallets.filter(w => w.walletId !== walletId);
      await api.put('/families/me', { defaultWalletId: remaining[0]?.walletId ?? null });
    }
  },

  deleteBudget: async (_familyId, budgetId) => {
    await api.delete(`/families/me/budgets/${budgetId}`);
  },

  saveIngredients: async (_familyId, ingredients) => {
    await api.put('/families/me/settings/ingredients', { availableIngredients: ingredients });
    set({ availableIngredients: ingredients });
  },

  addCustomCategory: async (_familyId, category) => {
    const family = get().family;
    if (!family) return;
    const current = family.customCategories || [];
    const exists = current.some(c => c.id === category.id);
    const updated = exists
      ? current.map(c => c.id === category.id ? category : c)
      : [...current, category];
    await api.put('/families/me', { customCategories: updated });
    set(state => ({
      customCategories: updated,
      family: state.family ? { ...state.family, customCategories: updated } : null,
    }));
  },

  deleteCustomCategory: async (_familyId, catId) => {
    const { family, budgets } = get();
    if (!family) return;
    const deletedCat = (family.customCategories || []).find(c => c.id === catId);
    const updated = (family.customCategories || []).filter(c => c.id !== catId);
    await api.put('/families/me', { customCategories: updated });
    set(state => ({
      customCategories: updated,
      family: state.family ? { ...state.family, customCategories: updated } : null,
    }));
    if (deletedCat) {
      const affected = budgets.filter(b => b.category === deletedCat.name);
      await Promise.all(affected.map(b => api.delete(`/families/me/budgets/${b.budgetId}`)));
    }
  },

  addCustomIngredient: async (_familyId, ingredient) => {
    const family = get().family;
    if (!family) return;
    const current = family.customIngredients || [];
    const exists = current.some(i => i.id === ingredient.id);
    const updated = exists
      ? current.map(i => i.id === ingredient.id ? ingredient : i)
      : [...current, ingredient];
    await api.put('/families/me', { customIngredients: updated });
    set(state => ({
      customIngredients: updated,
      family: state.family ? { ...state.family, customIngredients: updated } : null,
    }));
  },

  deleteCustomIngredient: async (_familyId, ingId) => {
    const { family, availableIngredients } = get();
    if (!family) return;
    const updated = (family.customIngredients || []).filter(i => i.id !== ingId);
    await api.put('/families/me', { customIngredients: updated });
    set(state => ({
      customIngredients: updated,
      family: state.family ? { ...state.family, customIngredients: updated } : null,
    }));
    if (availableIngredients.includes(ingId)) {
      const newAvailable = availableIngredients.filter(id => id !== ingId);
      await api.put('/families/me/settings/ingredients', { availableIngredients: newAvailable });
      set({ availableIngredients: newAvailable });
    }
  },

  saveFavoriteMenu: async (_familyId, favMenu) => {
    const family = get().family;
    if (!family) return;
    const current = family.favoriteMenus || [];
    const exists = current.some(m => m.favMenuId === favMenu.favMenuId);
    const updated = exists
      ? current.map(m => m.favMenuId === favMenu.favMenuId ? favMenu : m)
      : [...current, favMenu];
    await api.put('/families/me', { favoriteMenus: updated });
  },

  deleteFavoriteMenu: async (_familyId, favMenuId) => {
    const family = get().family;
    if (!family) return;
    const updated = (family.favoriteMenus || []).filter(m => m.favMenuId !== favMenuId);
    await api.put('/families/me', { favoriteMenus: updated });
  }
}));
