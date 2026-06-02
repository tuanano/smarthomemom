import { useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyStore } from '../../stores/familyStore';
import type { Family, FamilyMember } from '../../types';
import { Plus, Trash2, Users, Flame, ArrowRight, ArrowLeft, Coins, CreditCard } from 'lucide-react';
import { DEFAULT_CATEGORIES, DEFAULT_INGREDIENTS } from '../../core/constants';

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const { saveFamily, createWallet, saveBudget } = useFamilyStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // STEP 1 STATE: Family Name & Members
  const [familyName, setFamilyName] = useState('Gia đình thân yêu');
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Bố', role: 'father', age: 35, gender: 'male', activityLevel: 'moderately_active' },
    { id: '2', name: 'Mẹ', role: 'mother', age: 32, gender: 'female', activityLevel: 'lightly_active' }
  ]);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'father' | 'mother' | 'child' | 'grandparent'>('child');
  const [newAge, setNewAge] = useState(6);
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newActivity, setNewActivity] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');

  // STEP 2 STATE: Wallets & Default Wallet
  const [walletsSetup, setWalletsSetup] = useState<any[]>([
    { walletId: 'cash_wallet', name: 'Tiền mặt (Ví tay)', type: 'cash', balance: 3000000, colorCode: '#FF8C69', iconName: 'Coins' },
    { walletId: 'bank_wallet', name: 'Techcombank (Thẻ)', type: 'bank', balance: 10000000, colorCode: '#4EA8DE', iconName: 'CreditCard' }
  ]);
  const [defaultWalletId, setDefaultWalletId] = useState('cash_wallet');
  
  // Custom wallet form
  const [customWalletName, setCustomWalletName] = useState('');
  const [customWalletType, setCustomWalletType] = useState<'cash' | 'bank' | 'e_wallet'>('bank');
  const [customWalletBalance, setCustomWalletBalance] = useState(2000000);
  const [showAddWalletForm, setShowAddWalletForm] = useState(false);

  // STEP 3 STATE: Monthly budgets Setup
  const [budgetsSetup, setBudgetsSetup] = useState<any[]>([
    { category: 'Đi chợ / Ăn uống', limitAmount: 5000000, active: true, description: 'Tiền đi chợ nấu cơm hàng ngày, ăn ngoài.' },
    { category: 'Hóa đơn / Sinh hoạt', limitAmount: 3000000, active: true, description: 'Điện, nước, internet, gas, dịch vụ.' },
    { category: 'Học tập / Con cái', limitAmount: 2000000, active: false, description: 'Học phí, tã bỉm, sữa, đồ chơi cho con.' },
    { category: 'Mua sắm / Mỹ phẩm', limitAmount: 1500000, active: false, description: 'Quần áo, đồ gia dụng, đồ chăm sóc cá nhân.' },
    { category: 'Giải trí / Du lịch', limitAmount: 1000000, active: false, description: 'Xem phim, cafe họp mặt, du lịch cuối tuần.' }
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
      age: newAge,
      gender: newGender,
      activityLevel: newActivity
    };
    setMembers([...members, newMember]);
    setNewName('');
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  // Actions for Step 2
  const addCustomWallet = () => {
    if (!customWalletName.trim()) {
      alert("Vui lòng nhập tên ví!");
      return;
    }
    const newW = {
      walletId: 'wallet_' + Date.now().toString(),
      name: customWalletName.trim(),
      type: customWalletType,
      balance: customWalletBalance,
      colorCode: customWalletType === 'cash' ? '#FF8C69' : customWalletType === 'bank' ? '#4EA8DE' : '#81B29A',
      iconName: customWalletType === 'cash' ? 'Coins' : customWalletType === 'bank' ? 'CreditCard' : 'PiggyBank'
    };
    setWalletsSetup([...walletsSetup, newW]);
    setCustomWalletName('');
    setShowAddWalletForm(false);
  };

  const removeWallet = (id: string) => {
    if (walletsSetup.length <= 1) {
      alert("Cần có tối thiểu 1 ví để hoạt động!");
      return;
    }
    setWalletsSetup(walletsSetup.filter(w => w.walletId !== id));
    if (defaultWalletId === id) {
      const remaining = walletsSetup.filter(w => w.walletId !== id);
      setDefaultWalletId(remaining[0].walletId);
    }
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
        alert("Vui lòng khai báo ít nhất một thành viên gia đình!");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (walletsSetup.length === 0) {
        alert("Vui lòng thiết lập ít nhất một ví thanh toán!");
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
      customIngredients: DEFAULT_INGREDIENTS
    };

    try {
      // 1. Save family document (includes members & defaultWalletId)
      await saveFamily(familyData);

      // 2. Save all configured wallets
      for (const w of walletsSetup) {
        await createWallet(user.uid, w);
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
            startDate: new Date(),
            endDate: new Date(),
            alertThreshold: 0.8,
            isAlerted: false
          });
        }
      }
    } catch (err) {
      console.error("Error saving onboarding details: ", err);
      alert("Đã xảy ra lỗi khi lưu cấu hình gia đình. Vui lòng thử lại!");
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
            {members.map(m => (
              <div key={m.id} className="card" style={{ margin: 0, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{m.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : m.role === 'grandparent' ? 'Ông/Bà' : 'Con cái'} • {m.age} tuổi • {m.gender === 'male' ? 'Nam' : 'Nữ'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)' }}>
                    ~{calculateMemberCalories(m)} Kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
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
                  type="number"
                  className="form-control"
                  value={newAge}
                  onChange={(e) => setNewAge(parseInt(e.target.value) || 1)}
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
              return (
                <div
                  key={w.walletId}
                  className="card"
                  onClick={() => setDefaultWalletId(w.walletId)}
                  style={{
                    margin: 0,
                    padding: '16px',
                    borderColor: isDefault ? 'var(--primary)' : 'var(--border)',
                    borderWidth: isDefault ? '2px' : '1px',
                    backgroundColor: isDefault ? 'var(--primary-bg)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: `${w.colorCode}22`,
                      color: w.colorCode,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {w.type === 'cash' ? <Coins size={20} /> : <CreditCard size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{w.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Loại: {w.type === 'cash' ? 'Tiền mặt' : w.type === 'bank' ? 'Thẻ/Ngân hàng' : 'Ví điện tử'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800 }}>{w.balance.toLocaleString('vi-VN')} đ</div>
                      {isDefault && <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>Ví mặc định</span>}
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWallet(w.walletId);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
