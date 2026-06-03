import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const BASE = import.meta.env.BASE_URL;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem('pwa-banner-dismissed')) return;

    const ios = isIOS();

    if (ios) {
      const timer = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Nếu sau 5s không có event (đã cài rồi hoặc không hỗ trợ) thì bỏ qua
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (!show) return null;

  const ios = isIOS();

  return (
    <>
      {/* Backdrop mờ */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 9998,
        }}
      />

      {/* Banner */}
      <div style={{
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '440px',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        border: '1.5px solid rgba(255,140,105,0.25)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={`${BASE}pwa-192x192.png`}
            alt="SmartHomeMom"
            style={{ width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#1a1a1a' }}>
              Cài đặt SmartHomeMom
            </div>
            <div style={{ fontSize: '12px', color: '#777', marginTop: '3px', lineHeight: 1.4 }}>
              Truy cập nhanh • Dùng được offline • Không qua App Store
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: '#f0f0f0', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#888'
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Nội dung hướng dẫn theo nền tảng */}
        {ios ? (
          <div style={{
            backgroundColor: '#FFF8F6',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid rgba(255,140,105,0.2)',
          }}>
            <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>1</div>
                <span>Nhấn biểu tượng <Share size={13} style={{ display: 'inline', verticalAlign: 'middle', color: '#007AFF' }} /> <strong style={{ color: '#007AFF' }}>Chia sẻ</strong> ở thanh Safari</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>2</div>
                <span>Chọn <strong>"Thêm vào Màn hình chính"</strong> → <strong>"Thêm"</strong></span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            disabled={installing}
            style={{
              width: '100%', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF8C69 0%, #F15BB5 100%)',
              color: 'white', border: 'none',
              fontWeight: 700, fontSize: '15px',
              cursor: installing ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: installing ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(255,140,105,0.4)',
            }}
          >
            <Download size={18} />
            {installing ? 'Đang cài đặt...' : 'Thêm vào màn hình chính'}
          </button>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#aaa' }}>
          Ứng dụng miễn phí • Không cần App Store
        </div>
      </div>
    </>
  );
}
