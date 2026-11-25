import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/gameAlert';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Clock, 
  Diamond, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle,
  Gift,
  X,
  Briefcase,
  Heart,
  Zap,
  Shield,
  Gem,
  Coins
} from 'lucide-react';
import { trackEvent } from '../utils/analytics';

const RARITY_STYLES = {
  comun: 'bg-slate-900 text-slate-300 border-slate-700',
  poco_comun: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
  rara: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
  legendario: 'bg-amber-950/70 text-amber-300 border-amber-500/40'
};

export default function PacksShopView({ onOpenStripe }) {
  const { user, refreshUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('sobres'); // 'sobres' | 'pokegemas' | 'items'
  
  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [canClaimFree, setCanClaimFree] = useState(false);
  const [canClaimDailyPremium, setCanClaimDailyPremium] = useState(false);
  const [intervaloMinutos, setIntervaloMinutos] = useState(4);
  
  // Pack Opening Modal State
  const [openedCards, setOpenedCards] = useState(null);
  const [droppedItems, setDroppedItems] = useState([]);
  const [openingPackName, setOpeningPackName] = useState('');

  // Items / Mochila State
  const [itemsList, setItemsList] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [itemUseModal, setItemUseModal] = useState(null); // item object
  
  // UI Messages
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [loadingAction, setLoadingAction] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest('/packs/status');
      setSecondsRemaining(data.secondsRemaining || 0);
      setCanClaimFree(data.canClaimFree);
      setCanClaimDailyPremium(data.canClaimDailyPremium);
      setIntervaloMinutos(data.intervaloMinutos);
    } catch (err) {
      console.warn('Error fetching pack status:', err);
    }
  };

  const fetchItemsAndAlbum = async () => {
    try {
      const [itemsRes, albumRes] = await Promise.all([
        apiRequest('/items'),
        apiRequest('/cards/album')
      ]);
      setItemsList(itemsRes.items || []);
      setAlbumCards(albumRes.cards || []);
    } catch (err) {
      console.warn('Error cargando mochila:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchItemsAndAlbum();
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

  const handleOpenFreePack = async () => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/packs/open-free', 'POST');
      setOpenedCards(res.cards);
      setDroppedItems(res.items || []);
      setOpeningPackName('Sobre Gratuito');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      trackEvent('open_pack', { pack_type: 'free' });
      await refreshUser();
      await fetchStatus();
      await fetchItemsAndAlbum();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

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
      trackEvent('open_pack', { pack_type: packType, currency });
      await refreshUser();
      await fetchStatus();
      await fetchItemsAndAlbum();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleExchangeGems = async () => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });
    try {
      const res = await apiRequest('/packs/exchange-gems', 'POST', { gemsToExchange: 100 });
      setStatusMessage({ text: res.message, type: 'success' });
      trackEvent('exchange_gems', { gems: 100 });
      await refreshUser();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleClaimDailyPremium = async () => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });
    try {
      const res = await apiRequest('/packs/claim-daily-premium', 'POST');
      setOpenedCards(res.cards);
      setDroppedItems(res.items || []);
      setOpeningPackName('Sobre Diario Premium');
      confetti({ particleCount: 100, spread: 70 });
      trackEvent('open_pack', { pack_type: 'daily_premium' });
      await refreshUser();
      await fetchStatus();
      await fetchItemsAndAlbum();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleBuyShopItem = async (item) => {
    setLoadingAction(true);
    setStatusMessage({ text: '', type: '' });
    try {
      const res = await apiRequest('/items/buy', 'POST', { itemKey: item.item_key, quantity: 1 });
      setStatusMessage({ text: res.message, type: 'success' });
      trackEvent('buy_item', { item_key: item.item_key });
      await refreshUser();
      await fetchItemsAndAlbum();
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUseItemOnCard = async (userCardId) => {
    if (!itemUseModal) return;
    setLoadingAction(true);
    try {
      const res = await apiRequest('/items/use', 'POST', {
        itemKey: itemUseModal.item_key,
        userCardId
      });
      showAlert.success('Objeto Aplicado', res.message);
      setItemUseModal(null);
      await fetchItemsAndAlbum();
    } catch (err) {
      showAlert.error('No se pudo usar', err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const renderItemIcon = (item) => {
    if (item.effect_type?.startsWith('evolve')) return <Gem size={18} className={item.rarity === 'legendario' ? 'text-amber-300' : 'text-purple-400'} />;
    if (item.effect_type === 'battle_energy') return <Zap size={18} className="text-amber-400" />;
    if (item.effect_type === 'battle_atk_buff' || item.effect_type === 'battle_def_buff') return <Shield size={18} className="text-cyan-400" />;
    return <Heart size={18} className="text-emerald-400" />;
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 select-none text-slate-100">
      
      {/* Title & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">Sobres, Tienda y Mochila</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Abre sobres para conseguir cartas (con opción de evolucionados), ítems de combate y Prismas Evolutivos.
          </p>
        </div>

        {/* Subtabs: [Sobres] [Mochila e Ítems] [PokéGemas] */}
        <div className="inline-flex flex-wrap bg-slate-900 p-1 rounded-xl self-start sm:self-auto border border-slate-800 gap-1 max-w-full">
          <button
            onClick={() => setActiveSubTab('sobres')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'sobres' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sobres
          </button>
          <button
            onClick={() => setActiveSubTab('items')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
              activeSubTab === 'items' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase size={13} />
            <span>Mochila e Ítems</span>
          </button>
          <button
            onClick={() => setActiveSubTab('pokegemas')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. SOBRE GRATUITO */}
      <section className="bg-gradient-to-r from-[#0c1527] via-[#090f1d] to-[#060913] rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6">
            <div className="relative w-28 h-36 bg-gradient-to-br from-[#12203a] to-[#091122] rounded-2xl p-2 shadow-2xl border border-cyan-500/40 flex flex-col items-center justify-center overflow-hidden shrink-0">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/90 text-cyan-300 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider border border-cyan-500/30 shadow">
                {canClaimFree ? '00:00:00' : formatTimer(secondsRemaining)}
              </div>

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
                <span>Disponible cada {intervaloMinutos >= 60 ? `${intervaloMinutos / 60} horas` : `${intervaloMinutos} minutos`}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100">Sobre Gratuito</h2>
              <p className="text-xs text-slate-400">
                Ábrelo sin costo cuando acabe el temporizador: 5 cartas (baja chance de evolucionados) y 28% de ítem básico.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex justify-center">
            <button
              onClick={handleOpenFreePack}
              disabled={(!canClaimFree && secondsRemaining > 0) || loadingAction}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
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

      {/* Banner Sobre Diario Premium */}
      {(user?.role === 'Premium' || user?.role === 'Admin') && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/50 text-amber-400 flex items-center justify-center font-black shrink-0">
              <Gift size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300">Sobre Diario Premium (Beneficio Activo)</h4>
              <p className="text-[11px] text-slate-400">Incluye altas tasas de evolucionados y 85% de probabilidad de ítem o Prisma.</p>
            </div>
          </div>
          <button
            onClick={handleClaimDailyPremium}
            disabled={!canClaimDailyPremium || loadingAction}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all self-start sm:self-auto shrink-0 ${
              canClaimDailyPremium
                ? 'bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/50 shadow-md'
                : 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {canClaimDailyPremium ? 'Reclamar Sobre Hoy' : 'Ya Reclamado Hoy'}
          </button>
        </div>
      )}

      {/* 2. CATÁLOGO DE SOBRES */}
      {activeSubTab === 'sobres' && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Sobre Normal */}
          <div className="bg-[#0b1222] rounded-3xl p-5 border border-slate-800 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-40 bg-slate-950 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-850">
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
                <p className="text-xs text-slate-400 mt-1">
                  5 cartas (~78% básicas, baja chance de evolucionadas) + 45% de probabilidad de ítem (pociones comunes o raro Prisma).
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
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

          {/* Sobre Especial */}
          <div className="bg-[#0b1222] rounded-3xl p-5 border border-purple-500/30 shadow-xl hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-40 bg-slate-950 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-850">
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
                <p className="text-xs text-slate-400 mt-1">
                  5 cartas (~55% evolucionadas y raras, 3% legendarias) + 80% de probabilidad de ítems y mayor opción de Prismas Evolutivos.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
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

          {/* Sobre Legendario */}
          <div className="bg-[#0b1222] rounded-3xl p-5 border border-amber-500/30 shadow-xl hover:border-amber-500/50 transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="h-40 bg-slate-950 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-850">
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
                <p className="text-xs text-slate-400 mt-1">
                  1 Legendaria garantizada + alto índice de etapas evolucionadas + 100% ítem asegurado (mejor tasa de Prismas).
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
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

      {/* 3. MOCHILA E ÍTEMS */}
      {activeSubTab === 'items' && (
        <section className="space-y-4">
          <div className="bg-[#0b1222] rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-2">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Mochila y Botica del Entrenador</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Las curaciones pequeñas y tónicos pueden adquirirse con <strong>PokéMonedas</strong> o caer en sobres comunes. Los <strong>Prismas Evolutivos</strong> y objetos de rareza superior son mucho menos comunes y solo se obtienen abriendo sobres o ganando duelos competitivos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {itemsList.map((item) => {
              const canUseOutOfBattle = item.effect_type?.startsWith('heal') || item.effect_type?.startsWith('revive');
              return (
                <div
                  key={item.item_key}
                  className="bg-[#0b1222] rounded-2xl p-4 border border-slate-800 flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {renderItemIcon(item)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-slate-100 truncate">{item.name}</h4>
                          <span className={`inline-block text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border mt-0.5 ${
                            RARITY_STYLES[item.rarity] || RARITY_STYLES.comun
                          }`}>
                            {item.rarity.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 shrink-0">
                        x{item.quantity}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    {item.coinPrice ? (
                      <button
                        onClick={() => handleBuyShopItem(item)}
                        disabled={loadingAction || (user?.coins || 0) < item.coinPrice}
                        className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold flex items-center space-x-1"
                      >
                        <Coins size={12} />
                        <span>Comprar ({item.coinPrice} P)</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-purple-300 font-semibold">
                        Exclusivo de sobres y batallas
                      </span>
                    )}

                    {canUseOutOfBattle && item.quantity > 0 && (
                      <button
                        onClick={() => setItemUseModal(item)}
                        className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-bold"
                      >
                        Usar ahora
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. POKÉGEMAS */}
      {(activeSubTab === 'sobres' || activeSubTab === 'pokegemas') && (
        <section className="bg-[#0b1222] rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">PokéGemas (Moneda Oficial)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Úsalas en sobres legendarios/especiales o cámbialas por PokéMonedas. Pasarela segura vía Stripe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                  <Diamond size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-100">1,000 Gemas</h4>
                  <p className="text-[11px] font-mono text-cyan-400 font-bold">$99 MXN</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl transition-all shrink-0"
              >
                Comprar
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                  <Diamond size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-100">3,000 Gemas (+500)</h4>
                  <p className="text-[11px] font-mono text-cyan-400 font-bold">$249 MXN</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl transition-all shrink-0"
              >
                Comprar
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                  <Diamond size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-100">Pase Premium</h4>
                  <p className="text-[11px] font-mono text-cyan-300 font-bold">$149 MXN (Sobre diario)</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 text-xs font-bold rounded-xl transition-all shrink-0"
              >
                Ver Plan
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-400 text-center sm:text-left">
              <ArrowRightLeft size={15} className="text-cyan-400 shrink-0" />
              <span>Canje oficial: <strong>100 gemas</strong> equivalen a <strong>5,000 PokéMonedas</strong>.</span>
            </div>
            <button
              onClick={handleExchangeGems}
              disabled={loadingAction || (user?.gems || 0) < 100}
              className="w-full sm:w-auto px-4 py-2 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-750 font-bold rounded-xl transition-all text-xs"
            >
              Canjear 100 Gemas
            </button>
          </div>
        </section>
      )}

      {/* MODAL APLICAR ITEM DESDE MOCHILA */}
      {itemUseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-4 sm:p-6 max-w-lg w-full max-h-[90dvh] overflow-y-auto space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-100">Usar {itemUseModal.name}</h3>
                <p className="text-xs text-slate-400">{itemUseModal.description}</p>
              </div>
              <button onClick={() => setItemUseModal(null)} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {albumCards
                .filter(c => itemUseModal.effect_type.startsWith('revive') ? c.current_hp === 0 : c.current_hp > 0 && c.current_hp < c.max_hp)
                .map(card => (
                  <div key={card.user_card_id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img src={card.sprite_url} alt={card.name} className="w-10 h-10 object-contain shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-100 block truncate">{card.name} (Nv.{card.level})</span>
                        <span className="text-[11px] font-mono text-slate-400">HP: {card.current_hp}/{card.max_hp}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUseItemOnCard(card.user_card_id)}
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shrink-0"
                    >
                      Aplicar
                    </button>
                  </div>
                ))}

              {albumCards.filter(c => itemUseModal.effect_type.startsWith('revive') ? c.current_hp === 0 : c.current_hp > 0 && c.current_hp < c.max_hp).length === 0 && (
                <p className="text-xs text-center text-slate-400 py-6">
                  {itemUseModal.effect_type.startsWith('revive')
                    ? 'Ningún Pokémon de tu álbum está debilitado.'
                    : 'Todos tus Pokémon activos tienen su salud al máximo.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL APERTURA DE SOBRES */}
      {openedCards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-4 sm:p-8 max-w-2xl w-full text-center space-y-4 shadow-2xl relative max-h-[92dvh] overflow-y-auto my-auto">
            <button
              onClick={() => setOpenedCards(null)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-100 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center transition-colors"
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

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 pt-1">
              {openedCards.map((card, idx) => (
                <div 
                  key={idx}
                  className={`bg-[#0e1628] p-2.5 sm:p-3 rounded-2xl border text-center relative flex flex-col justify-between shadow-xl transition-all ${
                    card?.isEvolvedPull
                      ? 'border-purple-400/70 ring-1 ring-purple-500/30'
                      : 'border-slate-750 hover:border-cyan-500/60'
                  }`}
                >
                  {card?.isEvolvedPull && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                      Evolución Et.{card.evolution_stage}
                    </span>
                  )}
                  <div className="h-20 sm:h-24 flex items-center justify-center p-1 bg-slate-950/70 rounded-xl border border-slate-900 mt-1">
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
                      {card?.rarity?.replace('_', ' ') || 'Común'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {droppedItems.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-left text-xs space-y-1.5">
                <span className="font-bold text-slate-300 block">Objetos adicionales obtenidos:</span>
                <div className="flex flex-wrap gap-2">
                  {droppedItems.map((item, iidx) => (
                    <span
                      key={iidx}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border ${
                        item.effect_type?.startsWith('evolve')
                          ? 'bg-purple-950 text-purple-200 border-purple-500/50 animate-pulse'
                          : 'bg-slate-900 text-emerald-300 border-slate-800'
                      }`}
                    >
                      +1 {item.name}
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
