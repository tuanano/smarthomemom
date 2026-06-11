import { create } from 'zustand';
import { db } from '../firebase';
import {
  doc,
  collection,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  query,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import type { Family, Wallet, Transaction, Budget, CustomCategory, CustomIngredient, FavoriteMenu } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_INGREDIENTS } from '../core/constants';

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
    await setDoc(doc(db, 'families', family.familyId), family);
    set({ family });
  },
  
  createWallet: async (familyId, wallet) => {
    const walletDocRef = doc(collection(db, 'families', familyId, 'wallets'), wallet.walletId);
    await setDoc(walletDocRef, {
      ...wallet,
      createdAt: new Date()
    });
  },

  updateWallet: async (familyId, walletId, updates) => {
    const walletDocRef = doc(db, 'families', familyId, 'wallets', walletId);
    await updateDoc(walletDocRef, updates);
    set(state => ({
      wallets: state.wallets.map(w => w.walletId === walletId ? { ...w, ...updates } : w)
    }));
  },
  
  createTransaction: async (familyId, transaction) => {
    const transactionDocRef = doc(collection(db, 'families', familyId, 'transactions'), transaction.transactionId);
    const walletDocRef = doc(db, 'families', familyId, 'wallets', transaction.walletId);
    
    // Use Firestore Transaction to update wallet balance atomicaly
    await runTransaction(db, async (firestoreTransaction) => {
      const walletDoc = await firestoreTransaction.get(walletDocRef);
      if (!walletDoc.exists()) {
        throw new Error("Wallet does not exist!");
      }
      
      const currentBalance = walletDoc.data().balance || 0;
      let newBalance = currentBalance;
      
      if (transaction.type === 'expense') {
        newBalance -= transaction.amount;
      } else if (transaction.type === 'income') {
        newBalance += transaction.amount;
      } else if (transaction.type === 'transfer' && transaction.toWalletId) {
        newBalance -= transaction.amount;
        const targetWalletDocRef = doc(db, 'families', familyId, 'wallets', transaction.toWalletId);
        const targetWalletDoc = await firestoreTransaction.get(targetWalletDocRef);
        if (!targetWalletDoc.exists()) throw new Error("Ví nhận không tồn tại!");
        const targetBalance = targetWalletDoc.data().balance || 0;
        firestoreTransaction.update(targetWalletDocRef, { balance: targetBalance + transaction.amount });
      }

      firestoreTransaction.set(transactionDocRef, transaction);
      firestoreTransaction.update(walletDocRef, { balance: newBalance });
    });
  },
  
  deleteTransaction: async (familyId, transaction) => {
    const transactionDocRef = doc(db, 'families', familyId, 'transactions', transaction.transactionId);
    const walletDocRef = doc(db, 'families', familyId, 'wallets', transaction.walletId);
    
    await runTransaction(db, async (firestoreTransaction) => {
      const walletDoc = await firestoreTransaction.get(walletDocRef);
      if (!walletDoc.exists()) {
        throw new Error("Wallet does not exist!");
      }
      
      const currentBalance = walletDoc.data().balance || 0;
      let newBalance = currentBalance;
      
      // Reverse transaction effect
      if (transaction.type === 'expense') {
        newBalance += transaction.amount;
      } else if (transaction.type === 'income') {
        newBalance -= transaction.amount;
      } else if (transaction.type === 'transfer' && transaction.toWalletId) {
        newBalance += transaction.amount;
        const targetWalletDocRef = doc(db, 'families', familyId, 'wallets', transaction.toWalletId);
        const targetWalletDoc = await firestoreTransaction.get(targetWalletDocRef);
        if (!targetWalletDoc.exists()) throw new Error("Ví nhận không tồn tại!");
        const targetBalance = targetWalletDoc.data().balance || 0;
        firestoreTransaction.update(targetWalletDocRef, { balance: targetBalance - transaction.amount });
      }

      firestoreTransaction.delete(transactionDocRef);
      firestoreTransaction.update(walletDocRef, { balance: newBalance });
    });
  },

  updateTransaction: async (familyId, oldTx, newTx) => {
    const oldTxDocRef = doc(db, 'families', familyId, 'transactions', oldTx.transactionId);
    const newTxDocRef = doc(db, 'families', familyId, 'transactions', newTx.transactionId);
    const oldWalletDocRef = doc(db, 'families', familyId, 'wallets', oldTx.walletId);
    const newWalletDocRef = doc(db, 'families', familyId, 'wallets', newTx.walletId);

    await runTransaction(db, async (firestoreTransaction) => {
      // --- READ PHASE ---
      
      // 1. Fetch old wallet
      const oldWalletDoc = await firestoreTransaction.get(oldWalletDocRef);
      if (!oldWalletDoc.exists()) throw new Error("Old wallet not found");
      
      // 2. Fetch new wallet (if different)
      let newWalletDoc = oldWalletDoc;
      if (oldTx.walletId !== newTx.walletId) {
        const fetchNewWallet = await firestoreTransaction.get(newWalletDocRef);
        if (!fetchNewWallet.exists()) throw new Error("New wallet not found");
        newWalletDoc = fetchNewWallet;
      }
      
      // 3. Fetch old transfer target wallet (if it was a transfer)
      let oldTargetDoc: any = null;
      if (oldTx.type === 'transfer' && oldTx.toWalletId) {
        const oldTargetRef = doc(db, 'families', familyId, 'wallets', oldTx.toWalletId);
        oldTargetDoc = await firestoreTransaction.get(oldTargetRef);
      }
      
      // 4. Fetch new transfer target wallet (if it is a transfer)
      let newTargetDoc: any = null;
      if (newTx.type === 'transfer' && newTx.toWalletId) {
        if (oldTx.type === 'transfer' && oldTx.toWalletId === newTx.toWalletId && oldTargetDoc) {
          newTargetDoc = oldTargetDoc;
        } else {
          const newTargetRef = doc(db, 'families', familyId, 'wallets', newTx.toWalletId);
          newTargetDoc = await firestoreTransaction.get(newTargetRef);
        }
      }
      
      // --- WRITE PHASE ---
      
      // Reverse old transaction effect
      let oldBal = oldWalletDoc.data().balance || 0;
      if (oldTx.type === 'expense') {
        oldBal += oldTx.amount;
      } else if (oldTx.type === 'income') {
        oldBal -= oldTx.amount;
      } else if (oldTx.type === 'transfer' && oldTx.toWalletId && oldTargetDoc && oldTargetDoc.exists()) {
        oldBal += oldTx.amount;
        const oldTargetRef = doc(db, 'families', familyId, 'wallets', oldTx.toWalletId);
        const oldTargetBalance = oldTargetDoc.data().balance || 0;
        firestoreTransaction.update(oldTargetRef, { balance: oldTargetBalance - oldTx.amount });
      }

      // If same wallet, copy reversed balance
      let newBal = (oldTx.walletId === newTx.walletId) ? oldBal : (newWalletDoc.data().balance || 0);

      // Apply new transaction effect
      if (newTx.type === 'expense') {
        newBal -= newTx.amount;
      } else if (newTx.type === 'income') {
        newBal += newTx.amount;
      } else if (newTx.type === 'transfer' && newTx.toWalletId) {
        if (!newTargetDoc || !newTargetDoc.exists()) throw new Error("Ví nhận không tồn tại!");
        newBal -= newTx.amount;
        const newTargetRef = doc(db, 'families', familyId, 'wallets', newTx.toWalletId);
        let currentTargetBal = newTargetDoc.data().balance || 0;
        if (oldTx.type === 'transfer' && oldTx.toWalletId === newTx.toWalletId) {
          currentTargetBal -= oldTx.amount;
        }
        firestoreTransaction.update(newTargetRef, { balance: currentTargetBal + newTx.amount });
      }

      // Save balances
      if (oldTx.walletId === newTx.walletId) {
        firestoreTransaction.update(oldWalletDocRef, { balance: newBal });
      } else {
        firestoreTransaction.update(oldWalletDocRef, { balance: oldBal });
        firestoreTransaction.update(newWalletDocRef, { balance: newBal });
      }

      // Save Tx
      if (oldTx.transactionId !== newTx.transactionId) {
        firestoreTransaction.delete(oldTxDocRef);
      }
      firestoreTransaction.set(newTxDocRef, newTx);
    });
  },
  
  saveBudget: async (familyId, budget) => {
    await setDoc(doc(db, 'families', familyId, 'budgets', budget.budgetId), budget);
  },
  
  deleteWallet: async (familyId, walletId) => {
    const { family, wallets } = get();
    const remainingWallets = wallets.filter(w => w.walletId !== walletId);
    await deleteDoc(doc(db, 'families', familyId, 'wallets', walletId));
    if (family?.defaultWalletId === walletId) {
      const newDefaultId = remainingWallets[0]?.walletId ?? null;
      await setDoc(doc(db, 'families', familyId), { ...family, defaultWalletId: newDefaultId });
    }
  },

  deleteBudget: async (familyId, budgetId) => {
    await deleteDoc(doc(db, 'families', familyId, 'budgets', budgetId));
  },

  saveIngredients: async (familyId, ingredients) => {
    await setDoc(doc(db, 'families', familyId, 'settings', 'ingredients'), {
      availableIngredients: ingredients,
      updatedAt: new Date()
    });
    set({ availableIngredients: ingredients });
  },

  addCustomCategory: async (familyId, category) => {
    const family = get().family;
    if (!family) return;
    const current = family.customCategories || [];
    const exists = current.some(c => c.id === category.id);
    const updated = exists 
      ? current.map(c => c.id === category.id ? category : c)
      : [...current, category];
    const updatedFamily = { ...family, customCategories: updated };
    await setDoc(doc(db, 'families', familyId), updatedFamily);
  },

  deleteCustomCategory: async (familyId, catId) => {
    const { family, budgets } = get();
    if (!family) return;
    const current = family.customCategories || [];
    const deletedCat = current.find(c => c.id === catId);
    const updated = current.filter(c => c.id !== catId);
    const updatedFamily = { ...family, customCategories: updated };
    await setDoc(doc(db, 'families', familyId), updatedFamily);
    if (deletedCat) {
      const affectedBudgets = budgets.filter(b => b.category === deletedCat.name);
      await Promise.all(
        affectedBudgets.map(b => deleteDoc(doc(db, 'families', familyId, 'budgets', b.budgetId)))
      );
    }
  },

  addCustomIngredient: async (familyId, ingredient) => {
    const family = get().family;
    if (!family) return;
    const current = family.customIngredients || [];
    const exists = current.some(i => i.id === ingredient.id);
    const updated = exists
      ? current.map(i => i.id === ingredient.id ? ingredient : i)
      : [...current, ingredient];
    const updatedFamily = { ...family, customIngredients: updated };
    await setDoc(doc(db, 'families', familyId), updatedFamily);
  },

  deleteCustomIngredient: async (familyId, ingId) => {
    const { family, availableIngredients } = get();
    if (!family) return;
    const current = family.customIngredients || [];
    const updated = current.filter(i => i.id !== ingId);
    const updatedFamily = { ...family, customIngredients: updated };
    await setDoc(doc(db, 'families', familyId), updatedFamily);
    const currentAvailable = availableIngredients;
    if (currentAvailable.includes(ingId)) {
      const newAvailable = currentAvailable.filter(id => id !== ingId);
      await setDoc(doc(db, 'families', familyId, 'settings', 'ingredients'), {
        availableIngredients: newAvailable,
        updatedAt: new Date()
      });
      set({ availableIngredients: newAvailable });
    }
  },

  saveFavoriteMenu: async (familyId, favMenu) => {
    const family = get().family;
    if (!family) return;
    const current = family.favoriteMenus || [];
    const exists = current.some(m => m.favMenuId === favMenu.favMenuId);
    const updated = exists
      ? current.map(m => m.favMenuId === favMenu.favMenuId ? favMenu : m)
      : [...current, favMenu];
    const updatedFamily = { ...family, favoriteMenus: updated };
    await setDoc(doc(db, 'families', familyId), updatedFamily);
  },

  deleteFavoriteMenu: async (familyId, favMenuId) => {
    const family = get().family;
    if (!family) return;
    const current = family.favoriteMenus || [];
    const updated = current.filter(m => m.favMenuId !== favMenuId);
    const updatedFamily = { ...family, favoriteMenus: updated };
    await setDoc(doc(db, 'families', familyId), updatedFamily);
  }
}));
