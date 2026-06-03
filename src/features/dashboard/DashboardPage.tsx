import { useState, useMemo } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { useConfirm } from '../../components/ConfirmDialog';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';
import type { Budget, Transaction } from '../../types';
import { getMergedCategories } from '../../core/constants';
import { Wallet as WalletIcon, TrendingDown, TrendingUp, AlertTriangle, Trash2, PiggyBank, Coins, CreditCard, ArrowRightLeft, ChevronRight, ArrowLeft, Search, MoreVertical, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { format } from 'date-fns';
import TransactionModal from '../budget/TransactionModal';
import BudgetDetailPage from '../budget/BudgetDetailPage';
import PullToRefresh from '../../components/PullToRefresh';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const {
    family,
    wallets,
    transactions,
    budgets,
    deleteTransaction,
    customCategories
  } = useFamilyStore();

  const mergedCategories = getMergedCategories(customCategories);

  const linkedMember = user && family
    ? family.members.find(m => m.id === family.linkedMemberIds?.[user.uid])
    : null;
  const greetingName = linkedMember?.name ?? 'bạn';

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [newBudgetCategory, setNewBudgetCategory] = useState('Đi chợ / Ăn uống');
  const [newBudgetLimit, setNewBudgetLimit] = useState(5000000);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [view, setView] = useState<'main' | 'history' | 'wallet_detail' | 'budget_detail'>('main');
  const [selectedWalletIdForDetail, setSelectedWalletIdForDetail] = useState<string | null>(null);
  const [selectedBudgetForDetail, setSelectedBudgetForDetail] = useState<typeof budgets[0] | null>(null);
  const [walletPeriod, setWalletPeriod] = useState<30 | 90 | 365>(30);

  const [showBalance, setShowBalance] = useState(() => {
    return localStorage.getItem('showBalance') !== 'false';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');


  // Calculate totals — chỉ tính ví chi tiêu (includeInBalance !== false)
  const totalBalance = wallets
    .filter(w => w.includeInBalance !== false)
    .reduce((sum, w) => sum + w.balance, 0);
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Dynamic budget calculation based on current transactions of the month
  const getCategorySpent = (categoryName: string) => {
    return transactions
      .filter(t => t.type === 'expense' && t.category === categoryName)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleAddBudget = async () => {
    if (!user) return;
    const newB: Budget = {
      budgetId: 'budget_' + Date.now().toString(),
      category: newBudgetCategory,
      limitAmount: newBudgetLimit,
      spentAmount: 0,
      period: 'monthly',
      startDate: new Date(),
      endDate: new Date(),
      alertThreshold: 0.8,
      isAlerted: false
    };
    await saveBudget(user.uid, newB);
    setShowAddBudget(false);
  };


  const handleDeleteTx = async (tx: Transaction) => {
    if (!user) return;
    const yes = await confirm({
      title: 'Xóa giao dịch',
      message: 'Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được tự động cập nhật lại.',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      await deleteTransaction(user.uid, tx);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (dateFilter === 'all') return true;
    
    const txDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    const now = new Date();
    
    if (dateFilter === 'today') {
      return (
        txDate.getDate() === now.getDate() &&
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    }
    
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return txDate >= oneWeekAgo;
    }
    
    if (dateFilter === 'month') {
      return (
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    }
    
    return true;
  });

  const sortedFilteredTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredTransactions]);

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Chart Data preparation
  const categorySummary: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categorySummary[t.category] = (categorySummary[t.category] || 0) + t.amount;
    });

  const chartData = Object.keys(categorySummary).map(catName => {
    const catMeta = mergedCategories.find(c => c.name === catName);
    return {
      name: catName.split('/')[0].trim(),
      value: categorySummary[catName],
      color: catMeta?.color || '#FF8C69'
    };
  });

  const selectedWallet = wallets.find(w => w.walletId === selectedWalletIdForDetail);
  
  const walletTransactions = useMemo(() => {
    if (!selectedWalletIdForDetail) return [];
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - walletPeriod);
    
    return transactions.filter(t => {
      const txDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const isWithinPeriod = txDate >= startDate;
      const isRelated = t.walletId === selectedWalletIdForDetail || t.toWalletId === selectedWalletIdForDetail;
      return isRelated && isWithinPeriod;
    });
  }, [transactions, selectedWalletIdForDetail, walletPeriod]);

  const walletIncome = useMemo(() => {
    return walletTransactions
      .filter(t => (t.walletId === selectedWalletIdForDetail && t.type === 'income') || (t.toWalletId === selectedWalletIdForDetail && t.type === 'transfer'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [walletTransactions, selectedWalletIdForDetail]);

  const walletExpense = useMemo(() => {
    return walletTransactions
      .filter(t => (t.walletId === selectedWalletIdForDetail && t.type === 'expense') || (t.walletId === selectedWalletIdForDetail && t.type === 'transfer'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [walletTransactions, selectedWalletIdForDetail]);

  const runningBalances = useMemo(() => {
    if (!selectedWalletIdForDetail || !selectedWallet) return {};
    
    const allWalletTransactionsSorted = [...transactions]
      .filter(t => t.walletId === selectedWalletIdForDetail || t.toWalletId === selectedWalletIdForDetail)
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // newest first
      });

    const balances: { [txId: string]: number } = {};
    let tempBalance = selectedWallet.balance;

    allWalletTransactionsSorted.forEach(t => {
      balances[t.transactionId] = tempBalance;
      const isIncrease = (t.walletId === selectedWalletIdForDetail && t.type === 'income') || 
                         (t.toWalletId === selectedWalletIdForDetail && t.type === 'transfer');
      if (isIncrease) {
        tempBalance -= t.amount;
      } else {
        tempBalance += t.amount;
      }
    });

    return balances;
  }, [transactions, selectedWalletIdForDetail, selectedWallet]);

  // Group transactions by date for selected wallet
  const groupedWalletTransactions = useMemo(() => {
    const sorted = [...walletTransactions].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    const groups: { [dateStr: string]: Transaction[] } = {};
    sorted.forEach(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const dateStr = format(date, 'yyyy-MM-dd');
      groups[dateStr] = groups[dateStr] || [];
      groups[dateStr].push(t);
    });
    return groups;
  }, [walletTransactions]);

  const getDailyNetChange = (groupTxs: Transaction[]) => {
    let change = 0;
    groupTxs.forEach(t => {
      const isIncrease = (t.walletId === selectedWalletIdForDetail && t.type === 'income') || 
                         (t.toWalletId === selectedWalletIdForDetail && t.type === 'transfer');
      if (isIncrease) {
        change += t.amount;
      } else {
        change -= t.amount;
      }
    });
    return change;
  };

  const getWeekdayName = (date: Date) => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[date.getDay()];
  };

  const getFormattedDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    const formattedDate = format(date, 'dd/MM/yyyy');
    if (dateStr === todayStr) {
      return `${formattedDate} Hôm nay`;
    } else if (dateStr === yesterdayStr) {
      return `${formattedDate} Hôm qua`;
    } else {
      return `${formattedDate} ${getWeekdayName(date)}`;
    }
  };

  const renderTransactionRow = (t: Transaction, isWalletDetailView: boolean) => {
    const catMeta = mergedCategories.find(c => c.name === t.category);
    const IconComponent = catMeta?.icon || (t.type === 'expense' ? TrendingDown : t.type === 'income' ? TrendingUp : ArrowRightLeft);

    let amountColor = 'var(--text-primary)';
    let amountPrefix = '';
    let showRunningBalance = false;
    let runBal = 0;

    if (isWalletDetailView) {
      const isExpenseForWallet = (t.walletId === selectedWalletIdForDetail && t.type === 'expense') || 
                                 (t.walletId === selectedWalletIdForDetail && t.type === 'transfer');
      amountColor = isExpenseForWallet ? 'var(--danger)' : 'var(--secondary)';
      amountPrefix = isExpenseForWallet ? '-' : '+';
      showRunningBalance = true;
      runBal = runningBalances[t.transactionId] ?? selectedWallet?.balance ?? 0;
    } else {
      if (t.type === 'expense') {
        amountColor = 'var(--danger)';
        amountPrefix = '-';
      } else if (t.type === 'income') {
        amountColor = 'var(--secondary)';
        amountPrefix = '+';
      } else if (t.type === 'transfer') {
        amountColor = '#718096';
        amountPrefix = '';
      }
    }

    const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    const formattedDate = format(date, 'dd/MM/yyyy');

    let subtitleParts = [];
    if (!isWalletDetailView) {
      subtitleParts.push(t.category);
      subtitleParts.push(formattedDate);
    } else {
      if (t.note) {
        subtitleParts.push(t.category);
      }
    }

    if (t.type === 'transfer' && !isWalletDetailView) {
      const fromW = wallets.find(w => w.walletId === t.walletId);
      const toW = wallets.find(w => w.walletId === t.toWalletId);
      if (fromW || toW) {
        const fromName = fromW ? fromW.name.split(' ')[0] : 'Ví cũ';
        const toName = toW ? toW.name.split(' ')[0] : 'Ví mới';
        subtitleParts[0] = `${fromName} ➔ ${toName}`;
      }
    }

    if (t.spentBy) {
      subtitleParts.push(`bởi ${t.spentBy}`);
    }

    const subtitleText = subtitleParts.join(' • ');

    return (
      <div
        key={t.transactionId}
        onClick={() => {
          setSelectedTransaction(t);
          setModalOpen(true);
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.15s ease',
          margin: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: catMeta ? `${catMeta.color}15` : (t.type === 'expense' ? 'var(--primary-bg)' : 'var(--secondary-bg)'),
            color: catMeta?.color || (t.type === 'expense' ? 'var(--primary)' : 'var(--secondary)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <IconComponent size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.note || t.category}
            </span>
            {subtitleText && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                {subtitleText}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: amountColor }}>
              {amountPrefix}{t.amount.toLocaleString('vi-VN')} đ
            </span>
            {showRunningBalance && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                ({runBal.toLocaleString('vi-VN')} đ)
              </span>
            )}
          </div>
          
          {!isWalletDetailView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTx(t);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PullToRefresh key={view} onRefresh={handleRefresh}>
        {view === 'main' ? (
          <>
            {/* Upper header */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px' }}>Chào {greetingName}, {family?.familyName}!</h2>
              <p style={{ fontSize: '12px' }}>Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Balance Widget Card */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              color: 'white',
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ opacity: 0.1, position: 'absolute', right: '-20px', bottom: '-20px' }}>
                <WalletIcon size={120} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>Tổng số dư khả dụng</div>
                <button
                  onClick={() => setShowBalance(v => {
                    localStorage.setItem('showBalance', String(!v));
                    return !v;
                  })}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 16px', letterSpacing: showBalance ? 'normal' : '4px' }}>
                {showBalance ? `${totalBalance.toLocaleString('vi-VN')} đ` : '••••••'}
              </div>

              <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={12} /> Tổng thu</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>
                    {showBalance ? `+${totalIncome.toLocaleString('vi-VN')}đ` : '••••'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingDown size={12} /> Tổng chi</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>
                    {showBalance ? `-${totalExpense.toLocaleString('vi-VN')}đ` : '••••'}
                  </div>
                </div>
              </div>
            </div>

            {/* Wallets detail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {wallets.filter(w => w.includeInBalance !== false).map(w => {
                const WalIcon = w.type === 'cash' ? Coins : w.type === 'bank' ? CreditCard : PiggyBank;
                const isSaving = w.includeInBalance === false;
                return (
                  <div
                    key={w.walletId}
                    onClick={() => {
                      setSelectedWalletIdForDetail(w.walletId);
                      setView('wallet_detail');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${w.colorCode}`,
                      backgroundColor: 'var(--bg-card)',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      backgroundColor: `${w.colorCode}22`, color: w.colorCode,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <WalIcon size={20} />
                    </div>

                    {/* Name + type */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>{w.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{w.type === 'cash' ? 'Tiền mặt' : w.type === 'bank' ? 'Thẻ/Ngân hàng' : 'Ví điện tử'}</span>
                        {isSaving && (
                          <>
                            <span>·</span>
                            <span style={{ color: '#71717a', fontWeight: 600 }}>Tiết kiệm</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Balance */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: showBalance ? 'normal' : '3px' }}>
                        {showBalance ? `${w.balance.toLocaleString('vi-VN')}đ` : '••••'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {isSaving ? 'Tiết kiệm' : 'Số dư'}
                      </div>
                    </div>

                    <ChevronRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>

            {/* Budget Alerts Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px' }}>Hạn mức Chi tiêu</h3>
                <button
                  onClick={() => setShowAddBudget(!showAddBudget)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {showAddBudget ? 'Hủy' : '+ Cài hạn mức'}
                </button>
              </div>

              {showAddBudget && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Chọn danh mục</label>
                    <select className="form-control" value={newBudgetCategory} onChange={(e) => setNewBudgetCategory(e.target.value)}>
                      {mergedCategories.filter(c => c.type === 'expense').map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Hạn mức hàng tháng (VND)</label>
                    <CurrencyInput
                      className="form-control"
                      value={newBudgetLimit}
                      onChange={setNewBudgetLimit}
                    />
                  </div>
                  <button type="button" onClick={handleAddBudget} className="btn btn-primary" style={{ height: '40px' }}>Lưu hạn mức</button>
                </div>
              )}

              {budgets.map(b => {
                const spent = getCategorySpent(b.category);
                const ratio = b.limitAmount > 0 ? spent / b.limitAmount : 0;
                const pct = Math.min(ratio * 100, 100);
                let statusColor = 'var(--secondary)';
                if (ratio >= 0.9) statusColor = 'var(--danger)';
                else if (ratio >= 0.7) statusColor = 'var(--accent)';

                const catMeta = mergedCategories.find(c => c.name === b.category);
                const CatIcon = catMeta?.icon || HelpCircle;
                const catColor = catMeta?.color || 'var(--primary)';

                return (
                  <div
                    key={b.budgetId}
                    className="card"
                    onClick={() => {
                      setSelectedBudgetForDetail(b);
                      setView('budget_detail');
                    }}
                    style={{ marginBottom: '10px', padding: '14px 16px', cursor: 'pointer' }}
                  >
                    {/* Header row: icon + name + percent badge + chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                        backgroundColor: `${catColor}22`, color: catColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <CatIcon size={18} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{b.category}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Đã chi: <span style={{ color: statusColor, fontWeight: 700 }}>{spent.toLocaleString('vi-VN')}đ</span>
                          {' / '}{b.limitAmount.toLocaleString('vi-VN')}đ
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '12px', fontWeight: 800, color: statusColor,
                          backgroundColor: `${statusColor === 'var(--secondary)' ? '#81B29A' : statusColor === 'var(--accent)' ? '#FFB703' : '#E63946'}18`,
                          padding: '2px 8px', borderRadius: '8px'
                        }}>{pct.toFixed(0)}%</span>
                        <ChevronRight size={15} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-grey)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        backgroundColor: statusColor, borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {ratio >= 0.8 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '11px', marginTop: '8px', fontWeight: 600 }}>
                        <AlertTriangle size={12} />
                        <span>Đã dùng {pct.toFixed(0)}% hạn mức — cần kiểm soát chi tiêu!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recharts Analytics Chart */}
            {chartData.length > 0 && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', alignSelf: 'flex-start', marginBottom: '12px' }}>Cơ cấu Chi tiêu Tháng này</h3>
                <div style={{ width: '100%', height: '160px' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value.toLocaleString('vi-VN')}đ`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legends */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', width: '100%', marginTop: '8px' }}>
                  {chartData.map((d, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: d.color }}></div>
                      <span style={{ color: 'var(--text-secondary)' }}>{d.name}: <strong>{d.value.toLocaleString('vi-VN')}đ</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Access to History Button */}
            <button
              type="button"
              onClick={() => setView('history')}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '16px',
                cursor: 'pointer',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--border-radius-md)',
                textAlign: 'left',
                marginTop: '16px',
                marginBottom: '20px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-bg)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Lịch sử giao dịch</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Xem chi tiết, tìm kiếm và lọc chi tiêu ({transactions.length} giao dịch)
                  </div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </>
        ) : view === 'history' ? (
          <>
            {/* History Header & Back button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setView('main')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-grey)',
                  width: '36px',
                  height: '36px'
                }}
              >
                <ArrowLeft size={18} />
              </button>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Lịch sử giao dịch</h2>
            </div>

            {/* Search & Filter Controls */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo ghi chú, danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1.5, height: '40px', fontSize: '13px' }}
              />
              <select
                className="form-control"
                value={dateFilter}
                onChange={(e: any) => setDateFilter(e.target.value)}
                style={{ flex: 1, height: '40px', fontSize: '13px', padding: '0 8px' }}
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
              </select>
            </div>

            {/* Transactions list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' }}>
              {sortedFilteredTransactions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>Không tìm thấy giao dịch nào phù hợp.</p>
              ) : (
                sortedFilteredTransactions.map(t => renderTransactionRow(t, false))
              )}
            </div>
          </>
        ) : view === 'wallet_detail' ? (
          /* Wallet Details view */
          selectedWallet && (
            <div style={{ paddingBottom: '20px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setView('main')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-grey)',
                      width: '36px',
                      height: '36px'
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{selectedWallet.name}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}><Search size={20} /></button>
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}><MoreVertical size={20} /></button>
                </div>
              </div>

              {/* Time period filter selector */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <select
                  value={walletPeriod}
                  onChange={(e) => setWalletPeriod(parseInt(e.target.value) as any)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#4EA8DE',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '4px 8px'
                  }}
                >
                  <option value={30}>30 ngày gần nhất &gt;</option>
                  <option value={90}>90 ngày gần nhất &gt;</option>
                  <option value={365}>1 năm gần nhất &gt;</option>
                </select>
              </div>

              {/* Summary Metrics Card */}
              <div className="card" style={{ display: 'flex', padding: '16px 0', marginBottom: '16px' }}>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tổng thu</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--secondary)' }}>
                    {walletIncome.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tổng chi</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--danger)' }}>
                    {walletExpense.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* Current balance row */}
              <div className="card" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                marginBottom: '20px'
              }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Số dư hiện tại</span>
                <strong style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  borderBottom: '3px double var(--text-primary)',
                  paddingBottom: '2px'
                }}>
                  {selectedWallet.balance.toLocaleString('vi-VN')} đ
                </strong>
              </div>

              {/* Transactions list grouped by date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.keys(groupedWalletTransactions).length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Không có giao dịch nào trong khoảng thời gian này.
                  </p>
                ) : (
                  Object.keys(groupedWalletTransactions).map(dateStr => {
                    const dayTxs = groupedWalletTransactions[dateStr];
                    const netChange = getDailyNetChange(dayTxs);

                    return (
                      <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Group Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderBottom: '1px solid var(--border)',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          fontWeight: 700
                        }}>
                          <span>{getFormattedDateHeader(dateStr)}</span>
                          <span style={{
                            color: netChange > 0 ? 'var(--secondary)' : netChange < 0 ? 'var(--danger)' : 'var(--text-secondary)',
                            fontWeight: 700
                          }}>
                            {netChange > 0 ? '+' : ''}{netChange.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        {/* Group Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {dayTxs.map(t => renderTransactionRow(t, true))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )
        ) : (
          /* Budget Detail view */
          selectedBudgetForDetail && (
            <BudgetDetailPage
              budget={selectedBudgetForDetail}
              transactions={transactions}
              onBack={() => setView('main')}
            />
          )
        )}
      </PullToRefresh>

      {/* Custom Transaction Modal Component */}
      <TransactionModal 
        isOpen={modalOpen} 
        onClose={() => {
          setModalOpen(false);
          setSelectedTransaction(null);
        }} 
        transactionToEdit={selectedTransaction || undefined}
        defaultWalletId={view === 'wallet_detail' && selectedWalletIdForDetail ? selectedWalletIdForDetail : undefined}
      />
    </>
  );
}
