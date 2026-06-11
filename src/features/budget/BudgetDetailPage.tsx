import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, Tooltip, CartesianGrid
} from 'recharts';
import { toDate } from '../../types';
import type { Budget, Transaction } from '../../types';

interface Props {
  budget: Budget;
  transactions: Transaction[];
  onBack: () => void;
}

const fmtVND = (n: number) => n.toLocaleString('vi-VN') + ' đ';
const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const val = n / 1_000_000;
    return val.toFixed(1).replace('.0', '') + 'tr';
  }
  if (abs >= 1_000) return Math.round(n / 1_000) + 'k';
  return n.toLocaleString('vi-VN');
};

export default function BudgetDetailPage({ budget, transactions, onBack }: Props) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(), // 0-based
  }));

  const year = viewDate.year;
  const month = viewDate.month;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  // For past months use last day; for current month use today
  const today = isCurrentMonth ? now.getDate() : daysInMonth;

  const prevMonth = () => setViewDate(v => {
    const d = new Date(v.year, v.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setViewDate(v => {
    const next = new Date(v.year, v.month + 1, 1);
    const isAfterNow = next > new Date(now.getFullYear(), now.getMonth(), 1);
    if (isAfterNow) return v; // không cho xem tương lai
    return { year: next.getFullYear(), month: next.getMonth() };
  });

  const dailyBudget = budget.limitAmount / daysInMonth;

  // Filter this month's expense transactions for this category
  const monthTxs = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense' || t.category !== budget.category) return false;
      const d = toDate(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [transactions, budget.category, month, year]);

  // Daily spending map: day (1-based) → amount
  const dailySpending = useMemo(() => {
    const map: Record<number, number> = {};
    monthTxs.forEach(t => {
      const d = toDate(t.date);
      const day = d.getDate();
      map[day] = (map[day] || 0) + t.amount;
    });
    return map;
  }, [monthTxs]);

  // Build daily rows with carry-forward
  const dailyRows = useMemo(() => {
    let carryOver = 0;
    const rows = [];
    for (let day = 1; day <= today; day++) {
      const spent = dailySpending[day] || 0;
      const available = dailyBudget + carryOver;
      const variance = available - spent; // positive = saved, negative = over
      rows.push({ day, carryOver, available, spent, variance });
      carryOver = variance;
    }
    return rows;
  }, [dailySpending, dailyBudget, today]);

  const todayRow = dailyRows[dailyRows.length - 1] ?? {
    day: today, carryOver: 0, available: dailyBudget, spent: 0, variance: dailyBudget
  };

  const totalSpent = useMemo(() => {
    return Object.values(dailySpending).reduce((s, v) => s + v, 0);
  }, [dailySpending]);

  const accumulatedBalance = todayRow.carryOver;   // carry-over từ hôm qua, dùng cho display
  const todayBalance = todayRow.variance;           // số dư sau khi chi hôm nay, dùng cho status
  const availableToday = todayRow.available;
  const spentToday = todayRow.spent;

  // Status classification — dựa trên số dư sau khi trừ chi tiêu hôm nay
  type Status = 'saving' | 'on_track' | 'warning' | 'over_budget';
  const status: Status =
    todayBalance >= dailyBudget * 0.3 ? 'saving' :
    todayBalance >= 0 ? 'on_track' :
    todayBalance >= -dailyBudget * 0.5 ? 'warning' : 'over_budget';

  // End-of-month forecast based on current average daily spend
  const remainingDays = daysInMonth - today;
  const avgDailySpend = today > 0 ? totalSpent / today : 0;
  const projectedSpending = totalSpent + avgDailySpend * remainingDays;
  const projectedRemaining = budget.limitAmount - projectedSpending;
  const forecastRatio = budget.limitAmount > 0 ? projectedSpending / budget.limitAmount : 0;

  type ForecastRisk = 'on_track' | 'warning' | 'over_budget';
  const forecastRisk: ForecastRisk =
    forecastRatio > 1 ? 'over_budget' :
    forecastRatio > 0.9 ? 'warning' : 'on_track';

  // Trend chart data — cumulative planned vs actual
  const trendData = useMemo(() => {
    let cumActual = 0;
    return Array.from({ length: today }, (_, i) => {
      const day = i + 1;
      cumActual += (dailySpending[day] || 0);
      return {
        day: `${day}`,
        'Kế hoạch': Math.round(dailyBudget * day),
        'Thực tế': Math.round(cumActual),
      };
    });
  }, [dailySpending, dailyBudget, today]);

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const weeks = [];
    for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min(startDay + 6, daysInMonth);
      const weekBudget = dailyBudget * (endDay - startDay + 1);
      let weekSpent = 0;
      for (let d = startDay; d <= endDay; d++) weekSpent += (dailySpending[d] || 0);
      const isInProgress = startDay <= today && endDay >= today;
      const isPast = endDay < today;
      weeks.push({ week: w + 1, startDay, endDay, budget: weekBudget, spent: weekSpent, isInProgress, isPast });
    }
    return weeks;
  }, [dailySpending, dailyBudget, daysInMonth, today]);

  const monthRemaining = budget.limitAmount - totalSpent;
  const totalRatio = budget.limitAmount > 0 ? totalSpent / budget.limitAmount : 0;

  const statusConfig: Record<Status, { color: string; bg: string; label: string }> = {
    saving: { color: '#81B29A', bg: '#F4F9F6', label: '✅ Đang tiết kiệm' },
    on_track: { color: '#4EA8DE', bg: '#EFF8FF', label: '✅ Đúng kế hoạch' },
    warning: { color: '#F4A261', bg: '#FFF5EC', label: '⚠️ Sắp vượt hạn mức' },
    over_budget: { color: '#E63946', bg: '#FFF0F0', label: '🔴 Đã vượt hạn mức' },
  };

  const forecastConfig: Record<ForecastRisk, { color: string; label: string }> = {
    on_track: { color: '#81B29A', label: '✅ Ổn định' },
    warning: { color: '#F4A261', label: '⚠️ Cảnh báo' },
    over_budget: { color: '#E63946', label: '🔴 Nguy cơ vượt' },
  };

  const st = statusConfig[status];
  const fc = forecastConfig[forecastRisk];

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px'
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
            borderRadius: '50%', backgroundColor: 'var(--bg-grey)',
            width: '36px', height: '36px', color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Chi tiết Hạn mức</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {budget.category}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-grey)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '72px', textAlign: 'center' }}>
            T{month + 1}/{year}
          </span>
          <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', backgroundColor: isCurrentMonth ? 'var(--bg-grey)' : 'var(--bg-grey)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrentMonth ? 'var(--border)' : 'var(--text-primary)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── 1. Budget Overview Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #FF8C69 0%, #E07A5F 100%)',
        borderRadius: '16px', padding: '20px', color: 'white',
        marginBottom: '16px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ opacity: 0.07, position: 'absolute', right: '-10px', bottom: '-10px', pointerEvents: 'none' }}>
          <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>

        <div style={{ fontSize: '12px', opacity: 0.85, fontWeight: 600, marginBottom: '4px' }}>
          Hạn mức tháng {month + 1}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, marginBottom: '16px' }}>
          {fmtVND(budget.limitAmount)}
        </div>

        <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(totalRatio * 100, 100)}%`,
            backgroundColor: totalRatio >= 1 ? '#FF4D4F' : totalRatio >= 0.9 ? '#FFD600' : 'rgba(255,255,255,0.9)',
            borderRadius: '4px', transition: 'width 0.5s ease'
          }} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Đã chi', value: fmtVND(totalSpent), highlight: false },
            { label: 'Còn lại', value: fmtVND(monthRemaining), highlight: monthRemaining < 0 },
            { label: 'Đã dùng', value: `${(totalRatio * 100).toFixed(0)}%`, highlight: false },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 8px' }}>
              <div style={{ fontSize: '10px', opacity: 0.85, marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: item.highlight ? '#FF4D4F' : 'inherit' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Today's Budget Card (most prominent) ── */}
      <div style={{
        backgroundColor: st.bg, border: `2px solid ${st.color}`,
        borderRadius: '16px', padding: '20px', marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
              Được phép chi hôm nay
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: st.color, lineHeight: 1.1 }}>
              {availableToday >= 0 ? fmtVND(Math.round(availableToday)) : '0 đ'}
            </div>
            {todayBalance < 0 && (
              <div style={{ fontSize: '12px', color: '#E63946', fontWeight: 700, marginTop: '2px' }}>
                Đã vượt {fmtVND(Math.abs(Math.round(todayBalance)))}
              </div>
            )}
          </div>
          <div style={{
            backgroundColor: st.color, color: 'white', borderRadius: '20px',
            padding: '6px 12px', fontSize: '11px', fontWeight: 700,
            whiteSpace: 'nowrap', flexShrink: 0, marginTop: '4px'
          }}>
            {st.label}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            {
              label: 'Ngân sách / ngày',
              value: fmtVND(Math.round(dailyBudget)),
              color: 'var(--text-primary)'
            },
            {
              label: 'Dư/Thiếu hôm trước',
              value: `${accumulatedBalance >= 0 ? '+' : ''}${fmtVND(Math.round(accumulatedBalance))}`,
              color: accumulatedBalance >= 0 ? '#81B29A' : '#E63946'
            },
            {
              label: 'Đã chi hôm nay',
              value: spentToday > 0 ? fmtVND(spentToday) : '–',
              color: spentToday > 0 ? '#E63946' : 'var(--text-secondary)'
            },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, backgroundColor: 'white', borderRadius: '10px', padding: '10px 8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Forecast Card (tháng hiện tại) / Tổng kết (tháng đã qua) ── */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{isCurrentMonth ? 'Dự báo cuối tháng' : 'Tổng kết tháng'}</h3>
          <span style={{
            backgroundColor: fc.color + '22', color: fc.color,
            borderRadius: '12px', padding: '4px 10px', fontSize: '11px', fontWeight: 700
          }}>{fc.label}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(isCurrentMonth ? [
            {
              label: 'Dự kiến chi',
              value: fmtVND(Math.round(projectedSpending)),
              color: forecastRisk === 'over_budget' ? '#E63946' : 'var(--text-primary)'
            },
            {
              label: 'Còn lại dự kiến',
              value: `${projectedRemaining >= 0 ? '' : '-'}${fmtVND(Math.abs(Math.round(projectedRemaining)))}`,
              color: projectedRemaining >= 0 ? '#81B29A' : '#E63946'
            },
            {
              label: 'Còn lại',
              value: `${remainingDays} ngày`,
              color: 'var(--text-primary)'
            },
          ] : [
            {
              label: 'Tổng đã chi',
              value: fmtVND(totalSpent),
              color: monthRemaining < 0 ? '#E63946' : 'var(--text-primary)'
            },
            {
              label: monthRemaining >= 0 ? 'Tiết kiệm được' : 'Vượt hạn mức',
              value: fmtVND(Math.abs(monthRemaining)),
              color: monthRemaining >= 0 ? '#81B29A' : '#E63946'
            },
            {
              label: 'Tỷ lệ sử dụng',
              value: `${(totalRatio * 100).toFixed(0)}%`,
              color: totalRatio > 1 ? '#E63946' : totalRatio > 0.9 ? '#F4A261' : '#81B29A'
            },
          ]).map(item => (
            <div key={item.label} style={{ flex: 1, backgroundColor: 'var(--bg-grey)', borderRadius: '10px', padding: '10px 8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Budget Trend Chart ── */}
      {trendData.length > 1 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Xu hướng Chi tiêu (Lũy kế)</h3>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
            {[
              { color: '#4EA8DE', label: 'Kế hoạch' },
              { color: '#FF8C69', label: 'Thực tế' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '16px', height: '3px', backgroundColor: item.color, borderRadius: '2px' }} />
                {item.label}
              </div>
            ))}
          </div>
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="gPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4EA8DE" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#4EA8DE" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8C69" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#FF8C69" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E3DD" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#747790' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(Math.floor(today / 6) - 1, 0)}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${Math.round(Number(value)).toLocaleString('vi-VN')}đ`, name as string
                  ]}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E6E3DD' }}
                />
                <Area type="monotone" dataKey="Kế hoạch" stroke="#4EA8DE" strokeWidth={2} fill="url(#gPlanned)" dot={false} />
                <Area type="monotone" dataKey="Thực tế" stroke="#FF8C69" strokeWidth={2} fill="url(#gActual)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 5. Weekly Summary ── */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Tổng kết theo Tuần</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weeklySummary.map(w => {
            const wRatio = w.budget > 0 ? w.spent / w.budget : 0;
            const wColor = wRatio >= 1 ? '#E63946' : wRatio >= 0.9 ? '#F4A261' : '#81B29A';
            const wRemaining = w.budget - w.spent;
            return (
              <div key={w.week} style={{
                padding: '12px',
                backgroundColor: w.isInProgress ? '#FFF9F6' : 'var(--bg-grey)',
                borderRadius: '10px',
                border: w.isInProgress ? '1.5px solid #FF8C69' : '1px solid transparent'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Tuần {w.week}
                    </span>
                    {w.isInProgress && (
                      <span style={{ fontSize: '10px', color: '#FF8C69', fontWeight: 600, marginLeft: '6px' }}>● Hiện tại</span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                      {w.startDay}–{w.endDay}/{month + 1}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: wColor }}>
                    {(wRatio * 100).toFixed(0)}%
                  </span>
                </div>

                <div style={{ height: '5px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '7px' }}>
                  <div style={{ height: '100%', width: `${Math.min(wRatio * 100, 100)}%`, backgroundColor: wColor, borderRadius: '3px' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>NS: <strong style={{ color: 'var(--text-primary)' }}>{fmtVND(Math.round(w.budget))}</strong></span>
                  <span>Chi: <strong style={{ color: '#E63946' }}>{fmtVND(w.spent)}</strong></span>
                  {(w.isPast || w.isInProgress) && (
                    <span>
                      {wRemaining >= 0 ? 'Dư: ' : 'Vượt: '}
                      <strong style={{ color: wColor }}>{fmtVND(Math.abs(Math.round(wRemaining)))}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. Daily Tracking Table ── */}
      <div className="card">
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Theo dõi từng Ngày</h3>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '340px' }}>
            <thead>
              <tr>
                {['Ngày', 'Dư/Thiếu', 'Khả dụng', 'Thực chi', 'Chênh lệch', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '6px 8px',
                      textAlign: i === 0 ? 'left' : 'right',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      backgroundColor: 'var(--bg-grey)',
                      fontSize: '10px'
                    }}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...dailyRows].reverse().map(row => {
                const isToday = row.day === today;
                const statusEmoji = row.variance < 0 ? '🔴' : row.variance < dailyBudget * 0.15 ? '⚠️' : '✅';
                return (
                  <tr
                    key={row.day}
                    style={{
                      backgroundColor: isToday ? '#FFF9F6' : 'transparent',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <td style={{ padding: '7px 8px', fontWeight: isToday ? 800 : 600, color: isToday ? '#FF8C69' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {row.day}/{month + 1}{isToday ? ' ★' : ''}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: row.carryOver === 0 ? 'var(--text-secondary)' : row.carryOver > 0 ? '#81B29A' : '#E63946' }}>
                      {row.carryOver !== 0 ? `${row.carryOver > 0 ? '+' : ''}${fmtShort(Math.round(row.carryOver))}` : '–'}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {fmtShort(Math.round(row.available))}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: row.spent > 0 ? '#E63946' : 'var(--text-secondary)' }}>
                      {row.spent > 0 ? fmtShort(row.spent) : '–'}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: row.variance >= 0 ? '#81B29A' : '#E63946' }}>
                      {`${row.variance >= 0 ? '+' : ''}${fmtShort(Math.round(row.variance))}`}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontSize: '13px' }}>
                      {statusEmoji}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
