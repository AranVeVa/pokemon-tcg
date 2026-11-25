import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { showAlert } from '../utils/gameAlert';
import { 
  Search, 
  X, 
  AlertTriangle,
  BookOpen,
  Loader2,
  ArrowLeftRight,
  Copy
} from 'lucide-react';
import TradeProposalModal from './TradeProposalModal';

const TYPES = [
  'Todos', 'Planta', 'Fuego', 'Agua', 'Eléctrico', 'Normal', 
  'Veneno', 'Tierra', 'Bicho', 'Lucha', 'Psíquico', 'Roca', 
  'Fantasma', 'Dragón', 'Hielo', 'Hada', 'Acero', 'Siniestro', 'Volador'
];

const GENERATIONS = [
  { id: 'gen1', label: 'Gen 1: Kanto', range: [1, 151], count: 151 },
  { id: 'gen2', label: 'Gen 2: Johto', range: [152, 251], count: 100 },
  { id: 'gen3', label: 'Gen 3: Hoenn', range: [252, 386], count: 135 },
  { id: 'gen4', label: 'Gen 4: Sinnoh', range: [387, 493], count: 107 },
  { id: 'gen5', label: 'Gen 5: Teselia', range: [494, 649], count: 156 },
  { id: 'gen6', label: 'Gen 6: Kalos', range: [650, 721], count: 72 },
  { id: 'gen7', label: 'Gen 7: Alola', range: [722, 809], count: 88 },
  { id: 'gen8', label: 'Gen 8: Galar', range: [810, 905], count: 96 },
  { id: 'gen9', label: 'Gen 9: Paldea', range: [906, 1025], count: 120 },
  { id: 'all', label: 'Todas las Gen', range: [1, 1025], count: 1025 }
];

const PAGE_SIZE = 60;

