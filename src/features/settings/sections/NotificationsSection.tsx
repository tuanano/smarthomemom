import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, AlertCircle, Info } from 'lucide-react';
import { useNotificationStore } from '../../../stores/notificationStore';
import { useToast } from '../../../components/Toast';
import { playNotificationSound } from '../../../utils/notificationSound';
import TimeScrollPicker from '../../../components/TimeScrollPicker';

function Sw({ on, onToggle, light = false }: { on: boolean; onToggle: () => void; light?: boolean }) {
  return (
    <button
      type="button"
      aria-label={on ? 'Tắt' : 'Bật'}
      onClick={onToggle}
      style={{
        width: '50px', height: '28px', borderRadius: '14px', border: 'none', flexShrink: 0,
        backgroundColor: on ? (light ? 'rgba(255,255,255,0.9)' : 'var(--primary)') : (light ? 'rgba(255,255,255,0.3)' : '#D1D5DB'),
        cursor: 'pointer', position: 'relative', transition: 'background-color 0.25s',
      }}
    >
      <span style={{
        position: 'absolute', top: '4px', borderRadius: '50%',
        left: on ? '25px' : '4px',
        width: '20px', height: '20px',
        backgroundColor: on && light ? '#D97706' : '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left 0.25s',
      }} />
    </button>
  );
}

