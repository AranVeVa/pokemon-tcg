import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  Sparkles, 
  ChevronRight, 
  X, 
  Heart, 
  Sword, 
  Shield, 
  Zap, 
  Flame,
  Globe,
  PlusCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

const TYPES = [
  'Todos', 'Planta', 'Fuego', 'Agua', 'Eléctrico', 'Normal', 
  'Veneno', 'Tierra', 'Bicho', 'Lucha', 'Psíquico', 'Roca', 
  'Fantasma', 'Dragón', 'Hielo', 'Hada', 'Acero', 'Siniestro', 'Volador'
];

const GENERATIONS = [
  { id: 'all', label: 'Todas las Gen', range: [1, 1025] },
  { id: 'gen1', label: 'Gen 1: Kanto', range: [1, 151] },
  { id: 'gen2', label: 'Gen 2: Johto', range: [152, 251] },
  { id: 'gen3', label: 'Gen 3: Hoenn', range: [252, 386] },
  { id: 'gen4', label: 'Gen 4: Sinnoh', range: [387, 493] },
  { id: 'gen5', label: 'Gen 5: Teselia', range: [494, 649] },
  { id: 'gen6', label: 'Gen 6: Kalos', range: [650, 721] },
  { id: 'gen7', label: 'Gen 7: Alola', range: [722, 809] },
  { id: 'gen8', label: 'Gen 8: Galar', range: [810, 905] },
  { id: 'gen9', label: 'Gen 9: Paldea', range: [906, 1025] }
];

const FEATURED_MULTIVERSE = [
  { name: 'Lucario', id: 448 },
  { name: 'Greninja', id: 658 },
  { name: 'Rayquaza', id: 384 },
  { name: 'Lugia', id: 249 },
  { name: 'Tyranitar', id: 248 },
  { name: 'Garchomp', id: 445 },
  { name: 'Mimikyu', id: 778 },
  { name: 'Sylveon', id: 700 }
];

