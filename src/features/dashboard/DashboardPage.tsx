import { useState, useMemo } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { useConfirm } from '../../components/ConfirmDialog';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import type { Budget, Transaction } from '../../types';
import { getMergedCategories } from '../../core/constants';
import { Wallet as WalletIcon, TrendingDown, TrendingUp, AlertTriangle, Trash2, PiggyBank, Coins, CreditCard, ArrowRightLeft, ChevronRight, ArrowLeft, HelpCircle, Eye, EyeOff, Plus, Minus, Pencil, X, Check } from 'lucide-react';
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
    saveBudget,
    saveFamily,
    customCategories,
    deleteWallet,
    updateWallet
  } = useFamilyStore();

  const mergedCategories = getMergedCategories(customCategories);

  const { banners, dismissBanner } = useNotificationStore();

  const linkedMember = user && family
    ? family.members.find(m => m.id === family.linkedMemberIds?.[user.uid])
    : null;
  const greetingName = linkedMember?.name ?? 'bạn';

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [newBudgetCategory, setNewBudgetCategory] = useState('Đi chợ / Ăn uống');
  const [newBudgetLimit, setNewBudgetLimit] = useState(5000000);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [view, setView] = useState<'main' | 'history' | 'wallet_detail' | 'budget_detail' | 'balance_overview'>('main');
  const [selectedWalletIdForDetail, setSelectedWalletIdForDetail] = useState<string | null>(null);
  const [selectedBudgetForDetail, setSelectedBudgetForDetail] = useState<typeof budgets[0] | null>(null);
  const [walletPeriod, setWalletPeriod] = useState<'month' | 30 | 90 | 365 | 'custom'>('month');
  const [walletDateFrom, setWalletDateFrom] = useState('');
  const [walletDateTo, setWalletDateTo] = useState('');
  const [walletTxTypeFilter, setWalletTxTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [editingWallet, setEditingWallet] = useState(false);
  const [editWalletName, setEditWalletName] = useState('');
  const [editWalletColor, setEditWalletColor] = useState('');
  const [editWalletBalance, setEditWalletBalance] = useState(0);
  const [editWalletIncludeInBalance, setEditWalletIncludeInBalance] = useState(true);
  const [editWalletIsDefault, setEditWalletIsDefault] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'income' | 'expense' | 'transfer' | undefined>(undefined);

  const [showBalance, setShowBalance] = useState(() => {
    return localStorage.getItem('showBalance') !== 'false';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');


  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate totals — chỉ tính ví chi tiêu (includeInBalance !== false), lọc theo tháng hiện tại
  const totalBalance = wallets
    .filter(w => w.includeInBalance !== false)
    .reduce((sum, w) => sum + w.balance, 0);

  const totalIncome = transactions
    .filter(t => {
      if (t.type !== 'income') return false;
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const spendingWallets = wallets.filter(w => w.includeInBalance !== false);
  const savingsWallets = wallets.filter(w => w.includeInBalance === false);
  const totalAssets = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalSavings = savingsWallets.reduce((sum, w) => sum + w.balance, 0);

  // Dynamic budget calculation based on current transactions of the month
  const getCategorySpent = (categoryName: string, startDate?: Date, endDate?: Date) => {
    return transactions
      .filter(t => {
        if (t.type !== 'expense' || t.category !== categoryName) return false;
        if (startDate || endDate) {
          const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
          if (startDate && d < startDate) return false;
          if (endDate && d > endDate) return false;
        }
        return true;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleAddBudget = async () => {
    if (!user) return;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const newB: Budget = {
      budgetId: 'budget_' + Date.now().toString(),
      category: newBudgetCategory,
      limitAmount: newBudgetLimit,
      spentAmount: 0,
      period: 'monthly',
      startDate: monthStart,
      endDate: monthEnd,
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

    if (dateFilter === 'custom') {
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (txDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (txDate > to) return false;
      }
      return true;
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

  // Chart Data preparation — chỉ chi tiêu tháng hiện tại
  const categorySummary: { [key: string]: number } = {};
  transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
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
    return transactions.filter(t => {
      const txDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      let isWithinPeriod: boolean;
      if (walletPeriod === 'month') {
        isWithinPeriod = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (walletPeriod === 'custom') {
        isWithinPeriod = true;
        if (walletDateFrom) {
          const from = new Date(walletDateFrom);
          from.setHours(0, 0, 0, 0);
          if (txDate < from) isWithinPeriod = false;
        }
        if (isWithinPeriod && walletDateTo) {
          const to = new Date(walletDateTo);
          to.setHours(23, 59, 59, 999);
          if (txDate > to) isWithinPeriod = false;
        }
      } else {
        const startDate = new Date();
        startDate.setDate(now.getDate() - walletPeriod);
        isWithinPeriod = txDate >= startDate;
      }
      const isRelated = t.walletId === selectedWalletIdForDetail || t.toWalletId === selectedWalletIdForDetail;
      return isRelated && isWithinPeriod;
    });
  }, [transactions, selectedWalletIdForDetail, walletPeriod, walletDateFrom, walletDateTo]);

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

  const filteredWalletTransactions = useMemo(() => {
    if (walletTxTypeFilter === 'all') return walletTransactions;
    return walletTransactions.filter(t => t.type === walletTxTypeFilter);
  }, [walletTransactions, walletTxTypeFilter]);

  // Group transactions by date for selected wallet
  const groupedWalletTransactions = useMemo(() => {
    const sorted = [...filteredWalletTransactions].sort((a, b) => {
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
  }, [filteredWalletTransactions]);

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

            {/* In-app reminder banners */}
            {banners.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {banners.map((banner) => (
                  <div key={banner.id} style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    gap: '10px', padding: '12px 14px',
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: banner.type === 'budget' ? '#FFF8E1' : '#FFF3E0',
                    border: `1px solid ${banner.type === 'budget' ? '#FFB300' : '#FF8C00'}`,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#5D4037', lineHeight: 1.4, flex: 1 }}>{banner.message}</span>
                    <button
                      onClick={() => dismissBanner(banner.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E6B00', padding: '0', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                      aria-label="Đóng"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Balance Widget Card */}
            <div
              className="card"
              onClick={() => setView('balance_overview')}
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: 'white',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
            >
              <div style={{ opacity: 0.1, position: 'absolute', right: '-20px', bottom: '-20px' }}>
                <WalletIcon size={120} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>Tổng số dư khả dụng</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowBalance(v => {
                        localStorage.setItem('showBalance', String(!v));
                        return !v;
                      });
                    }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <ChevronRight size={16} style={{ opacity: 0.7 }} />
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 16px', letterSpacing: showBalance ? 'normal' : '4px' }}>
                {showBalance ? `${totalBalance.toLocaleString('vi-VN')} đ` : '••••••'}
              </div>

              <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={12} /> Thu tháng này</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>
                    {showBalance ? `+${totalIncome.toLocaleString('vi-VN')}đ` : '••••'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingDown size={12} /> Chi tháng này</div>
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
                let bStart: Date, bEnd: Date;
                if (b.period === 'monthly') {
                  const now = new Date();
                  bStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  bEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                } else {
                  bStart = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
                  bEnd = b.endDate?.toDate ? b.endDate.toDate() : new Date(b.endDate);
                }
                const spent = getCategorySpent(b.category, bStart, bEnd);
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
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
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
                <option value="custom">Tùy chỉnh</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                <input
                  type="date"
                  className="form-control"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ flex: 1, height: '40px', fontSize: '13px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flexShrink: 0 }}>→</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ flex: 1, height: '40px', fontSize: '13px' }}
                />
              </div>
            )}

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
          selectedWallet && (() => {
            const WalIcon = selectedWallet.type === 'cash' ? Coins : selectedWallet.type === 'bank' ? CreditCard : PiggyBank;
            const walletTypeName = selectedWallet.type === 'cash' ? 'Tiền mặt' : selectedWallet.type === 'bank' ? 'Thẻ / Ngân hàng' : 'Ví điện tử';
            const WALLET_COLORS = ['#E63946', '#F4A261', '#2A9D8F', '#457B9D', '#7B2D8B', '#264653', '#E9C46A', '#6D6875'];
            const typeFilters: { key: 'all' | 'income' | 'expense' | 'transfer'; label: string }[] = [
              { key: 'all', label: 'Tất cả' },
              { key: 'income', label: 'Thu' },
              { key: 'expense', label: 'Chi' },
              { key: 'transfer', label: 'Chuyển' },
            ];

            return (
              <div style={{ paddingBottom: '24px' }}>
                {/* Top bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => { setView('main'); setEditingWallet(false); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-grey)', width: '36px', height: '36px', flexShrink: 0 }}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Chi tiết ví</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingWallet) {
                          setEditingWallet(false);
                        } else {
                          setEditWalletName(selectedWallet.name);
                          setEditWalletColor(selectedWallet.colorCode);
                          setEditWalletBalance(selectedWallet.balance);
                          setEditWalletIncludeInBalance(selectedWallet.includeInBalance !== false);
                          setEditWalletIsDefault(family?.defaultWalletId === selectedWallet.walletId);
                          setEditingWallet(true);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: editingWallet ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-grey)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {editingWallet ? <X size={18} /> : <Pencil size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) return;
                        const yes = await confirm({ title: 'Xoá ví', message: `Bạn có chắc muốn xoá ví "${selectedWallet.name}"? Dữ liệu giao dịch liên quan sẽ không bị xoá.`, confirmText: 'Xoá ví', variant: 'danger' });
                        if (yes) { await deleteWallet(user.uid, selectedWallet.walletId); setView('main'); }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-grey)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Edit form */}
                {editingWallet && (
                  <div className="card" style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '13px' }}>Tên ví</label>
                      <input
                        className="form-control"
                        value={editWalletName}
                        onChange={e => setEditWalletName(e.target.value)}
                        style={{ height: '40px', fontSize: '14px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '13px' }}>Số dư (VND)</label>
                      <CurrencyInput
                        className="form-control"
                        value={editWalletBalance}
                        onChange={setEditWalletBalance}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Màu ví</label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {WALLET_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditWalletColor(c)}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c, border: editWalletColor === c ? '3px solid var(--text-primary)' : '3px solid transparent', cursor: 'pointer', boxSizing: 'border-box' }}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Toggle ví mặc định */}
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>Ví mặc định</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {editWalletIsDefault ? 'Tự động chọn khi thêm giao dịch mới' : 'Nhấn để đặt làm ví mặc định'}
                        </div>
                      </div>
                      <div
                        onClick={() => setEditWalletIsDefault(v => !v)}
                        style={{
                          width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                          backgroundColor: editWalletIsDefault ? 'var(--primary)' : 'var(--bg-grey)',
                          position: 'relative', transition: 'background-color 0.2s', cursor: 'pointer'
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: '3px',
                          left: editWalletIsDefault ? '23px' : '3px',
                          width: '18px', height: '18px', borderRadius: '50%',
                          backgroundColor: 'white', transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </label>
                    {/* Toggle ví chi tiêu */}
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
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
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={async () => {
                        if (!user || !editWalletName.trim() || !family) return;
                        await updateWallet(user.uid, selectedWallet.walletId, {
                          name: editWalletName.trim(),
                          colorCode: editWalletColor,
                          balance: editWalletBalance,
                          includeInBalance: editWalletIncludeInBalance,
                        });
                        if (editWalletIsDefault && family.defaultWalletId !== selectedWallet.walletId) {
                          await saveFamily({ ...family, defaultWalletId: selectedWallet.walletId });
                        } else if (!editWalletIsDefault && family.defaultWalletId === selectedWallet.walletId) {
                          await saveFamily({ ...family, defaultWalletId: undefined });
                        }
                        setEditingWallet(false);
                      }}
                    >
                      <Check size={16} /> Lưu thay đổi
                    </button>
                  </div>
                )}

                {/* Hero balance card */}
                <div style={{
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${selectedWallet.colorCode} 0%, ${selectedWallet.colorCode}bb 100%)`,
                  color: 'white',
                  padding: '20px',
                  marginBottom: '14px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ opacity: 0.12, position: 'absolute', right: '-12px', bottom: '-12px' }}>
                    <WalIcon size={100} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <WalIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '16px' }}>{selectedWallet.name}</div>
                      <div style={{ fontSize: '11px', opacity: 0.85 }}>{walletTypeName}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>Số dư hiện tại</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: showBalance ? 'normal' : '4px' }}>
                    {showBalance ? `${selectedWallet.balance.toLocaleString('vi-VN')} đ` : '••••••'}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>Thu kỳ này</div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>+{walletIncome.toLocaleString('vi-VN')}đ</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>Chi kỳ này</div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>-{walletExpense.toLocaleString('vi-VN')}đ</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>Chênh lệch</div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{(walletIncome - walletExpense) >= 0 ? '+' : ''}{(walletIncome - walletExpense).toLocaleString('vi-VN')}đ</div>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: 'Thu tiền', icon: <Plus size={16} />, type: 'income' as const, color: 'var(--secondary)', bg: 'var(--secondary-bg)' },
                    { label: 'Chi tiêu', icon: <Minus size={16} />, type: 'expense' as const, color: 'var(--danger)', bg: '#E6394610' },
                    { label: 'Chuyển khoản', icon: <ArrowRightLeft size={14} />, type: 'transfer' as const, color: 'var(--primary)', bg: 'var(--primary-bg)' },
                  ].map(action => (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => { setModalDefaultType(action.type); setSelectedTransaction(null); setModalOpen(true); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '12px', border: `1px solid ${action.color}30`, backgroundColor: action.bg, cursor: 'pointer' }}
                    >
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: `${action.color}20`, color: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {action.icon}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: action.color }}>{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* Period filter dropdown */}
                <div style={{ marginBottom: walletPeriod === 'custom' ? '8px' : '12px' }}>
                  <select
                    className="form-control"
                    value={String(walletPeriod)}
                    onChange={e => setWalletPeriod(e.target.value === '30' ? 30 : e.target.value === '90' ? 90 : e.target.value === '365' ? 365 : e.target.value as any)}
                    style={{ height: '40px', fontSize: '13px' }}
                  >
                    <option value="month">Tháng này</option>
                    <option value="30">30 ngày gần nhất</option>
                    <option value="90">90 ngày gần nhất</option>
                    <option value="365">1 năm gần nhất</option>
                    <option value="custom">Tùy chỉnh...</option>
                  </select>
                </div>

                {walletPeriod === 'custom' && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    <input
                      type="date"
                      className="form-control"
                      value={walletDateFrom}
                      onChange={e => setWalletDateFrom(e.target.value)}
                      style={{ flex: 1, height: '40px', fontSize: '13px' }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flexShrink: 0 }}>→</span>
                    <input
                      type="date"
                      className="form-control"
                      value={walletDateTo}
                      min={walletDateFrom}
                      onChange={e => setWalletDateTo(e.target.value)}
                      style={{ flex: 1, height: '40px', fontSize: '13px' }}
                    />
                  </div>
                )}

                {/* Type filter chips */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                  {typeFilters.map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setWalletTxTypeFilter(f.key)}
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        border: walletTxTypeFilter === f.key ? 'none' : '1px solid var(--border)',
                        backgroundColor: walletTxTypeFilter === f.key ? 'var(--text-primary)' : 'var(--bg-card)',
                        color: walletTxTypeFilter === f.key ? 'var(--bg-card)' : 'var(--text-secondary)',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 4px', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                            <span>{getFormattedDateHeader(dateStr)}</span>
                            <span style={{ color: netChange > 0 ? 'var(--secondary)' : netChange < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {netChange > 0 ? '+' : ''}{netChange.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dayTxs.map(t => renderTransactionRow(t, true))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()
        ) : view === 'balance_overview' ? (
          /* ── Balance Overview ── */
          (() => {
            const pieData = wallets
              .filter(w => w.balance > 0)
              .map(w => ({ name: w.name, value: w.balance, color: w.colorCode, isSaving: w.includeInBalance === false }));
            const net = totalIncome - totalExpense;

            return (
              <div style={{ paddingBottom: '24px' }}>
                {/* Top bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setView('main')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-grey)', width: '36px', height: '36px', flexShrink: 0 }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Tổng quan tài sản</h2>
                  <button
                    type="button"
                    onClick={() => setShowBalance(v => { localStorage.setItem('showBalance', String(!v)); return !v; })}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                  >
                    {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>

                {/* Hero card — tổng tài sản */}
                <div style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                  color: 'white',
                  padding: '24px 20px',
                  marginBottom: '16px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ opacity: 0.06, position: 'absolute', right: '-16px', bottom: '-16px' }}>
                    <WalletIcon size={130} />
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Tổng tài sản gia đình</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: showBalance ? 'normal' : '5px', marginBottom: '20px' }}>
                    {showBalance ? `${totalAssets.toLocaleString('vi-VN')} đ` : '••••••'}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                      flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px'
                    }}>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Coins size={11} /> Ví chi tiêu
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>
                        {showBalance ? `${totalBalance.toLocaleString('vi-VN')}đ` : '••••'}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
                        {totalAssets > 0 ? `${Math.round(totalBalance / totalAssets * 100)}%` : '0%'} tổng tài sản
                      </div>
                    </div>
                    <div style={{
                      flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px'
                    }}>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <PiggyBank size={11} /> Ví tiết kiệm
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>
                        {showBalance ? `${totalSavings.toLocaleString('vi-VN')}đ` : '••••'}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
                        {totalAssets > 0 ? `${Math.round(totalSavings / totalAssets * 100)}%` : '0%'} tổng tài sản
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tháng này — 3 chỉ số */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { label: 'Thu tháng này', value: totalIncome, color: 'var(--secondary)', icon: TrendingUp, prefix: '+' },
                    { label: 'Chi tháng này', value: totalExpense, color: 'var(--danger)', icon: TrendingDown, prefix: '-' },
                    { label: 'Còn lại', value: Math.abs(net), color: net >= 0 ? 'var(--secondary)' : 'var(--danger)', icon: net >= 0 ? TrendingUp : TrendingDown, prefix: net >= 0 ? '+' : '-' },
                  ].map(({ label, value, color, icon: Icon, prefix }) => (
                    <div key={label} className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={15} />
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color, letterSpacing: showBalance ? 'normal' : '2px' }}>
                        {showBalance ? `${prefix}${value.toLocaleString('vi-VN')}đ` : '••••'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.3 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Biểu đồ phân bổ */}
                {pieData.length > 0 && (
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Phân bổ tài sản</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '130px', height: '130px', flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={2} strokeWidth={0}>
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip
                              formatter={(v: unknown) => [showBalance ? `${Number(v).toLocaleString('vi-VN')}đ` : '••••']}
                              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pieData.map((d) => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: d.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                {totalAssets > 0 ? `${Math.round(d.value / totalAssets * 100)}%` : '0%'}
                                {d.isSaving && <span style={{ marginLeft: '4px', color: '#71717a', fontWeight: 600 }}>· Tiết kiệm</span>}
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: showBalance ? 'normal' : '2px', flexShrink: 0 }}>
                              {showBalance ? `${d.value.toLocaleString('vi-VN')}đ` : '••••'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Danh sách ví chi tiêu */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Ví chi tiêu</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{spendingWallets.length} ví</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {spendingWallets.map(w => {
                      const WalIcon = w.type === 'cash' ? Coins : w.type === 'bank' ? CreditCard : PiggyBank;
                      const pct = totalBalance > 0 ? Math.round(w.balance / totalBalance * 100) : 0;
                      const isDefault = family?.defaultWalletId === w.walletId;
                      return (
                        <div
                          key={w.walletId}
                          onClick={() => { setSelectedWalletIdForDetail(w.walletId); setView('wallet_detail'); }}
                          style={{
                            padding: '14px', borderRadius: '14px', border: '1px solid var(--border)',
                            borderLeft: `4px solid ${w.colorCode}`, backgroundColor: 'var(--bg-card)', cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, backgroundColor: `${w.colorCode}22`, color: w.colorCode, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <WalIcon size={19} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                                {isDefault && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-bg)', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>Mặc định</span>}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                {w.type === 'cash' ? 'Tiền mặt' : w.type === 'bank' ? 'Thẻ/Ngân hàng' : 'Ví điện tử'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: showBalance ? 'normal' : '2px' }}>
                                {showBalance ? `${w.balance.toLocaleString('vi-VN')}đ` : '••••'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>{pct}% ví chi tiêu</div>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: '4px', borderRadius: '2px', backgroundColor: `${w.colorCode}25`, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', backgroundColor: w.colorCode, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                    {spendingWallets.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>Chưa có ví chi tiêu</div>
                    )}
                  </div>
                </div>

                {/* Danh sách ví tiết kiệm */}
                {savingsWallets.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Ví tiết kiệm</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{savingsWallets.length} ví</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {savingsWallets.map(w => {
                        const WalIcon = w.type === 'cash' ? Coins : w.type === 'bank' ? CreditCard : PiggyBank;
                        const pct = totalAssets > 0 ? Math.round(w.balance / totalAssets * 100) : 0;
                        return (
                          <div
                            key={w.walletId}
                            onClick={() => { setSelectedWalletIdForDetail(w.walletId); setView('wallet_detail'); }}
                            style={{
                              padding: '14px', borderRadius: '14px',
                              border: '1px dashed var(--border)',
                              borderLeft: `4px solid ${w.colorCode}`,
                              backgroundColor: 'var(--bg-card)', cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, backgroundColor: `${w.colorCode}22`, color: w.colorCode, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <WalIcon size={19} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', backgroundColor: '#f4f4f5', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>Tiết kiệm</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                  {w.type === 'cash' ? 'Tiền mặt' : w.type === 'bank' ? 'Thẻ/Ngân hàng' : 'Ví điện tử'} · Không tính vào chi tiêu
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: showBalance ? 'normal' : '2px' }}>
                                  {showBalance ? `${w.balance.toLocaleString('vi-VN')}đ` : '••••'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>{pct}% tổng tài sản</div>
                              </div>
                            </div>
                            <div style={{ height: '4px', borderRadius: '2px', backgroundColor: `${w.colorCode}25`, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', backgroundColor: w.colorCode, transition: 'width 0.4s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
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
          setModalDefaultType(undefined);
        }}
        transactionToEdit={selectedTransaction || undefined}
        defaultWalletId={view === 'wallet_detail' && selectedWalletIdForDetail ? selectedWalletIdForDetail : undefined}
        defaultType={modalDefaultType}
      />
    </>
  );
}