export function NotificationsSection() {
  const {
    enabled: notifEnabled,
    expenseReminderEnabled,
    expenseReminderHour,
    expenseReminderMinute,
    menuReminderEnabled,
    menuReminderHour,
    menuReminderMinute,
    budgetAlertEnabled,
    updateSettings: updateNotifSettings,
  } = useNotificationStore();
  const showToast = useToast();

  const [notifPermStatus, setNotifPermStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [bgSyncActive, setBgSyncActive] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((reg) => (reg as any).periodicSync?.getTags?.() as Promise<string[]> | undefined)
      .then((tags) => setBgSyncActive(!!(tags?.includes('smm-reminders'))))
      .catch(() => {});
  }, []);

  const pad2 = (n: number) => String(n).padStart(2, '0');

  const handleRequestPermission = async () => {
    if (notifPermStatus !== 'default') return;
    const result = await Notification.requestPermission();
    setNotifPermStatus(result);
    if (result === 'granted') {
      showToast('Đã cấp quyền thông báo!');
    } else {
      showToast('Quyền bị từ chối. Vào cài đặt trình duyệt để cấp lại.');
    }
  };

  const handleTestNotification = async () => {
    if (notifPermStatus !== 'granted') {
      showToast('Vui lòng cấp quyền thông báo trước.');
      return;
    }
    try {
      playNotificationSound();
      let sent = false;
      if ('serviceWorker' in navigator) {
        const reg = await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>((r) => setTimeout(() => r(null), 3000)),
        ]);
        if (reg) {
          await reg.showNotification('🔔 SmartHomeMom', {
            body: 'Thông báo thử nghiệm hoạt động tốt!',
            icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
          });
          sent = true;
        }
      }
      if (!sent) new Notification('🔔 SmartHomeMom', { body: 'Thông báo thử nghiệm hoạt động tốt!' });
      showToast('Đã gửi thông báo thử!');
    } catch {
      showToast('Không thể gửi thông báo. Kiểm tra lại quyền trình duyệt.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, #F7B731 0%, #FF8C00 100%)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '20px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -18, top: -18, opacity: 0.1, pointerEvents: 'none' }}>
          <Bell size={120} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {notifEnabled ? <Bell size={24} /> : <BellOff size={24} />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.2px' }}>Nhắc nhở thông minh</div>
              <div style={{ fontSize: '13px', opacity: 0.88, marginTop: '1px' }}>
                {notifEnabled ? '✓ Đang hoạt động' : 'Đang tắt — nhấn để bật'}
              </div>
            </div>
          </div>
          <Sw on={notifEnabled} onToggle={() => updateNotifSettings({ enabled: !notifEnabled })} light />
        </div>

        <div style={{
          backgroundColor: 'rgba(0,0,0,0.12)',
          borderRadius: '12px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700, minWidth: 0 }}>
            {notifPermStatus === 'granted'
              ? <><Check size={14} /> Đã cấp quyền thông báo</>
              : notifPermStatus === 'denied'
              ? <><AlertCircle size={14} /> Quyền bị từ chối — mở cài đặt trình duyệt</>
              : notifPermStatus === 'unsupported'
              ? <><Info size={14} /> Thiết bị không hỗ trợ</>
              : <><Info size={14} /> Chưa cấp quyền thông báo</>}
          </div>
          {notifPermStatus === 'default' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              style={{ background: 'white', color: '#D97706', border: 'none', borderRadius: '8px', padding: '6px 13px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
            >
              Cấp quyền
            </button>
          )}
        </div>

        {notifPermStatus !== 'granted' && (
          <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '8px', lineHeight: 1.5, position: 'relative' }}>
            In-app banner vẫn hiện trong app ngay cả khi chưa cấp quyền.
          </div>
        )}

        {notifPermStatus === 'granted' && (
          <div style={{
            marginTop: '8px',
            backgroundColor: 'rgba(0,0,0,0.10)',
            borderRadius: '10px', padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '12px', fontWeight: 700, position: 'relative',
          }}>
            <span style={{ fontSize: '15px' }}>{bgSyncActive ? '⏰' : '📱'}</span>
            <span>
              {bgSyncActive
                ? 'Nhắc nền bật — hoạt động kể cả khi đóng app'
                : 'Nhắc nền: chỉ hoạt động khi app đang mở'}
            </span>
          </div>
        )}
      </div>

      {notifEnabled ? (
        <>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '2px', marginTop: '2px' }}>
            Nhắc theo giờ
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  💰
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>Nhắc nhập chi tiêu</div>
                  <div style={{ fontSize: '12px', marginTop: '2px', fontWeight: expenseReminderEnabled ? 700 : 400, color: expenseReminderEnabled ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {expenseReminderEnabled ? `Nhắc lúc ${pad2(expenseReminderHour)}:${pad2(expenseReminderMinute)}` : 'Nhắc khi chưa có giao dịch hôm nay'}
                  </div>
                </div>
              </div>
              <Sw on={expenseReminderEnabled} onToggle={() => updateNotifSettings({ expenseReminderEnabled: !expenseReminderEnabled })} />
            </div>
            {expenseReminderEnabled && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 16px 12px', backgroundColor: 'var(--primary-bg)' }}>
                <TimeScrollPicker
                  hour={expenseReminderHour}
                  minute={expenseReminderMinute}
                  onHourChange={(h) => updateNotifSettings({ expenseReminderHour: h })}
                  onMinuteChange={(m) => updateNotifSettings({ expenseReminderMinute: m })}
                  label="Chọn giờ nhắc"
                />
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: '#F4F9F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  🍽️
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>Nhắc cập nhật thực đơn</div>
                  <div style={{ fontSize: '12px', marginTop: '2px', fontWeight: menuReminderEnabled ? 700 : 400, color: menuReminderEnabled ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {menuReminderEnabled ? `Nhắc lúc ${pad2(menuReminderHour)}:${pad2(menuReminderMinute)}` : 'Nhắc khi chưa có thực đơn hôm nay'}
                  </div>
                </div>
              </div>
              <Sw on={menuReminderEnabled} onToggle={() => updateNotifSettings({ menuReminderEnabled: !menuReminderEnabled })} />
            </div>
            {menuReminderEnabled && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 16px 12px', backgroundColor: 'var(--primary-bg)' }}>
                <TimeScrollPicker
                  hour={menuReminderHour}
                  minute={menuReminderMinute}
                  onHourChange={(h) => updateNotifSettings({ menuReminderHour: h })}
                  onMinuteChange={(m) => updateNotifSettings({ menuReminderMinute: m })}
                  label="Chọn giờ nhắc"
                />
              </div>
            )}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '2px', marginTop: '2px' }}>
            Cảnh báo tự động
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  ⚠️
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>Cảnh báo vượt ngân sách</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Tự động khi chi tiêu đạt ngưỡng hạn mức</div>
                </div>
              </div>
              <Sw on={budgetAlertEnabled} onToggle={() => updateNotifSettings({ budgetAlertEnabled: !budgetAlertEnabled })} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestNotification}
            style={{
              width: '100%', height: '48px',
              borderRadius: '14px',
              backgroundColor: 'transparent',
              border: '1.5px dashed var(--border)',
              color: 'var(--text-secondary)',
              fontWeight: 700, fontSize: '14px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-grey)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Bell size={16} />
            Gửi thử thông báo
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '36px 20px 24px', color: 'var(--text-secondary)' }}>
          <div style={{ marginBottom: '12px', opacity: 0.18 }}>
            <BellOff size={52} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Thông báo đang tắt
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
            Bật công tắc ở thẻ phía trên để cấu hình nhắc nhở chi tiêu và thực đơn.
          </div>
        </div>
      )}
    </div>
  );
}
