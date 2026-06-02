import { useState, useEffect } from 'react';
import { useConfirm } from './components/ConfirmDialog';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useAuthStore } from './stores/authStore';
import { useFamilyStore } from './stores/familyStore';
import AuthPage from './features/auth/AuthPage';
import OnboardingPage from './features/auth/OnboardingPage';
import DashboardPage from './features/dashboard/DashboardPage';
import MenuPage from './features/menu/MenuPage';
import LocalPantry from './features/menu/LocalPantry';
import SettingsPage from './features/settings/SettingsPage';
import { Wallet, ChefHat, ShoppingBasket, LogOut, Loader2, Sparkles, Settings } from 'lucide-react';

export default function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { 
    family,
    subscribeFamily,
    subscribeWallets,
    subscribeTransactions,
    subscribeBudgets,
    subscribeIngredients,
    subscribeCustomCategories,
    subscribeCustomIngredients,
    subscribeFavoriteMenus,
    setFamily,
    setWallets,
    setTransactions,
    setBudgets,
    setAvailableIngredients,
    setCustomCategories,
    setCustomIngredients,
    setFavoriteMenus
  } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'pantry' | 'settings'>('dashboard');
  const confirm = useConfirm();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      if (!firebaseUser) {
        // Clear store state on logout
        setFamily(null);
        setWallets([]);
        setTransactions([]);
        setBudgets([]);
        setAvailableIngredients([]);
        setCustomCategories([]);
        setCustomIngredients([]);
        setFavoriteMenus([]);
      }
    });
  }, []);

  // Firestore Subscriptions when user logged in
  useEffect(() => {
    if (!user) return;

    const unsubFamily = subscribeFamily(user.uid);
    const unsubWallets = subscribeWallets(user.uid);
    const unsubTrans = subscribeTransactions(user.uid);
    const unsubBudgets = subscribeBudgets(user.uid);
    const unsubIng = subscribeIngredients(user.uid);
    const unsubCustomCat = subscribeCustomCategories(user.uid);
    const unsubCustomIng = subscribeCustomIngredients(user.uid);
    const unsubFavMenu = subscribeFavoriteMenus(user.uid);

    return () => {
      unsubFamily();
      unsubWallets();
      unsubTrans();
      unsubBudgets();
      unsubIng();
      unsubCustomCat();
      unsubCustomIng();
      unsubFavMenu();
    };
  }, [user]);

  // Capture PWA Install event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
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

  // Loading Screen
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-cream)',
        gap: '16px'
      }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ fontWeight: 600 }}>Đang chuẩn bị căn bếp...</p>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return <AuthPage />;
  }

  // Onboarding Screen
  if (!family) {
    return <OnboardingPage />;
  }

  return (
    <>
      {/* Top Header */}
      <header style={{
        height: '56px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '16px', color: 'var(--primary-dark)', fontWeight: 800 }}>SmartHomeMom</h2>
          {user.isAnonymous && (
            <span style={{
              fontSize: '10px',
              backgroundColor: 'var(--primary-bg)',
              color: 'var(--primary)',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 700
            }}>Demo</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showInstallBtn && (
            <button
              onClick={handleInstallPWA}
              style={{
                background: 'var(--primary-bg)',
                color: 'var(--primary)',
                border: '1px solid var(--primary-light)',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={12} /> Cài đặt App
            </button>
          )}
          <button
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px'
            }}
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'menu' && <MenuPage />}
        {activeTab === 'pantry' && <LocalPantry />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* PWA Shell Bottom Navigation Tabs */}
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

      {/* Custom micro animation CSS injected inline */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1.5s linear infinite;
        }
        .bottom-nav-item:active {
          transform: scale(0.92);
          transition: transform 0.1s ease;
        }
      `}</style>
    </>
  );
}
