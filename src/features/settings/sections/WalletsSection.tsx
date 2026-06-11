import { useState } from 'react';
import CurrencyInput from '../../../components/CurrencyInput';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { useFamilyStore } from '../../../stores/familyStore';
import { useAuthStore } from '../../../stores/authStore';
import type { Wallet } from '../../../types';
import { Coins, CreditCard, Star, Pencil, SlidersHorizontal, Trash2, Calculator } from 'lucide-react';

export default function WalletsSection() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const showToast = useToast();
  const {
    family,
    wallets,
    saveFamily,
    createWallet,
    updateWallet,
    deleteWallet,
    createTransaction,
  } = useFamilyStore();

  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<'cash' | 'bank' | 'e_wallet'>('cash');
  const [newWalletBalance, setNewWalletBalance] = useState(1000000);
  const [newWalletIsDefault, setNewWalletIsDefault] = useState(false);
  const [newWalletIncludeInBalance, setNewWalletIncludeInBalance] = useState(true);

  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editWalletName, setEditWalletName] = useState('');
  const [editWalletBalance, setEditWalletBalance] = useState(0);
  const [editWalletIncludeInBalance, setEditWalletIncludeInBalance] = useState(true);

  const [adjustingWalletId, setAdjustingWalletId] = useState<string | null>(null);
  const [adjustWalletExpr, setAdjustWalletExpr] = useState('');
  const [showAdjustKeypad, setShowAdjustKeypad] = useState(false);

  if (!user || !family) return null;

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

  return (
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
    </>
  );
}
