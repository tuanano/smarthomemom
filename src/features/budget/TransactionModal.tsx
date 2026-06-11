import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { useFamilyStore } from '../../stores/familyStore';
import { getMergedCategories } from '../../core/constants';
import { toDate } from '../../types';
import type { Transaction } from '../../types';
import { X, Calculator, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction;
  defaultWalletId?: string;
  defaultType?: 'income' | 'expense' | 'transfer';
}

function evaluateMath(expr: string): number {
  const clean = expr.replace(/[^0-9+\-*/.]/g, '');
  if (!clean) return 0;
  try {
    const res = new Function(`return ${clean}`)();
    return typeof res === 'number' && isFinite(res) && res >= 0 ? res : 0;
  } catch {
    return 0;
  }
}

export default function TransactionModal({ isOpen, onClose, transactionToEdit, defaultWalletId, defaultType }: TransactionModalProps) {
  const { family, wallets, createTransaction, updateTransaction, deleteTransaction, customCategories } = useFamilyStore();
  const confirm = useConfirm();
  const showToast = useToast();
  
  const mergedCategories = useMemo(() => getMergedCategories(customCategories), [customCategories]);
  
  // Refs for tracking clicks outside keypad / input
  const keypadRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef({ hour: false, minute: false });

  // Form states
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amountExpr, setAmountExpr] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [targetWalletId, setTargetWalletId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [note, setNote] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [spentBy, setSpentBy] = useState('');

  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Keypad Visibility
  const [showKeypad, setShowKeypad] = useState(false);

  // Click outside detector
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Do not close keypad if clicking buttons or select elements to avoid disrupting their actions/focus
      if (target.closest('button') || target.closest('select')) {
        return;
      }
      if (
        amountInputRef.current && 
        !amountInputRef.current.contains(event.target as Node) &&
        keypadRef.current && 
        !keypadRef.current.contains(event.target as Node)
      ) {
        setShowKeypad(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Load or Reset form states based on mode
  useEffect(() => {
    if (isOpen) {
      setShowTimePicker(false);
      if (transactionToEdit) {
        setType(transactionToEdit.type as any);
        setAmountExpr(transactionToEdit.amount.toString());
        setSelectedWalletId(transactionToEdit.walletId);
        setTargetWalletId(transactionToEdit.toWalletId || '');
        setSelectedCategory(transactionToEdit.category);
        setNote(transactionToEdit.note);
        
        const date = toDate(transactionToEdit.date);
        setDateStr(format(date, 'yyyy-MM-dd'));
        setSelectedHour(date.getHours());
        setSelectedMinute(date.getMinutes());
        setSpentBy(transactionToEdit.spentBy || '');
        setShowKeypad(false); // Hide keypad by default when viewing/editing existing tx
      } else {
        setType(defaultType || 'expense');
        setAmountExpr('');
        const spendingWallets = wallets.filter(w => w.includeInBalance !== false);
        const fallbackWallet = spendingWallets[0] ?? wallets[0];
        const defaultId = defaultWalletId || family?.defaultWalletId || fallbackWallet?.walletId || '';
        setSelectedWalletId(defaultId);
        const otherWallet = wallets.find(w => w.walletId !== defaultId) ?? wallets[1];
        setTargetWalletId(otherWallet?.walletId || (wallets[0]?.walletId || ''));
        
        // Initialize default category matching the type
        const resolvedType = defaultType || 'expense';
        const defaultCat = mergedCategories.find(c => c.type === resolvedType);
        setSelectedCategory(defaultCat ? defaultCat.name : 'Khác');
        
        setNote('');
        const now = new Date();
        setDateStr(format(now, 'yyyy-MM-dd'));
        setSelectedHour(now.getHours());
        setSelectedMinute(now.getMinutes());
        const defaultSpender = family?.members?.find(m => m.isDefaultSpender) ?? family?.members?.[0];
        setSpentBy(defaultSpender?.name || '');
        setShowKeypad(true); // Automatically show keypad for new transactions
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transactionToEdit, defaultWalletId]);

  // Scroll to active index on open or selection
  useEffect(() => {
    if (isOpen && showTimePicker) {
      setTimeout(() => {
        if (hourScrollRef.current) {
          isScrollingRef.current.hour = true;
          hourScrollRef.current.scrollTop = selectedHour * 36;
          setTimeout(() => { isScrollingRef.current.hour = false; }, 50);
        }
        if (minuteScrollRef.current) {
          isScrollingRef.current.minute = true;
          minuteScrollRef.current.scrollTop = selectedMinute * 36;
          setTimeout(() => { isScrollingRef.current.minute = false; }, 50);
        }
      }, 50);
    }
  }, [isOpen, showTimePicker, selectedHour, selectedMinute]);

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep keyboard focus inside the modal while open
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSave = useCallback(async () => {
    if (!family) return;
    let finalType = type;
    let finalAmount = evaluateMath(amountExpr);
    let finalCategory = selectedCategory;
    let finalNote = note.trim();

    if (finalAmount <= 0) {
      showToast("Vui lòng nhập số tiền lớn hơn 0", "warning");
      return;
    }
    if (!selectedWalletId) {
      showToast("Vui lòng chọn ví thanh toán", "warning");
      return;
    }
    if (type === 'transfer' && !targetWalletId) {
      showToast("Vui lòng chọn ví nhận", "warning");
      return;
    }
    if (type === 'transfer' && selectedWalletId === targetWalletId) {
      showToast("Ví chuyển và ví nhận phải khác nhau", "warning");
      return;
    }

    const transactionData: Transaction = {
      transactionId: transactionToEdit ? transactionToEdit.transactionId : Date.now().toString(),
      walletId: selectedWalletId,
      type: finalType,
      amount: finalAmount,
      category: type === 'transfer' ? 'Chuyển ví' : finalCategory,
      note: finalNote || (type === 'transfer' ? 'Chuyển tiền' : finalCategory),
      date: (() => {
        const d = new Date(dateStr);
        d.setHours(selectedHour);
        d.setMinutes(selectedMinute);
        d.setSeconds(0);
        d.setMilliseconds(0);
        return d;
      })(),
      createdAt: transactionToEdit ? (toDate(transactionToEdit.createdAt)) : new Date(),
      ...(type === 'transfer' ? { toWalletId: targetWalletId } : {}),
      ...(type === 'expense' ? { spentBy } : {})
    };

    try {
      if (transactionToEdit) {
        await updateTransaction(family.familyId, transactionToEdit, transactionData);
      } else {
        await createTransaction(family.familyId, transactionData);
      }
      setAmountExpr('');
      setNote('');
      onClose();
    } catch (err) {
      console.error(err);
      showToast(transactionToEdit ? "Lỗi khi cập nhật giao dịch" : "Lỗi khi thêm giao dịch", "error");
    }
  }, [type, amountExpr, note, selectedWalletId, targetWalletId, selectedCategory, dateStr, selectedHour, selectedMinute, spentBy, transactionToEdit, family, updateTransaction, createTransaction, onClose, showToast]);

  const handleDelete = useCallback(async () => {
    if (!transactionToEdit || !family) return;
    const yes = await confirm({
      title: 'Xóa giao dịch',
      message: 'Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được tự động cập nhật lại.',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      try {
        await deleteTransaction(family.familyId, transactionToEdit);
        onClose();
      } catch (err) {
        console.error(err);
        showToast('Lỗi khi xóa giao dịch', 'error');
      }
    }
  }, [transactionToEdit, family, confirm, deleteTransaction, onClose, showToast]);

  if (!isOpen || !family) return null;

  // Format display: số thuần → có dấu phân cách, expression → giữ nguyên
  const formatExprDisplay = (expr: string): string => {
    if (!expr) return '';
    if (/^[0-9]+$/.test(expr)) {
      return parseInt(expr, 10).toLocaleString('vi-VN');
    }
    return expr;
  };

  // Keypad interactions
  const handleKeyPress = (val: string) => {
    if (val === 'C') {
      setAmountExpr('');
    } else if (val === 'back') {
      setAmountExpr(prev => prev.slice(0, -1));
    } else if (val === '=') {
      const result = evaluateMath(amountExpr);
      setAmountExpr(result.toString());
    } else {
      setAmountExpr(prev => prev + val);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleHourScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current.hour) return;
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / 36);
    if (index >= 0 && index < 24 && index !== selectedHour) {
      setSelectedHour(index);
    }
  };

  const handleMinuteScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current.minute) return;
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / 36);
    if (index >= 0 && index < 60 && index !== selectedMinute) {
      setSelectedMinute(index);
    }
  };

  const filteredCategories = mergedCategories.filter(
    c => c.type === type
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={transactionToEdit ? 'Chi tiết & Sửa giao dịch' : 'Ghi chép chi tiêu'}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(61, 64, 91, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .blinking-cursor {
          animation: blink-cursor 1s step-end infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div ref={modalRef} style={{
        backgroundColor: 'var(--bg-cream)',
        borderTopLeftRadius: 'var(--border-radius-lg)',
        borderTopRightRadius: 'var(--border-radius-lg)',
        maxHeight: '92%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '18px' }}>
            {transactionToEdit ? 'Chi tiết & Sửa giao dịch' : 'Ghi chép chi tiêu'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Area */}
        <div className="scrollable" style={{ paddingBottom: showKeypad ? '320px' : '20px' }}>
          {/* Transaction Type Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-grey)',
            padding: '4px',
            borderRadius: 'var(--border-radius-sm)',
            marginBottom: '16px'
          }}>
            {(['expense', 'income', 'transfer'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  const defaultCat = mergedCategories.find(c => c.type === t);
                  setSelectedCategory(defaultCat ? defaultCat.name : 'Khác');
                }}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: type === t ? 'var(--bg-card)' : 'transparent',
                  color: type === t ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: type === t ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s ease',
                  padding: '0 4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {t === 'expense' ? 'Khoản Chi' : t === 'income' ? 'Khoản Thu' : 'Chuyển Ví'}
              </button>
            ))}
          </div>

          {/* Amount Display with Calculator Trigger */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Số tiền (VND)</label>
            <div ref={amountInputRef} style={{ position: 'relative' }} role="button" tabIndex={0} aria-label="Nhập số tiền" onClick={() => setShowKeypad(true)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowKeypad(true); } }}>
              <Calculator size={18} style={{ position: 'absolute', right: '16px', top: '15px', color: 'var(--primary)' }} />
              <div
                className="form-control"
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  paddingRight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  backgroundColor: showKeypad ? 'var(--primary-bg)' : 'var(--bg-card)',
                  borderColor: showKeypad ? 'var(--primary)' : 'var(--border)',
                  height: '48px',
                }}
              >
                <span>{formatExprDisplay(amountExpr) || '0'}</span>
                {showKeypad && (
                  <span 
                    className="blinking-cursor" 
                    style={{ 
                      color: 'var(--primary)', 
                      marginLeft: '4px',
                      fontWeight: 'normal',
                      fontSize: '20px'
                    }}
                  >
                    |
                  </span>
                )}
              </div>
            </div>
            {amountExpr && (
              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Bằng số: {evaluateMath(amountExpr).toLocaleString('vi-VN')} đ
              </div>
            )}
          </div>

          {/* Category Picker Grid (Not visible for transfer) */}
          {type !== 'transfer' && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Danh mục phân loại</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '4px'
              }}>
                {filteredCategories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: isSelected ? 'var(--primary-bg)' : 'var(--bg-card)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={18} style={{ color: isSelected ? 'var(--primary)' : cat.color }} />
                      <span style={{ textAlign: 'center', wordBreak: 'break-word' }}>{cat.name.split('/')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note Input */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Ghi chú ngắn</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: Mua thịt cá cho bữa tối..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Wallets Selectors */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>{type === 'transfer' ? 'Ví nguồn' : 'Ví thanh toán'}</label>
              <select
                className="form-control"
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
              >
                {(type === 'expense'
                  ? wallets.filter(w => w.includeInBalance !== false)
                  : wallets
                ).map(w => (
                  <option key={w.walletId} value={w.walletId}>
                    {w.name} ({w.balance.toLocaleString('vi-VN')}đ)
                  </option>
                ))}
              </select>
              {type === 'expense' && wallets.some(w => w.includeInBalance === false) && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  * Ví lưu trữ không thể dùng để chi tiêu
                </div>
              )}
            </div>

            {type === 'transfer' && (
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Ví đích nhận</label>
                <select
                  className="form-control"
                  value={targetWalletId}
                  onChange={(e) => setTargetWalletId(e.target.value)}
                >
                  {wallets.map(w => (
                    <option key={w.walletId} value={w.walletId}>
                      {w.name} ({w.balance.toLocaleString('vi-VN')}đ){w.includeInBalance === false ? ' [Lưu trữ]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Members Selector (Only for expenses) */}
          {type === 'expense' && family.members.length > 0 && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Thành viên chi tiêu</label>
              <select
                className="form-control"
                value={spentBy}
                onChange={(e) => setSpentBy(e.target.value)}
              >
                {family.members.map(m => (
                  <option key={m.id} value={m.name}>{m.name} ({m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : 'Con'})</option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Time Picker */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            {/* Date Picker */}
            <div className="form-group" style={{ flex: 1.2, marginBottom: 0 }}>
              <label>Ngày giao dịch</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
                <input
                  type="date"
                  className="form-control"
                  style={{ paddingLeft: '40px', fontSize: '13px', height: '40px' }}
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
            </div>

            {/* Time Picker Trigger */}
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Giờ giao dịch</label>
              <div 
                onClick={() => setShowTimePicker(!showTimePicker)}
                className="form-control"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  backgroundColor: showTimePicker ? 'var(--primary-bg)' : 'var(--bg-card)',
                  borderColor: showTimePicker ? 'var(--primary)' : 'var(--border)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  height: '40px'
                }}
              >
                <span>{selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Scrollable Time Picker Wheel */}
          {showTimePicker && (
            <div className="card" style={{
              display: 'flex',
              padding: '8px 16px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: '16px',
              position: 'relative',
              alignItems: 'center'
            }}>
              {/* Highlight bar in the middle */}
              <div style={{
                position: 'absolute',
                left: '16px',
                right: '16px',
                height: '36px',
                backgroundColor: 'rgba(78, 168, 222, 0.08)',
                borderRadius: '6px',
                pointerEvents: 'none',
                zIndex: 1
              }} />

              {/* Hour column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Giờ</div>
                <div 
                  ref={hourScrollRef}
                  onScroll={handleHourScroll}
                  className="no-scrollbar"
                  style={{
                    height: '108px',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    paddingTop: '36px',
                    paddingBottom: '36px',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  {hours.map(h => (
                    <div 
                      key={h}
                      onClick={() => {
                        setSelectedHour(h);
                        if (hourScrollRef.current) {
                          hourScrollRef.current.scrollTo({ top: h * 36, behavior: 'smooth' });
                        }
                      }}
                      style={{
                        height: '36px',
                        lineHeight: '36px',
                        scrollSnapAlign: 'center',
                        fontWeight: selectedHour === h ? '800' : '500',
                        fontSize: selectedHour === h ? '16px' : '13px',
                        color: selectedHour === h ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {h.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Colon separator */}
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-secondary)', padding: '0 10px', paddingTop: '14px' }}>:</div>

              {/* Minute column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Phút</div>
                <div 
                  ref={minuteScrollRef}
                  onScroll={handleMinuteScroll}
                  className="no-scrollbar"
                  style={{
                    height: '108px',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    paddingTop: '36px',
                    paddingBottom: '36px',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  {minutes.map(m => (
                    <div 
                      key={m}
                      onClick={() => {
                        setSelectedMinute(m);
                        if (minuteScrollRef.current) {
                          minuteScrollRef.current.scrollTo({ top: m * 36, behavior: 'smooth' });
                        }
                      }}
                      style={{
                        height: '36px',
                        lineHeight: '36px',
                        scrollSnapAlign: 'center',
                        fontWeight: selectedMinute === m ? '800' : '500',
                        fontSize: selectedMinute === m ? '16px' : '13px',
                        color: selectedMinute === m ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {m.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            {transactionToEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  backgroundColor: '#FFEBEE',
                  color: 'var(--danger)',
                  borderColor: '#FFCDD2',
                  fontWeight: 700,
                  height: '44px'
                }}
                onClick={handleDelete}
              >
                Xóa
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 2, height: '44px' }}
              onClick={handleSave}
            >
              {transactionToEdit ? 'Cập nhật' : 'Lưu giao dịch'}
            </button>
          </div>
        </div>

        {/* Custom Calculator Keypad Panel */}
        {showKeypad && (
          <div ref={keypadRef} style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ECEAE4',
            borderTop: '1px solid var(--border)',
            borderRadius: '16px 16px 0 0',
            padding: '12px 10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            zIndex: 101,
            boxShadow: '0 -6px 24px rgba(0,0,0,0.12)'
          }}>
            {/* Header */}
            <div style={{
              gridColumn: 'span 4',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 4px 6px'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Nhập số tiền
              </span>
              <button
                type="button"
                onClick={() => setShowKeypad(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Xong
              </button>
            </div>

            {/* Row 1 */}
            {['7', '8', '9', '/'].map(k => (
              <button key={k} type="button" onClick={() => handleKeyPress(k)} style={{
                height: '46px', borderRadius: '8px', border: 'none',
                fontSize: '18px', fontWeight: 700,
                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}>{k}</button>
            ))}

            {/* Row 2 */}
            {['4', '5', '6', '*'].map(k => (
              <button key={k} type="button" onClick={() => handleKeyPress(k)} style={{
                height: '46px', borderRadius: '8px', border: 'none',
                fontSize: '18px', fontWeight: 700,
                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}>{k}</button>
            ))}

            {/* Row 3 */}
            {['1', '2', '3', '-'].map(k => (
              <button key={k} type="button" onClick={() => handleKeyPress(k)} style={{
                height: '46px', borderRadius: '8px', border: 'none',
                fontSize: '18px', fontWeight: 700,
                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}>{k}</button>
            ))}

            {/* Row 4 */}
            {['0', '000', 'back', '+'].map(k => (
              <button key={k} type="button" onClick={() => handleKeyPress(k)} style={{
                height: '46px', borderRadius: '8px', border: 'none',
                fontSize: k === 'back' ? '14px' : '18px', fontWeight: 700,
                backgroundColor: k === 'back' ? 'var(--border)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}>{k === 'back' ? 'Xóa' : k}</button>
            ))}

            {/* Row 5 */}
            <button
              type="button"
              onClick={() => handleKeyPress('C')}
              style={{
                gridColumn: 'span 2', height: '46px', borderRadius: '8px', border: 'none',
                fontSize: '15px', fontWeight: 700,
                backgroundColor: '#FFA29A', color: '#FFF',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}
            >
              Xóa hết (C)
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('=')}
              style={{
                gridColumn: 'span 2', height: '46px', borderRadius: '8px', border: 'none',
                fontSize: '16px', fontWeight: 700,
                backgroundColor: 'var(--primary)', color: '#FFF',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}
            >
              = Tính toán
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
