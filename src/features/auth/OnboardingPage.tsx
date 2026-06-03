import { useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyStore } from '../../stores/familyStore';
import type { Family, FamilyMember } from '../../types';
import { Plus, Trash2, Users, Flame, ArrowRight, ArrowLeft, Coins, CreditCard, PiggyBank, Pencil, Check, UserCheck } from 'lucide-react';
import { DEFAULT_CATEGORIES, DEFAULT_INGREDIENTS } from '../../core/constants';

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const { saveFamily, createWallet, saveBudget } = useFamilyStore();
  const showToast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // STEP 1 STATE: Family Name & Members
  const [familyName, setFamilyName] = useState('Gia đình thân yêu');
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Bố', role: 'father', age: 35, gender: 'male', activityLevel: 'moderately_active' },
    { id: '2', name: 'Mẹ', role: 'mother', age: 32, gender: 'female', activityLevel: 'lightly_active' }
  ]);

  // Add member form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'father' | 'mother' | 'child' | 'grandparent'>('child');
  const [newAgeStr, setNewAgeStr] = useState('6');
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newActivity, setNewActivity] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');

  // Account linking & default spender
  const [linkedMemberId, setLinkedMemberId] = useState<string>('');

  // Inline edit member state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<'father' | 'mother' | 'child' | 'grandparent'>('child');
  const [editMemberAgeStr, setEditMemberAgeStr] = useState('');
  const [editMemberGender, setEditMemberGender] = useState<'male' | 'female'>('male');
  const [editMemberActivity, setEditMemberActivity] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');

  // STEP 2 STATE: Wallets & Default Wallet
  const [walletsSetup, setWalletsSetup] = useState<any[]>([
    { walletId: 'cash_wallet', name: 'Tiền mặt (Ví tay)', type: 'cash', balance: 3000000, colorCode: '#FF8C69', iconName: 'Coins', includeInBalance: true },
    { walletId: 'bank_wallet', name: 'Techcombank (Thẻ)', type: 'bank', balance: 10000000, colorCode: '#4EA8DE', iconName: 'CreditCard', includeInBalance: true }
  ]);
  const [defaultWalletId, setDefaultWalletId] = useState('cash_wallet');

  // Custom wallet form
  const [customWalletName, setCustomWalletName] = useState('');
  const [customWalletType, setCustomWalletType] = useState<'cash' | 'bank' | 'e_wallet'>('bank');
  const [customWalletBalance, setCustomWalletBalance] = useState(2000000);
  const [customWalletIncludeInBalance, setCustomWalletIncludeInBalance] = useState(true);
  const [showAddWalletForm, setShowAddWalletForm] = useState(false);

  // Inline edit wallet state
  const [editingSetupWalletId, setEditingSetupWalletId] = useState<string | null>(null);
  const [editSetupWalletName, setEditSetupWalletName] = useState('');
  const [editSetupWalletBalance, setEditSetupWalletBalance] = useState(0);
  const [editSetupWalletIncludeInBalance, setEditSetupWalletIncludeInBalance] = useState(true);

  // STEP 3 STATE: Monthly budgets Setup — names must match DEFAULT_CATEGORIES exactly
  const [budgetsSetup, setBudgetsSetup] = useState<any[]>([
    { category: 'Đi chợ / Ăn uống',    limitAmount: 5000000, active: true,  description: 'Tiền đi chợ nấu cơm hàng ngày, ăn ngoài.' },
    { category: 'Hóa đơn & Tiện ích',   limitAmount: 3000000, active: true,  description: 'Điện, nước, internet, gas, dịch vụ sinh hoạt.' },
    { category: 'Di chuyển / Xăng xe',  limitAmount: 1000000, active: false, description: 'Xăng xe, gửi xe, taxi, xe ôm.' },
    { category: 'Học phí / Giáo dục',   limitAmount: 2000000, active: false, description: 'Học phí, sách vở, khóa học, đồ chơi trẻ em.' },
    { category: 'Sức khỏe / Bảo hiểm', limitAmount: 1000000, active: false, description: 'Thuốc men, khám bệnh, bảo hiểm sức khỏe.' },
    { category: 'Mua sắm / Làm đẹp',   limitAmount: 1500000, active: false, description: 'Quần áo, mỹ phẩm, đồ gia dụng cá nhân.' },
    { category: 'Sửa chữa / Gia đình',  limitAmount: 500000,  active: false, description: 'Sửa chữa nhà cửa, đồ dùng gia đình.' },
  ]);

  // Quick calorie estimation helper
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

  const totalCalories = members.reduce((sum, m) => sum + calculateMemberCalories(m), 0);

  // Actions for Step 1
  const addMember = () => {
    if (!newName.trim()) return;
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: newName.trim(),
      role: newRole,
      age: parseInt(newAgeStr) || 1,
      gender: newGender,
      activityLevel: newActivity
    };
    setMembers([...members, newMember]);
    setNewName('');
    setNewAgeStr('6');
  };

  const removeMember = (id: string) => {
    if (members.length <= 1) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    if (linkedMemberId === id) setLinkedMemberId('');
  };

  const setDefaultSpender = (id: string) => {
    setMembers(members.map(m => ({ ...m, isDefaultSpender: m.id === id })));
  };

  const startEditMember = (m: FamilyMember) => {
    setEditingMemberId(m.id);
    setEditMemberName(m.name);
    setEditMemberRole(m.role);
    setEditMemberAgeStr(String(m.age));
    setEditMemberGender(m.gender);
    setEditMemberActivity(m.activityLevel);
  };

  const saveMemberEdit = () => {
    if (!editingMemberId || !editMemberName.trim()) return;
    setMembers(members.map(m =>
      m.id === editingMemberId
        ? { ...m, name: editMemberName.trim(), role: editMemberRole, age: parseInt(editMemberAgeStr) || 1, gender: editMemberGender, activityLevel: editMemberActivity }
        : m
    ));
    setEditingMemberId(null);
  };

  // Actions for Step 2
  const addCustomWallet = () => {
    if (!customWalletName.trim()) {
      showToast("Vui lòng nhập tên ví!", "warning");
      return;
    }
    const newW = {
      walletId: 'wallet_' + Date.now().toString(),
      name: customWalletName.trim(),
      type: customWalletType,
      balance: customWalletBalance,
      colorCode: customWalletType === 'cash' ? '#FF8C69' : customWalletType === 'bank' ? '#4EA8DE' : '#81B29A',
      iconName: customWalletType === 'cash' ? 'Coins' : customWalletType === 'bank' ? 'CreditCard' : 'PiggyBank',
      includeInBalance: customWalletIncludeInBalance
    };
    setWalletsSetup([...walletsSetup, newW]);
    setCustomWalletName('');
    setCustomWalletIncludeInBalance(true);
    setShowAddWalletForm(false);
  };

  const removeWallet = (id: string) => {
    if (walletsSetup.length <= 1) {
      showToast("Cần có tối thiểu 1 ví để hoạt động!", "warning");
      return;
    }
    setWalletsSetup(walletsSetup.filter(w => w.walletId !== id));
    if (defaultWalletId === id) {
      const remaining = walletsSetup.filter(w => w.walletId !== id);
      setDefaultWalletId(remaining[0].walletId);
    }
  };

  const startEditSetupWallet = (w: any) => {
    setEditingSetupWalletId(w.walletId);
    setEditSetupWalletName(w.name);
    setEditSetupWalletBalance(w.balance);
    setEditSetupWalletIncludeInBalance(w.includeInBalance !== false);
  };

  const saveSetupWalletEdit = () => {
    if (!editingSetupWalletId || !editSetupWalletName.trim()) return;
    setWalletsSetup(walletsSetup.map(w =>
      w.walletId === editingSetupWalletId
        ? { ...w, name: editSetupWalletName.trim(), balance: editSetupWalletBalance, includeInBalance: editSetupWalletIncludeInBalance }
        : w
    ));
    setEditingSetupWalletId(null);
  };

  // Action for Step 3 budget limits
  const toggleBudget = (idx: number) => {
    const updated = [...budgetsSetup];
    updated[idx].active = !updated[idx].active;
    setBudgetsSetup(updated);
  };

  const handleBudgetLimitChange = (idx: number, limit: number) => {
    const updated = [...budgetsSetup];
    updated[idx].limitAmount = Math.max(0, limit);
    setBudgetsSetup(updated);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (members.length === 0) {
        showToast("Vui lòng khai báo ít nhất một thành viên gia đình!", "warning");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (walletsSetup.length === 0) {
        showToast("Vui lòng thiết lập ít nhất một ví thanh toán!", "warning");
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    // Calculate macros
    const protein = Math.round((totalCalories * 0.20) / 4);
    const carbs = Math.round((totalCalories * 0.55) / 4);
    const fat = Math.round((totalCalories * 0.25) / 9);

    const familyData: Family = {
      familyId: user.uid,
      familyName: familyName.trim() || 'Gia đình của tôi',
      createdAt: new Date(),
      updatedAt: new Date(),
      members,
      nutritionTargets: {
        calories: totalCalories,
        protein,
        carbs,
        fat
      },
      defaultWalletId,
      customCategories: DEFAULT_CATEGORIES,
      customIngredients: DEFAULT_INGREDIENTS,
      ...(linkedMemberId ? { linkedMemberIds: { [user.uid]: linkedMemberId } } : {}),
    };

    try {
      // 1. Save family document (includes members & defaultWalletId)
      await saveFamily(familyData);

      // 2. Save all configured wallets
      for (const w of walletsSetup) {
        await createWallet(user.uid, {
          ...w,
          includeInBalance: w.includeInBalance !== false
        });
      }

      // 3. Save all checked budgets
      for (const b of budgetsSetup) {
        if (b.active) {
          await saveBudget(user.uid, {
            budgetId: 'budget_' + b.category.replace(/\s+/g, '').replace(/\//g, ''),
            category: b.category,
            limitAmount: b.limitAmount,
            spentAmount: 0,
            period: 'monthly',
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59),
            alertThreshold: 0.8,
            isAlerted: false
          });
        }
      }
    } catch (err) {
      console.error("Error saving onboarding details: ", err);
      showToast("Đã xảy ra lỗi khi lưu, vui lòng thử lại!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrollable" style={{ paddingBottom: '30px' }}>
      
      {/* Top Welcome Title */}
      <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
        <h1 style={{ fontSize: '22px', color: 'var(--primary-dark)', fontWeight: 800 }}>SmartHomeMom</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {step === 1 ? 'Chào mừng mẹ nội trợ! Khai báo tổ ấm nhỏ' : step === 2 ? 'Khai báo Ví & Dòng tài chính' : 'Lập ngân sách hạn mức hàng tháng'}
        </p>
      </div>

      {/* Progress Steps Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: '24px' }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: step === s ? 'var(--primary)' : step > s ? 'var(--secondary)' : 'var(--bg-grey)',
              color: step >= s ? 'white' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              transition: 'all 0.3s ease'
            }}>{s}</div>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: step === s ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}>
              {s === 1 ? 'Thành viên' : s === 2 ? 'Ví tiền' : 'Hạn mức'}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: FAMILY MEMBERS */}
      {step === 1 && (
        <>
          <div className="card">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tên Gia đình</label>
              <input
                type="text"
                className="form-control"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Ví dụ: Gia đình Tuấn Lê"
              />
            </div>
          </div>

          <h3 style={{ margin: '20px 0 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} />
            Thành viên trong nhà ({members.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {members.map(m => {
              const isEditing = editingMemberId === m.id;
              const isDefaultSpender = !!m.isDefaultSpender;
              const isLinked = linkedMemberId === m.id;
              const roleLabel = m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : m.role === 'grandparent' ? 'Ông/Bà' : 'Con cái';
              return (
                <div key={m.id} className="card" style={{
                  margin: 0, padding: '14px 16px',
                  borderColor: isDefaultSpender ? 'var(--secondary)' : 'var(--border)',
                  borderWidth: isDefaultSpender ? '2px' : '1px',
                }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Sửa thông tin: {m.name}</div>
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
                          <input type="text" inputMode="numeric" className="form-control"
                            value={editMemberAgeStr} placeholder="1"
                            onChange={e => setEditMemberAgeStr(e.target.value.replace(/\D/g, ''))} />
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
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={saveMemberEdit} className="btn btn-primary" style={{ flex: 1, height: '38px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <Check size={14} /> Lưu
                        </button>
                        <button type="button" onClick={() => setEditingMemberId(null)} className="btn btn-secondary" style={{ flex: 1, height: '38px', fontSize: '13px' }}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                          backgroundColor: 'var(--bg-grey)', color: 'var(--text-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', fontWeight: 800,
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
                      <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <button type="button" onClick={() => startEditMember(m)}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 4px', background: 'none', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer', color: 'var(--primary)' }}>
                          <Pencil size={15} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>Sửa</span>
                        </button>
                        <button type="button"
                          onClick={() => !isDefaultSpender && setDefaultSpender(m.id)}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 4px', background: isDefaultSpender ? '#81B29A15' : 'none', border: 'none', borderRight: '1px solid var(--border)', cursor: isDefaultSpender ? 'default' : 'pointer', color: isDefaultSpender ? 'var(--secondary)' : 'var(--text-secondary)' }}>
                          <Check size={15} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>{isDefaultSpender ? 'Mặc định' : 'Chi mặc định'}</span>
                        </button>
                        <button type="button" onClick={() => removeMember(m.id)}
                          disabled={members.length <= 1}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 4px', background: 'none', border: 'none', cursor: members.length <= 1 ? 'not-allowed' : 'pointer', color: members.length <= 1 ? 'var(--border)' : 'var(--danger)', opacity: members.length <= 1 ? 0.4 : 1 }}>
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

          {/* Tài khoản của bạn */}
          <div className="card" style={{ marginBottom: '16px', backgroundColor: 'var(--primary-bg)', borderColor: 'var(--primary-light)', borderWidth: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <UserCheck size={17} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Tài khoản của bạn là ai?</span>
            </div>
            {linkedMemberId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    {members.find(m => m.id === linkedMemberId)?.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {(() => { const m = members.find(x => x.id === linkedMemberId); return m ? `${m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : m.role === 'grandparent' ? 'Ông/Bà' : 'Con cái'} • ${m.age} tuổi` : ''; })()}
                  </div>
                </div>
                <button type="button" onClick={() => setLinkedMemberId('')}
                  style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Đổi
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Chọn thành viên tương ứng với tài khoản đang đăng nhập:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {members.map(m => (
                    <button key={m.id} type="button" onClick={() => setLinkedMemberId(m.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left' }}>
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

          <div className="card" style={{ backgroundColor: 'var(--secondary-bg)', border: '1px dashed var(--secondary)' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 700 }}>Thêm thành viên mới</h4>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Tên (Ví dụ: bé Bi, bé Na...)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ flex: 2 }}
              />
              <select
                className="form-control"
                value={newRole}
                onChange={(e: any) => setNewRole(e.target.value)}
                style={{ flex: 1.5, padding: '0 8px' }}
              >
                <option value="child">Con cái</option>
                <option value="father">Bố</option>
                <option value="mother">Mẹ</option>
                <option value="grandparent">Ông/Bà</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Tuổi</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  value={newAgeStr}
                  placeholder="1"
                  onChange={(e) => setNewAgeStr(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Giới tính</label>
                <select
                  className="form-control"
                  value={newGender}
                  onChange={(e: any) => setNewGender(e.target.value)}
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Vận động</label>
                <select
                  className="form-control"
                  value={newActivity}
                  onChange={(e: any) => setNewActivity(e.target.value)}
                >
                  <option value="sedentary">Ít vận động</option>
                  <option value="lightly_active">Nhẹ nhàng</option>
                  <option value="moderately_active">Vừa phải</option>
                  <option value="very_active">Nhiều</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={addMember}
              className="btn btn-secondary"
              style={{ width: '100%', display: 'flex', gap: '8px', color: 'var(--text-primary)', height: '40px' }}
            >
              <Plus size={16} /> Thêm vào nhà
            </button>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--primary-bg)', borderColor: 'var(--primary-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--primary)' }}><Flame size={24} fill="currentColor" /></div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mục tiêu dinh dưỡng gia đình</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCalories} Kcal / ngày</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* STEP 2: WALLETS & DEFAULT SELECTION */}
      {step === 2 && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Ví tiền của mẹ và gia đình</h3>
            <p style={{ fontSize: '12px' }}>Khai báo các quỹ/ví hiện có. Đánh dấu tích để chọn ví mặc định khi mẹ nhập nhanh thu chi.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {walletsSetup.map(w => {
              const isDefault = defaultWalletId === w.walletId;
              const isEditing = editingSetupWalletId === w.walletId;
              const WalletIcon = w.type === 'cash' ? Coins : w.type === 'bank' ? CreditCard : PiggyBank;
              return (
                <div
                  key={w.walletId}
                  className="card"
                  style={{
                    margin: 0,
                    padding: '14px 16px',
                    borderColor: isDefault ? 'var(--primary)' : 'var(--border)',
                    borderWidth: isDefault ? '2px' : '1px',
                    backgroundColor: isDefault ? 'var(--primary-bg)' : 'var(--bg-card)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Sửa thông tin: {w.name}</div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Tên ví / tài khoản</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editSetupWalletName}
                          onChange={e => setEditSetupWalletName(e.target.value)}
                          placeholder="Tên ví..."
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Số dư hiện tại (VND)</label>
                        <CurrencyInput
                          className="form-control"
                          value={editSetupWalletBalance}
                          onChange={setEditSetupWalletBalance}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>Ví chi tiêu (tính vào số dư)</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {editSetupWalletIncludeInBalance
                              ? 'Số dư hiển thị ở tổng số dư, có thể chi tiêu bình thường'
                              : 'Số dư ẩn khỏi tổng, chỉ thu/chuyển tiền — không chi được'}
                          </div>
                        </div>
                        <div
                          onClick={() => setEditSetupWalletIncludeInBalance(v => !v)}
                          style={{
                            width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                            backgroundColor: editSetupWalletIncludeInBalance ? 'var(--secondary)' : 'var(--bg-grey)',
                            position: 'relative', transition: 'background-color 0.2s', cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: '3px',
                            left: editSetupWalletIncludeInBalance ? '23px' : '3px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            backgroundColor: 'white', transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={saveSetupWalletEdit} className="btn btn-primary"
                          style={{ flex: 1, height: '38px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <Check size={14} /> Lưu
                        </button>
                        <button type="button" onClick={() => setEditingSetupWalletId(null)} className="btn btn-secondary"
                          style={{ flex: 1, height: '38px', fontSize: '13px' }}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                          backgroundColor: `${w.colorCode}22`, color: w.colorCode,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <WalletIcon size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px' }}>{w.name}</span>
                            {isDefault && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-light)' }}>
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{w.type === 'cash' ? 'Tiền mặt' : w.type === 'bank' ? 'Thẻ/Ngân hàng' : 'Ví điện tử'}</span>
                            <span>•</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{w.balance.toLocaleString('vi-VN')} đ</span>
                            <span>•</span>
                            <span style={{ color: w.includeInBalance !== false ? 'var(--secondary)' : 'var(--text-secondary)', fontWeight: 600 }}>
                              {w.includeInBalance !== false ? 'Ví chi tiêu' : 'Ví tiết kiệm'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <button type="button" onClick={() => startEditSetupWallet(w)}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 4px', background: 'none', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer', color: 'var(--primary)' }}>
                          <Pencil size={15} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>Sửa</span>
                        </button>
                        <button type="button"
                          onClick={() => !isDefault && setDefaultWalletId(w.walletId)}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 4px', background: isDefault ? 'var(--primary-bg)' : 'none', border: 'none', borderRight: '1px solid var(--border)', cursor: isDefault ? 'default' : 'pointer', color: isDefault ? 'var(--primary)' : 'var(--text-secondary)' }}>
                          <Check size={15} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>{isDefault ? 'Mặc định' : 'Đặt mặc định'}</span>
                        </button>
                        <button type="button" onClick={() => removeWallet(w.walletId)}
                          disabled={walletsSetup.length <= 1}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 4px', background: 'none', border: 'none', cursor: walletsSetup.length <= 1 ? 'not-allowed' : 'pointer', color: walletsSetup.length <= 1 ? 'var(--border)' : 'var(--danger)', opacity: walletsSetup.length <= 1 ? 0.4 : 1 }}>
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

          {!showAddWalletForm ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddWalletForm(true)}
              style={{ width: '100%', border: '1px dashed var(--primary)', color: 'var(--primary)', height: '44px', marginBottom: '20px' }}
            >
              + Khai báo thêm ví/tài khoản mới
            </button>
          ) : (
            <div className="card" style={{ borderStyle: 'dashed', borderColor: 'var(--primary)', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Khai báo ví mới</h4>
              <div className="form-group">
                <label>Tên ví / tài khoản</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Ví MoMo, Thẻ phụ của chồng..."
                  value={customWalletName}
                  onChange={(e) => setCustomWalletName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Loại nguồn tiền</label>
                  <select
                    className="form-control"
                    value={customWalletType}
                    onChange={(e: any) => setCustomWalletType(e.target.value)}
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="bank">Tài khoản/Thẻ ngân hàng</option>
                    <option value="e_wallet">Ví điện tử (Momo, ShopeePay)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Số dư hiện tại (VND)</label>
                  <CurrencyInput
                    className="form-control"
                    value={customWalletBalance}
                    onChange={setCustomWalletBalance}
                  />
                </div>
              </div>
              {/* Toggle: Ví chi tiêu */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Ví chi tiêu (tính vào số dư)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {customWalletIncludeInBalance
                      ? 'Số dư hiển thị ở tổng số dư, có thể chi tiêu bình thường'
                      : 'Số dư ẩn khỏi tổng, chỉ thu/chuyển tiền — không chi được'}
                  </div>
                </div>
                <div
                  onClick={() => setCustomWalletIncludeInBalance(v => !v)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                    backgroundColor: customWalletIncludeInBalance ? 'var(--secondary)' : 'var(--bg-grey)',
                    position: 'relative', transition: 'background-color 0.2s', cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: customWalletIncludeInBalance ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: 'white', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={addCustomWallet}
                  className="btn btn-primary"
                  style={{ flex: 1, height: '40px' }}
                >
                  Thêm Ví
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddWalletForm(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, height: '40px' }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* STEP 3: MONTHLY BUDGET LIMITS */}
      {step === 3 && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Cài đặt hạn mức chi tiêu hàng tháng</h3>
            <p style={{ fontSize: '12px' }}>Giúp các mẹ quản lý chặt chẽ ngân sách, tránh vỡ kế hoạch chi tiêu. Tích chọn để áp dụng.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {budgetsSetup.map((b, idx) => (
              <div
                key={b.category}
                className="card"
                style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: b.active ? 'var(--bg-card)' : '#F4F2EE',
                  borderColor: b.active ? 'var(--primary-light)' : 'var(--border)',
                  opacity: b.active ? 1 : 0.8,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={b.active}
                      onChange={() => toggleBudget(idx)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--primary)',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: b.active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {b.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Theo tháng</span>
                </div>
                
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: b.active ? '12px' : 0 }}>
                  {b.description}
                </p>

                {b.active && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px' }}>Hạn mức chi tối đa (VND)</label>
                    <div style={{ position: 'relative' }}>
                      <CurrencyInput
                        className="form-control"
                        value={b.limitAmount}
                        onChange={(v) => handleBudgetLimitChange(idx, v)}
                        style={{ fontWeight: 700, color: 'var(--primary)', paddingRight: '72px' }}
                      />
                      <span style={{ position: 'absolute', right: '16px', top: '13px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>đ / tháng</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* BUTTON FOOTER */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '24px',
        borderTop: '1px solid var(--border)',
        paddingTop: '16px'
      }}>
        {step > 1 && (
          <button
            type="button"
            onClick={handlePrevStep}
            className="btn btn-secondary"
            style={{ flex: 1, display: 'flex', gap: '6px' }}
            disabled={loading}
          >
            <ArrowLeft size={18} /> Quay lại
          </button>
        )}
        
        {step < 3 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }}
          >
            Tiếp theo <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary"
            style={{ flex: 2, display: 'flex', gap: '6px', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Đang hoàn tất...' : 'Hoàn tất thiết lập'} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
