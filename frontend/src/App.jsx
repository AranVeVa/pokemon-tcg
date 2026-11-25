import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LandingView from './views/LandingView';
import AuthModal from './views/AuthModal';
import PacksShopView from './views/PacksShopView';
import PokedexView from './views/PokedexView';
import UpgradeEvolveView from './views/UpgradeEvolveView';
import BattlePassView from './views/BattlePassView';
import FriendsBattlesView from './views/FriendsBattlesView';
import AdminPanel from './views/AdminPanel';
import StripeCheckoutModal from './views/StripeCheckoutModal';
import GlobalLiveNotifications from './components/GlobalLiveNotifications';
import { trackPageView } from './utils/analytics';

export default function App() {
  const { user, loading } = useAuth();
  
  // Navigation State: landing, sobres-tienda, pokedex, pase-batalla, amigos-retos, mejorar-evolucionar, super-admin
  const [activeTab, setActiveTab] = useState('sobres-tienda');
  const [shopSubTab, setShopSubTab] = useState('sobres');
  const [friendsSubTab, setFriendsSubTab] = useState('amigos');
  const [globalSyncTick, setGlobalSyncTick] = useState(0);
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [upgradeSelectedPokemonId, setUpgradeSelectedPokemonId] = useState(7); // Squirtle por defecto

  const isPublicTab = activeTab === 'landing';
  const showLanding = !user || isPublicTab;

  // Si inicia sesión estando en landing, pasar directo a Sobres y Tienda
  useEffect(() => {
    if (user && activeTab === 'landing') {
      setActiveTab('sobres-tienda');
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!loading) {
      const pageKey = showLanding ? 'landing' : activeTab;
      trackPageView(`/${pageKey}`, `Pokémon TCG · ${pageKey}`);
    }
  }, [activeTab, showLanding, loading]);

  const navigateToTab = (tab, opts = {}) => {
    if (opts.shopSubTab) setShopSubTab(opts.shopSubTab);
    if (opts.friendsSubTab) setFriendsSubTab(opts.friendsSubTab);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPokemonForUpgrade = (pokemonId) => {
    setUpgradeSelectedPokemonId(pokemonId);
    navigateToTab('mejorar-evolucionar');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Iniciando Pokémon TCG...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pokemon-route-bg text-slate-100 flex flex-col font-sans">
      <div className="pokemon-grass-horizon" aria-hidden="true" />
      
      {/* Top Navbar */}
      <Navbar 
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onOpenStripe={() => setShowStripeModal(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => navigateToTab(tab)}
      />

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        
        {/* Left Sidebar (Only visible when user is logged in) */}
        {user && !isPublicTab && (
          <Sidebar activeTab={activeTab} setActiveTab={(tab) => navigateToTab(tab)} />
        )}

        {/* Content Area */}
        <main className={`flex-1 p-3 sm:p-6 lg:p-8 min-w-0 overflow-x-clip pb-[calc(5.2rem+env(safe-area-inset-bottom))] md:pb-8 ${!user || isPublicTab ? 'max-w-6xl mx-auto' : ''}`}>
          
          {showLanding && (
            <LandingView 
              onOpenAuth={(mode) => setAuthModalMode(mode)}
              onExplore={(tab) => {
                navigateToTab(tab);
                if (!user) setAuthModalMode('login');
              }}
            />
          )}

          {user && !isPublicTab && (
            <>
              <GlobalLiveNotifications onGlobalAction={() => setGlobalSyncTick(t => t + 1)} />

              {activeTab === 'sobres-tienda' && (
                <PacksShopView
                  initialSubTab={shopSubTab}
                  onSubTabChange={setShopSubTab}
                  onOpenStripe={() => setShowStripeModal(true)}
                />
              )}

              {activeTab === 'pokedex' && (
                <PokedexView onSelectPokemonForUpgrade={handleSelectPokemonForUpgrade} />
              )}

              {activeTab === 'mejorar-evolucionar' && (
                <UpgradeEvolveView
                  initialPokemonId={upgradeSelectedPokemonId}
                  onGoToShop={(sub) => navigateToTab('sobres-tienda', { shopSubTab: sub || 'sobres' })}
                  onGoToTrades={() => navigateToTab('amigos-retos', { friendsSubTab: 'intercambios' })}
                  onOpenStripe={() => setShowStripeModal(true)}
                />
              )}

              {activeTab === 'pase-batalla' && (
                <BattlePassView onOpenStripe={() => setShowStripeModal(true)} />
              )}

              {activeTab === 'amigos-retos' && (
                <FriendsBattlesView
                  initialSubTab={friendsSubTab}
                  onSubTabChange={setFriendsSubTab}
                  refreshSignal={globalSyncTick}
                />
              )}

              {activeTab === 'super-admin' && (
                <AdminPanel />
              )}
            </>
          )}

        </main>
      </div>

      {/* Auth Modal (Login / Register / Verify) */}
      {authModalMode && (
        <AuthModal 
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
        />
      )}

      {/* Stripe Checkout Modal (Mockup 11) */}
      {showStripeModal && (
        <StripeCheckoutModal 
          initialProductId={user?.role === 'Normal' ? 'pass_premium' : 'gems_1000'}
          onClose={() => setShowStripeModal(false)}
        />
      )}

    </div>
  );
}
