import { useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import type { FamilyMember, Wallet, Budget, CustomCategory, CustomIngredient } from '../../types';
import { Users, PiggyBank, Settings, Coins, CreditCard, Plus, Trash2, Flame, Save, LogOut, Tag, Apple, HelpCircle, ChevronRight, ChevronDown, User, ArrowLeft, Calculator, Pencil, SlidersHorizontal, Star, UserCheck, Check, Copy, Shield, MessageSquare, Crown, Info, BarChart3, TrendingUp, Lock, Bell } from 'lucide-react';
import { signOut, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase';
import { getMergedCategories, ICON_MAP } from '../../core/constants';
import { EditProfileSection } from './sections/EditProfileSection';
import { ChangePasswordSection } from './sections/ChangePasswordSection';
import { FeedbackSection } from './sections/FeedbackSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { HelpSection } from './sections/HelpSection';
import { AboutSection } from './sections/AboutSection';

const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'Utensils', label: 'Ăn uống' },
  { name: 'UtensilsCrossed', label: 'Nhà hàng' },
  { name: 'Coffee', label: 'Cà phê' },
  { name: 'Wine', label: 'Đồ uống' },
  { name: 'ShoppingBag', label: 'Mua sắm' },
  { name: 'ShoppingCart', label: 'Siêu thị' },
  { name: 'Shirt', label: 'Quần áo' },
  { name: 'Scissors', label: 'Cắt tóc' },
  { name: 'Sparkles', label: 'Làm đẹp' },
  { name: 'Car', label: 'Xe hơi' },
  { name: 'Bike', label: 'Xe máy' },
  { name: 'Bus', label: 'Xe buýt' },
  { name: 'Plane', label: 'Máy bay' },
  { name: 'Fuel', label: 'Xăng dầu' },
  { name: 'Home', label: 'Nhà ở' },
  { name: 'Lightbulb', label: 'Điện' },
  { name: 'Droplets', label: 'Nước' },
  { name: 'Wifi', label: 'Internet' },
  { name: 'Zap', label: 'Gas/Điện' },
  { name: 'Flame', label: 'Gas' },
  { name: 'Sofa', label: 'Nội thất' },
  { name: 'Wrench', label: 'Sửa chữa' },
  { name: 'HeartPulse', label: 'Sức khỏe' },
  { name: 'Pill', label: 'Thuốc' },
  { name: 'Stethoscope', label: 'Bác sĩ' },
  { name: 'Dumbbell', label: 'Thể dục' },
  { name: 'Activity', label: 'Hoạt động' },
  { name: 'GraduationCap', label: 'Học phí' },
  { name: 'BookOpen', label: 'Sách vở' },
  { name: 'Laptop', label: 'Máy tính' },
  { name: 'Briefcase', label: 'Công việc' },
  { name: 'Tv', label: 'Giải trí' },
  { name: 'Music', label: 'Âm nhạc' },
  { name: 'Gamepad2', label: 'Game' },
  { name: 'Camera', label: 'Ảnh/Video' },
  { name: 'Film', label: 'Phim' },
  { name: 'Baby', label: 'Trẻ em' },
  { name: 'Gift', label: 'Quà tặng' },
  { name: 'Heart', label: 'Tình cảm' },
  { name: 'PartyPopper', label: 'Lễ tiệc' },
  { name: 'Phone', label: 'Điện thoại' },
  { name: 'Globe', label: 'Quốc tế' },
  { name: 'Leaf', label: 'Môi trường' },
  { name: 'Package', label: 'Đơn hàng' },
  { name: 'PiggyBank', label: 'Tiết kiệm' },
  { name: 'TrendingUp', label: 'Đầu tư' },
  { name: 'DollarSign', label: 'Thu nhập' },
  { name: 'Wallet', label: 'Ví tiền' },
  { name: 'BarChart3', label: 'Tài chính' },
  { name: 'HelpCircle', label: 'Khác' },
];

