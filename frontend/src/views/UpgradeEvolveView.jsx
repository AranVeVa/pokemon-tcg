import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowLeftRight
} from 'lucide-react';
import TradeProposalModal from './TradeProposalModal';
import { trackEvent } from '../utils/analytics';

export default function UpgradeEvolveView({ initialPokemonId = 7 }) {
  const { user, refreshUser } = useAuth();
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(initialPokemonId);
  const [evolutionChain, setEvolutionChain] = useState([]);
  const [prisms, setPrisms] = useState({ prisma_evolucion: 0, prisma_maestro: 0 });
  const [albumCards, setAlbumCards] = useState([]);
  const [speciesFilter, setSpeciesFilter] = useState('');
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

  // Agrupar todas las especies poseídas con conteo de copias (sin recorte a 16!)
  const ownedSpeciesList = useMemo(() => {
    const map = new Map();
    albumCards.forEach(c => {
      if (!map.has(c.card_id)) {
        map.set(c.card_id, {
          id: c.card_id,
          name: c.name,
          count: 1,
          maxLevel: c.level,
          canEvolveNext: Boolean(c.evolves_to_id)
        });
      } else {
        const prev = map.get(c.card_id);
        prev.count += 1;
        prev.maxLevel = Math.max(prev.maxLevel, c.level);
      }
    });

    const list = Array.from(map.values());
    const q = speciesFilter.trim().toLowerCase().replace('#', '');
    if (!q) return list;
    return list.filter(s => s.name.toLowerCase().includes(q) || s.id.toString().includes(q));
  }, [albumCards, speciesFilter]);

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

  return (
    <div className="space-y-6 pb-12 select-none text-slate-100">
      
      {/* Header + Prisms Inventory */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ArrowUpCircle size={22} className="text-cyan-400 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">Laboratorio de Evolución y Mejora</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Sube cartas del <strong>Nivel 1 al 5</strong> (500 monedas c/u). Al llegar a Nivel 5 evoluciona con <strong>3 copias repetidas</strong> o usando un <strong>Prisma Evolutivo</strong> (sin gastar repetidas).
          </p>
        </div>

        {/* Inventario rápido de Prismas */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="bg-[#0b1222] border border-purple-500/40 rounded-2xl px-3 py-2 flex items-center space-x-2">
            <Gem size={15} className="text-purple-400" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block leading-none">Prisma Evolutivo</span>
              <span className="text-xs font-mono font-black text-purple-300">{prisms.prisma_evolucion || 0} disp.</span>
            </div>
          </div>
          <div className="bg-[#0b1222] border border-amber-500/40 rounded-2xl px-3 py-2 flex items-center space-x-2">
            <Sparkles size={15} className="text-amber-400" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block leading-none">Prisma Maestro</span>
              <span className="text-xs font-mono font-black text-amber-300">{prisms.prisma_maestro || 0} disp.</span>
            </div>
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

      {/* Selector completo y buscable de especies poseídas */}
      <div className="bg-[#0b1222] p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Tus especies ({ownedSpeciesList.length}):
          </span>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrar Pokémon..."
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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

      {/* Main Flow: Evolution Chain */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando cadena evolutiva...</p>
        </div>
      ) : (
        <div className="bg-[#0b1222] p-4 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-4">
            
            {evolutionChain.map((species, index) => {
              const bestCopy = species.ownedCopies?.[0] || null;
              const hasCopies = species.userCopiesCount > 0;
              const isLevel5 = bestCopy?.level >= 5;
              const freeCopiesCount = (species.ownedCopies || []).filter(c => !c.in_pending_trade).length;
              const hasEnoughDuplicates = freeCopiesCount >= 3 && bestCopy && !bestCopy.in_pending_trade;
              const nextForm = evolutionChain[index + 1];
              const isFinalStage = species.evolution_stage === 3 || !species.evolves_to_id;

              return (
                <React.Fragment key={species.id}>
                  
                  {/* Card Container */}
                  <div className={`w-full max-w-xs bg-[#0e1628] rounded-3xl p-4 sm:p-6 border-2 transition-all flex flex-col justify-between shadow-xl relative overflow-hidden ${
                    evolvedGlowCardId && bestCopy?.id === evolvedGlowCardId 
                      ? 'border-amber-400 ring-4 ring-amber-500/40 animate-shine' 
                      : hasCopies 
                        ? 'border-slate-750 hover:border-cyan-500/60 hover:shadow-cyan-500/10' 
                        : 'border-slate-850/60 opacity-45'
                  }`}>

                    {/* Level Pill & IV */}
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
                          <span className="bg-cyan-950/80 text-cyan-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                            Nv. {bestCopy ? bestCopy.level : 1}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sprite */}
                    <div className="h-36 sm:h-44 flex items-center justify-center p-2 relative bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <img 
                        src={hasCopies ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${species.id}.gif` : species.artwork_url} 
                        alt={species.name}
                        className={`max-h-32 sm:max-h-36 object-contain filter ${
                          hasCopies ? 'drop-shadow-[0_8px_15px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform' : 'grayscale opacity-30 kanto-silhouette'
                        }`}
                        onError={(e) => {
                          e.target.src = species.artwork_url;
                        }}
                      />
                    </div>

                    {/* Stats & Details */}
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

                      {/* HP & ATK Bars */}
                      <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-850 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-300">
                          <span className="flex items-center space-x-1 text-rose-400">
                            <Heart size={13} className="fill-rose-500" />
                            <span>HP</span>
                          </span>
                          <span className="font-mono">{bestCopy ? bestCopy.max_hp : species.hp_base}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="bg-rose-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((bestCopy ? bestCopy.max_hp : species.hp_base) / 330) * 100)}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between font-bold text-slate-300 pt-1">
                          <span className="flex items-center space-x-1 text-cyan-400">
                            <Sword size={13} />
                            <span>ATQ</span>
                          </span>
                          <span className="font-mono">{bestCopy ? bestCopy.atk : species.atk_base}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="bg-cyan-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((bestCopy ? bestCopy.atk : species.atk_base) / 190) * 100)}%` }}
                          ></div>
                        </div>

                        {hasCopies && bestCopy && (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px] font-mono font-bold text-slate-400">
                            <div className="flex justify-between">
                              <span>DEF:</span>
                              <span className="text-emerald-400">{bestCopy.def || 45}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SPD:</span>
                              <span className="text-indigo-400">{bestCopy.spd || 50}</span>
                            </div>
                          </div>
                        )}

                        {hasCopies && bestCopy?.moves && (
                          <div className="pt-1.5 border-t border-slate-800 text-[10px] space-y-0.5">
                            <div className="flex justify-between gap-2 text-slate-300">
                              <span className="flex items-center space-x-1 truncate">
                                <Zap size={11} className="text-amber-400 shrink-0" />
                                <span className="truncate">{bestCopy.moves[0]?.name}</span>
                              </span>
                              <span className="font-mono font-bold text-cyan-400 shrink-0">{bestCopy.moves[0]?.power} dmg</span>
                            </div>
                            <div className="flex justify-between gap-2 text-slate-300">
                              <span className="flex items-center space-x-1 truncate">
                                <Sparkles size={11} className="text-rose-400 shrink-0" />
                                <span className="truncate">{bestCopy.moves[1]?.name}</span>
                              </span>
                              <span className="font-mono font-bold text-rose-400 shrink-0">{bestCopy.moves[1]?.power} dmg</span>
                            </div>
                          </div>
                        )}

                        {nextForm && (
                          <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-slate-800 mt-1">
                            <span className="flex items-center space-x-1">
                              <Copy size={11} />
                              <span>Copias libres:</span>
                            </span>
                            <span className={`font-mono font-bold ${hasEnoughDuplicates ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {freeCopiesCount}/3
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-1 space-y-2">
                        {!hasCopies && (
                          <div className="py-2.5 bg-slate-900 border border-slate-800 text-slate-500 font-bold rounded-xl text-xs text-center uppercase tracking-wider">
                            No desbloqueada
                          </div>
                        )}

                        {/* Subir de nivel si < 5 */}
                        {hasCopies && !isLevel5 && (
                          <div>
                            <p className="text-[10px] font-mono text-center text-slate-400 font-semibold mb-1">
                              Subir nivel: 500 PokéMonedas (Máx. Nv. 5)
                            </p>
                            <button
                              onClick={() => handleUpgradeLevel(bestCopy.id)}
                              disabled={actionLoading || (user?.coins || 0) < 500}
                              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1 uppercase tracking-wider"
                            >
                              <ArrowUpCircle size={14} />
                              <span>Subir a Nv. {(bestCopy?.level || 1) + 1}</span>
                            </button>
                          </div>
                        )}

                        {/* Evolucionar cuando hay siguiente etapa */}
                        {hasCopies && nextForm && (
                          <div className="space-y-1.5">
                            {isLevel5 && (
                              <>
                                <button
                                  onClick={() => handleEvolve(bestCopy.id, 'copies')}
                                  disabled={!hasEnoughDuplicates || actionLoading}
                                  className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center space-x-1.5 uppercase tracking-wider ${
                                    hasEnoughDuplicates
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                                  }`}
                                >
                                  <Copy size={13} />
                                  <span>Evolucionar ({freeCopiesCount}/3 copias)</span>
                                </button>

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

                        {/* Botón rápido de intercambio si tiene repetidas */}
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

                  {/* Flow Arrow */}
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
