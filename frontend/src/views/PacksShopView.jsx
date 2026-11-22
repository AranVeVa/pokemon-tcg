import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  Package, 
  Sparkles, 
  Clock, 
  Diamond, 
  Coins, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  Gift,
  X
} from 'lucide-react';

export default function PacksShopView({ onOpenStripe }) {
  const { user, refreshUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('sobres'); // 'sobres' | 'pokegemas' | 'items'
  
  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [canClaimFree, setCanClaimFree] = useState(false);
  const [canClaimDailyPremium, setCanClaimDailyPremium] = useState(false);
  const [modoDemo, setModoDemo] = useState(true);
  const [intervaloMinutos, setIntervaloMinutos] = useState(4);
  
  // Pack Opening Modal State
  const [openedCards, setOpenedCards] = useState(null);
  const [droppedItems, setDroppedItems] = useState([]);
  const [isOpening, setIsOpening] = useState(false);
  const [openingPackName, setOpeningPackName] = useState('');
  
  // UI Messages
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [loadingAction, setLoadingAction] = useState(false);

  // Fetch status on mount
  const fetchStatus = async () => {
    try {
      const data = await apiRequest('/packs/status');
      setSecondsRemaining(data.secondsRemaining || 0);
      setCanClaimFree(data.canClaimFree);
      setCanClaimDailyPremium(data.canClaimDailyPremium);
      setModoDemo(data.modoDemo);
      setIntervaloMinutos(data.intervaloMinutos);
    } catch (err) {
      console.warn('Error fetching pack status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setCanClaimFree(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Abrir Sobre Gratuito
  const handleOpenFreePack = async () => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/packs/open-free', 'POST');
      setOpenedCards(res.cards);
      setDroppedItems([]);
      setOpeningPackName('Sobre Gratuito');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      await refreshUser();
      await fetchStatus();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Comprar Sobre de Tienda
  const handleBuyPack = async (packType, currency = 'coins') => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/packs/buy', 'POST', {
        packType,
        paymentCurrency: currency
      });
      setOpenedCards(res.cards);
      setDroppedItems(res.items || []);
      setOpeningPackName(
        packType === 'normal' ? 'Sobre Normal' :
        packType === 'especial' ? 'Sobre Especial' : 'Sobre Legendario'
      );
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      await refreshUser();
      await fetchStatus();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Canjear 100 gemas por 5,000 monedas
  const handleExchangeGems = async () => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });
    try {
      const res = await apiRequest('/packs/exchange-gems', 'POST', { gemsToExchange: 100 });
      setStatusMessage({ text: res.message, type: 'success' });
      await refreshUser();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Reclamar sobre diario premium
  const handleClaimDailyPremium = async () => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });
    try {
      const res = await apiRequest('/packs/claim-daily-premium', 'POST');
      setOpenedCards(res.cards);
      setDroppedItems([]);
      setOpeningPackName('Sobre Diario Premium');
      confetti({ particleCount: 100, spread: 70 });
      await refreshUser();
      await fetchStatus();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 select-none text-slate-100">
      
      {/* Title & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Sobres y Tienda</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Abre sobres para obtener nuevas cartas, acumular copias y evolucionar tu equipo.
          </p>
        </div>

        {/* Subtabs: [Sobres] [PokéGemas] [Items] */}
        <div className="inline-flex bg-slate-900 p-1 rounded-xl self-start sm:self-auto border border-slate-800">
          <button
            onClick={() => setActiveSubTab('sobres')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'sobres' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sobres
          </button>
          <button
            onClick={() => setActiveSubTab('pokegemas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'pokegemas' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PokéGemas
          </button>
        </div>
      </div>

      {statusMessage.text && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          statusMessage.type === 'success' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/70 text-red-300 border border-red-500/40'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SECCIÓN SOBRE GRATUITO (Con temporizador en el sobre) */}
      {/* ======================================================== */}
      <section className="bg-gradient-to-r from-[#0c1527] via-[#090f1d] to-[#060913] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center space-x-6">
            {/* Graphic with Timer directly ON the pack */}
            <div className="relative w-28 h-36 bg-gradient-to-br from-[#12203a] to-[#091122] rounded-2xl p-2 shadow-2xl border border-cyan-500/40 flex flex-col items-center justify-center overflow-hidden shrink-0">
              
              {/* Timer Badge Directly Over the Pack */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/90 text-cyan-300 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider border border-cyan-500/30 shadow">
                {canClaimFree ? '00:00:00' : formatTimer(secondsRemaining)}
              </div>

              {/* Squirtle Artwork */}
              <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png" 
                alt="Sobre gratuito"
                className={`w-20 h-20 object-contain mt-3 filter drop-shadow ${canClaimFree ? 'animate-bounce' : ''}`}
              />

              <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider mt-1 font-mono">
                Sobre Gratis
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                <Clock size={12} />
                <span>{modoDemo ? 'Modo Demo Activo (4 min)' : 'Modo Estándar (4 horas)'}</span>
              </div>
              <h2 className="text-xl font-black text-slate-100">Sobre Gratuito</h2>
              <p className="text-xs text-slate-400">
                Se renueva cada 4 horas. Modo demo: cada {intervaloMinutos} minutos.
              </p>
              <p className="text-xs font-semibold text-slate-500 font-mono">
                5 cartas aleatorias obtenidas directamente de la Pokédex.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={handleOpenFreePack}
              disabled={!canClaimFree && secondsRemaining > 0 || loadingAction}
              className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
                canClaimFree
                  ? 'bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950 hover:scale-105'
                  : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              {loadingAction ? 'Abriendo...' : canClaimFree ? 'Abrir Sobre Gratis' : 'Esperando Recarga'}
            </button>
          </div>

        </div>
      </section>

      {/* Si es Premium: Banner de Sobre Diario Premium */}
      {(user?.role === 'Premium' || user?.role === 'Admin') && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/50 text-amber-400 flex items-center justify-center font-black">
              <Gift size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300">Sobre Diario Premium (Beneficio Activo)</h4>
              <p className="text-[11px] text-slate-400">Por contar con el Pase de Batalla Premium, tienes 1 sobre especial diario garantizado.</p>
            </div>
          </div>
          <button
            onClick={handleClaimDailyPremium}
            disabled={!canClaimDailyPremium || loadingAction}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              canClaimDailyPremium
                ? 'bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/50 shadow-md'
                : 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {canClaimDailyPremium ? 'Reclamar Sobre Hoy' : 'Ya Reclamado Hoy'}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CATÁLOGO DE SOBRES EN TIENDA */}
      {/* ======================================================== */}
      {activeSubTab === 'sobres' && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Sobre Normal */}
          <div className="bg-[#0b1222] rounded-3xl p-5 border border-slate-800 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-44 bg-slate-950 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-850">
                <span className="absolute top-3 left-3 bg-slate-900 text-slate-300 border border-slate-750 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                  Común
                </span>
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" 
                  alt="Sobre Normal"
                  className="w-28 h-28 object-contain filter drop-shadow hover:scale-105 transition-transform"
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">Sobre Normal</h3>
                <p className="text-xs text-slate-400 mt-1">5 cartas de rareza común y poco común.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-amber-300 font-mono font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px]">
                  P
                </span>
                <span>1,200</span>
              </div>

              <button
                onClick={() => handleBuyPack('normal', 'coins')}
                disabled={loadingAction || (user?.coins || 0) < 1200}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Comprar
              </button>
            </div>
          </div>

          {/* 2. Sobre Especial */}
          <div className="bg-[#0b1222] rounded-3xl p-5 border border-purple-500/30 shadow-xl hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-44 bg-slate-950 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-850">
                <span className="absolute top-3 left-3 bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                  Especial
                </span>
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png" 
                  alt="Sobre Especial"
                  className="w-28 h-28 object-contain filter drop-shadow hover:scale-105 transition-transform"
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">Sobre Especial</h3>
                <p className="text-xs text-slate-400 mt-1">5 cartas con alta probabilidad de rara + probabilidad de items.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-amber-300 font-mono font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px]">
                    P
                  </span>
                  <span>8,000</span>
                </div>
                <button
                  onClick={() => handleBuyPack('especial', 'coins')}
                  disabled={loadingAction || (user?.coins || 0) < 8000}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-purple-300 border border-purple-500/40 text-xs font-bold rounded-xl transition-all"
                >
                  Monedas
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-850">
                <div className="flex items-center space-x-1.5 text-cyan-300 font-mono font-bold text-sm">
                  <span className="w-3 h-3 rotate-45 bg-cyan-400 rounded-xs inline-block"></span>
                  <span>150</span>
                </div>
                <button
                  onClick={() => handleBuyPack('especial', 'gems')}
                  disabled={loadingAction || (user?.gems || 0) < 150}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl transition-all"
                >
                  Gemas
                </button>
              </div>
            </div>
          </div>

          {/* 3. Sobre Legendario */}
          <div className="bg-[#0b1222] rounded-3xl p-5 border border-amber-500/30 shadow-xl hover:border-amber-500/50 transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="h-44 bg-slate-950 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-850">
                <span className="absolute top-3 left-3 bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                  Legendario
                </span>
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/144.png" 
                  alt="Sobre Legendario"
                  className="w-28 h-28 object-contain filter drop-shadow hover:scale-105 transition-transform"
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">Sobre Legendario</h3>
                <p className="text-xs text-slate-400 mt-1">Carta legendaria garantizada con estadísticas superiores.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-mono font-bold text-sm">
                <span className="w-3.5 h-3.5 rotate-45 bg-cyan-400 rounded-xs inline-block"></span>
                <span>400</span>
              </div>

              <button
                onClick={() => handleBuyPack('legendario', 'gems')}
                disabled={loadingAction || (user?.gems || 0) < 400}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl shadow transition-all"
              >
                Comprar
              </button>
            </div>
          </div>

        </section>
      )}

      {/* ======================================================== */}
      {/* 3. POKÉGEMAS (DINERO REAL) */}
      {/* ======================================================== */}
      {(activeSubTab === 'sobres' || activeSubTab === 'pokegemas') && (
        <section className="bg-[#0b1222] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">PokéGemas (Moneda Oficial)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Úsalas en sobres legendarios o cámbialas por PokéMonedas. Pasarela segura vía Stripe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Paquete 1,000 gemas */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                  <Diamond size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">1,000 Gemas</h4>
                  <p className="text-[11px] font-mono text-cyan-400 font-bold">$99 MXN</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl transition-all"
              >
                Comprar
              </button>
            </div>

            {/* Paquete 2,500 gemas */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                  <Diamond size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">2,500 Gemas</h4>
                  <p className="text-[11px] font-mono text-cyan-400 font-bold">$199 MXN</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl transition-all"
              >
                Comprar
              </button>
            </div>

            {/* Paquete 6,000 gemas */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-400 flex items-center justify-center font-bold">
                  <Diamond size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">6,000 Gemas</h4>
                  <p className="text-[11px] font-mono text-cyan-300 font-bold">$399 MXN (Mejor Valor)</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 text-xs font-bold rounded-xl transition-all"
              >
                Comprar
              </button>
            </div>

          </div>

          {/* Canje de Gemas a Monedas */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <ArrowRightLeft size={15} className="text-cyan-400" />
              <span>Canje oficial: <strong>100 gemas</strong> equivalen a <strong>5,000 PokéMonedas</strong>.</span>
            </div>
            <button
              onClick={handleExchangeGems}
              disabled={loadingAction || (user?.gems || 0) < 100}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-750 font-bold rounded-xl transition-all text-xs"
            >
              Canjear 100 Gemas
            </button>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL ANIMADO DE APERTURA DE SOBRES */}
      {/* ======================================================== */}
      {openedCards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-center space-y-5 shadow-2xl relative">
            <button
              onClick={() => setOpenedCards(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                ¡Apertura Exitosa!
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-0.5">
                {openingPackName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Cartas agregadas a tu colección y Pokédex:
              </p>
            </div>

            {/* Grid of opened cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {openedCards.map((card, idx) => (
                <div 
                  key={idx}
                  className="bg-[#0e1628] p-3 rounded-2xl border border-slate-750 text-center relative flex flex-col justify-between shadow-xl hover:border-cyan-500/60 hover:scale-105 transition-all"
                >
                  <div className="h-24 flex items-center justify-center p-1 bg-slate-950/70 rounded-xl border border-slate-900">
                    <img 
                      src={card?.artwork_url || card?.sprite_url || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'} 
                      alt={card?.name || 'Pokémon'} 
                      className="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.8)]" 
                    />
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                      #{card?.id ? card.id.toString().padStart(3, '0') : '???'}
                    </span>
                    <h5 className="text-xs font-black text-slate-100 truncate mt-0.5">
                      {card?.name || 'Pokémon'}
                    </h5>
                    <span className="text-[9px] font-mono font-bold text-amber-400 capitalize block mt-0.5">
                      {card?.rarity || 'Común'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Dropped items */}
            {droppedItems.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-left text-xs">
                <span className="font-bold text-slate-400 block mb-1">Objetos adicionales obtenidos:</span>
                <div className="flex gap-2">
                  {droppedItems.map((item, iidx) => (
                    <span key={iidx} className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-mono text-[11px] border border-slate-800">
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setOpenedCards(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 font-bold text-xs rounded-xl shadow transition-all"
            >
              Guardar en mi Álbum
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
