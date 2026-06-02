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
  createdAt: any;
  updatedAt: any;
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
  createdAt: any;
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
  date: any; // Firestore Timestamp
  createdAt: any;
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
  startDate: any;
  endDate: any;
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
  startDate: any;
  endDate: any;
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
