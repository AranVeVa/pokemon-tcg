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
  CheckCircle, 
  AlertCircle,
  Shield,
  Gift
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

  const formatTimer = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Abrir Sobre Gratuito
  const handleOpenFreePack = async () => {
    if (!canClaimFree && secondsRemaining > 0) return;
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
    <div className="space-y-8 pb-12">
      
      {/* Title & Subtabs (Mockup 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sobres y Tienda</h1>
          <p className="text-xs text-gray-500">
            Abre sobres para obtener nuevas cartas, acumular copias y evolucionar tu equipo.
          </p>
        </div>

        {/* Subtabs: [Sobres] [PokéGemas] [Items] */}
        <div className="inline-flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto border border-gray-200">
          <button
            onClick={() => setActiveSubTab('sobres')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'sobres' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sobres
          </button>
          <button
            onClick={() => setActiveSubTab('pokegemas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'pokegemas' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            PokéGemas
          </button>
          <button
            onClick={() => setActiveSubTab('items')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'items' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Items
          </button>
        </div>
      </div>

      {statusMessage.text && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SECCIÓN SOBRE GRATUITO (Mockup 2 Header Box) */}
      {/* ======================================================== */}
      <section className="bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-2xl p-6 border border-blue-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center space-x-6">
            {/* Graphic with Timer directly ON the pack (Mockup 2 requirement!) */}
            <div className="relative w-28 h-36 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-2 shadow-lg border-2 border-white flex flex-col items-center justify-center overflow-hidden shrink-0">
              
              {/* Timer Badge Directly Over the Pack */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-950/85 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[11px] font-black font-mono tracking-wider border border-white/20 shadow-md">
                {canClaimFree ? '00:00:00' : formatTimer(secondsRemaining)}
              </div>

              {/* Squirtle Artwork */}
              <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png" 
                alt="Sobre gratuito"
                className={`w-20 h-20 object-contain mt-3 filter drop-shadow ${canClaimFree ? 'animate-bounce' : ''}`}
              />

              <div className="text-[10px] font-black text-blue-200 uppercase tracking-tighter mt-1">
                Sobre Gratis
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                <Clock size={12} />
                <span>{modoDemo ? 'Modo Demo Activo (4 min)' : 'Modo Estándar (4 horas)'}</span>
              </div>
              <h2 className="text-xl font-black text-gray-900">Sobre gratuito</h2>
              <p className="text-xs text-gray-600">
                Se renueva cada 4 horas. Modo demo: cada {intervaloMinutos} minutos.
              </p>
              <p className="text-xs font-semibold text-gray-500">
                5 cartas aleatorias obtenidas directamente de PokéAPI.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={handleOpenFreePack}
              disabled={!canClaimFree && secondsRemaining > 0 || loadingAction}
              className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${
                canClaimFree
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:scale-105 animate-pulse'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
              }`}
            >
              {loadingAction ? 'Abriendo...' : canClaimFree ? '¡Abrir sobre gratis!' : 'Abrir cuando esté listo'}
            </button>
          </div>

        </div>
      </section>

      {/* Si es Premium: Banner de Sobre Diario Premium */}
      {(user?.role === 'Premium' || user?.role === 'Admin') && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow">
              <Gift size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Sobre Diario Premium (Beneficio Activo)</h4>
              <p className="text-xs text-amber-700">Por tener el Pase de Batalla Premium, tienes 1 sobre especial diario garantizado.</p>
            </div>
          </div>
          <button
            onClick={handleClaimDailyPremium}
            disabled={!canClaimDailyPremium || loadingAction}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              canClaimDailyPremium
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canClaimDailyPremium ? 'Reclamar sobre hoy' : 'Ya reclamado hoy'}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CATÁLOGO DE SOBRES EN TIENDA (Mockup 2 Grid) */}
      {/* ======================================================== */}
      {activeSubTab === 'sobres' && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Sobre Normal */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-44 bg-blue-50 rounded-xl flex items-center justify-center relative overflow-hidden border border-blue-100">
                <span className="absolute top-3 left-3 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                  Normal
                </span>
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" 
                  alt="Sobre Normal"
                  className="w-28 h-28 object-contain filter drop-shadow hover:scale-105 transition-transform"
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Sobre normal</h3>
                <p className="text-xs text-gray-500 mt-1">5 cartas, común y poco común.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-amber-800 font-black text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-900 font-extrabold flex items-center justify-center text-[10px]">
                  P
                </span>
                <span>1,200</span>
              </div>

              <button
                onClick={() => handleBuyPack('normal', 'coins')}
                disabled={loadingAction || (user?.coins || 0) < 1200}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Comprar
              </button>
            </div>
          </div>

          {/* 2. Sobre Especial */}
          <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-44 bg-purple-50 rounded-xl flex items-center justify-center relative overflow-hidden border border-purple-100">
                <span className="absolute top-3 left-3 bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                  Especial
                </span>
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png" 
                  alt="Sobre Especial"
                  className="w-28 h-28 object-contain filter drop-shadow hover:scale-105 transition-transform"
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Sobre especial</h3>
                <p className="text-xs text-gray-500 mt-1">5 cartas, alta probabilidad de rara + items.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-amber-800 font-black text-sm">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-900 font-extrabold flex items-center justify-center text-[10px]">
                    P
                  </span>
                  <span>8,000</span>
                </div>
                <button
                  onClick={() => handleBuyPack('especial', 'coins')}
                  disabled={loadingAction || (user?.coins || 0) < 8000}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Comprar con Monedas
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="flex items-center space-x-1.5 text-cyan-800 font-black text-sm">
                  <span className="w-3.5 h-3.5 rotate-45 bg-cyan-500 rounded-sm inline-block"></span>
                  <span>150</span>
                </div>
                <button
                  onClick={() => handleBuyPack('especial', 'gems')}
                  disabled={loadingAction || (user?.gems || 0) < 150}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Comprar con Gemas
                </button>
              </div>
            </div>
          </div>

          {/* 3. Sobre Legendario */}
          <div className="bg-white rounded-2xl p-5 border border-amber-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="h-44 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl flex items-center justify-center relative overflow-hidden border border-amber-200">
                <span className="absolute top-3 left-3 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                  Legendario
                </span>
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/144.png" 
                  alt="Sobre Legendario"
                  className="w-28 h-28 object-contain filter drop-shadow hover:scale-105 transition-transform"
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Sobre legendario</h3>
                <p className="text-xs text-gray-500 mt-1">Carta legendaria garantizada con buenas estadísticas.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-cyan-800 font-black text-sm">
                <span className="w-3.5 h-3.5 rotate-45 bg-cyan-500 rounded-sm inline-block"></span>
                <span>400</span>
              </div>

              <button
                onClick={() => handleBuyPack('legendario', 'gems')}
                disabled={loadingAction || (user?.gems || 0) < 400}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Comprar
              </button>
            </div>
          </div>

        </section>
      )}

      {/* ======================================================== */}
      {/* 3. POKÉGEMAS (DINERO REAL) (Mockup 2 Bottom Box) */}
      {/* ======================================================== */}
      {(activeSubTab === 'sobres' || activeSubTab === 'pokegemas') && (
        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">PokéGemas (dinero real)</h3>
            <p className="text-xs text-gray-500">
              Úsalas en sobres legendarios o cámbialas por PokéMonedas. Pasarela segura vía Stripe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Paquete 1,000 gemas */}
            <div className="p-4 bg-cyan-50/60 rounded-xl border border-cyan-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500 text-white flex items-center justify-center font-bold">
                  <Diamond size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">1,000 gemas</h4>
                  <p className="text-xs font-semibold text-cyan-700">$99 MXN</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm"
              >
                Comprar
              </button>
            </div>

            {/* Paquete 3,000 gemas */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                  <Diamond size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">3,000 gemas (+500)</h4>
                  <p className="text-xs font-semibold text-purple-700">$249 MXN</p>
                </div>
              </div>
              <button
                onClick={onOpenStripe}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-sm"
              >
                Comprar
              </button>
            </div>

            {/* Canje de Gemas */}
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Canje de gemas</h4>
                <p className="text-xs text-amber-800 font-medium">100 gemas = 5,000 monedas</p>
              </div>
              <button
                onClick={handleExchangeGems}
                disabled={loadingAction || (user?.gems || 0) < 100}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-lg text-xs shadow-sm"
              >
                Canjear
              </button>
            </div>

          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL INTERACTIVO DE APERTURA DE SOBRES CON ANIMACIÓN */}
      {/* ======================================================== */}
      {openedCards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 border border-white/20 shadow-2xl space-y-6 text-center">
            
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">¡Sobre Abierto!</span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">{openingPackName}</h2>
              <p className="text-xs text-gray-500">
                Se han añadido las 5 nuevas cartas y recompensas a tu colección.
              </p>
            </div>

            {/* Grid of 5 Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {openedCards.map((card, idx) => (
                <div 
                  key={idx}
                  className="bg-gradient-to-b from-gray-50 to-white rounded-2xl p-3 border-2 border-gray-200 shadow hover:shadow-lg flex flex-col items-center justify-between text-center animate-jump card-shine"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    card.rarity === 'legendario' ? 'bg-amber-100 text-amber-800' :
                    card.rarity === 'rara' ? 'bg-purple-100 text-purple-800' :
                    card.rarity === 'poco_comun' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {card.rarity}
                  </span>

                  <img 
                    src={card.artwork_url} 
                    alt={card.name} 
                    className="w-24 h-24 object-contain filter drop-shadow my-2"
                  />

                  <div>
                    <h4 className="text-xs font-black text-gray-900 leading-tight">{card.name}</h4>
                    <p className="text-[10px] text-gray-400 font-mono">#{card.id.toString().padStart(3, '0')}</p>
                    <div className="flex justify-center gap-1 mt-1">
                      {card.types?.map((t, tidx) => (
                        <span key={tidx} className="text-[9px] font-bold bg-gray-100 px-1.5 py-0.2 rounded text-gray-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dropped Items Notice */}
            {droppedItems.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold inline-flex items-center space-x-2">
                <Sparkles size={16} className="text-amber-600" />
                <span>¡También obtuviste items en este sobre: {droppedItems.map(i => i.name).join(', ')}!</span>
              </div>
            )}

            <div>
              <button
                onClick={() => setOpenedCards(null)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all text-sm"
              >
                Guardar en mi Álbum
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
