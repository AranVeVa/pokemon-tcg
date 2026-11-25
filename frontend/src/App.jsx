import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LandingView from './views/LandingView';
import AuthModal from './views/AuthModal';
import PacksShopView from './views/PacksShopView';
import PokedexView from './views/PokedexView';
import UpgradeEvolveView from './views/UpgradeEvolveView';
import TradesView from './views/TradesView';
import BattlePassView from './views/BattlePassView';
import FriendsBattlesView from './views/FriendsBattlesView';
import AdminPanel from './views/AdminPanel';
import StripeCheckoutModal from './views/StripeCheckoutModal';

export default function App() {
  const { user, loading } = useAuth();
  
  // Navigation State: landing, sobres-tienda, pokedex, pase-batalla, amigos-retos, mejorar-evolucionar, super-admin
  const [activeTab, setActiveTab] = useState('sobres-tienda');
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [upgradeSelectedPokemonId, setUpgradeSelectedPokemonId] = useState(7); // Squirtle por defecto (Mockup 6)

  // Si no hay usuario y entra a una pestaña privada, redirigir a landing o abrir login
  const isPublicTab = activeTab === 'landing';
  const showLanding = !user || isPublicTab;

  const handleSelectPokemonForUpgrade = (pokemonId) => {
    setUpgradeSelectedPokemonId(pokemonId);
    setActiveTab('mejorar-evolucionar');
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar 
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onOpenStripe={() => setShowStripeModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Left Sidebar (Only visible when user is logged in or navigating internal modules) */}
        {user && !isPublicTab && (
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* Content Area */}
        <main className={`flex-1 p-3 sm:p-6 lg:p-8 min-w-0 pb-24 md:pb-8 ${!user || isPublicTab ? 'max-w-6xl mx-auto' : ''}`}>
          
          {showLanding && (
            <LandingView 
              onOpenAuth={(mode) => setAuthModalMode(mode)}
              onExplore={(tab) => {
                setActiveTab(tab);
                if (!user) setAuthModalMode('login');
              }}
            />
          )}

          {user && !isPublicTab && (
            <>
              {activeTab === 'sobres-tienda' && (
                <PacksShopView onOpenStripe={() => setShowStripeModal(true)} />
              )}

              {activeTab === 'pokedex' && (
                <PokedexView onSelectPokemonForUpgrade={handleSelectPokemonForUpgrade} />
              )}

              {activeTab === 'mejorar-evolucionar' && (
                <UpgradeEvolveView initialPokemonId={upgradeSelectedPokemonId} />
              )}

              {activeTab === 'pase-batalla' && (
                <BattlePassView onOpenStripe={() => setShowStripeModal(true)} />
              )}

              {activeTab === 'amigos-retos' && (
                <FriendsBattlesView />
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
