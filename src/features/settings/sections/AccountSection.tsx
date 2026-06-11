import { useState } from 'react';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { useFamilyStore } from '../../../stores/familyStore';
import { useAuthStore } from '../../../stores/authStore';
import { signOut, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../../firebase';
import { Users, PiggyBank, TrendingUp, BarChart3, Crown, Shield, MessageSquare, HelpCircle, Info, User, Pencil, ChevronRight, Check, Copy, Lock, LogOut } from 'lucide-react';

type AccountSubView = 'editProfile' | 'changePassword' | 'feedback' | 'help' | 'about';

interface AccountSectionProps {
  onNavigate: (view: AccountSubView) => void;
  displayNameOverride: string | null;
  setDisplayNameOverride: (name: string | null) => void;
  setEditDisplayName: (name: string) => void;
  setPasswordError: (err: string) => void;
  setCurrentPassword: (pw: string) => void;
  setNewPassword: (pw: string) => void;
  setConfirmPassword: (pw: string) => void;
}

export default function AccountSection({
  onNavigate,
  displayNameOverride,
  setEditDisplayName,
  setPasswordError,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
}: AccountSectionProps) {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const showToast = useToast();
  const { family, wallets, budgets, transactions } = useFamilyStore();

  const [copiedFamilyId, setCopiedFamilyId] = useState(false);

  if (!user || !family) return null;

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

  return (
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
                {displayNameOverride ?? (user.displayName || user.email?.split('@')[0] || 'Người dùng')}
              </div>
              <button
                type="button"
                onClick={() => { setEditDisplayName(displayNameOverride ?? user.displayName ?? ''); onNavigate('editProfile'); }}
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
                  onClick={() => { setPasswordError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); onNavigate('changePassword'); }}>
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
          { IconComp: MessageSquare, label: 'Gửi phản hồi / Góp ý', color: '#8338EC', desc: 'Báo lỗi hoặc đề xuất tính năng mới', target: 'feedback' as AccountSubView },
          { IconComp: HelpCircle, label: 'Hướng dẫn sử dụng', color: '#4EA8DE', desc: 'Xem cách dùng các tính năng', target: 'help' as AccountSubView },
          { IconComp: Info, label: 'Về ứng dụng · v1.0.0', color: 'var(--text-secondary)', desc: 'SmartHomeMom · Quản lý tài chính gia đình', target: 'about' as AccountSubView },
        ].map((item, idx, arr) => {
          const { IconComp } = item;
          return (
            <div
              key={item.label}
              onClick={() => onNavigate(item.target)}
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
  );
}