export default function PokedexView({ onSelectPokemonForUpgrade }) {
  const { user, refreshUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedGen, setSelectedGen] = useState('gen1');
  const [inspectedCard, setInspectedCard] = useState(null);

  // Live PokéAPI Global Search State
  const [pokeApiSearching, setPokeApiSearching] = useState(false);
  const [pokeApiResult, setPokeApiResult] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);

  useEffect(() => {
    fetchPokedex();
  }, []);

  const fetchPokedex = async () => {
    setLoading(true);
    try {
      const [data, albumData] = await Promise.all([
        apiRequest('/cards/pokedex'),
        apiRequest('/cards/album')
      ]);
      setCards(data.cards || []);
      setTotalRegistered(data.totalRegistered || 0);
      setAlbumCards(albumData.cards || []);
    } catch (err) {
      console.error('Error fetching pokedex:', err);
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda en vivo de cualquier Pokémon en PokéAPI (#1 a #1025)
  const handleLivePokeApiSearch = async (queryToSearch) => {
    const q = (queryToSearch || searchTerm).trim();
    if (!q) return;

    setPokeApiSearching(true);
    try {
      const res = await apiRequest(`/cards/search-pokeapi?query=${encodeURIComponent(q)}`);
      if (res && res.card) {
        const ownedCopies = albumCards.filter(c => c.card_id === res.card.id);
        setInspectedCard({
          ...res.card,
          ownedCopies,
          source: res.source
        });
      }
    } catch (err) {
      alert(`No se encontró "${q}" en la PokéAPI: ${err.message}`);
    } finally {
      setPokeApiSearching(false);
    }
  };

  // Reclamar Pokémon descubierto de PokéAPI a la colección del usuario
  const handleClaimPokemon = async (card) => {
    setClaimLoading(true);
    try {
      const res = await apiRequest('/cards/claim-pokeapi-card', 'POST', { card });
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      alert(res.message);
      await refreshUser();
      await fetchPokedex();

      // Actualizar tarjeta inspeccionada
      setInspectedCard(prev => ({
        ...prev,
        is_registered: true,
        count_copies: (prev.count_copies || 0) + 1,
        ownedCopies: [res.userCard, ...(prev.ownedCopies || [])]
      }));
    } catch (err) {
      alert(`Error al reclamar carta: ${err.message}`);
    } finally {
      setClaimLoading(false);
    }
  };

  const currentGenObj = GENERATIONS.find(g => g.id === selectedGen) || GENERATIONS[0];

  const filteredCards = cards.filter((card) => {
    const matchesSearch = 
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.id.toString().includes(searchTerm);

    const matchesType = 
      selectedType === 'Todos' || (card.types && card.types.includes(selectedType));

    const matchesGen = 
      selectedGen === 'all' || 
      (card.id >= currentGenObj.range[0] && card.id <= currentGenObj.range[1]);

    return matchesSearch && matchesType && matchesGen;
  });

  const handleCardClick = (card) => {
    const ownedCopies = albumCards.filter(c => c.card_id === card.id);
    setInspectedCard({
      ...card,
      ownedCopies
    });
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pokédex y Multiverso PokéAPI</h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-300">
              Gen 1 - 9 (1000+ Pokémon)
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">
            <span className="text-blue-600 font-bold">{totalRegistered}</span> registrados en tu colección personal
          </p>
        </div>

        {/* Global Live PokéAPI Search Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar (ej. Lucario, #448)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLivePokeApiSearch();
              }}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 shadow-sm w-56 sm:w-64"
            />
          </div>

          <button
            onClick={() => handleLivePokeApiSearch()}
            disabled={pokeApiSearching || !searchTerm.trim()}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-all"
            title="Buscar en toda la base de datos de PokéAPI en vivo"
          >
            <Globe size={14} className={pokeApiSearching ? 'animate-spin' : ''} />
            <span>{pokeApiSearching ? 'Buscando...' : 'Buscar PokéAPI'}</span>
          </button>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  Tipo: {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Search Chips for Popular Multi-Gen Pokémon */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-3 rounded-2xl border border-blue-100 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-black text-gray-700 flex items-center space-x-1">
          <Sparkles size={14} className="text-amber-500" />
          <span>Multiverso Destacado:</span>
        </span>
        {FEATURED_MULTIVERSE.map((item) => (
          <button
            key={item.id}
            onClick={() => handleLivePokeApiSearch(item.name)}
            className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white rounded-lg text-gray-700 font-bold border border-blue-200 shadow-sm transition-all flex items-center space-x-1"
          >
            <span>{item.name}</span>
            <span className="text-[10px] opacity-60">#{item.id}</span>
          </button>
        ))}
      </div>

      {/* Generation Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {GENERATIONS.map((gen) => (
          <button
            key={gen.id}
            onClick={() => setSelectedGen(gen.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              selectedGen === gen.id
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {gen.label}
          </button>
        ))}
      </div>

      {/* Pokédex Grid with 3D Holographic Foil Cards */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500 font-bold">Cargando catálogo de cartas...</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 shadow-sm space-y-3">
          <Globe size={40} className="mx-auto text-blue-500 animate-pulse" />
          <h3 className="text-base font-black text-gray-900">
            ¿Buscando a "{searchTerm}" de otra generación?
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            PokéAPI cuenta con más de 1025 Pokémon de todas las regiones. Haz clic abajo para buscarlo en vivo e incorporarlo a tu mazo de cartas.
          </p>
          <button
            onClick={() => handleLivePokeApiSearch()}
            disabled={pokeApiSearching}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all inline-flex items-center space-x-2"
          >
            <Sparkles size={16} />
            <span>Consultar "{searchTerm}" en la PokéAPI Global</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCards.map((card) => {
            const isOwned = card.is_registered;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`holo-card rounded-2xl p-3 border text-center transition-all relative flex flex-col justify-between cursor-pointer ${
                  isOwned
                    ? 'bg-white border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-400 group'
                    : 'bg-gray-100/70 border-gray-200 opacity-60 hover:opacity-80'
                }`}
              >
                {/* Badge: Number of copies */}
                {isOwned && card.count_copies > 0 && (
                  <div className="absolute top-2 right-2 bg-gray-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-10">
                    x{card.count_copies}
                  </div>
                )}

                {/* Pokemon Artwork or Silhouette */}
                <div className="h-28 flex items-center justify-center p-2 relative">
                  <img
                    src={card.artwork_url}
                    alt={isOwned ? card.name : '???'}
                    className={`max-h-full max-w-full object-contain filter drop-shadow transition-transform ${
                      isOwned 
                        ? 'group-hover:scale-110' 
                        : 'brightness-0 contrast-200 opacity-20'
                    }`}
                  />
                </div>

                {/* Info Text */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] font-mono text-gray-400 font-bold block">
                    #{card.id.toString().padStart(3, '0')}
                  </span>
                  <h4 className="text-xs font-black text-gray-900 truncate">
                    {isOwned ? card.name : '???'}
                  </h4>

                  {isOwned ? (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {card.types?.map((t, tidx) => (
                        <span key={tidx} className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] font-semibold text-gray-400 block mt-1">
                      No registrado
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DETALLE DE CARTA CON SPRITE ANIMADO, STATS Y 4 ATAQUES */}
      {/* ======================================================== */}
      {inspectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-gray-200 shadow-2xl space-y-4 relative max-h-[94vh] overflow-y-auto">
            <button
              onClick={() => setInspectedCard(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-bold text-gray-400">
                #{inspectedCard.id.toString().padStart(3, '0')} · {inspectedCard.rarity?.toUpperCase() || 'COMÚN'}
              </span>
              <h3 className="text-2xl font-black text-gray-900">
                {inspectedCard.name}
              </h3>
              
              <div className="flex justify-center gap-1.5">
                {inspectedCard.types?.map((t, idx) => (
                  <span key={idx} className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Sprite Animado de PokéAPI Showdown */}
            <div className="h-44 bg-gradient-to-b from-slate-900 to-gray-950 rounded-2xl flex items-center justify-center relative p-3 border border-slate-800 shadow-inner">
              <img
                src={
                  inspectedCard.animated_front_url ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${inspectedCard.id}.gif`
                }
                alt={inspectedCard.name}
                className="max-h-36 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                onError={(e) => {
                  e.target.src = inspectedCard.artwork_url;
                }}
              />
            </div>

            {/* Base Stats Preview */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                <span className="block text-[10px] text-gray-400 font-bold">HP BASE</span>
                <span className="font-black text-gray-900">{inspectedCard.hp_base || 60}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                <span className="block text-[10px] text-gray-400 font-bold">ATQ</span>
                <span className="font-black text-gray-900">{inspectedCard.atk_base || 60}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                <span className="block text-[10px] text-gray-400 font-bold">DEF</span>
                <span className="font-black text-gray-900">{inspectedCard.def || 50}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                <span className="block text-[10px] text-gray-400 font-bold">SPD</span>
                <span className="font-black text-gray-900">{inspectedCard.spd || 50}</span>
              </div>
            </div>

            {/* Si está registrado, mostrar copias y sus ataques variados */}
            {inspectedCard.is_registered ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>Copias en tu colección ({inspectedCard.ownedCopies?.length || 1}):</span>
                  <span className="text-blue-600 font-black">Nivel Máximo: {inspectedCard.max_level || 5}</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {inspectedCard.ownedCopies?.map((copy, cidx) => {
                    const fastMove = copy.moves?.[0] || { name: 'Ataque Rápido', power: 14 };
                    const chargedMove = copy.moves?.[1] || { name: 'Golpe Cargado', power: 75 };

                    return (
                      <div key={copy.user_card_id || cidx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-gray-900">Copia #{cidx + 1} · Nivel {copy.level}</span>
                          <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-black text-[10px]">
                            IV {copy.iv_percentage || 85}% ⭐⭐⭐
                          </span>
                        </div>

                        {/* Distinct Moveset */}
                        <div className="flex items-center justify-between text-[10px] bg-white px-2.5 py-1 rounded-lg border">
                          <span className="text-gray-700">⚡ {fastMove.name} ({fastMove.power} dmg)</span>
                          <span className="text-amber-700 font-bold">💥 {chargedMove.name} ({chargedMove.power} dmg)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setInspectedCard(null);
                    if (onSelectPokemonForUpgrade) onSelectPokemonForUpgrade(inspectedCard.id);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition-all"
                >
                  Ir a Mejorar o Evolucionar este Pokémon
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center justify-center space-x-1 font-bold text-amber-800">
                    <Sparkles size={14} />
                    <span>¡Pokémon Descubierto del Multiverso PokéAPI!</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Puedes reclamar esta carta ahora mismo para añadirla a tu álbum, equiparla en tu equipo de 3 y luchar con ella en el Estadio.
                  </p>
                </div>

                <button
                  onClick={() => handleClaimPokemon(inspectedCard)}
                  disabled={claimLoading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center space-x-2"
                >
                  <PlusCircle size={16} />
                  <span>{claimLoading ? 'Incorporando a tu mazo...' : '⭐ Reclamar e Incorporar a mi Colección'}</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
