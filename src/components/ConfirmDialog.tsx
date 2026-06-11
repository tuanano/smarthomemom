import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

/* ─── Types ─── */
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

/* ─── Context ─── */
const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

/* ─── Provider ─── */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { visible: boolean }) | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [animating, setAnimating] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, visible: true });
      // trigger enter animation
      requestAnimationFrame(() => setAnimating(true));
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setAnimating(false);
    // wait for exit animation
    setTimeout(() => {
      resolveRef.current?.(result);
      resolveRef.current = null;
      setState(null);
    }, 200);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!state) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state, handleClose]);

  const variantConfig = {
    danger: {
      icon: <AlertTriangle size={28} />,
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconColor: '#ef4444',
      btnBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      btnHover: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    },
    warning: {
      icon: <AlertTriangle size={28} />,
      iconBg: 'rgba(244, 162, 97, 0.15)',
      iconColor: '#F4A261',
      btnBg: 'linear-gradient(135deg, #F4A261, #e08c48)',
      btnHover: 'linear-gradient(135deg, #e08c48, #c97a3a)',
    },
    info: {
      icon: <Info size={28} />,
      iconBg: 'rgba(74, 144, 226, 0.12)',
      iconColor: 'var(--primary)',
      btnBg: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
      btnHover: 'linear-gradient(135deg, var(--primary-dark), var(--primary-dark))',
    },
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {state && (
        <div
          onClick={() => handleClose(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: animating ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0)',
            backdropFilter: animating ? 'blur(6px)' : 'blur(0px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            transition: 'background-color 0.2s ease, backdrop-filter 0.2s ease',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
              width: '100%',
              maxWidth: '380px',
              overflow: 'hidden',
              transform: animating ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(12px)',
              opacity: animating ? 1 : 0,
              transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
            }}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => handleClose(false)}
              aria-label="Đóng"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
              {/* Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: variantConfig[state.variant || 'danger'].iconBg,
                color: variantConfig[state.variant || 'danger'].iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                {variantConfig[state.variant || 'danger'].icon}
              </div>

              {/* Title */}
              <h3 id="confirm-dialog-title" style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                {state.title || 'Xác nhận'}
              </h3>

              {/* Message */}
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.55,
              }}>
                {state.message}
              </p>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '0 24px 24px',
            }}>
              <button
                type="button"
                onClick={() => handleClose(false)}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-grey)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-grey)';
                }}
              >
                {state.cancelText || 'Hủy'}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '10px',
                  border: 'none',
                  background: variantConfig[state.variant || 'danger'].btnBg,
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s, transform 0.1s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = variantConfig[state.variant || 'danger'].btnHover;
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = variantConfig[state.variant || 'danger'].btnBg;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {state.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