function IconPicker({ value, onChange, color }: { value: string; onChange: (v: string) => void; color: string }) {
  const [open, setOpen] = useState(false);
  const CurrentIcon = ICON_MAP[value] || HelpCircle;
  const currentLabel = ICON_OPTIONS.find(i => i.name === value)?.label || value;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="form-control"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          backgroundColor: open ? 'var(--primary-bg)' : undefined,
          borderColor: open ? 'var(--primary)' : undefined,
        }}
      >
        <div style={{
          width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
          backgroundColor: `${color}22`, color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CurrentIcon size={14} />
        </div>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, textAlign: 'left' }}>{currentLabel}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          marginTop: '6px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '4px',
          padding: '8px',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          maxHeight: '192px',
          overflowY: 'auto'
        }}>
          {ICON_OPTIONS.map(opt => {
            const Icon = ICON_MAP[opt.name] || HelpCircle;
            const isSelected = value === opt.name;
            return (
              <button
                key={opt.name}
                type="button"
                onClick={() => { onChange(opt.name); setOpen(false); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '3px', padding: '7px 2px', borderRadius: '8px',
                  border: isSelected ? `1.5px solid ${color}` : '1.5px solid transparent',
                  backgroundColor: isSelected ? `${color}22` : 'transparent',
                  color: isSelected ? color : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <Icon size={18} />
                <span style={{
                  fontSize: '9px', fontWeight: isSelected ? 700 : 500,
                  textAlign: 'center', lineHeight: 1.2,
                  maxWidth: '38px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


export default function SettingsPage() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const showToast = useToast();
  const {
    family,
    wallets,
    budgets,
    transactions,
    saveFamily,
    createWallet,
    updateWallet,
    deleteWallet,
    saveBudget,
    deleteBudget,
    createTransaction,
    customCategories,
    customIngredients,
    addCustomCategory,
    deleteCustomCategory,
    addCustomIngredient,
    deleteCustomIngredient
  } = useFamilyStore();

  const mergedCategories = getMergedCategories(customCategories);

  const [view, setView] = useState<'menu' | 'family' | 'wallets' | 'budgets' | 'categories' | 'ingredients' | 'notifications' | 'account' | 'editProfile' | 'changePassword' | 'feedback' | 'help' | 'about'>('menu');
  const { enabled: notifEnabled } = useNotificationStore();

  const [copiedFamilyId, setCopiedFamilyId] = useState(false);

  // --- CUSTOM CATEGORY EDIT STATE ---
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState<'income' | 'expense'>('expense');
  const [editCatIcon, setEditCatIcon] = useState('Utensils');
  const [editCatColor, setEditCatColor] = useState('#FF8C69');

  // --- CUSTOM INGREDIENT EDIT STATE ---
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editIngName, setEditIngName] = useState('');
  const [editIngCategory, setEditIngCategory] = useState<'meat_egg' | 'seafood' | 'vegetables' | 'fruits' | 'dry_spice'>('vegetables');

  // --- FAMILY & MEMBERS STATE ---
  const [editFamilyName, setEditFamilyName] = useState(family?.familyName || '');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<'father' | 'mother' | 'child' | 'grandparent'>('child');
  const [memberAgeStr, setMemberAgeStr] = useState('6');
  const [memberGender, setMemberGender] = useState<'male' | 'female'>('male');
  const [memberActivity, setMemberActivity] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');

  // Edit member state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<'father' | 'mother' | 'child' | 'grandparent'>('child');
  const [editMemberAgeStr, setEditMemberAgeStr] = useState('');
  const [editMemberGender, setEditMemberGender] = useState<'male' | 'female'>('male');
  const [editMemberActivity, setEditMemberActivity] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');

  // --- WALLET STATE ---
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<'cash' | 'bank' | 'e_wallet'>('cash');
  const [newWalletBalance, setNewWalletBalance] = useState(1000000);
  const [newWalletIsDefault, setNewWalletIsDefault] = useState(false);
  const [newWalletIncludeInBalance, setNewWalletIncludeInBalance] = useState(true);

  // Edit wallet states
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editWalletName, setEditWalletName] = useState('');
  const [editWalletBalance, setEditWalletBalance] = useState(0);
  const [editWalletIncludeInBalance, setEditWalletIncludeInBalance] = useState(true);

  // Adjust wallet balance states
  const [adjustingWalletId, setAdjustingWalletId] = useState<string | null>(null);
  const [adjustWalletExpr, setAdjustWalletExpr] = useState('');
  const [showAdjustKeypad, setShowAdjustKeypad] = useState(false);

  // --- BUDGET STATE ---
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState(2000000);

  // Edit budget states
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudgetLimit, setEditBudgetLimit] = useState(0);

  if (!user || !family) return null;

  // --- HELPER NUTRITION CALCULATION ---
  const calculateMemberCalories = (member: FamilyMember): number => {
    let base = 2000;
    if (member.role === 'father') base = 2400;
    else if (member.role === 'mother') base = 2000;
    else if (member.role === 'grandparent') base = 1600;
    else {
      if (member.age < 3) base = 1000;
      else if (member.age < 6) base = 1400;
      else if (member.age < 12) base = 1800;
      else base = 2200;
    }

    const multipliers = {
      sedentary: 0.85,
      lightly_active: 1.0,
      moderately_active: 1.15,
      very_active: 1.3
    };
    
    return Math.round(base * multipliers[member.activityLevel]);
  };

  const recalculateAndSaveFamily = async (updatedMembers: FamilyMember[], updatedName: string = family.familyName) => {
    const totalCal = updatedMembers.reduce((sum, m) => sum + calculateMemberCalories(m), 0);
    const protein = Math.round((totalCal * 0.20) / 4);
    const carbs = Math.round((totalCal * 0.55) / 4);
    const fat = Math.round((totalCal * 0.25) / 9);

    await saveFamily({
      ...family,
      familyName: updatedName,
      members: updatedMembers,
      nutritionTargets: {
        calories: totalCal,
        protein,
        carbs,
        fat
      },
      updatedAt: new Date()
    });
  };

  // --- ACTIONS: FAMILY & MEMBERS ---
  const handleSaveFamilyName = async () => {
    if (!editFamilyName.trim()) return;
    await recalculateAndSaveFamily(family.members, editFamilyName.trim());
    showToast("Đã cập nhật tên gia đình!", "success");
  };

  const handleAddMember = async () => {
    if (!memberName.trim()) return;
    const age = parseInt(memberAgeStr) || 1;
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: memberName.trim(),
      role: memberRole,
      age,
      gender: memberGender,
      activityLevel: memberActivity
    };
    const updated = [...family.members, newMember];
    await recalculateAndSaveFamily(updated);
    setMemberName('');
    setMemberAgeStr('6');
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId || !editMemberName.trim()) return;
    const age = parseInt(editMemberAgeStr) || 1;
    const updated = family.members.map(m =>
      m.id === editingMemberId
        ? { ...m, name: editMemberName.trim(), role: editMemberRole, age, gender: editMemberGender, activityLevel: editMemberActivity }
        : m
    );
    await recalculateAndSaveFamily(updated);
    setEditingMemberId(null);
  };

  const handleDeleteMember = async (id: string) => {
    if (family.members.length <= 1) {
      showToast("Gia đình cần có ít nhất một thành viên!", "warning");
      return;
    }
    const yes = await confirm({
      title: 'Xóa thành viên',
      message: 'Bạn có muốn xóa thành viên này? Chỉ số calo gia đình sẽ được tự động tính toán lại.',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      const updated = family.members.filter(m => m.id !== id);
      await recalculateAndSaveFamily(updated);
    }
  };

  const handleSetDefaultSpender = async (id: string) => {
    const updated = family.members.map(m => ({ ...m, isDefaultSpender: m.id === id }));
    await recalculateAndSaveFamily(updated);
  };

  const handleLinkUserToMember = async (memberId: string) => {
    if (!user) return;
    await saveFamily({
      ...family,
      linkedMemberIds: { ...(family.linkedMemberIds || {}), [user.uid]: memberId }
    });
  };

  // --- ACTIONS: WALLETS ---
  const handleCreateWallet = async () => {
    if (!newWalletName.trim()) return;
    const walletId = 'wallet_' + Date.now().toString();
    try {
      await createWallet(user.uid, {
        walletId,
        name: newWalletName.trim(),
        type: newWalletType,
        balance: newWalletBalance,
        colorCode: newWalletType === 'cash' ? '#FF8C69' : newWalletType === 'bank' ? '#4EA8DE' : '#81B29A',
        iconName: newWalletType === 'cash' ? 'Coins' : newWalletType === 'bank' ? 'CreditCard' : 'PiggyBank',
        includeInBalance: newWalletIncludeInBalance
      });
      if (newWalletIsDefault) {
        await saveFamily({ ...family, defaultWalletId: walletId });
      }
      setNewWalletName('');
      setNewWalletIsDefault(false);
      setNewWalletIncludeInBalance(true);
      setShowAddWallet(false);
    } catch {
      showToast("Lỗi khi tạo ví, vui lòng thử lại", "error");
    }
  };

  const handleUpdateWallet = async (w: Wallet) => {
    if (!editWalletName.trim()) return;
    try {
      await updateWallet(user.uid, w.walletId, {
        name: editWalletName.trim(),
        balance: editWalletBalance,
        includeInBalance: editWalletIncludeInBalance,
      });
      setEditingWalletId(null);
    } catch {
      showToast("Lỗi khi cập nhật ví, vui lòng thử lại", "error");
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    if (wallets.length <= 1) {
      showToast("Không thể xóa ví duy nhất còn lại!", "warning");
      return;
    }
    const yes = await confirm({
      title: 'Xóa ví',
      message: 'Cảnh báo: Xóa ví này sẽ xóa toàn bộ số dư liên quan trong hệ thống. Bạn có muốn tiếp tục?',
      confirmText: 'Xóa ví',
      variant: 'danger'
    });
    if (yes) {
      await deleteWallet(user.uid, walletId);
    }
  };

  const handleSetDefaultWallet = async (walletId: string) => {
    await saveFamily({
      ...family,
      defaultWalletId: walletId
    });
  };

  // --- ACTIONS: BUDGETS ---
  const handleCreateBudget = async () => {
    const cat = newBudgetCategory || mergedCategories.filter(c => c.type === 'expense').find(c => !budgets.some(b => b.category === c.name))?.name;
    if (!cat) {
      showToast("Không còn danh mục nào chưa thiết lập hạn mức!", "info");
      return;
    }
    try {
      const budgetId = 'budget_' + cat.replace(/\s+/g, '').replace(/\//g, '');
      await saveBudget(user.uid, {
        budgetId,
        category: cat,
        limitAmount: newBudgetLimit,
        spentAmount: 0,
        period: 'monthly',
        startDate: new Date(),
        endDate: new Date(),
        alertThreshold: 0.8,
        isAlerted: false
      });
      setShowAddBudget(false);
    } catch {
      showToast("Lỗi khi tạo hạn mức, vui lòng thử lại", "error");
    }
  };

  const handleUpdateBudget = async (b: Budget) => {
    try {
      await saveBudget(user.uid, { ...b, limitAmount: editBudgetLimit });
      setEditingBudgetId(null);
    } catch {
      showToast("Lỗi khi cập nhật hạn mức, vui lòng thử lại", "error");
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    const yes = await confirm({
      title: 'Xóa hạn mức',
      message: 'Bạn có chắc muốn xóa hạn mức chi tiêu cho danh mục này?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      await deleteBudget(user.uid, budgetId);
    }
  };

  const evaluateMath = (expr: string): number => {
    const clean = expr.replace(/[^0-9+\-*/.]/g, '');
    if (!clean) return 0;
    try {
      const res = new Function(`return ${clean}`)();
      return typeof res === 'number' && isFinite(res) && res >= 0 ? res : 0;
    } catch {
      return 0;
    }
  };

  const formatExprDisplay = (expr: string): string => {
    if (!expr) return '';
    if (/^[0-9]+$/.test(expr)) {
      return parseInt(expr, 10).toLocaleString('vi-VN');
    }
    return expr;
  };

  const handleAdjustKeyPress = (val: string) => {
    if (val === 'C') {
      setAdjustWalletExpr('');
    } else if (val === 'back') {
      setAdjustWalletExpr(prev => prev.slice(0, -1));
    } else if (val === '=') {
      const result = evaluateMath(adjustWalletExpr);
      setAdjustWalletExpr(result.toString());
    } else {
      setAdjustWalletExpr(prev => prev + val);
    }
  };

  const handleAdjustWalletBalance = async (w: Wallet) => {
    const actualBal = evaluateMath(adjustWalletExpr);
    const diff = actualBal - w.balance;
    if (diff === 0) {
      setAdjustingWalletId(null);
      setShowAdjustKeypad(false);
      return;
    }

    const transactionData = {
      transactionId: 'adjust_' + Date.now().toString(),
      walletId: w.walletId,
      type: (diff > 0 ? 'income' : 'expense') as 'income' | 'expense',
      amount: Math.abs(diff),
      category: 'Điều chỉnh số dư',
      note: 'Điều chỉnh số dư ví thực tế',
      date: new Date(),
      createdAt: new Date()
    };

    try {
      await createTransaction(family.familyId, transactionData);
      setAdjustingWalletId(null);
      setShowAdjustKeypad(false);
      showToast("Đã điều chỉnh số dư và tạo giao dịch bù trừ!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi điều chỉnh số dư", "error");
    }
  };

  // --- ACTIONS: CUSTOM CATEGORIES & INGREDIENTS ---
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatIcon, setNewCatIcon] = useState('Utensils');
  const [newCatColor, setNewCatColor] = useState('#FF8C69');

  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<'meat_egg' | 'seafood' | 'vegetables' | 'fruits' | 'dry_spice'>('vegetables');

  const handleAddCustomCategory = async () => {
    if (!newCatName.trim()) return;
    const catId = 'cat_' + Date.now().toString();
    const newCat: CustomCategory = {
      id: catId,
      name: newCatName.trim(),
      type: newCatType,
      iconName: newCatIcon,
      color: newCatColor
    };
    try {
      await addCustomCategory(family.familyId, newCat);
      setNewCatName('');
      showToast("Đã thêm danh mục tùy chỉnh!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi thêm danh mục tùy chỉnh", "error");
    }
  };

  const handleDeleteCustomCategory = async (catId: string) => {
    const yes = await confirm({
      title: 'Xóa danh mục',
      message: 'Bạn có muốn xóa danh mục này?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      try {
        await deleteCustomCategory(family.familyId, catId);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi xóa danh mục", "error");
      }
    }
  };

  const handleAddCustomIngredient = async () => {
    if (!newIngName.trim()) return;
    const ingId = 'ing_' + Date.now().toString();
    const newIng: CustomIngredient = {
      id: ingId,
      name: newIngName.trim(),
      category: newIngCategory
    };
    try {
      await addCustomIngredient(family.familyId, newIng);
      setNewIngName('');
      showToast("Đã thêm nguyên liệu tùy chỉnh!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi thêm nguyên liệu", "error");
    }
  };

  const handleDeleteCustomIngredient = async (ingId: string) => {
    const yes = await confirm({
      title: 'Xóa nguyên liệu',
      message: 'Bạn có muốn xóa nguyên liệu này khỏi tủ đồ tùy chỉnh?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      try {
        await deleteCustomIngredient(family.familyId, ingId);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi xóa nguyên liệu", "error");
      }
    }
  };

  const handleUpdateCustomCategory = async (catId: string) => {
    if (!editCatName.trim()) return;
    const updatedCat: CustomCategory = {
      id: catId,
      name: editCatName.trim(),
      type: editCatType,
      iconName: editCatIcon,
      color: editCatColor
    };
    try {
      await addCustomCategory(family.familyId, updatedCat);
      setEditingCategoryId(null);
      showToast("Đã cập nhật danh mục!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi cập nhật danh mục", "error");
    }
  };

  const handleUpdateCustomIngredient = async (ingId: string) => {
    if (!editIngName.trim()) return;
    const updatedIng: CustomIngredient = {
      id: ingId,
      name: editIngName.trim(),
      category: editIngCategory
    };
    try {
      await addCustomIngredient(family.familyId, updatedIng);
      setEditingIngredientId(null);
      showToast("Đã cập nhật nguyên liệu!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi cập nhật nguyên liệu", "error");
    }
  };

  // --- ACCOUNT HANDLERS ---
  const handleSendVerification = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      showToast('Email xác thực đã được gửi! Vui lòng kiểm tra hộp thư.', 'success');
    } catch {
      showToast('Lỗi khi gửi email xác thực', 'error');
    }
  };

  const handleSignOut = async () => {
    const yes = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có muốn đăng xuất khỏi tài khoản?',
      confirmText: 'Đăng xuất',
      variant: 'warning'
    });
    if (yes) {
      await signOut(auth);
    }
  };

  // Unused categories for budget setup
  const unusedCategories = mergedCategories
    .filter(c => c.type === 'expense')
    .filter(c => !budgets.some(b => b.category === c.name));

  return (
    <div className="scrollable" style={{ paddingBottom: '90px' }}>
      {/* Sub-page Navigation Header */}
      {view !== 'menu' && (() => {
        const accountSubViews = new Set(['editProfile', 'changePassword', 'feedback', 'help', 'about']);
        const backTarget: any = accountSubViews.has(view) ? 'account' : 'menu';
        const titles: Record<string, string> = {
          family: 'Gia đình & Thành viên',
          wallets: 'Quản lý Ví tiền',
          budgets: 'Quản lý Hạn mức',
          categories: 'Danh mục Chi tiêu',
          ingredients: 'Danh mục Nguyên liệu',
          notifications: 'Thông báo nhắc nhở',
          account: 'Thông tin Tài khoản',
          editProfile: 'Sửa thông tin cá nhân',
          changePassword: 'Đổi mật khẩu',
          feedback: 'Gửi phản hồi',
          help: 'Hướng dẫn sử dụng',
          about: 'Về ứng dụng',
        };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setView(backTarget)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-grey)',
                width: '36px', height: '36px'
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{titles[view] || 'Cài đặt'}</h2>
          </div>
        );
      })()}

      {/* 0. MAIN SETTINGS MENU */}
      {view === 'menu' && (
        <div>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Cấu hình & Cài đặt</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Quản lý thông tin gia đình, ví tiền, hạn mức chi tiêu và tủ nguyên liệu của bạn.</p>
          </div>

          {/* Menu Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              { id: 'family', name: 'Gia đình & Thành viên', desc: `${family.members.length} thành viên • Mục tiêu ${family.nutritionTargets.calories} Kcal`, icon: Users, color: '#FF8C69' },
              { id: 'wallets', name: 'Quản lý Ví tiền', desc: `${wallets.length} ví hoạt động • Đặt ví mặc định & Cân đối`, icon: PiggyBank, color: '#4EA8DE' },
              { id: 'budgets', name: 'Quản lý Hạn mức', desc: `${budgets.length} hạn mức chi tiêu tháng được thiết lập`, icon: Settings, color: '#8338EC' },
              { id: 'categories', name: 'Danh mục chi tiêu', desc: 'Quản lý danh mục thu, chi mặc định và tự tạo', icon: Tag, color: '#F15BB5' },
              { id: 'ingredients', name: 'Danh mục nguyên liệu', desc: 'Quản lý các nguyên liệu tủ bếp dùng để nấu ăn', icon: Apple, color: '#81B29A' },
              { id: 'notifications', name: 'Thông báo nhắc nhở', desc: notifEnabled ? 'Đang bật • Nhắc chi tiêu & thực đơn' : 'Đang tắt • Nhấn để bật nhắc nhở', icon: Bell, color: '#F7B731' },
              { id: 'account', name: 'Thông tin tài khoản', desc: 'Xem email đăng nhập, mã nhóm và đăng xuất', icon: User, color: '#F77F00' }
            ].map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id as any);
                    // Close edits
                    setEditingWalletId(null);
                    setAdjustingWalletId(null);
                    setEditingBudgetId(null);
                    setEditingCategoryId(null);
                    setEditingIngredientId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComp size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. FAMILY & MEMBERS SUB-PAGE */}
      {view === 'family' && (
        <>
          <div className="card">
            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Tên gia đình</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                value={editFamilyName}
                onChange={(e) => setEditFamilyName(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveFamilyName}
                className="btn btn-primary"
                style={{ width: '48px', height: '48px', padding: 0 }}
              >
                <Save size={18} />
              </button>
            </div>
          </div>

          {/* Tài khoản của bạn là ai */}
          {(() => {
            const linkedId = family.linkedMemberIds?.[user.uid];
            const linkedMember = family.members.find(m => m.id === linkedId);
            return (
              <div className="card" style={{ marginBottom: '20px', backgroundColor: 'var(--primary-bg)', borderColor: 'var(--primary-light)', borderWidth: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <UserCheck size={18} style={{ color: 'var(--primary)' }} />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Tài khoản của bạn</div>
                </div>
                {linkedMember ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{linkedMember.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {linkedMember.role === 'father' ? 'Bố' : linkedMember.role === 'mother' ? 'Mẹ' : linkedMember.role === 'grandparent' ? 'Ông/Bà' : 'Con cái'} • {linkedMember.age} tuổi
                      </div>
                    </div>
                    <button type="button" onClick={() => handleLinkUserToMember('')}
                      style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Đổi
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Chọn thành viên tương ứng với tài khoản đăng nhập của bạn:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {family.members.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleLinkUserToMember(m.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left'
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : m.role === 'grandparent' ? 'Ông/Bà' : 'Con cái'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <h3 style={{ fontSize: '16px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--primary)' }} />
            Thành viên gia đình ({family.members.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {family.members.map(m => {
              const isEditing = editingMemberId === m.id;
              const isDefaultSpender = !!m.isDefaultSpender;
              const isLinked = family.linkedMemberIds?.[user.uid] === m.id;
              const roleLabel = m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : m.role === 'grandparent' ? 'Ông/Bà' : 'Con cái';

              return (
                <div key={m.id} className="card" style={{
                  margin: 0, padding: '14px 16px',
                  borderColor: isDefaultSpender ? 'var(--secondary)' : 'var(--border)',
                  borderWidth: isDefaultSpender ? '2px' : '1px'
                }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Sửa thông tin: {m.name}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                          <label>Họ tên</label>
                          <input type="text" className="form-control" value={editMemberName} onChange={e => setEditMemberName(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                          <label>Vai trò</label>
                          <select className="form-control" value={editMemberRole} onChange={(e: any) => setEditMemberRole(e.target.value)}>
                            <option value="child">Con cái</option>
                            <option value="father">Bố</option>
                            <option value="mother">Mẹ</option>
                            <option value="grandparent">Ông/Bà</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600 }}>Tuổi</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="form-control"
                            value={editMemberAgeStr}
                            onChange={e => setEditMemberAgeStr(e.target.value.replace(/\D/g, ''))}
                            placeholder="1"
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600 }}>Giới tính</label>
                          <select className="form-control" value={editMemberGender} onChange={(e: any) => setEditMemberGender(e.target.value)}>
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                          </select>
                        </div>
                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600 }}>Vận động</label>
                          <select className="form-control" value={editMemberActivity} onChange={(e: any) => setEditMemberActivity(e.target.value)}>
                            <option value="sedentary">Ít</option>
                            <option value="lightly_active">Nhẹ</option>
                            <option value="moderately_active">Vừa</option>
                            <option value="very_active">Nhiều</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <button type="button" onClick={handleUpdateMember} className="btn btn-primary" style={{ flex: 1, height: '38px', fontSize: '13px' }}>
                          <Check size={14} /> Lưu
                        </button>
                        <button type="button" onClick={() => setEditingMemberId(null)} className="btn btn-secondary" style={{ flex: 1, height: '38px', fontSize: '13px' }}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Info row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                          backgroundColor: isDefaultSpender ? '#81B29A22' : 'var(--bg-grey)',
                          color: isDefaultSpender ? 'var(--secondary)' : 'var(--text-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', fontWeight: 800
                        }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px' }}>{m.name}</span>
                            {isLinked && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-light)' }}>
                                Của bạn
                              </span>
                            )}
                            {isDefaultSpender && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: '#81B29A22', color: 'var(--secondary)', border: '1px solid #81B29A44' }}>
                                Chi mặc định
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {roleLabel} • {m.age} tuổi • {m.gender === 'male' ? 'Nam' : 'Nữ'} • ~{calculateMemberCalories(m)} Kcal
                          </div>
                        </div>
                      </div>

                      {/* Action bar */}
                      <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemberId(m.id);
                            setEditMemberName(m.name);
                            setEditMemberRole(m.role);
                            setEditMemberAgeStr(String(m.age));
                            setEditMemberGender(m.gender);
                            setEditMemberActivity(m.activityLevel);
                          }}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: '3px', padding: '8px 4px',
                            background: 'none', border: 'none', borderRight: '1px solid var(--border)',
                            cursor: 'pointer', color: 'var(--primary)'
                          }}
                        >
                          <Pencil size={15} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>Sửa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => !isDefaultSpender && handleSetDefaultSpender(m.id)}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: '3px', padding: '8px 4px',
                            background: isDefaultSpender ? '#81B29A15' : 'none',
                            border: 'none', borderRight: '1px solid var(--border)',
                            cursor: isDefaultSpender ? 'default' : 'pointer',
                            color: isDefaultSpender ? 'var(--secondary)' : 'var(--text-secondary)'
                          }}
                        >
                          <Check size={15} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>{isDefaultSpender ? 'Chi mặc định' : 'Đặt mặc định'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id)}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: '3px', padding: '8px 4px',
                            background: 'none', border: 'none',
                            cursor: 'pointer', color: 'var(--danger)'
                          }}
                        >
                          <Trash2 size={15} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>Xóa</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Form thêm thành viên */}
          <div className="card" style={{ backgroundColor: 'var(--secondary-bg)', borderStyle: 'dashed' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thêm thành viên mới</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Họ tên thành viên"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                style={{ flex: 2 }}
              />
              <select
                className="form-control"
                value={memberRole}
                onChange={(e: any) => setMemberRole(e.target.value)}
                style={{ flex: 1.5, padding: '0 8px' }}
              >
                <option value="child">Con cái</option>
                <option value="father">Bố</option>
                <option value="mother">Mẹ</option>
                <option value="grandparent">Ông/Bà</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Tuổi</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  value={memberAgeStr}
                  onChange={(e) => setMemberAgeStr(e.target.value.replace(/\D/g, ''))}
                  placeholder="6"
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Giới tính</label>
                <select className="form-control" value={memberGender} onChange={(e: any) => setMemberGender(e.target.value)}>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Vận động</label>
                <select className="form-control" value={memberActivity} onChange={(e: any) => setMemberActivity(e.target.value)}>
                  <option value="sedentary">Ít vận động</option>
                  <option value="lightly_active">Nhẹ nhàng</option>
                  <option value="moderately_active">Vừa phải</option>
                  <option value="very_active">Nhiều</option>
                </select>
              </div>
            </div>
            <button type="button" onClick={handleAddMember} className="btn btn-secondary" style={{ width: '100%', height: '42px' }}>
              <Plus size={16} /> Thêm thành viên
            </button>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--primary-bg)', borderColor: 'var(--primary-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--primary)' }}><Flame size={24} fill="currentColor" /></div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mục tiêu dinh dưỡng gia đình</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{family.nutritionTargets.calories} Kcal / ngày</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. WALLETS SUB-PAGE */}
      {view === 'wallets' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px' }}>Danh sách ví tiền</h3>
            <button
              type="button"
              onClick={() => setShowAddWallet(!showAddWallet)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              {showAddWallet ? 'Hủy' : '+ Thêm ví'}
            </button>
          </div>

          {/* Add Wallet card */}
          {showAddWallet && (
            <div className="card" style={{ borderStyle: 'dashed' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Khai báo ví mới</h4>
              <div className="form-group">
                <label>Tên ví / tài khoản</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Ví MoMo, Thẻ phụ của chồng..."
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Loại nguồn tiền</label>
                  <select
                    className="form-control"
                    value={newWalletType}
                    onChange={(e: any) => setNewWalletType(e.target.value)}
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="bank">Tài khoản/Thẻ ngân hàng</option>
                    <option value="e_wallet">Ví điện tử (Momo...)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Số dư ban đầu (VND)</label>
                  <CurrencyInput
                    className="form-control"
                    value={newWalletBalance}
                    onChange={setNewWalletBalance}
                  />
                </div>
              </div>
              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Đặt làm ví mặc định</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tự động chọn ví này khi thêm giao dịch mới</div>
                  </div>
                  <div
                    onClick={() => setNewWalletIsDefault(v => !v)}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                      backgroundColor: newWalletIsDefault ? 'var(--primary)' : 'var(--bg-grey)',
                      position: 'relative', transition: 'background-color 0.2s', cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '3px',
                      left: newWalletIsDefault ? '23px' : '3px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: 'white', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Ví chi tiêu (tính vào số dư)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {newWalletIncludeInBalance
                        ? 'Số dư hiển thị ở tổng số dư, có thể chi tiêu bình thường'
                        : 'Số dư ẩn khỏi tổng, chỉ thu/chuyển tiền — không chi được'}
                    </div>
                  </div>
                  <div
                    onClick={() => setNewWalletIncludeInBalance(v => !v)}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                      backgroundColor: newWalletIncludeInBalance ? 'var(--secondary)' : 'var(--bg-grey)',
                      position: 'relative', transition: 'background-color 0.2s', cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '3px',
                      left: newWalletIncludeInBalance ? '23px' : '3px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: 'white', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={handleCreateWallet}
                className="btn btn-primary"
                style={{ width: '100%', height: '44px' }}
              >
                Lưu Ví
              </button>
            </div>
          )}

          {/* List wallets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {wallets.map(w => {
              const isDefault = family.defaultWalletId === w.walletId;
              const isSpending = w.includeInBalance !== false;
              const isEditing = editingWalletId === w.walletId;
              const isAdjusting = adjustingWalletId === w.walletId;

              return (
                <div
                  key={w.walletId}
                  className="card"
                  style={{
                    margin: 0,
                    padding: '16px',
                    borderColor: isDefault ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    borderWidth: isDefault ? '2px' : '1px'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Tên ví</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editWalletName}
                          onChange={(e) => setEditWalletName(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Số dư (VND)</label>
                        <CurrencyInput
                          className="form-control"
                          value={editWalletBalance}
                          onChange={setEditWalletBalance}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>Ví chi tiêu</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {editWalletIncludeInBalance ? 'Tính vào tổng số dư, chi tiêu bình thường' : 'Ẩn khỏi tổng, chỉ thu/chuyển tiền'}
                          </div>
                        </div>
                        <div
                          onClick={() => setEditWalletIncludeInBalance(v => !v)}
                          style={{
                            width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                            backgroundColor: editWalletIncludeInBalance ? 'var(--secondary)' : 'var(--bg-grey)',
                            position: 'relative', transition: 'background-color 0.2s', cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: '3px',
                            left: editWalletIncludeInBalance ? '23px' : '3px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            backgroundColor: 'white', transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateWallet(w)}
                          className="btn btn-primary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingWalletId(null)}
                          className="btn btn-secondary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : isAdjusting ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <style>{`
                        @keyframes blink-cursor {
                          0%, 100% { opacity: 1; }
                          50% { opacity: 0; }
                        }
                        .blinking-cursor {
                          animation: blink-cursor 1s step-end infinite;
                        }
                      `}</style>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Cân đối số dư: {w.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Số dư hiện tại: <strong>{w.balance.toLocaleString('vi-VN')} đ</strong>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Số dư thực tế hiện tại (VND)</label>
                        <div style={{ position: 'relative' }} onClick={() => setShowAdjustKeypad(true)}>
                          <Calculator size={18} style={{ position: 'absolute', right: '16px', top: '15px', color: 'var(--primary)' }} />
                          <div
                            className="form-control"
                            style={{
                              fontSize: '18px',
                              fontWeight: 700,
                              color: 'var(--primary)',
                              paddingRight: '48px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              cursor: 'pointer',
                              backgroundColor: showAdjustKeypad ? 'var(--primary-bg)' : 'var(--bg-card)',
                              borderColor: showAdjustKeypad ? 'var(--primary)' : 'var(--border)',
                              height: '48px',
                            }}
                          >
                            <span>{formatExprDisplay(adjustWalletExpr) || '0'}</span>
                            {showAdjustKeypad && (
                              <span 
                                className="blinking-cursor" 
                                style={{ 
                                  color: 'var(--primary)', 
                                  marginLeft: '4px',
                                  fontWeight: 'normal',
                                  fontSize: '18px'
                                }}
                              >
                                |
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const diff = evaluateMath(adjustWalletExpr) - w.balance;
                        return (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: 'var(--border-radius-sm)',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            fontSize: '14px',
                            height: '44px'
                          }}>
                            <span>Chênh lệch:</span>
                            <strong style={{
                              fontWeight: 700,
                              color: diff > 0 ? '#06D6A0' : diff < 0 ? 'var(--danger)' : 'var(--text-secondary)'
                            }}>
                              {diff > 0 ? `+${diff.toLocaleString('vi-VN')}` : diff < 0 ? `-${Math.abs(diff).toLocaleString('vi-VN')}` : '0'} đ
                            </strong>
                          </div>
                        );
                      })()}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleAdjustWalletBalance(w)}
                          className="btn btn-primary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingWalletId(null);
                            setShowAdjustKeypad(false);
                          }}
                          className="btn btn-secondary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Tầng 1: Thông tin ví */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                          backgroundColor: `${w.colorCode}20`, color: w.colorCode,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {w.type === 'cash' ? <Coins size={22} /> : <CreditCard size={22} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{w.name}</span>
                            {!isSpending && (
                              <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                                borderRadius: '8px', backgroundColor: '#71717a18', color: '#71717a',
                                border: '1px solid #71717a30'
                              }}>Lưu trữ</span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', marginTop: '3px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                              {w.balance.toLocaleString('vi-VN')} đ
                            </span>
                            {!isSpending && (
                              <span style={{ color: '#71717a', fontSize: '11px' }}> · Ẩn khỏi tổng số dư</span>
                            )}
                          </div>
                        </div>
                        {isDefault && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                            fontSize: '10px', fontWeight: 700,
                            color: 'var(--primary)', backgroundColor: 'var(--primary-bg)',
                            padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--primary-light)'
                          }}>
                            <Star size={10} fill="currentColor" />
                            Mặc định
                          </div>
                        )}
                      </div>

                      {/* Tầng 2: Toggle ví mặc định */}
                      <div
                        onClick={() => !isDefault && handleSetDefaultWallet(w.walletId)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: '10px', marginBottom: '12px',
                          backgroundColor: isDefault ? 'var(--primary-bg)' : 'var(--bg-grey)',
                          border: `1px solid ${isDefault ? 'var(--primary-light)' : 'transparent'}`,
                          cursor: isDefault ? 'default' : 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Ví mặc định</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                            {isDefault ? 'Tự động chọn khi thêm giao dịch mới' : 'Nhấn để đặt làm ví mặc định'}
                          </div>
                        </div>
                        <div style={{
                          width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                          backgroundColor: isDefault ? 'var(--primary)' : '#d1d5db',
                          position: 'relative', transition: 'background-color 0.2s'
                        }}>
                          <div style={{
                            position: 'absolute', top: '3px',
                            left: isDefault ? '23px' : '3px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            backgroundColor: 'white', transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                          }} />
                        </div>
                      </div>

                      {/* Tầng 3: Action bar */}
                      <div style={{
                        display: 'flex', borderRadius: '10px', overflow: 'hidden',
                        border: '1px solid var(--border)'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWalletId(w.walletId);
                            setEditWalletName(w.name);
                            setEditWalletBalance(w.balance);
                            setEditWalletIncludeInBalance(w.includeInBalance !== false);
                          }}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: '4px', padding: '10px 6px',
                            background: 'none', border: 'none', borderRight: '1px solid var(--border)',
                            cursor: 'pointer', color: 'var(--primary)', transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Pencil size={16} />
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>Sửa tên</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingWalletId(w.walletId);
                            setAdjustWalletExpr(w.balance.toString());
                            setShowAdjustKeypad(true);
                          }}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: '4px', padding: '10px 6px',
                            background: 'none', border: 'none', borderRight: '1px solid var(--border)',
                            cursor: 'pointer', color: '#8338EC', transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#8338EC12')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <SlidersHorizontal size={16} />
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>Cân đối</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteWallet(w.walletId)}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: '4px', padding: '10px 6px',
                            background: 'none', border: 'none',
                            cursor: 'pointer', color: 'var(--danger)', transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ff000010')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Trash2 size={16} />
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>Xóa ví</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 3. BUDGETS SUB-PAGE */}
      {view === 'budgets' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px' }}>Hạn mức chi tiêu tháng</h3>
            {unusedCategories.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowAddBudget(!showAddBudget);
                  if (unusedCategories.length > 0) {
                    setNewBudgetCategory(unusedCategories[0].name);
                  }
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                {showAddBudget ? 'Hủy' : '+ Thêm hạn mức'}
              </button>
            )}
          </div>

          {/* Add budget card */}
          {showAddBudget && unusedCategories.length > 0 && (
            <div className="card" style={{ borderStyle: 'dashed' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thiết lập hạn mức mới</h4>
              <div className="form-group">
                <label>Chọn danh mục chi tiêu</label>
                <select
                  className="form-control"
                  value={newBudgetCategory}
                  onChange={(e) => setNewBudgetCategory(e.target.value)}
                >
                  {unusedCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Hạn mức chi tối đa hàng tháng (VND)</label>
                <CurrencyInput
                  className="form-control"
                  value={newBudgetLimit}
                  onChange={setNewBudgetLimit}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateBudget}
                className="btn btn-primary"
                style={{ width: '100%', height: '44px' }}
              >
                Lưu hạn mức
              </button>
            </div>
          )}

          {/* List budgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {budgets.map(b => {
              const isEditing = editingBudgetId === b.budgetId;
              return (
                <div key={b.budgetId} className="card" style={{ margin: 0, padding: '16px' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Hạn mức: {b.category}</div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Số tiền hạn mức tối đa (VND)</label>
                        <CurrencyInput
                          className="form-control"
                          value={editBudgetLimit}
                          onChange={setEditBudgetLimit}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateBudget(b)}
                          className="btn btn-primary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBudgetId(null)}
                          className="btn btn-secondary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{b.category}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Ngân sách tối đa: <strong>{b.limitAmount.toLocaleString('vi-VN')} đ</strong> / tháng
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBudgetId(b.budgetId);
                            setEditBudgetLimit(b.limitAmount);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(b.budgetId)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 4. CATEGORIES SUB-PAGE */}
      {view === 'categories' && (
        <>
          {/* List of categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {mergedCategories.map(cat => {
              const isCustom = true;
              const isEditing = editingCategoryId === cat.id;
              const IconComponent = cat.icon || HelpCircle;

              return (
                <div
                  key={cat.id}
                  className="card"
                  style={{
                    margin: 0,
                    padding: '16px',
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg-card)'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Sửa danh mục: {cat.name}</div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Tên danh mục</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Loại</label>
                        <select
                          className="form-control"
                          value={editCatType}
                          onChange={(e: any) => setEditCatType(e.target.value)}
                        >
                          <option value="expense">Khoản chi</option>
                          <option value="income">Khoản thu</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Biểu tượng</label>
                        <IconPicker value={editCatIcon} onChange={setEditCatIcon} color={editCatColor} />
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label>Màu sắc</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            className="form-control"
                            value={editCatColor}
                            onChange={(e) => setEditCatColor(e.target.value)}
                            style={{ width: '60px', padding: '0 4px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '13px' }}>{editCatColor}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomCategory(cat.id)}
                          className="btn btn-primary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryId(null)}
                          className="btn btn-secondary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: `${cat.color}22`,
                          color: cat.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{cat.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {cat.type === 'expense' ? 'Khoản chi' : cat.type === 'income' ? 'Khoản thu' : 'Chuyển tiền'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {!isCustom ? (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: 'var(--bg-grey)',
                            color: 'var(--text-secondary)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 600
                          }}>Hệ thống</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditCatName(cat.name);
                                setEditCatType(cat.type as any);
                                setEditCatIcon(cat.iconName || 'HelpCircle');
                                setEditCatColor(cat.color);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomCategory(cat.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Custom Category Form */}
          <div className="card" style={{ borderStyle: 'dashed', backgroundColor: 'var(--secondary-bg)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thêm danh mục mới</h4>
            <div className="form-group">
              <label>Tên danh mục</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Ăn vặt, Nuôi thú cưng..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Loại danh mục</label>
                <select
                  className="form-control"
                  value={newCatType}
                  onChange={(e: any) => setNewCatType(e.target.value)}
                >
                  <option value="expense">Khoản chi</option>
                  <option value="income">Khoản thu</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Biểu tượng</label>
              <IconPicker value={newCatIcon} onChange={setNewCatIcon} color={newCatColor} />
            </div>
            <div className="form-group">
              <label>Màu sắc đại diện</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  className="form-control"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  style={{ width: '60px', padding: '0 4px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mã màu: {newCatColor}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddCustomCategory}
              style={{ width: '100%', height: '44px' }}
            >
              <Plus size={16} /> Thêm danh mục
            </button>
          </div>
        </>
      )}

      {/* 5. INGREDIENTS SUB-PAGE */}
      {view === 'ingredients' && (
        <>
          {/* List of ingredients grouped by category */}
          {(() => {
            const allIngredients = customIngredients;
            const getCatName = (cat: string) => {
              switch(cat) {
                case 'meat_egg': return 'Thịt & Trứng';
                case 'seafood': return 'Hải sản';
                case 'vegetables': return 'Rau củ';
                case 'fruits': return 'Trái cây';
                case 'dry_spice': return 'Đồ khô & Gia vị';
                default: return 'Khác';
              }
            };
            
            // Group them
            const grouped: { [key: string]: typeof allIngredients } = {};
            allIngredients.forEach(ing => {
              grouped[ing.category] = grouped[ing.category] || [];
              grouped[ing.category].push(ing);
            });

            return Object.keys(grouped).map(catKey => (
              <div key={catKey} style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '6px',
                  marginBottom: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  {getCatName(catKey)} ({grouped[catKey].length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {grouped[catKey].map(ing => {
                    const isCustom = true;
                    const isEditing = editingIngredientId === ing.id;

                    return (
                      <div
                        key={ing.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--border-radius-sm)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Tên nguyên liệu</label>
                              <input
                                type="text"
                                className="form-control"
                                value={editIngName}
                                onChange={(e) => setEditIngName(e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Nhóm nguyên liệu</label>
                              <select
                                className="form-control"
                                value={editIngCategory}
                                onChange={(e: any) => setEditIngCategory(e.target.value)}
                              >
                                <option value="meat_egg">Thịt & Trứng</option>
                                <option value="seafood">Hải sản</option>
                                <option value="vegetables">Rau củ</option>
                                <option value="fruits">Trái cây</option>
                                <option value="dry_spice">Đồ khô & Gia vị</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomIngredient(ing.id)}
                                className="btn btn-primary"
                                style={{ flex: 1, height: '36px', fontSize: '12px' }}
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingIngredientId(null)}
                                className="btn btn-secondary"
                                style={{ flex: 1, height: '36px', fontSize: '12px' }}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{ing.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {!isCustom ? (
                                <span style={{
                                  fontSize: '10px',
                                  backgroundColor: 'var(--bg-grey)',
                                  color: 'var(--text-secondary)',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontWeight: 600
                                }}>Hệ thống</span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingIngredientId(ing.id);
                                      setEditIngName(ing.name);
                                      setEditIngCategory(ing.category);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--primary)',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCustomIngredient(ing.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}

          {/* Add Custom Ingredient Form */}
          <div className="card" style={{ borderStyle: 'dashed', backgroundColor: 'var(--secondary-bg)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thêm nguyên liệu mới</h4>
            <div className="form-group">
              <label>Tên nguyên liệu</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Rau đay, cá quả, ốc..."
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Nhóm nguyên liệu</label>
              <select
                className="form-control"
                value={newIngCategory}
                onChange={(e: any) => setNewIngCategory(e.target.value)}
              >
                <option value="meat_egg">Thịt & Trứng</option>
                <option value="seafood">Hải sản</option>
                <option value="vegetables">Rau củ</option>
                <option value="fruits">Trái cây</option>
                <option value="dry_spice">Đồ khô & Gia vị</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddCustomIngredient}
              style={{ width: '100%', height: '44px' }}
            >
              <Plus size={16} /> Thêm nguyên liệu
            </button>
          </div>
        </>
      )}

      {/* 6. ACCOUNT SUB-PAGE */}
      {view === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Profile Hero */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #F15BB5 100%)',
            borderRadius: 'var(--border-radius-md)',
            padding: '24px 20px',
            boxShadow: '0 4px 20px rgba(255, 140, 105, 0.35)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px', flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.25)',
                border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px', fontWeight: 800, color: 'white'
              }}>
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {user.displayName || user.email?.split('@')[0] || 'Người dùng'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('editProfile')}
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                  >
                    <Pencil size={12} />
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>Sửa</span>
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
                {(() => {
                  const linkedId = family.linkedMemberIds?.[user.uid];
                  const linked = family.members.find(m => m.id === linkedId);
                  if (!linked) return null;
                  const roleLabel = linked.role === 'father' ? 'Bố' : linked.role === 'mother' ? 'Mẹ' : linked.role === 'grandparent' ? 'Ông/Bà' : 'Con';
                  return (
                    <div style={{
                      marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                      backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <User size={11} style={{ color: 'white' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{linked.name} · {roleLabel}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Gói dịch vụ */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={18} style={{ color: '#F77F00' }} />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Gói dịch vụ</span>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
                backgroundColor: '#FFF3E0', color: '#F77F00', border: '1px solid #FFE0B2'
              }}>
                Cơ bản · Miễn phí
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Giao dịch', value: transactions.length, color: '#FF8C69', icon: BarChart3 },
                { label: 'Ví tiền', value: wallets.length, color: '#4EA8DE', icon: PiggyBank },
                { label: 'Hạn mức', value: budgets.length, color: '#8338EC', icon: TrendingUp },
              ].map(stat => {
                const StatIcon = stat.icon;
                return (
                  <div key={stat.label} style={{
                    textAlign: 'center', padding: '12px 8px', borderRadius: '12px',
                    backgroundColor: `${stat.color}10`, border: `1px solid ${stat.color}25`
                  }}>
                    <StatIcon size={16} style={{ color: stat.color, marginBottom: '4px' }} />
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '3px' }}>{stat.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{
              padding: '10px 12px', borderRadius: '10px',
              backgroundColor: 'var(--bg-grey)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Tính năng nâng cao</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>Báo cáo AI · Đa gia đình · Xuất Excel</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Sắp có</span>
            </div>
          </div>

          {/* Nhóm gia đình */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Nhóm gia đình</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { label: 'Tên nhóm', value: family.familyName },
                { label: 'Thành viên', value: `${family.members.length} người` },
              ].map((row) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Mã nhóm</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {family.familyId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(family.familyId);
                    setCopiedFamilyId(true);
                    setTimeout(() => setCopiedFamilyId(false), 2000);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '7px 12px', borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: copiedFamilyId ? '#E8F5E9' : 'var(--bg-grey)',
                    color: copiedFamilyId ? '#2E7D32' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                    transition: 'all 0.2s', flexShrink: 0
                  }}
                >
                  {copiedFamilyId ? (<><Check size={13} /> Đã sao chép</>) : (<><Copy size={13} /> Sao chép</>)}
                </button>
              </div>
            </div>
          </div>

          {/* Bảo mật & Tài khoản */}
          {(() => {
            const isPasswordProvider = user.providerData.some(p => p.providerId === 'password');
            return (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Shield size={18} style={{ color: '#4EA8DE' }} />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Bảo mật & Tài khoản</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Email</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', backgroundColor: user.emailVerified ? '#E8F5E9' : '#FFF8E1', color: user.emailVerified ? '#2E7D32' : '#F57F17' }}>
                        {user.emailVerified ? '✓' : '⚠'}
                      </span>
                    </div>
                  </div>
                  {!user.emailVerified && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Xác thực email</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>Email chưa được xác thực</div>
                      </div>
                      <button type="button" onClick={handleSendVerification} style={{ fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', border: '1px solid #4EA8DE', backgroundColor: '#E3F2FD', color: '#1565C0', cursor: 'pointer' }}>
                        Gửi email
                      </button>
                    </div>
                  )}
                  {isPasswordProvider && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setView('changePassword')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lock size={15} style={{ color: '#8338EC' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Đổi mật khẩu</span>
                      </div>
                      <ChevronRight size={15} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ngày tham gia</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Đăng nhập gần nhất</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Hỗ trợ */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { IconComp: MessageSquare, label: 'Gửi phản hồi / Góp ý', color: '#8338EC', desc: 'Báo lỗi hoặc đề xuất tính năng mới', target: 'feedback' },
              { IconComp: HelpCircle, label: 'Hướng dẫn sử dụng', color: '#4EA8DE', desc: 'Xem cách dùng các tính năng', target: 'help' },
              { IconComp: Info, label: 'Về ứng dụng · v1.0.0', color: 'var(--text-secondary)', desc: 'SmartHomeMom · Quản lý tài chính gia đình', target: 'about' },
            ].map((item, idx, arr) => {
              const { IconComp } = item;
              return (
                <div
                  key={item.label}
                  onClick={() => setView(item.target as any)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                      backgroundColor: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <IconComp size={17} style={{ color: item.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>

          {/* Đăng xuất */}
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              width: '100%', height: '50px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid #FFCDD2',
              backgroundColor: '#FFEBEE',
              color: 'var(--danger)',
              fontWeight: 700, fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            <LogOut size={17} /> Đăng xuất tài khoản
          </button>

          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', paddingBottom: '4px' }}>
            SmartHomeMom · Quản lý chi tiêu gia đình thông minh
          </div>
        </div>
      )}

      {/* 7. EDIT PROFILE */}
      {view === 'editProfile' && <EditProfileSection onBack={() => setView('account')} />}

      {/* 8. CHANGE PASSWORD */}
      {view === 'changePassword' && <ChangePasswordSection onBack={() => setView('account')} />}

      {/* 9. FEEDBACK */}
      {view === 'feedback' && <FeedbackSection onBack={() => setView('account')} />}

      {/* 10. HELP — Hướng dẫn sử dụng */}
      {view === 'help' && <HelpSection />}

      {/* 11. NOTIFICATIONS */}
      {view === 'notifications' && <NotificationsSection />}

      {/* 12. ABOUT */}
      {view === 'about' && <AboutSection />}

      {/* Dim overlay khi keypad mở */}
      {showAdjustKeypad && adjustingWalletId && (
        <div
          onClick={() => setShowAdjustKeypad(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.25)',
            zIndex: 1099
          }}
        />
      )}

      {/* Custom Keypad for Wallet Balance Adjustment */}
      {showAdjustKeypad && adjustingWalletId && (
        <div style={{
          position: 'fixed',
          bottom: 64,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ECEAE4',
          borderTop: '1px solid var(--border)',
          borderRadius: '16px 16px 0 0',
          padding: '12px 10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          zIndex: 1100,
          boxShadow: '0 -6px 24px rgba(0,0,0,0.18)'
        }}>
          {/* Keypad header / close action */}
          <div style={{
            gridColumn: 'span 4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 6px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}>
            <span>Nhập số dư thực tế</span>
            <button
              type="button"
              onClick={() => setShowAdjustKeypad(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Xong
            </button>
          </div>

          {/* Row 1 */}
          {['7', '8', '9', '/'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => handleAdjustKeyPress(k)}
              style={{
                height: '46px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {k}
            </button>
          ))}
          {/* Row 2 */}
          {['4', '5', '6', '*'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => handleAdjustKeyPress(k)}
              style={{
                height: '46px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {k}
            </button>
          ))}
          {/* Row 3 */}
          {['1', '2', '3', '-'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => handleAdjustKeyPress(k)}
              style={{
                height: '46px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {k}
            </button>
          ))}
          {/* Row 4 */}
          {['0', '000', 'back', '+'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => handleAdjustKeyPress(k)}
              style={{
                height: '46px',
                borderRadius: '8px',
                border: 'none',
                fontSize: k === 'back' ? '14px' : '18px',
                fontWeight: 700,
                backgroundColor: k === 'back' ? 'var(--border)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {k === 'back' ? 'Xóa' : k}
            </button>
          ))}
          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleAdjustKeyPress('C')}
            style={{
              gridColumn: 'span 2',
              height: '46px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              backgroundColor: '#FFA29A',
              color: '#FFF',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            Xóa hết (C)
          </button>
          <button
            type="button"
            onClick={() => handleAdjustKeyPress('=')}
            style={{
              gridColumn: 'span 2',
              height: '46px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 700,
              backgroundColor: 'var(--primary)',
              color: '#FFF',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            = Tính toán
          </button>
        </div>
      )}
    </div>
  );
}
