import { useState, useEffect } from 'react';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';
import { useAuthStore } from './stores/authStore';
import { useFamilyStore } from './stores/familyStore';
import AuthPage from './features/auth/AuthPage';
import OnboardingPage from './features/auth/OnboardingPage';
import DashboardPage from './features/dashboard/DashboardPage';
import MenuPage from './features/menu/MenuPage';
import LocalPantry from './features/menu/LocalPantry';
import SettingsPage from './features/settings/SettingsPage';
import TransactionModal from './features/budget/TransactionModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { Wallet, ChefHat, ShoppingBasket, Loader2, Settings, Plus } from 'lucide-react';
import AppLogo from './components/AppLogo';
import { useReminderService } from './hooks/useReminderService';

export default function App() {
  useReminderService();
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
  } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'pantry' | 'settings'>('dashboard');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Auth Listener
  // getRedirectResult MUST run before onAuthStateChanged starts listening.
  // On iOS Safari, signInWithRedirect stores state in IndexedDB. If onAuthStateChanged
  // fires first (with null), AuthPage renders but the redirect result is never processed
  // because Firebase only processes it when getRedirectResult is explicitly called.
  useEffect(() => {
    let unsubAuth: (() => void) | undefined;

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('[Auth] redirect sign-in OK:', result.user.email);
          setRedirectError(null);
        }
      })
      .catch((err: any) => {
        const msg = `${err?.code ?? 'unknown'}: ${err?.message ?? ''}`;
        console.error('[Auth] getRedirectResult error:', msg);
        setRedirectError(msg);
      })
      .finally(() => {
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

    return () => unsubAuth?.();
  }, []);

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
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'menu' && <MenuPage />}
        {activeTab === 'pantry' && <LocalPantry />}
        {activeTab === 'settings' && <SettingsPage />}
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
      <TransactionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />

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
