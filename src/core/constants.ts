import {
  ShoppingBag, Utensils, Zap, Car, GraduationCap, HeartPulse, Wrench, PiggyBank, TrendingUp, HelpCircle,
  Coffee, UtensilsCrossed, Wine, Home, Lightbulb, Droplets, Wifi, Sofa, Flame,
  Pill, Stethoscope, Dumbbell, Activity, BookOpen, Laptop, Briefcase,
  ShoppingCart, Shirt, Scissors, Sparkles, Tv, Music, Gamepad2, Camera, Film,
  Baby, Gift, Heart, PartyPopper, DollarSign, Wallet, BarChart3,
  Phone, Globe, Leaf, Bus, Plane, Bike, Fuel, Package
} from 'lucide-react';
import type { CustomCategory, CustomIngredient } from '../types';

export const ICON_MAP: { [key: string]: any } = {
  // Ăn uống
  Utensils, UtensilsCrossed, Coffee, Wine,
  // Di chuyển
  Car, Bike, Bus, Plane, Fuel,
  // Nhà ở & Tiện ích
  Home, Lightbulb, Droplets, Wifi, Zap, Flame, Sofa, Wrench,
  // Sức khỏe
  HeartPulse, Pill, Stethoscope, Dumbbell, Activity,
  // Giáo dục & Công việc
  GraduationCap, BookOpen, Laptop, Briefcase,
  // Mua sắm & Cá nhân
  ShoppingBag, ShoppingCart, Shirt, Scissors, Sparkles,
  // Giải trí
  Tv, Music, Gamepad2, Camera, Film,
  // Gia đình & Trẻ em
  Baby, Gift, Heart, PartyPopper,
  // Tài chính
  PiggyBank, TrendingUp, DollarSign, Wallet, BarChart3,
  // Khác
  Phone, Globe, Leaf, Package, HelpCircle
};

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'di_cho', name: 'Đi chợ / Ăn uống', type: 'expense', iconName: 'Utensils', color: '#FF8C69' },
  { id: 'hoa_don', name: 'Hóa đơn & Tiện ích', type: 'expense', iconName: 'Zap', color: '#4EA8DE' },
  { id: 'di_lai', name: 'Di chuyển / Xăng xe', type: 'expense', iconName: 'Car', color: '#FFD166' },
  { id: 'hoc_phi', name: 'Học phí / Giáo dục', type: 'expense', iconName: 'GraduationCap', color: '#8338EC' },
  { id: 'suc_khoe', name: 'Sức khỏe / Bảo hiểm', type: 'expense', iconName: 'HeartPulse', color: '#06D6A0' },
  { id: 'mua_sam', name: 'Mua sắm / Làm đẹp', type: 'expense', iconName: 'ShoppingBag', color: '#F15BB5' },
  { id: 'gia_dinh', name: 'Sửa chữa / Gia đình', type: 'expense', iconName: 'Wrench', color: '#F77F00' },
  { id: 'luong', name: 'Lương / Thu nhập', type: 'income', iconName: 'TrendingUp', color: '#81B29A' },
  { id: 'tiet_kiem', name: 'Tiết kiệm / Đầu tư', type: 'transfer', iconName: 'PiggyBank', color: '#003049' }
];

export const CATEGORIES = DEFAULT_CATEGORIES.map(cat => ({
  id: cat.id,
  name: cat.name,
  type: cat.type,
  icon: ICON_MAP[cat.iconName] || HelpCircle,
  color: cat.color
}));

export const DEFAULT_INGREDIENTS: CustomIngredient[] = [
  // Meat & Eggs
  { id: 'thit_heo', name: 'Thịt heo', category: 'meat_egg' },
  { id: 'thit_bo', name: 'Thịt bò', category: 'meat_egg' },
  { id: 'thit_ga', name: 'Thịt gà', category: 'meat_egg' },
  { id: 'trung_ga', name: 'Trứng gà', category: 'meat_egg' },
  { id: 'trung_vit', name: 'Trứng vịt', category: 'meat_egg' },
  
  // Seafood
  { id: 'ca_loc', name: 'Cá lóc', category: 'seafood' },
  { id: 'ca_dieu_hong', name: 'Cá điêu hồng', category: 'seafood' },
  { id: 'tom', name: 'Tôm sông', category: 'seafood' },
  { id: 'cua_dong', name: 'Cua đồng', category: 'seafood' },
  
  // Vegetables
  { id: 'rau_muong', name: 'Rau muống', category: 'vegetables' },
  { id: 'rau_ngot', name: 'Rau ngót', category: 'vegetables' },
  { id: 'rau_cai_ngot', name: 'Cải ngọt', category: 'vegetables' },
  { id: 'ca_chua', name: 'Cà chua', category: 'vegetables' },
  { id: 'bi_do', name: 'Bí đỏ', category: 'vegetables' },
  { id: 'bap_cai', name: 'Bắp cabbage', category: 'vegetables' },
  { id: 'muop_huong', name: 'Mướp hương', category: 'vegetables' },
  
  // Fruits
  { id: 'chuoi', name: 'Chuối chín', category: 'fruits' },
  { id: 'du_du', name: 'Đu đủ', category: 'fruits' },
  { id: 'cam', name: 'Cam sành', category: 'fruits' },
  { id: 'dua_hau', name: 'Dưa hấu', category: 'fruits' },
  
  // Dry & Spices & Tofu
  { id: 'dau_hu', name: 'Đậu hũ', category: 'dry_spice' },
  { id: 'gao', name: 'Gạo tẻ', category: 'dry_spice' },
  { id: 'gia_vi', name: 'Muối/Đường/Mắm', category: 'dry_spice' },
  { id: 'hanh_toi', name: 'Hành tỏi', category: 'dry_spice' }
];

export const INGREDIENTS_MASTER = DEFAULT_INGREDIENTS;

export const getMergedCategories = (customCats: any[]) => {
  return (customCats || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    type: cat.type,
    icon: ICON_MAP[cat.iconName] || HelpCircle,
    iconName: cat.iconName || 'HelpCircle',
    color: cat.color
  }));
};

export const getMergedIngredients = (customIngs: any[]) => {
  const base = [...DEFAULT_INGREDIENTS];
  (customIngs || []).forEach((custom: CustomIngredient) => {
    if (!base.find(i => i.id === custom.id)) {
      base.push(custom);
    }
  });
  return base;
};
