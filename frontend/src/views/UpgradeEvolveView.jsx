import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/gameAlert';
import confetti from 'canvas-confetti';
import { 
  ChevronRight, 
  ArrowUpCircle, 
  Sparkles, 
  Heart, 
  Sword, 
  Zap,
  CheckCircle2, 
  AlertCircle,
  Copy,
  Star,
  Gem,
  Search,
  ArrowLeftRight,
  Coins,
  Diamond,
  Package,
  Filter
} from 'lucide-react';
import TradeProposalModal from './TradeProposalModal';
import { trackEvent } from '../utils/analytics';

const FILTER_TYPES = [
  'Todos', 'Agua', 'Fuego', 'Planta', 'Eléctrico', 'Normal',
  'Veneno', 'Tierra', 'Bicho', 'Lucha', 'Psíquico', 'Roca',
  'Fantasma', 'Dragón', 'Hielo', 'Hada', 'Acero', 'Volador'
];

export default function UpgradeEvolveView({
  initialPokemonId = 7,
  onGoToShop,
  onGoToTrades,
  onOpenStripe
}) {
  const { user, refreshUser } = useAuth();
  const chainSectionRef = useRef(null);

  const [selectedSpeciesId, setSelectedSpeciesId] = useState(initialPokemonId);
  const [evolutionChain, setEvolutionChain] = useState([]);
  const [prisms, setPrisms] = useState({ prisma_evolucion: 0, prisma_maestro: 0 });
  const [albumCards, setAlbumCards] = useState([]);

  // Búsqueda y filtros del álbum inferior y selector superior
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas'); // 'todas' | 'evolucionables' | 'subir_nivel' | 'repetidas' | 'heridas'
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('pokedex'); // 'pokedex' | 'level' | 'copies'

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [evolvedGlowCardId, setEvolvedGlowCardId] = useState(null);
  const [tradeSpeciesCard, setTradeSpeciesCard] = useState(null);

  useEffect(() => {
    setSelectedSpeciesId(initialPokemonId);
  }, [initialPokemonId]);

  useEffect(() => {
    fetchAlbumAndChain(selectedSpeciesId);
  }, [selectedSpeciesId]);

  const fetchAlbumAndChain = async (speciesId) => {
    setLoading(true);
    try {
      const [albumRes, chainRes] = await Promise.all([
        apiRequest('/cards/album'),
        apiRequest(`/cards/evolution-chain/${speciesId}`)
      ]);
      setAlbumCards(albumRes.cards || []);
      setEvolutionChain(chainRes.chain || []);
      setPrisms(chainRes.prisms || { prisma_evolucion: 0, prisma_maestro: 0 });
    } catch (err) {
      console.error('Error fetching evolution chain:', err);
    } finally {
      setLoading(false);
    }
  };

  // Conteo total de copias libres y totales por card_id
  const speciesStatsMap = useMemo(() => {
    const map = new Map();
    albumCards.forEach(c => {
      if (!map.has(c.card_id)) {
        map.set(c.card_id, {
          id: c.card_id,
          name: c.name,
          types: c.types || ['Normal'],
          count: 1,
          freeCount: c.in_pending_trade ? 0 : 1,
          maxLevel: c.level,
          evolvesToId: c.evolves_to_id,
          bestCard: c
        });
      } else {
        const entry = map.get(c.card_id);
        entry.count += 1;
        if (!c.in_pending_trade) entry.freeCount += 1;
        if (c.level > entry.maxLevel) {
          entry.maxLevel = c.level;
          entry.bestCard = c;
        }
      }
    });
    return map;
  }, [albumCards]);

  // Lista rápida de especies para la barra superior
  const ownedSpeciesList = useMemo(() => {
    const list = Array.from(speciesStatsMap.values());
    const q = speciesFilter.trim().toLowerCase().replace('#', '');
    if (!q) return list;
    return list.filter(s => s.name.toLowerCase().includes(q) || s.id.toString().includes(q));
  }, [speciesStatsMap, speciesFilter]);

  // Todas las cartas filtradas para la cuadrícula inferior
  const filteredAlbumCards = useMemo(() => {
    const q = speciesFilter.trim().toLowerCase().replace('#', '');
    const filtered = albumCards.filter(card => {
      const sp = speciesStatsMap.get(card.card_id);
      const matchesQuery = !q || card.name.toLowerCase().includes(q) || card.card_id.toString().includes(q);
      const matchesType = typeFilter === 'Todos' || (card.types && card.types.includes(typeFilter));

      let matchesStatus = true;
      if (statusFilter === 'evolucionables') {
        const canByCopies = Boolean(card.evolves_to_id) && card.level >= 5 && (sp?.freeCount || 0) >= 3;
        const canByPrism = Boolean(card.evolves_to_id) && card.level >= 5 && (prisms.prisma_evolucion || 0) > 0;
        const canByMaster = Boolean(card.evolves_to_id) && (prisms.prisma_maestro || 0) > 0;
        matchesStatus = canByCopies || canByPrism || canByMaster;
      } else if (statusFilter === 'subir_nivel') {
        matchesStatus = card.level < 5;
      } else if (statusFilter === 'repetidas') {
        matchesStatus = (sp?.count || 1) >= 2;
      } else if (statusFilter === 'heridas') {
        matchesStatus = card.current_hp < card.max_hp;
      }

      return matchesQuery && matchesType && matchesStatus;
    });

    const sorted = [...filtered];
    if (sortBy === 'level') {
      sorted.sort((a, b) => b.level - a.level || a.card_id - b.card_id);
    } else if (sortBy === 'copies') {
      sorted.sort((a, b) => (speciesStatsMap.get(b.card_id)?.count || 1) - (speciesStatsMap.get(a.card_id)?.count || 1) || a.card_id - b.card_id);
    } else {
      sorted.sort((a, b) => a.card_id - b.card_id || b.level - a.level);
    }
    return sorted;
  }, [albumCards, speciesStatsMap, speciesFilter, typeFilter, statusFilter, sortBy, prisms]);

  const handleUpgradeLevel = async (userCardId) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/cards/upgrade', 'POST', { userCardId });
      setMessage({ text: res.message, type: 'success' });
      trackEvent('card_upgraded', { user_card_id: userCardId });
      await refreshUser();
      await fetchAlbumAndChain(selectedSpeciesId);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvolve = async (userCardId, mode = 'copies') => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/cards/evolve', 'POST', { userCardId, mode });
      setMessage({ text: res.message, type: 'success' });
      setEvolvedGlowCardId(userCardId);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      trackEvent('card_evolved', { mode });

      await refreshUser();
      await fetchAlbumAndChain(selectedSpeciesId);

      setTimeout(() => setEvolvedGlowCardId(null), 3500);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Canje rápido de 100 PokéGemas -> 5,000 PokéMonedas sin salir de Evolución
  const handleQuickExchangeGems = async () => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await apiRequest('/packs/exchange-gems', 'POST', { gemsToExchange: 100 });
      setMessage({ text: res.message, type: 'success' });
      trackEvent('exchange_gems', { gems: 100, source: 'evolution_view' });
      await refreshUser();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const userCoins = user?.coins || 0;
  const userGems = user?.gems || 0;
  const UPGRADE_COST = 500;
  const missingCoinsForUpgrade = Math.max(0, UPGRADE_COST - userCoins);

  const selectSpeciesAndScroll = (cardId) => {
    setSelectedSpeciesId(cardId);
    chainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6 pb-12 select-none text-slate-100">
      
      {/* Header compacto con saldos y Prismas (sin pared de instrucciones arriba) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <ArrowUpCircle size={22} className="text-cyan-400 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">Evolución y Mejora</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="bg-[#0b1222] border border-amber-500/30 rounded-2xl px-3 py-1.5 flex items-center space-x-1.5">
            <Coins size={14} className="text-amber-400" />
            <span className="text-xs font-mono font-black text-amber-300">{userCoins.toLocaleString()} P</span>
          </div>
          <button
            onClick={() => onOpenStripe && onOpenStripe()}
            className="bg-[#0b1222] hover:bg-slate-900 border border-cyan-500/40 rounded-2xl px-3 py-1.5 flex items-center space-x-1.5 transition-all"
          >
            <Diamond size={14} className="text-cyan-400" />
            <span className="text-xs font-mono font-black text-cyan-300">{userGems.toLocaleString()} Gemas +</span>
          </button>
          <div className="bg-[#0b1222] border border-purple-500/40 rounded-2xl px-3 py-1.5 flex items-center space-x-1.5">
            <Gem size={14} className="text-purple-400" />
            <span className="text-xs font-mono font-black text-purple-300">Prisma: {prisms.prisma_evolucion || 0}</span>
          </div>
          <div className="bg-[#0b1222] border border-fuchsia-500/40 rounded-2xl px-3 py-1.5 flex items-center space-x-1.5">
            <Sparkles size={14} className="text-amber-300" />
            <span className="text-xs font-mono font-black text-amber-200">Maestro: {prisms.prisma_maestro || 0}</span>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/70 text-red-300 border border-red-500/40'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Búsqueda + Barra rápida de especies */}
      <div ref={chainSectionRef} className="bg-[#0b1222] p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Cadena Evolutiva · Tus especies ({ownedSpeciesList.length}):
          </span>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar Pokémon o #007..."
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {ownedSpeciesList.map(sp => (
            <button
              key={sp.id}
              onClick={() => setSelectedSpeciesId(sp.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                selectedSpeciesId === sp.id
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/50 shadow-md'
                  : 'bg-[#080d1a] hover:bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              <span>{sp.name}</span>
              {sp.count >= 2 && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold">x{sp.count}</span>
              )}
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedSpeciesId === sp.id ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' : 'bg-slate-900 text-slate-500'
              }`}>
                Nv.{sp.maxLevel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CADENA EVOLUTIVA CON BARRAS DE PROGRESO Y AVISOS INTELIGENTES */}
      {loading ? (
        <div className="text-center py-14">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando cadena evolutiva...</p>
        </div>
      ) : (
        <div className="bg-[#0b1222] p-4 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-4">
            
            {evolutionChain.map((species, index) => {
              const bestCopy = species.ownedCopies?.[0] || null;
              const hasCopies = species.userCopiesCount > 0;
              const currentLevel = bestCopy?.level || 0;
              const isLevel5 = currentLevel >= 5;
              const freeCopiesCount = (species.ownedCopies || []).filter(c => !c.in_pending_trade).length;
              const missingCopies = Math.max(0, 3 - freeCopiesCount);
              const hasEnoughDuplicates = freeCopiesCount >= 3 && bestCopy && !bestCopy.in_pending_trade;
              const nextForm = evolutionChain[index + 1];
              const isFinalStage = species.evolution_stage === 3 || !species.evolves_to_id;

              const levelPct = hasCopies ? Math.min(100, (currentLevel / 5) * 100) : 0;
              const copiesPct = Math.min(100, (freeCopiesCount / 3) * 100);

              return (
                <React.Fragment key={species.id}>
                  
                  {/* Card Container */}
                  <div className={`w-full max-w-xs bg-[#0e1628] rounded-3xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between shadow-xl relative overflow-hidden ${
                    evolvedGlowCardId && bestCopy?.id === evolvedGlowCardId 
                      ? 'border-amber-400 ring-4 ring-amber-500/40 animate-shine' 
                      : hasCopies 
                        ? 'border-slate-750 hover:border-cyan-500/60 hover:shadow-cyan-500/10' 
                        : 'border-slate-850/60 opacity-45'
                  }`}>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                      <span className="text-xs font-mono text-slate-400 font-bold">
                        #{species.id.toString().padStart(3, '0')} · Etapa {species.evolution_stage || 1}
                      </span>
                      {hasCopies && (
                        <div className="flex items-center space-x-1 font-mono">
                          <span className="bg-amber-950/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center space-x-0.5">
                            <Star size={10} className="fill-amber-400 text-amber-400" />
                            <span>IV {bestCopy?.iv_percentage || 85}%</span>
                          </span>
                          <span className="bg-cyan-950/80 text-cyan-300 text-xs font-black px-2 py-0.5 rounded-full border border-cyan-500/30">
                            Nv.{currentLevel}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="h-32 sm:h-40 flex items-center justify-center p-2 relative bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <img 
                        src={hasCopies ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${species.id}.gif` : species.artwork_url} 
                        alt={species.name}
                        className={`max-h-28 sm:max-h-36 object-contain filter ${
                          hasCopies ? 'drop-shadow-[0_8px_15px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform' : 'grayscale opacity-30 kanto-silhouette'
                        }`}
                        onError={(e) => {
                          e.target.src = species.artwork_url;
                        }}
                      />
                    </div>

                    <div className="space-y-3 mt-3">
                      <div className="text-center">
                        <h3 className="text-lg font-black text-slate-100">
                          {species.name} {species.evolution_stage === 3 ? 'EX' : ''}
                        </h3>
                        <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                          {species.types?.map((t, idx) => (
                            <span key={idx} className="text-[10px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Barras de Estadísticas y Progreso */}
                      <div className="space-y-2 bg-slate-950/75 p-3 rounded-xl border border-slate-850 text-xs">
                        {/* Barra HP / ATQ compacta */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono font-bold pb-1.5 border-b border-slate-800">
                          <div className="flex items-center justify-between text-rose-300">
                            <span className="flex items-center space-x-1"><Heart size={11} className="fill-rose-500 text-rose-500" /><span>HP</span></span>
                            <span>{bestCopy ? bestCopy.max_hp : species.hp_base}</span>
                          </div>
                          <div className="flex items-center justify-between text-cyan-300">
                            <span className="flex items-center space-x-1"><Sword size={11} /><span>ATQ</span></span>
                            <span>{bestCopy ? bestCopy.atk : species.atk_base}</span>
                          </div>
                        </div>

                        {/* Barra de Nivel requerido */}
                        {hasCopies && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                              <span className="text-slate-300">Nivel ({currentLevel}/5)</span>
                              <span className={isLevel5 ? 'text-emerald-400' : 'text-cyan-400'}>
                                {isLevel5 ? '¡Nivel 5 listo!' : `Faltan ${5 - currentLevel} nv.`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${isLevel5 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                                style={{ width: `${levelPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Barra de Copias faltantes para evolucionar */}
                        {nextForm && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                              <span className="text-slate-300 flex items-center space-x-1">
                                <Copy size={10} />
                                <span>Cartas ({freeCopiesCount}/3)</span>
                              </span>
                              <span className={hasEnoughDuplicates ? 'text-emerald-400' : 'text-amber-400'}>
                                {hasEnoughDuplicates
                                  ? '¡Listas!'
                                  : `Faltan ${missingCopies} ${missingCopies === 1 ? 'carta' : 'cartas'}`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${hasEnoughDuplicates ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${copiesPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Acciones y Avisos Inteligentes */}
                      <div className="space-y-2">
                        {!hasCopies && (
                          <div className="space-y-1.5">
                            <div className="py-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold rounded-xl text-[11px] text-center">
                              Aún no tienes a {species.name}
                            </div>
                            {onGoToShop && (
                              <button
                                onClick={() => onGoToShop('sobres')}
                                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-bold rounded-xl text-[11px]"
                              >
                                Abrir sobres para conseguirlo
                              </button>
                            )}
                          </div>
                        )}

                        {/* Subir Nivel + Aviso inteligente de monedas/gemas faltantes */}
                        {hasCopies && !isLevel5 && (
                          <div className="space-y-2">
                            {missingCoinsForUpgrade === 0 ? (
                              <button
                                onClick={() => handleUpgradeLevel(bestCopy.id)}
                                disabled={actionLoading}
                                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1 uppercase tracking-wider"
                              >
                                <ArrowUpCircle size={14} />
                                <span>Subir a Nv. {currentLevel + 1} (500 P)</span>
                              </button>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/40 space-y-2 text-left">
                                <p className="text-[11px] font-bold text-amber-300 leading-snug">
                                  Te faltan {missingCoinsForUpgrade.toLocaleString()} PokéMonedas para subir a Nv. {currentLevel + 1}.
                                </p>

                                {userGems >= 100 ? (
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      onClick={handleQuickExchangeGems}
                                      disabled={actionLoading}
                                      className="w-full py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-lg text-[11px] transition-all"
                                    >
                                      ¿Cambiar 100 PokéGemas (+5,000 P)?
                                    </button>
                                    {onGoToShop && (
                                      <button
                                        onClick={() => onGoToShop('pokegemas')}
                                        className="w-full py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold rounded-lg text-[10px]"
                                      >
                                        Ir a Tienda de PokéGemas
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-rose-300 font-semibold">
                                      No tienes suficientes PokéGemas ({userGems}/100 para canje).
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {onOpenStripe && (
                                        <button
                                          onClick={onOpenStripe}
                                          className="py-1.5 px-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-lg text-[10px]"
                                        >
                                          ¿Recargar Gemas?
                                        </button>
                                      )}
                                      {onGoToShop && (
                                        <button
                                          onClick={() => onGoToShop('sobres')}
                                          className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-bold rounded-lg text-[10px]"
                                        >
                                          ¿Ir a Tienda?
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Botones de Evolución */}
                        {hasCopies && nextForm && (
                          <div className="space-y-1.5">
                            {isLevel5 && (
                              <>
                                {hasEnoughDuplicates ? (
                                  <button
                                    onClick={() => handleEvolve(bestCopy.id, 'copies')}
                                    disabled={actionLoading}
                                    className="w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center space-x-1.5 uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20"
                                  >
                                    <Sparkles size={13} />
                                    <span>Evolucionar a {nextForm.name}</span>
                                  </button>
                                ) : (
                                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-left">
                                    <p className="text-[11px] font-bold text-amber-300">
                                      Te {missingCopies === 1 ? 'falta 1 carta' : `faltan ${missingCopies} cartas`} de {species.name} (o usa un Prisma).
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {onGoToShop && (
                                        <button
                                          onClick={() => onGoToShop('sobres')}
                                          className="py-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1"
                                        >
                                          <Package size={11} />
                                          <span>Abrir Sobres</span>
                                        </button>
                                      )}
                                      {onGoToTrades && (
                                        <button
                                          onClick={onGoToTrades}
                                          className="py-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1"
                                        >
                                          <ArrowLeftRight size={11} />
                                          <span>Intercambiar</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <button
                                  onClick={() => handleEvolve(bestCopy.id, 'prisma_evolucion')}
                                  disabled={(prisms.prisma_evolucion || 0) <= 0 || actionLoading}
                                  className={`w-full py-2 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center space-x-1.5 border ${
                                    (prisms.prisma_evolucion || 0) > 0
                                      ? 'bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border-purple-400/50 shadow-md'
                                      : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                                  }`}
                                >
                                  <Gem size={13} />
                                  <span>Usar Prisma Evolutivo ({prisms.prisma_evolucion || 0})</span>
                                </button>
                              </>
                            )}

                            {(prisms.prisma_maestro || 0) > 0 && (
                              <button
                                onClick={() => handleEvolve(bestCopy.id, 'prisma_maestro')}
                                disabled={actionLoading}
                                className="w-full py-2 rounded-xl font-black text-[11px] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-amber-500 hover:brightness-110 text-white shadow-lg flex items-center justify-center space-x-1.5"
                              >
                                <Sparkles size={13} />
                                <span>Prisma Maestro (Cualquier Nv.)</span>
                              </button>
                            )}
                          </div>
                        )}

                        {hasCopies && isFinalStage && isLevel5 && (
                          <div className="py-2 bg-amber-950/40 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs text-center font-mono">
                            Fase y Nivel Máximos
                          </div>
                        )}

                        {hasCopies && species.userCopiesCount >= 2 && (
                          <button
                            onClick={() => {
                              const freeCopy = species.ownedCopies.find(c => !c.in_pending_trade) || bestCopy;
                              setTradeSpeciesCard({ userCardId: freeCopy.id, speciesId: species.id });
                            }}
                            className="w-full py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 transition-all"
                          >
                            <ArrowLeftRight size={12} />
                            <span>Intercambiar Repetida (x{species.userCopiesCount})</span>
                          </button>
                        )}
                      </div>

                    </div>

                  </div>

                  {index < evolutionChain.length - 1 && (
                    <div className="text-cyan-400 font-black text-2xl rotate-90 lg:rotate-0 flex items-center justify-center px-2">
                      <ChevronRight size={28} />
                    </div>
                  )}

                </React.Fragment>
              );
            })}

          </div>
        </div>
      )}

      {/* TODAS MIS CARTAS ABAJO CON BÚSQUEDA Y FILTROS ACCESIBLES */}
      <section className="bg-[#0b1222] rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center space-x-2">
              <Filter size={18} className="text-cyan-400 shrink-0" />
              <span>Todas mis Cartas ({filteredAlbumCards.length} de {albumCards.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulta el progreso de todas tus cartas, súbelas de nivel directo o cárgalas en la cadena evolutiva arriba.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {FILTER_TYPES.map(t => (
                <option key={t} value={t}>Tipo: {t}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="pokedex">Orden: # Pokédex</option>
              <option value="level">Orden: Mayor Nivel</option>
              <option value="copies">Orden: Más Repetidas</option>
            </select>
          </div>
        </div>

        {/* Chips de filtro rápido */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'evolucionables', label: 'Listas para Evolucionar' },
            { id: 'subir_nivel', label: 'Pueden Subir Nivel' },
            { id: 'repetidas', label: 'Repetidas' },
            { id: 'heridas', label: 'Heridas / Debilitadas' }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                statusFilter === chip.id
                  ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {filteredAlbumCards.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No tienes cartas que coincidan con esos filtros. Prueba limpiar la búsqueda o cambiar el filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredAlbumCards.map((card) => {
              const sp = speciesStatsMap.get(card.card_id);
              const totalCopies = sp?.count || 1;
              const freeCopies = sp?.freeCount || 1;
              const isSelected = selectedSpeciesId === card.card_id;
              const isLvl5 = card.level >= 5;
              const canUpgradeHere = !isLvl5 && userCoins >= UPGRADE_COST;

              return (
                <div
                  key={card.user_card_id}
                  className={`bg-[#0e1628] rounded-2xl p-3.5 border transition-all flex flex-col justify-between space-y-3 ${
                    isSelected ? 'border-cyan-500/70 ring-1 ring-cyan-500/30' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        #{card.card_id.toString().padStart(3, '0')} · IV {card.iv_percentage || 85}%
                      </span>
                      <div className="flex items-center space-x-1">
                        {totalCopies >= 2 && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            x{totalCopies}
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                          Nv.{card.level}/5
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center p-1 shrink-0">
                        <img
                          src={card.artwork_url || card.sprite_url}
                          loading="lazy"
                          alt={card.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-slate-100 truncate">{card.name}</h4>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {card.types?.map((t, i) => (
                            <span key={i} className="text-[9px] font-bold bg-slate-900 text-slate-300 px-1.5 py-0.2 rounded border border-slate-800">
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          HP {card.current_hp}/{card.max_hp} · ATQ {card.atk}
                        </div>
                      </div>
                    </div>

                    {/* Mini barras de Nivel y Copias */}
                    <div className="space-y-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-850">
                      <div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                          <span>Nivel</span>
                          <span>{card.level}/5</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full ${isLvl5 ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${(card.level / 5) * 100}%` }} />
                        </div>
                      </div>

                      {card.evolves_to_id && (
                        <div>
                          <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                            <span>Copias p/ {card.evolves_to_name || 'Evolución'}</span>
                            <span className={freeCopies >= 3 ? 'text-emerald-400' : 'text-amber-300'}>
                              {freeCopies >= 3 ? '¡Listo!' : `Faltan ${3 - freeCopies}`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full ${freeCopies >= 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (freeCopies / 3) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones accesibles */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      onClick={() => selectSpeciesAndScroll(card.card_id)}
                      className="flex-1 py-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 rounded-xl text-[11px] font-bold text-center"
                    >
                      Ver Cadena
                    </button>

                    {!isLvl5 && (
                      canUpgradeHere ? (
                        <button
                          onClick={() => {
                            setSelectedSpeciesId(card.card_id);
                            handleUpgradeLevel(card.user_card_id);
                          }}
                          disabled={actionLoading}
                          className="flex-1 py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[11px] font-black text-center"
                        >
                          Subir (500 P)
                        </button>
                      ) : (
                        <button
                          onClick={() => selectSpeciesAndScroll(card.card_id)}
                          className="flex-1 py-1.5 px-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 rounded-xl text-[10px] font-bold text-center"
                          title={`Te faltan ${missingCoinsForUpgrade} monedas`}
                        >
                          Faltan {missingCoinsForUpgrade} P
                        </button>
                      )
                    )}

                    {!card.in_pending_trade && totalCopies >= 2 && (
                      <button
                        onClick={() => setTradeSpeciesCard({ userCardId: card.user_card_id, speciesId: card.card_id })}
                        className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-xl"
                        title="Intercambiar copia repetida"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TradeProposalModal
        isOpen={Boolean(tradeSpeciesCard)}
        onClose={() => setTradeSpeciesCard(null)}
        initialOfferedUserCardId={tradeSpeciesCard?.userCardId}
        initialSpeciesId={tradeSpeciesCard?.speciesId}
        onTradeCreated={async (msg) => {
          showAlert.success('¡Propuesta Enviada!', msg);
          await fetchAlbumAndChain(selectedSpeciesId);
        }}
      />

    </div>
  );
}
