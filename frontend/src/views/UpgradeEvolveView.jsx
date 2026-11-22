import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  ChevronRight, 
  ArrowUpCircle, 
  Sparkles, 
  Heart, 
  Sword, 
  Shield,
  Zap,
  CheckCircle2, 
  AlertCircle,
  Copy,
  Star,
  Layers
} from 'lucide-react';

export default function UpgradeEvolveView({ initialPokemonId = 7 }) {
  const { user, refreshUser } = useAuth();
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(initialPokemonId);
  const [evolutionChain, setEvolutionChain] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [evolvedGlowCardId, setEvolvedGlowCardId] = useState(null);

  useEffect(() => {
    fetchAlbumAndChain(selectedSpeciesId);
  }, [selectedSpeciesId]);

  const fetchAlbumAndChain = async (speciesId) => {
    setLoading(true);
    try {
      // 1. Obtener álbum del usuario
      const albumRes = await apiRequest('/cards/album');
      setAlbumCards(albumRes.cards || []);

      // 2. Obtener cadena de evolución de la especie seleccionada
      const chainRes = await apiRequest(`/cards/evolution-chain/${speciesId}`);
      setEvolutionChain(chainRes.chain || []);
    } catch (err) {
      console.error('Error fetching evolution chain:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subir nivel (Nv. 1 a Nv. 5) con 500 PokéMonedas
  const handleUpgradeLevel = async (userCardId, cardName) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/cards/upgrade', 'POST', { userCardId });
      setMessage({ text: res.message, type: 'success' });
      await refreshUser();
      await fetchAlbumAndChain(selectedSpeciesId);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Evolucionar carta (Nv. 5 + 3 copias repetidas)
  const handleEvolve = async (userCardId, targetName) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/cards/evolve', 'POST', { userCardId });
      setMessage({ text: res.message, type: 'success' });
      setEvolvedGlowCardId(userCardId);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

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
    <div className="space-y-8 pb-12 select-none text-slate-100">
      
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <ArrowUpCircle size={24} className="text-cyan-400" />
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Laboratorio de Evolución y Mejora</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Invierte PokéMonedas para subir cartas del nivel 1 al 5. Al alcanzar el nivel 5 con copias repetidas, ¡evoluciona a la siguiente fase de combate!
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/70 text-red-300 border border-red-500/40'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Selector rápido de especies poseídas */}
      <div className="bg-[#0b1222] p-4 rounded-2xl border border-slate-800 shadow-md space-y-2">
        <span className="text-xs font-mono font-bold text-slate-400 block uppercase tracking-wider">
          Selecciona una especie de tu álbum:
        </span>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(albumCards.map(c => c.card_id))).slice(0, 16).map(id => {
            const card = albumCards.find(c => c.card_id === id);
            return (
              <button
                key={id}
                onClick={() => setSelectedSpeciesId(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                  selectedSpeciesId === id
                    ? 'bg-slate-800 text-cyan-400 border-cyan-500/50 shadow-md'
                    : 'bg-[#080d1a] hover:bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                <span>{card?.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${selectedSpeciesId === id ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' : 'bg-slate-900 text-slate-500'}`}>
                  #{id.toString().padStart(3, '0')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Flow: Evolution Chain */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando cadena evolutiva...</p>
        </div>
      ) : (
        <div className="bg-[#0b1222] p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-4">
            
            {evolutionChain.map((species, index) => {
              const bestCopy = species.ownedCopies?.[0] || null;
              const hasCopies = species.userCopiesCount > 0;
              const isLevel5 = bestCopy?.level >= 5;
              const hasEnoughDuplicates = species.userCopiesCount >= 3;
              const nextForm = evolutionChain[index + 1];

              return (
                <React.Fragment key={species.id}>
                  
                  {/* Card Container */}
                  <div className={`w-full max-w-xs bg-[#0e1628] rounded-3xl p-6 border-2 transition-all flex flex-col justify-between shadow-xl relative overflow-hidden ${
                    evolvedGlowCardId && bestCopy?.id === evolvedGlowCardId 
                      ? 'border-amber-400 ring-4 ring-amber-500/40 animate-shine' 
                      : hasCopies 
                        ? 'border-slate-750 hover:border-cyan-500/60 hover:shadow-cyan-500/10' 
                        : 'border-slate-850/60 opacity-40'
                  }`}>

                    {/* Level Pill & IV */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-400 font-bold">
                        #{species.id.toString().padStart(3, '0')}
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

                    {/* Animated Showdown Sprite from PokéAPI */}
                    <div className="h-44 flex items-center justify-center p-2 relative bg-slate-950/60 border border-slate-900 rounded-2xl">
                      <img 
                        src={hasCopies ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${species.id}.gif` : species.artwork_url} 
                        alt={species.name}
                        className={`max-h-36 object-contain filter ${
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
                          {species.name} {species.stage === 3 ? 'EX' : ''}
                        </h3>
                        <div className="flex items-center justify-center gap-1 mt-1">
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

                        {/* Additional Stats: DEF & SPD */}
                        {hasCopies && bestCopy && (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px] font-mono font-bold text-slate-400">
                            <div className="flex justify-between">
                              <span className="text-slate-400">DEF:</span>
                              <span className="text-emerald-400">{bestCopy.def || 45}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">SPD:</span>
                              <span className="text-indigo-400">{bestCopy.spd || 50}</span>
                            </div>
                          </div>
                        )}

                        {/* Distinct Moveset */}
                        {hasCopies && bestCopy?.moves && (
                          <div className="pt-1.5 border-t border-slate-800 text-[10px] space-y-0.5">
                            <div className="flex justify-between text-slate-300">
                              <span className="flex items-center space-x-1">
                                <Zap size={11} className="text-amber-400" />
                                <span>{bestCopy.moves[0]?.name}</span>
                              </span>
                              <span className="font-mono font-bold text-cyan-400">{bestCopy.moves[0]?.power} dmg</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span className="flex items-center space-x-1">
                                <Sparkles size={11} className="text-rose-400" />
                                <span>{bestCopy.moves[1]?.name}</span>
                              </span>
                              <span className="font-mono font-bold text-rose-400">{bestCopy.moves[1]?.power} dmg</span>
                            </div>
                          </div>
                        )}

                        {/* Copias repetidas */}
                        {nextForm && (
                          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-slate-800 mt-1">
                            <span className="flex items-center space-x-1">
                              <Copy size={11} />
                              <span>Repetidas:</span>
                            </span>
                            <span className={`font-mono font-bold ${hasEnoughDuplicates ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {species.userCopiesCount}/3
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {!hasCopies && (
                          <div className="py-2.5 bg-slate-900 border border-slate-800 text-slate-500 font-bold rounded-xl text-xs text-center uppercase tracking-wider">
                            No desbloqueada
                          </div>
                        )}

                        {hasCopies && nextForm && isLevel5 && (
                          <button
                            onClick={() => handleEvolve(bestCopy.id, nextForm.name)}
                            disabled={!hasEnoughDuplicates || actionLoading}
                            className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center space-x-1.5 uppercase tracking-wider ${
                              hasEnoughDuplicates
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 animate-pulse'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                            }`}
                          >
                            <Sparkles size={14} />
                            <span>Evolucionar a {nextForm.name}</span>
                          </button>
                        )}

                        {hasCopies && !isLevel5 && (
                          <div>
                            <p className="text-[10px] font-mono text-center text-slate-400 font-semibold mb-1">
                              Costo: 500 PokéMonedas
                            </p>
                            <button
                              onClick={() => handleUpgradeLevel(bestCopy.id, species.name)}
                              disabled={actionLoading || (user?.coins || 0) < 500}
                              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1 uppercase tracking-wider"
                            >
                              <ArrowUpCircle size={14} />
                              <span>Subir a Nv. {(bestCopy?.level || 1) + 1}</span>
                            </button>
                          </div>
                        )}

                        {hasCopies && !nextForm && (
                          <div className="py-2.5 bg-amber-950/40 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs text-center font-mono">
                            Fase Máxima Alcanzada
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Flow Arrow */}
                  {index < evolutionChain.length - 1 && (
                    <div className="text-cyan-400 font-black text-2xl rotate-90 lg:rotate-0 flex items-center justify-center px-2">
                      <ChevronRight size={32} />
                    </div>
                  )}

                </React.Fragment>
              );
            })}

          </div>
        </div>
      )}

    </div>
  );
}
