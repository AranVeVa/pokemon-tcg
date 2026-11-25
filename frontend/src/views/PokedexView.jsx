import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { showAlert } from '../utils/gameAlert';
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
  AlertTriangle,
  Layers,
  BookOpen,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  { id: 'all', label: 'Todas las Gen', range: [1, 151], count: 151 }
];

export default function PokedexView({ onSelectPokemonForUpgrade }) {
  const { user, refreshUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedGen, setSelectedGen] = useState('gen1');
  const [inspectedCard, setInspectedCard] = useState(null);

  // Live PokéAPI Search
  const [pokeApiSearching, setPokeApiSearching] = useState(false);
  const [liveApiCard, setLiveApiCard] = useState(null);
  const [liveApiSearching, setLiveApiSearching] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  useEffect(() => {
    fetchPokedex();
  }, []);

  // Búsqueda en vivo automática en PokéAPI si el usuario escribe el nombre de cualquier Pokémon (#1 a #1025)
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
  }, [debouncedSearchTerm]);

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

  // Consultar cualquier Pokémon en vivo a través de la PokéAPI (#1 a #1025)
  const handleLivePokeApiSearch = async (queryToSearch) => {
    const q = (queryToSearch || searchTerm).toString().trim();
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
      showAlert.error('Pokémon no encontrado', `No se encontró "${q}" en los registros oficiales.`);
    } finally {
      setPokeApiSearching(false);
    }
  };

  // Reclamar Pokémon descubierto a la colección del usuario
  const handleClaimPokemon = async (card) => {
    setClaimLoading(true);
    try {
      const res = await apiRequest('/cards/claim-pokeapi-card', 'POST', { card });
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      showAlert.success('¡Pokémon Añadido!', res.message);
      await refreshUser();
      await fetchPokedex();

      setInspectedCard(prev => ({
        ...prev,
        is_registered: true,
        count_copies: (prev.count_copies || 0) + 1,
        ownedCopies: [res.userCard, ...(prev.ownedCopies || [])]
      }));
    } catch (err) {
      showAlert.error('Error al reclamar', err.message);
    } finally {
      setClaimLoading(false);
    }
  };

  const currentGenObj = GENERATIONS.find(g => g.id === selectedGen) || GENERATIONS[0];

  // Construcción de la cuadrícula uniforme estilo Pokédex de Kanto
  // Asegura que todas las ranuras de la generación seleccionada aparezcan de forma uniforme
  const buildRosterForGeneration = () => {
    if (selectedGen === 'all') {
      const allRegisteredIds = new Set(cards.filter(c => c.is_registered).map(c => c.id));
      albumCards.forEach(c => allRegisteredIds.add(c.card_id));
      for (let i = 1; i <= 151; i++) allRegisteredIds.add(i);

      const sortedIds = Array.from(allRegisteredIds).sort((a, b) => a - b);
      return sortedIds.map(id => {
        const existingInDb = cards.find(c => c.id === id);
        const ownedCopies = albumCards.filter(c => c.card_id === id);
        const isOwned = ownedCopies.length > 0 || (existingInDb && existingInDb.is_registered);
        if (existingInDb) {
          return {
            ...existingInDb,
            is_registered: isOwned,
            count_copies: ownedCopies.length,
            ownedCopies
          };
        }
        return {
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
        };
      });
    }

    const [startId, endId] = currentGenObj.range;
    const roster = [];

    // Mapear cada ID de la generación
    for (let id = startId; id <= endId; id++) {
      // Buscar si ya está en la BD local
      const existingInDb = cards.find(c => c.id === id);
      const ownedCopies = albumCards.filter(c => c.card_id === id);
      const isOwned = ownedCopies.length > 0 || (existingInDb && existingInDb.is_registered);

      if (existingInDb) {
        roster.push({
          ...existingInDb,
          is_registered: isOwned,
          count_copies: ownedCopies.length,
          ownedCopies
        });
      } else {
        // Carta de la generación con sombra uniforme estilo Kanto
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
  };

  const rawRoster = buildRosterForGeneration();

  const filteredCards = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase().replace('#', '').trim();

    // Si no hay búsqueda activa por texto, mostrar la generación seleccionada
    if (!q) {
      return rawRoster.filter(card => {
        return selectedType === 'Todos' || (card.types && card.types.includes(selectedType));
      });
    }

    // Si hay búsqueda activa por texto, buscar globalmente en toda la BD + PokéAPI
    const matched = [];
    const seenIds = new Set();

    // 1. Coincidencias en la base de datos (Kanto + Sylveon + otros registrados)
    cards.forEach(card => {
      const matchesSearch =
        card.name.toLowerCase().includes(q) ||
        card.id.toString() === q ||
        card.id.toString().includes(q);
      const matchesType =
        selectedType === 'Todos' ||
        (card.types && card.types.includes(selectedType));

      if (matchesSearch && matchesType) {
        const ownedCopies = albumCards.filter(c => c.card_id === card.id);
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

    // 2. Coincidencias en cartas del álbum del usuario
    albumCards.forEach(ac => {
      if (!seenIds.has(ac.card_id)) {
        const matchesSearch =
          (ac.name && ac.name.toLowerCase().includes(q)) ||
          ac.card_id.toString() === q ||
          ac.card_id.toString().includes(q);
        const matchesType =
          selectedType === 'Todos' ||
          (ac.types && ac.types.includes(selectedType));

        if (matchesSearch && matchesType) {
          const ownedCopies = albumCards.filter(c => c.card_id === ac.card_id);
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

    // 3. Si la búsqueda en vivo de PokéAPI encontró un resultado y no está ya en la lista
    if (liveApiCard && !seenIds.has(liveApiCard.id)) {
      const matchesType =
        selectedType === 'Todos' ||
        (liveApiCard.types && liveApiCard.types.includes(selectedType));
      if (matchesType) {
        matched.push(liveApiCard);
      }
    }

    return matched;
  }, [debouncedSearchTerm, rawRoster, cards, albumCards, selectedType, liveApiCard]);

  const handleCardClick = (card) => {
    const ownedCopies = albumCards.filter(c => c.card_id === card.id);
    const isOwned = ownedCopies.length > 0 || card.is_registered;
    setInspectedCard({
      ...card,
      is_registered: isOwned,
      ownedCopies
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center space-x-2">
              <BookOpen size={24} className="text-cyan-400" />
              <span>Pokédex</span>
            </h1>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              {debouncedSearchTerm.trim()
                ? `Búsqueda Global (${filteredCards.length} ${filteredCards.length === 1 ? 'Especie' : 'Especies'})`
                : `${currentGenObj.label} (${filteredCards.length} Especies)`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <span className="text-cyan-400 font-bold">{totalRegistered}</span> cartas registradas en tu colección de cartas coleccionables.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o número (#001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-2 bg-[#0b1222] border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm w-60 sm:w-72"
            />
            {liveApiSearching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" />
            )}
          </div>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-2 px-3 bg-[#0b1222] border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 shadow-sm cursor-pointer"
            >
              {TYPES.map((t) => (
                <option key={t} value={t} className="bg-slate-900 text-slate-200">
                  Tipo: {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Generation Selector Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {GENERATIONS.map((gen) => (
          <button
            key={gen.id}
            onClick={() => setSelectedGen(gen.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedGen === gen.id
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50 shadow-md'
                : 'bg-[#0b1222] hover:bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {gen.label}
          </button>
        ))}
      </div>

      {/* Pokédex Grid: Uniform Cards with Authentic Kanto Silhouette */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-cyan-500/20"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando catálogo de cartas...</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-[#0b1222] border border-slate-800 rounded-3xl p-10 text-center space-y-3 shadow-xl">
          <Search size={36} className="mx-auto text-slate-500" />
          <h3 className="text-base font-black text-slate-100">
            No se encontraron resultados
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No hay Pokémon que coincidan con tu búsqueda o filtro seleccionado. Prueba otro nombre, número (#025) o cambia de tipo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredCards.map((card) => {
            const isOwned = card.is_registered;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`rounded-2xl p-3 border text-center transition-all relative flex flex-col justify-between cursor-pointer group ${
                  isOwned
                    ? 'bg-[#0b1222] border-slate-800 hover:border-cyan-500/60 hover:scale-[1.02] shadow-sm hover:shadow-xl'
                    : 'bg-[#080d19]/80 border-slate-850/80 hover:border-slate-700 hover:scale-[1.01]'
                }`}
              >
                {/* Badge: Number of copies owned */}
                {isOwned && card.count_copies > 0 && (
                  <div className="absolute top-2 right-2 bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow z-10">
                    x{card.count_copies}
                  </div>
                )}

                {/* Pokemon Artwork Viewport - EN SOMBRA SI NO SE TIENE */}
                <div className="h-28 flex items-center justify-center p-2 relative rounded-xl bg-slate-950/60 border border-slate-900 overflow-hidden">
                  <img
                    src={card.artwork_url}
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

                {/* Info Text - NUNCA MOSTRAR NOMBRE SI NO SE TIENE */}
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 font-bold block">
                    #{card.id.toString().padStart(3, '0')}
                  </span>
                  
                  <h4 className="text-xs font-bold text-slate-100 truncate mt-0.5">
                    {isOwned ? card.name : `??? (#${card.id})`}
                  </h4>

                  {isOwned ? (
                    <div className="flex items-center justify-center gap-1 mt-1">
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
      )}

      {/* ======================================================== */}
      {/* MODAL DETALLE DE CARTA CON SPRITE ANIMADO, STATS Y 4 ATAQUES */}
      {/* ======================================================== */}
      {inspectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1222] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-750 shadow-2xl space-y-4 relative max-h-[94vh] overflow-y-auto text-slate-100">
            <button
              onClick={() => setInspectedCard(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-bold text-slate-400">
                #{inspectedCard.id.toString().padStart(3, '0')} · {inspectedCard.is_registered ? (inspectedCard.rarity?.toUpperCase() || 'COMÚN') : 'NO REGISTRADO'}
              </span>
              <h3 className="text-2xl font-black text-slate-100">
                {inspectedCard.is_registered ? inspectedCard.name : `??? (#${inspectedCard.id})`}
              </h3>
              
              <div className="flex justify-center gap-1.5">
                {inspectedCard.is_registered ? (
                  inspectedCard.types?.map((t, idx) => (
                    <span key={idx} className="text-xs font-bold bg-slate-900 text-cyan-400 px-2.5 py-0.5 rounded-full border border-slate-750">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-mono font-bold bg-slate-900 text-slate-500 px-3 py-0.5 rounded-full border border-slate-800">
                    Tipo Desconocido
                  </span>
                )}
              </div>
            </div>

            {/* Viewport: EN SOMBRA SI NO SE TIENE */}
            <div className="h-44 bg-gradient-to-b from-slate-900 to-gray-950 rounded-2xl flex items-center justify-center relative p-3 border border-slate-800 shadow-inner">
              <img
                src={
                  inspectedCard.is_registered
                    ? (inspectedCard.animated_front_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${inspectedCard.id}.gif`)
                    : inspectedCard.artwork_url
                }
                alt={inspectedCard.is_registered ? inspectedCard.name : `Pokémon #${inspectedCard.id}`}
                className={`max-h-36 object-contain filter ${
                  inspectedCard.is_registered
                    ? 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]'
                    : 'kanto-silhouette'
                }`}
                onError={(e) => {
                  e.target.src = inspectedCard.artwork_url;
                }}
              />
            </div>

            {/* Base Stats Preview: OCULTOS SI NO SE TIENE */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-500 font-bold">HP BASE</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.hp_base || 60) : '???'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-500 font-bold">ATQ</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.atk_base || 60) : '???'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-500 font-bold">DEF</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.def || 50) : '???'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-500 font-bold">SPD</span>
                <span className="font-bold text-slate-200">{inspectedCard.is_registered ? (inspectedCard.spd || 50) : '???'}</span>
              </div>
            </div>

            {/* Si está registrado, mostrar copias y sus ataques variados; si no, mensaje de no registrado */}
            {inspectedCard.is_registered ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Copias en tu colección ({inspectedCard.ownedCopies?.length || 1}):</span>
                  <span className="text-cyan-400 font-bold">Nivel Máximo: {inspectedCard.max_level || 5}</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {inspectedCard.ownedCopies?.map((copy, cidx) => {
                    const fastMove = copy.moves?.[0] || { name: 'Ataque Rápido', power: 14 };
                    const chargedMove = copy.moves?.[1] || { name: 'Golpe Cargado', power: 75 };

                    return (
                      <div key={copy.user_card_id || cidx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-200">Copia #{cidx + 1} · Nivel {copy.level}</span>
                          <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-500/30">
                            IV {copy.iv_percentage || 85}%
                          </span>
                        </div>

                        {/* Distinct Moveset */}
                        <div className="flex items-center justify-between text-[10px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="text-slate-300">{fastMove.name} ({fastMove.power} dmg)</span>
                          <span className="text-amber-400 font-bold">{chargedMove.name} ({chargedMove.power} dmg)</span>
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
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs shadow transition-all"
                >
                  Ir a Mejorar o Evolucionar este Pokémon
                </button>
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

    </div>
  );
}
