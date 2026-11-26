import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from './context/AuthContext';
import { apiRequest } from './api';
import { showAlert } from './utils/gameAlert';
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
import { trackPageView, trackEvent } from './utils/analytics';

export default function App() {
  const { user, loading, refreshUser } = useAuth();
  const handledPaymentReturnRef = useRef(false);
  
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

  const refreshUserRef = useRef(refreshUser);
  useEffect(() => {
    refreshUserRef.current = refreshUser;
  }, [refreshUser]);

  // Procesar retorno desde Stripe Checkout (?payment=success&session_id=... o ?payment=cancelled)
  useEffect(() => {
    if (loading || handledPaymentReturnRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (!paymentStatus) return;

    if (paymentStatus === 'cancelled') {
      handledPaymentReturnRef.current = true;
      window.history.replaceState({}, '', '/');
      showAlert.info('Pago cancelado', 'No se realizó ningún cargo en tu entorno de prueba.');
      return;
    }

    if (paymentStatus === 'success') {
      if (!user) {
        handledPaymentReturnRef.current = true;
        window.history.replaceState({}, '', '/');
        showAlert.warning(
          'Inicia sesión para ver tu compra',
          'Tu pago regresó de Stripe, pero no se detectó una sesión activa en este navegador.'
        );
        return;
      }

      const sessionId = params.get('session_id');
      handledPaymentReturnRef.current = true;
      window.history.replaceState({}, '', '/');

      if (!sessionId) return;

      apiRequest('/payments/verify-session', 'POST', { sessionId })
        .then(async (res) => {
          await refreshUserRef.current();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          if (res.productId) {
            trackEvent('purchase', {
              product_id: res.productId,
              value: res.amountMxn,
              currency: 'MXN'
            });
          }
          showAlert.success('¡Pago Exitoso!', res.message);
        })
        .catch((err) => {
          showAlert.error('Error al verificar el pago', err.message);
        });
    }
  }, [loading, user]);

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
                  onGoToBag={() => navigateToTab('sobres-tienda', { shopSubTab: 'items' })}
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
