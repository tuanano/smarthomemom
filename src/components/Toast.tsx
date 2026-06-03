import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.showToast;
}

const CONFIG: Record<ToastType, { icon: any; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: '#22c55e',        bg: '#f0fdf4',              border: '#bbf7d0' },
  error:   { icon: XCircle,       color: '#ef4444',        bg: '#fef2f2',              border: '#fecaca' },
  warning: { icon: AlertTriangle, color: '#f59e0b',        bg: '#fffbeb',              border: '#fde68a' },
  info:    { icon: Info,          color: 'var(--primary)', bg: 'var(--primary-bg)',    border: 'var(--primary-light)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 280);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, visible: false }]);
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: true } : t))
      )
    );
    setTimeout(() => dismiss(id), 3200);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 'calc(100% - 32px)',
        maxWidth: '440px',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => {
          const { icon: Icon, color, bg, border } = CONFIG[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                transform: toast.visible ? 'translateY(0)' : 'translateY(-20px)',
                opacity: toast.visible ? 1 : 0,
                transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
              }}
            >
              <Icon size={18} style={{ color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {toast.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
