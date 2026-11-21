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
  CheckCircle2, 
  AlertCircle,
  Copy
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
      setAlbumCards(albumRes.cards);

      // 2. Obtener cadena de evolución de la especie seleccionada
      const chainRes = await apiRequest(`/cards/evolution-chain/${speciesId}`);
      setEvolutionChain(chainRes.chain);
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
    <div className="space-y-8 pb-12">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mejorar y Evolucionar</h1>
        <p className="text-xs text-gray-500">
          Gasta PokéMonedas para subir cartas del nivel 1 al 5. Al llegar al nivel 5 con copias repetidas, ¡evoluciona a tu Pokémon!
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Selector rápido de especies poseídas */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
        <span className="text-xs font-bold text-gray-600 block">Selecciona una especie de tu álbum:</span>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(albumCards.map(c => c.card_id))).slice(0, 15).map(id => {
            const card = albumCards.find(c => c.card_id === id);
            return (
              <button
                key={id}
                onClick={() => setSelectedSpeciesId(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                  selectedSpeciesId === id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <span>{card?.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSpeciesId === id ? 'bg-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                  #{id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Flow: Mockup 6 (Squirtle > Wartortle > Blastoise EX) */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500">Cargando cadena de evolución...</p>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-6 sm:p-10 rounded-3xl border border-blue-100 shadow-sm">
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
                  <div className={`w-full max-w-xs bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between shadow-md relative overflow-hidden ${
                    evolvedGlowCardId && bestCopy?.id === evolvedGlowCardId 
                      ? 'border-amber-400 ring-4 ring-amber-200 animate-shine' 
                      : hasCopies 
                        ? 'border-blue-200 hover:border-blue-400 hover:shadow-lg' 
                        : 'border-gray-200 opacity-60'
                  }`}>

                    {/* Level Pill & IV */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-400 font-bold">
                        #{species.id.toString().padStart(3, '0')}
                      </span>
                      {hasCopies && (
                        <div className="flex items-center space-x-1">
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                            IV {bestCopy?.iv_percentage || 85}% ⭐
                          </span>
                          <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                            Nv. {bestCopy ? bestCopy.level : 1}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Animated Showdown Sprite from PokéAPI */}
                    <div className="h-44 flex items-center justify-center p-2 relative bg-gradient-to-b from-blue-50/50 to-transparent rounded-2xl">
                      <img 
                        src={hasCopies ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${species.id}.gif` : species.artwork_url} 
                        alt={species.name}
                        className={`max-h-36 object-contain filter drop-shadow-md ${
                          hasCopies ? 'hover:scale-110 transition-transform' : 'grayscale opacity-40'
                        }`}
                        onError={(e) => {
                          e.target.src = species.artwork_url;
                        }}
                      />
                    </div>

                    {/* Stats & Details */}
                    <div className="space-y-3 mt-3">
                      <div className="text-center">
                        <h3 className="text-lg font-black text-gray-900">
                          {species.name} {species.stage === 3 ? 'EX' : ''}
                        </h3>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {species.types?.map((t, idx) => (
                            <span key={idx} className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* HP & ATK Bars (Mockup 6) */}
                      <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                        <div className="flex items-center justify-between font-bold text-gray-700">
                          <span className="flex items-center space-x-1 text-red-600">
                            <Heart size={13} className="fill-red-500" />
                            <span>HP</span>
                          </span>
                          <span>{bestCopy ? bestCopy.max_hp : species.hp_base}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((bestCopy ? bestCopy.max_hp : species.hp_base) / 330) * 100)}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between font-bold text-gray-700 pt-1">
                          <span className="flex items-center space-x-1 text-blue-600">
                            <Sword size={13} />
                            <span>ATQ</span>
                          </span>
                          <span>{bestCopy ? bestCopy.atk : species.atk_base}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((bestCopy ? bestCopy.atk : species.atk_base) / 190) * 100)}%` }}
                          ></div>
                        </div>

                        {/* Additional Stats: DEF & SPD */}
                        {hasCopies && bestCopy && (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60 text-[10px] font-bold text-gray-600">
                            <div className="flex justify-between">
                              <span>DEF:</span>
                              <span className="text-emerald-700">{bestCopy.def || 45}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SPD:</span>
                              <span className="text-purple-700">{bestCopy.spd || 50}</span>
                            </div>
                          </div>
                        )}

                        {/* Distinct Moveset */}
                        {hasCopies && bestCopy?.moves && (
                          <div className="pt-1.5 border-t border-gray-200/60 text-[10px] space-y-0.5">
                            <div className="flex justify-between text-gray-600">
                              <span>⚡ {bestCopy.moves[0]?.name}</span>
                              <span className="font-bold">{bestCopy.moves[0]?.power} dmg</span>
                            </div>
                            <div className="flex justify-between text-amber-700">
                              <span>💥 {bestCopy.moves[1]?.name}</span>
                              <span className="font-bold">{bestCopy.moves[1]?.power} dmg</span>
                            </div>
                          </div>
                        )}

                        {/* Copias repetidas (Mockup 6) */}
                        {nextForm && (
                          <div className="pt-1 flex items-center justify-between text-[11px] text-gray-500 font-semibold border-t border-gray-200/60 mt-1">
                            <span>Repetidas</span>
                            <span className={hasEnoughDuplicates ? 'text-green-600 font-bold' : 'text-amber-600'}>
                              {species.userCopiesCount}/3
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {/* Si no la posee */}
                        {!hasCopies && (
                          <div className="py-2.5 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs text-center">
                            No la tienes aún
                          </div>
                        )}

                        {/* Si la posee y es Nivel 5 con evolución disponible */}
                        {hasCopies && nextForm && isLevel5 && (
                          <button
                            onClick={() => handleEvolve(bestCopy.id, nextForm.name)}
                            disabled={!hasEnoughDuplicates || actionLoading}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 ${
                              hasEnoughDuplicates
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 animate-pulse'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles size={14} />
                            <span>Evolucionar a {nextForm.name}</span>
                          </button>
                        )}

                        {/* Si la posee y está por debajo de nivel 5 */}
                        {hasCopies && !isLevel5 && (
                          <div>
                            <p className="text-[10px] text-center text-gray-400 font-semibold mb-1">
                              Costo: 500 monedas
                            </p>
                            <button
                              onClick={() => handleUpgradeLevel(bestCopy.id, species.name)}
                              disabled={actionLoading || (user?.coins || 0) < 500}
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1"
                            >
                              <ArrowUpCircle size={14} />
                              <span>Subir de nivel</span>
                            </button>
                          </div>
                        )}

                        {/* Si ya es la evolución final y nivel 5 */}
                        {hasCopies && !nextForm && (
                          <div className="py-2.5 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded-xl text-xs text-center">
                            Carta máxima en tu álbum
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Flow Arrow (Mockup 6: Squirtle > Wartortle > Blastoise EX) */}
                  {index < evolutionChain.length - 1 && (
                    <div className="text-blue-500 font-black text-2xl rotate-90 lg:rotate-0 flex items-center justify-center px-2">
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
