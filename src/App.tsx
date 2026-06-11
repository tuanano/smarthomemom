import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';
import { useAuthStore } from './stores/authStore';
import { useFamilyStore } from './stores/familyStore';
import AuthPage from './features/auth/AuthPage';
import OnboardingPage from './features/auth/OnboardingPage';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const MenuPage = lazy(() => import('./features/menu/MenuPage'));
const LocalPantry = lazy(() => import('./features/menu/LocalPantry'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const TransactionModal = lazy(() => import('./features/budget/TransactionModal'));
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToast } from './components/Toast';
import { Wallet, ChefHat, ShoppingBasket, Loader2, Settings, Plus } from 'lucide-react';
import AppLogo from './components/AppLogo';
import { useReminderService } from './hooks/useReminderService';

export default function App() {
  useReminderService();
  const showToast = useToast();
  const { user, loading, setUser, setLoading, setRedirectError } = useAuthStore();
  const {
    family,
    familyLoading,
    subscribeFamily,
    subscribeWallets,
    subscribeTransactions,
    subscribeBudgets,
    subscribeIngredients,
    setFamily,
    setWallets,
    setTransactions,
    setBudgets,
    setAvailableIngredients,
    setCustomCategories,
    setCustomIngredients,
    setFavoriteMenus,
    subscriptionError,
    clearSubscriptionError,
  } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'pantry' | 'settings'>('dashboard');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Auth Listener
  // getRedirectResult MUST run before onAuthStateChanged starts listening.
  // On iOS Safari, signInWithRedirect stores state in IndexedDB. If onAuthStateChanged
  // fires first (with null), AuthPage renders but the redirect result is never processed
  // because Firebase only processes it when getRedirectResult is explicitly called.
  useEffect(() => {
    let cancelled = false;
    let unsubAuth: (() => void) | undefined;

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('[Auth] redirect sign-in OK:', result.user.email);
          setRedirectError(null);
        }
      })
      .catch((err: unknown) => {
        const e = err as { code?: string; message?: string };
        const msg = `${e?.code ?? 'unknown'}: ${e?.message ?? ''}`;
        console.error('[Auth] getRedirectResult error:', msg);
        setRedirectError(msg);
      })
      .finally(() => {
        if (cancelled) return;
        // Start listening for auth state AFTER redirect result is processed
        unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);

          if (!firebaseUser) {
            setFamily(null);
            setWallets([]);
            setTransactions([]);
            setBudgets([]);
            setAvailableIngredients([]);
            setCustomCategories([]);
            setCustomIngredients([]);
            setFavoriteMenus([]);
            useFamilyStore.setState({ familyLoading: true });
          }
        });
      });

    return () => {
      cancelled = true;
      unsubAuth?.();
    };
  }, []);

  // Surface Firestore subscription errors as toast (H6)
  useEffect(() => {
    if (subscriptionError) {
      showToast(subscriptionError, 'error');
      clearSubscriptionError();
    }
  }, [subscriptionError]);

  // Firestore Subscriptions when user logged in
  useEffect(() => {
    if (!user) return;

    const unsubFamily = subscribeFamily(user.uid);
    const unsubWallets = subscribeWallets(user.uid);
    const unsubTrans = subscribeTransactions(user.uid);
    const unsubBudgets = subscribeBudgets(user.uid);
    const unsubIng = subscribeIngredients(user.uid);

    return () => {
      unsubFamily();
      unsubWallets();
      unsubTrans();
      unsubBudgets();
      unsubIng();
    };
  }, [user]);

  // Loading Screen — wait for both auth AND first Firestore snapshot
  if (loading || (user && familyLoading)) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-cream)',
        gap: '16px',
        animation: 'authFadeIn 0.18s ease',
      }}>
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(255,140,105,0.3)' }}>
          <AppLogo size={72} />
        </div>
        <Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ fontWeight: 600 }}>Đang chuẩn bị dữ liệu...</p>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return <AuthPage />;
  }

  // Onboarding Screen — only shown when Firestore confirmed no family doc exists
  if (!family) {
    return <OnboardingPage />;
  }

  return (
    <>
      {/* Main Content Area — full height, no header */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} /></div>}>
          {activeTab === 'dashboard' && <ErrorBoundary><DashboardPage /></ErrorBoundary>}
          {activeTab === 'menu' && <ErrorBoundary><MenuPage /></ErrorBoundary>}
          {activeTab === 'pantry' && <ErrorBoundary><LocalPantry /></ErrorBoundary>}
          {activeTab === 'settings' && <ErrorBoundary><SettingsPage /></ErrorBoundary>}
        </Suspense>
      </main>

      {/* Bottom Navigation with center FAB */}
      <nav className="bottom-nav">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <Wallet size={20} />
          <span>Thu Chi</span>
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`bottom-nav-item ${activeTab === 'menu' ? 'active' : ''}`}
        >
          <ChefHat size={20} />
          <span>Thực Đơn</span>
        </button>

        {/* Center FAB — add transaction */}
        <button
          onClick={() => setAddModalOpen(true)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: 'white',
            border: '3px solid var(--bg-cream)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255, 140, 105, 0.45)',
            marginTop: '-20px',
            flexShrink: 0,
          }}
        >
          <Plus size={26} />
        </button>

        <button
          onClick={() => setActiveTab('pantry')}
          className={`bottom-nav-item ${activeTab === 'pantry' ? 'active' : ''}`}
        >
          <ShoppingBasket size={20} />
          <span>Tủ Chợ</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Cài đặt</span>
        </button>
      </nav>

      {/* Global add-transaction modal (triggered from bottom nav +) */}
      <Suspense fallback={null}>
        <TransactionModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
        />
      </Suspense>

      {/* PWA install prompt — Android banner or iOS instructions */}
      <PWAInstallPrompt />

      <style>{`
        .bottom-nav-item:active {
          transform: scale(0.92);
          transition: transform 0.1s ease;
        }
      `}</style>
    </>
  );
}
