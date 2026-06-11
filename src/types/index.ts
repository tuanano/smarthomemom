import type { Timestamp } from 'firebase/firestore';

/** Timestamp hoặc Date — dùng hàm toDate() để convert an toàn */
export type FirestoreDate = Timestamp | Date;

/** Convert FirestoreDate → JS Date an toàn */
export function toDate(val: FirestoreDate): Date {
  return val instanceof Date ? val : val.toDate();
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'father' | 'mother' | 'child' | 'grandparent';
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  isDefaultSpender?: boolean; // thành viên chi tiêu mặc định
}

export interface Family {
  familyId: string;
  familyName: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  members: FamilyMember[];
  nutritionTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  defaultWalletId?: string;
  linkedMemberIds?: { [userId: string]: string }; // userId → memberId
  customCategories?: CustomCategory[];
  customIngredients?: CustomIngredient[];
  favoriteMenus?: FavoriteMenu[];
}

export interface Wallet {
  walletId: string;
  name: string;
  type: 'cash' | 'bank' | 'e_wallet';
  balance: number;
  colorCode: string;
  iconName: string;
  createdAt: FirestoreDate;
  // false = ví lưu trữ: không tính vào tổng số dư, không chi được, chỉ thu/chuyển tiền
  includeInBalance?: boolean;
}

export interface Transaction {
  transactionId: string;
  walletId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  note: string;
  date: FirestoreDate;
  createdAt: FirestoreDate;
  imageUrl?: string;
  toWalletId?: string;
  spentBy?: string;
}

export interface Budget {
  budgetId: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  period: 'monthly' | 'weekly';
  startDate: FirestoreDate;
  endDate: FirestoreDate;
  alertThreshold: number;
  isAlerted: boolean;
}

export interface MealItem {
  recipeId: string;
  recipeName: string;
  calories: number;
}

export interface WeeklyMenu {
  menuId: string; // yyyy_wWW
  startDate: FirestoreDate;
  endDate: FirestoreDate;
  meals: {
    [dateString: string]: {
      breakfast: MealItem[];
      lunch: MealItem[];
      dinner: MealItem[];
    };
  };
  shoppingListGenerated: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'meat_egg' | 'seafood' | 'vegetables' | 'fruits' | 'dry_spice';
}

export interface CustomCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  iconName: string;
  color: string;
}

export interface CustomIngredient {
  id: string;
  name: string;
  category: 'meat_egg' | 'seafood' | 'vegetables' | 'fruits' | 'dry_spice';
}

import type { Meal } from '../core/gemini';

export interface FavoriteMenu {
  favMenuId: string;
  name: string;
  meals: {
    breakfast: Meal[];
    lunch: Meal[];
    dinner: Meal[];
  };
}