export default function PokedexView({ onSelectPokemonForUpgrade }) {
  const [cards, setCards] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedGen, setSelectedGen] = useState('gen1');
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [inspectedCard, setInspectedCard] = useState(null);

  // PokéAPI live search & PokéAPI type filter cache
  const [liveApiCard, setLiveApiCard] = useState(null);
  const [liveApiSearching, setLiveApiSearching] = useState(false);
  const [typeIdSet, setTypeIdSet] = useState(null); // Set of IDs 1..1025 for selectedType
  const [typeLoading, setTypeLoading] = useState(false);

  // Intercambio directo desde una carta
  const [tradeModalCard, setTradeModalCard] = useState(null);

  useEffect(() => {
    fetchPokedex();
  }, []);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [selectedGen, selectedType, debouncedSearchTerm]);

  // Consultar especies reales de toda la PokéAPI (1-1025) cuando el usuario filtra por un tipo elemental
  useEffect(() => {
    if (selectedType === 'Todos') {
      setTypeIdSet(null);
      setTypeLoading(false);
      return;
    }

    let cancelled = false;
    const fetchTypeIds = async () => {
      setTypeLoading(true);
      try {
        const res = await apiRequest(`/cards/pokeapi-type/${encodeURIComponent(selectedType)}`);
        if (!cancelled && Array.isArray(res?.ids)) {
          setTypeIdSet(new Set(res.ids));
        }
      } catch (err) {
        if (!cancelled) setTypeIdSet(null);
      } finally {
        if (!cancelled) setTypeLoading(false);
      }
    };

    fetchTypeIds();
    return () => { cancelled = true; };
  }, [selectedType]);

  // Búsqueda en vivo automática en PokéAPI (#1 a #1025)
  useEffect(() => {
    const q = debouncedSearchTerm.trim().toLowerCase().replace('#', '');
    if (!q || q.length < 2) {
      setLiveApiCard(null);
      setLiveApiSearching(false);
      return;
    }

    let isCancelled = false;
    const searchLive = async () => {
      setLiveApiSearching(true);
      try {
        const res = await apiRequest(`/cards/search-pokeapi?query=${encodeURIComponent(q)}`);
        if (!isCancelled && res && res.card) {
          const ownedCopies = albumCards.filter(c => c.card_id === res.card.id);
          setLiveApiCard({
            ...res.card,
            is_registered: ownedCopies.length > 0 || res.card.is_registered,
            count_copies: ownedCopies.length,
            ownedCopies,
            source: res.source
          });
        }
      } catch (e) {
        if (!isCancelled) setLiveApiCard(null);
      } finally {
        if (!isCancelled) setLiveApiSearching(false);
      }
    };

    searchLive();
    return () => { isCancelled = true; };
  }, [debouncedSearchTerm, albumCards]);

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

  const currentGenObj = GENERATIONS.find(g => g.id === selectedGen) || GENERATIONS[0];

  const cardByIdMap = useMemo(() => {
    const m = new Map();
    cards.forEach(c => m.set(c.id, c));
    return m;
  }, [cards]);

  const copiesByCardIdMap = useMemo(() => {
    const m = new Map();
    albumCards.forEach(c => {
      if (!m.has(c.card_id)) m.set(c.card_id, []);
      m.get(c.card_id).push(c);
    });
    return m;
  }, [albumCards]);

  const rawRoster = useMemo(() => {
    const [startId, endId] = currentGenObj.range;
    const roster = [];

    for (let id = startId; id <= endId; id++) {
      const existingInDb = cardByIdMap.get(id);
      const ownedCopies = copiesByCardIdMap.get(id) || [];
      const isOwned = ownedCopies.length > 0 || (existingInDb && existingInDb.is_registered);

      if (existingInDb) {
        roster.push({
          ...existingInDb,
          is_registered: isOwned,
          count_copies: ownedCopies.length,
          ownedCopies
        });
      } else {
        roster.push({
          id,
          name: `Pokémon #${id}`,
          types: ['Desconocido'],
          artwork_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
          sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
          animated_front_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
          is_registered: isOwned,
          count_copies: ownedCopies.length,
          ownedCopies,
          isPlaceholderRoster: true
        });
      }
    }

    return roster;
  }, [currentGenObj, cardByIdMap, copiesByCardIdMap]);

  const filteredCards = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase().replace('#', '').trim();

    const matchesSelectedType = (card) => {
      if (selectedType === 'Todos') return true;
      if (card.types && card.types.includes(selectedType)) return true;
      if (typeIdSet && typeIdSet.has(card.id)) return true;
      return false;
    };

    if (!q) {
      return rawRoster.filter(matchesSelectedType);
    }

    const matched = [];
    const seenIds = new Set();

    cards.forEach(card => {
      const matchesSearch =
        card.name.toLowerCase().includes(q) ||
        card.id.toString() === q ||
        card.id.toString().includes(q);

      if (matchesSearch && matchesSelectedType(card)) {
        const ownedCopies = copiesByCardIdMap.get(card.id) || [];
        const isOwned = ownedCopies.length > 0 || card.is_registered;
        matched.push({
          ...card,
          is_registered: isOwned,
          count_copies: ownedCopies.length,
          ownedCopies
        });
        seenIds.add(card.id);
      }
    });

    albumCards.forEach(ac => {
      if (!seenIds.has(ac.card_id)) {
        const matchesSearch =
          (ac.name && ac.name.toLowerCase().includes(q)) ||
          ac.card_id.toString() === q ||
          ac.card_id.toString().includes(q);

        if (matchesSearch && matchesSelectedType({ id: ac.card_id, types: ac.types })) {
          const ownedCopies = copiesByCardIdMap.get(ac.card_id) || [];
          matched.push({
            id: ac.card_id,
            name: ac.name,
            types: ac.types,
            hp_base: ac.hp_base || 60,
            atk_base: ac.atk_base || 60,
            artwork_url: ac.artwork_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${ac.card_id}.png`,
            sprite_url: ac.sprite_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${ac.card_id}.png`,
            animated_front_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${ac.card_id}.gif`,
            is_registered: true,
            count_copies: ownedCopies.length,
            ownedCopies
          });
          seenIds.add(ac.card_id);
        }
      }
    });

    if (liveApiCard && !seenIds.has(liveApiCard.id) && matchesSelectedType(liveApiCard)) {
      matched.push(liveApiCard);
    }

    return matched;
  }, [debouncedSearchTerm, rawRoster, cards, albumCards, copiesByCardIdMap, selectedType, typeIdSet, liveApiCard]);

  const visibleCards = useMemo(() => filteredCards.slice(0, visibleLimit), [filteredCards, visibleLimit]);

  const handleCardClick = (card) => {
    const ownedCopies = copiesByCardIdMap.get(card.id) || [];
    const isOwned = ownedCopies.length > 0 || card.is_registered;
    setInspectedCard({
      ...card,
      is_registered: isOwned,
      count_copies: ownedCopies.length,
      ownedCopies
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center space-x-2">
              <BookOpen size={22} className="text-cyan-400 shrink-0" />
              <span>Pokédex</span>
            </h1>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              {debouncedSearchTerm.trim()
                ? `Búsqueda Global (${filteredCards.length} ${filteredCards.length === 1 ? 'Especie' : 'Especies'})`
                : `${currentGenObj.label} (${filteredCards.length.toLocaleString()} Especies)`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <span className="text-cyan-400 font-bold">{totalRegistered}</span> especies registradas en tu álbum · <span className="text-emerald-400 font-semibold">Repetidas (x2+)</span> listas para evolucionar o intercambiar.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o #025..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-2 bg-[#0b1222] border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm w-full sm:w-64"
            />
            {(liveApiSearching || typeLoading) && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" />
            )}
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="py-2 px-3 bg-[#0b1222] border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 shadow-sm cursor-pointer w-full sm:w-auto"
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="bg-slate-900 text-slate-200">
                Tipo: {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Generation Selector Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {GENERATIONS.map((gen) => (
          <button
            key={gen.id}
            onClick={() => setSelectedGen(gen.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedGen === gen.id
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50 shadow-md'
                : 'bg-[#0b1222] hover:bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {gen.label}
          </button>
        ))}
      </div>

      {/* Pokédex Grid */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-cyan-500/20"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando catálogo de cartas...</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-[#0b1222] border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-3 shadow-xl">
          <Search size={36} className="mx-auto text-slate-500" />
          <h3 className="text-base font-black text-slate-100">
            No se encontraron resultados
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {selectedGen === 'gen1' && selectedType !== 'Todos'
              ? `En Gen 1 (Kanto) hay pocas especies de tipo ${selectedType}. Cambia a "Todas las Gen" para ver las de las 9 regiones.`
              : 'No hay Pokémon que coincidan con tu búsqueda o filtro seleccionado. Prueba otro nombre, número (#025) o cambia de tipo.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {visibleCards.map((card) => {
              const isOwned = card.is_registered;
              const isDuplicate = isOwned && card.count_copies > 1;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`rounded-2xl p-2.5 sm:p-3 border text-center transition-all relative flex flex-col justify-between cursor-pointer group ${
                    isOwned
                      ? 'bg-[#0b1222] border-slate-800 hover:border-cyan-500/60 shadow-sm hover:shadow-xl'
                      : 'bg-[#080d19]/80 border-slate-850/80 hover:border-slate-700'
                  }`}
                >
                  {/* Badge: Copias / Repetida */}
                  {isOwned && card.count_copies > 0 && (
                    <div
                      className={`absolute top-2 right-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow z-10 border ${
                        isDuplicate
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      x{card.count_copies}
                    </div>
                  )}

                  {/* Artwork */}
                  <div className="h-24 sm:h-28 flex items-center justify-center p-2 relative rounded-xl bg-slate-950/60 border border-slate-900 overflow-hidden">
                    <img
                      src={card.artwork_url}
                      loading="lazy"
                      alt={isOwned ? card.name : `Pokémon #${card.id}`}
                      className={`max-h-full max-w-full object-contain filter transition-all duration-200 ${
                        isOwned 
                          ? 'drop-shadow-[0_8px_12px_rgba(0,0,0,0.7)] group-hover:scale-110' 
                          : 'kanto-silhouette'
                      }`}
                      onError={(e) => {
                        e.target.src = card.sprite_url || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 font-bold block">
                      #{card.id.toString().padStart(3, '0')}
                    </span>
                    
                    <h4 className="text-xs font-bold text-slate-100 truncate mt-0.5">
                      {isOwned ? card.name : `??? (#${card.id})`}
                    </h4>

                    {isOwned ? (
                      <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                        {card.types?.map((t, tidx) => (
                          <span key={tidx} className="text-[9px] font-bold text-slate-300 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] font-semibold text-slate-500 block mt-1 font-mono">
                        No registrado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCards.length > visibleLimit && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setVisibleLimit(prev => prev + PAGE_SIZE)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs transition-all"
              >
                Mostrar {Math.min(PAGE_SIZE, filteredCards.length - visibleLimit)} más ({visibleLimit}/{filteredCards.length})
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL DETALLE DE CARTA */}
      {inspectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b1222] rounded-3xl p-4 sm:p-7 max-w-lg w-full border border-slate-750 shadow-2xl space-y-4 relative max-h-[92dvh] overflow-y-auto text-slate-100 my-auto">
            <button
              onClick={() => setInspectedCard(null)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-100 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1 pr-6 pl-6">
              <span className="text-xs font-mono font-bold text-slate-400">
                #{inspectedCard.id.toString().padStart(3, '0')} · {inspectedCard.is_registered ? (inspectedCard.rarity?.toUpperCase() || 'COMÚN') : 'NO REGISTRADO'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-100">
                {inspectedCard.is_registered ? inspectedCard.name : `??? (#${inspectedCard.id})`}
              </h3>
              
              <div className="flex flex-wrap justify-center gap-1.5">
                {inspectedCard.is_registered ? (
                  <>
                    {inspectedCard.types?.map((t, idx) => (
                      <span key={idx} className="text-xs font-bold bg-slate-900 text-cyan-400 px-2.5 py-0.5 rounded-full border border-slate-750">
                        {t}
                      </span>
                    ))}
                    {inspectedCard.ownedCopies?.length >= 2 ? (
                      <span className="text-[11px] font-bold bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 inline-flex items-center space-x-1">
                        <Copy size={11} />
                        <span>Repetida x{inspectedCard.ownedCopies.length} · Intercambiable</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700">
                        Copia única (1/1)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-mono font-bold bg-slate-900 text-slate-500 px-3 py-0.5 rounded-full border border-slate-800">
                    Tipo Desconocido
                  </span>
                )}
              </div>
            </div>

            <div className="h-40 sm:h-44 bg-gradient-to-b from-slate-900 to-gray-950 rounded-2xl flex items-center justify-center relative p-3 border border-slate-800 shadow-inner">
              <img
                src={
                  inspectedCard.is_registered
                    ? (inspectedCard.animated_front_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${inspectedCard.id}.gif`)
                    : inspectedCard.artwork_url
                }
                alt={inspectedCard.is_registered ? inspectedCard.name : `Pokémon #${inspectedCard.id}`}
                className={`max-h-32 sm:max-h-36 object-contain filter ${
                  inspectedCard.is_registered
                    ? 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]'
                    : 'kanto-silhouette'
                }`}
                onError={(e) => {
                  e.target.src = inspectedCard.artwork_url;
                }}
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] sm:text-[10px] text-slate-500 font-bold">HP BASE</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.hp_base || 60) : '???'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] sm:text-[10px] text-slate-500 font-bold">ATQ</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.atk_base || 60) : '???'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] sm:text-[10px] text-slate-500 font-bold">DEF</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.def || 50) : '???'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] sm:text-[10px] text-slate-500 font-bold">SPD</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.spd || 50) : '???'}</span>
              </div>
            </div>

            {inspectedCard.is_registered ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Copias en tu álbum ({inspectedCard.ownedCopies?.length || 1}):</span>
                  <span className="text-cyan-400 font-bold">Máximo Nv. {inspectedCard.max_level || 1}</span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {inspectedCard.ownedCopies?.map((copy, cidx) => {
                    const fastMove = copy.moves?.[0] || { name: 'Ataque Rápido', power: 14 };
                    const chargedMove = copy.moves?.[1] || { name: 'Golpe Cargado', power: 75 };

                    return (
                      <div key={copy.user_card_id || cidx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-200">
                            Copia #{cidx + 1} · Nv. {copy.level}
                            {copy.in_pending_trade && (
                              <span className="ml-1.5 text-[9px] text-amber-300 font-mono">(En intercambio)</span>
                            )}
                          </span>
                          <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-500/30 shrink-0">
                            IV {copy.iv_percentage || 85}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[10px] bg-slate-900/70 px-2 py-1 rounded-lg border border-slate-800">
                          <span className="text-slate-300 truncate">{fastMove.name} ({fastMove.power} dmg)</span>
                          <span className="text-amber-400 font-bold truncate">{chargedMove.name} ({chargedMove.power} dmg)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const freeCopy = inspectedCard.ownedCopies?.find(c => !c.in_pending_trade) || inspectedCard.ownedCopies?.[0];
                      setInspectedCard(null);
                      setTradeModalCard({
                        userCardId: freeCopy?.user_card_id || null,
                        speciesId: inspectedCard.id
                      });
                    }}
                    className="w-full py-2.5 bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 font-bold rounded-xl text-xs shadow transition-all flex items-center justify-center space-x-1.5"
                  >
                    <ArrowLeftRight size={14} />
                    <span>Intercambiar Carta</span>
                  </button>

                  <button
                    onClick={() => {
                      setInspectedCard(null);
                      if (onSelectPokemonForUpgrade) onSelectPokemonForUpgrade(inspectedCard.id);
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs shadow transition-all"
                  >
                    Mejorar / Evolucionar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
                  <div className="flex items-center justify-center space-x-1.5 font-bold text-amber-400">
                    <AlertTriangle size={15} />
                    <span>Pokémon No Registrado</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Aún no has obtenido esta carta para tu álbum. Abre sobres en la Tienda o realiza intercambios con otros entrenadores para registrarlo en tu Pokédex.
                  </p>
                </div>

                <button
                  onClick={() => setInspectedCard(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
                >
                  Cerrar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal de Intercambio directo desde una carta */}
      <TradeProposalModal
        isOpen={Boolean(tradeModalCard)}
        onClose={() => setTradeModalCard(null)}
        initialOfferedUserCardId={tradeModalCard?.userCardId}
        initialSpeciesId={tradeModalCard?.speciesId}
        onTradeCreated={async (msg) => {
          showAlert.success('¡Propuesta Enviada!', msg);
          await fetchPokedex();
        }}
      />

    </div>
  );
}
