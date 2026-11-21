import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Search, Filter, Sparkles, ChevronRight, X, Heart, Sword, Shield, Zap, Flame } from 'lucide-react';

const TYPES = [
  'Todos', 'Planta', 'Fuego', 'Agua', 'Eléctrico', 'Normal', 
  'Veneno', 'Tierra', 'Bicho', 'Lucha', 'Psíquico', 'Roca', 
  'Fantasma', 'Dragón', 'Hielo', 'Hada', 'Acero'
];

export default function PokedexView({ onSelectPokemonForUpgrade }) {
  const [cards, setCards] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [inspectedCard, setInspectedCard] = useState(null);

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
      setCards(data.cards);
      setTotalRegistered(data.totalRegistered);
      setAlbumCards(albumData.cards || []);
    } catch (err) {
      console.error('Error fetching pokedex:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter((card) => {
    const matchesSearch = 
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.id.toString().includes(searchTerm);

    const matchesType = 
      selectedType === 'Todos' || (card.types && card.types.includes(selectedType));

    return matchesSearch && matchesType;
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
      
      {/* Header & Stats (Mockup 3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pokédex</h1>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">
            <span className="text-blue-600 font-bold">{totalRegistered}</span> de 151 Pokémon registrados
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar Pokémon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 shadow-sm w-48 sm:w-56"
            />
          </div>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
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

      {/* Pokédex Grid (Mockup 3) */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500">Cargando datos de la Pokédex...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCards.map((card) => {
            const isOwned = card.is_registered;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`rounded-2xl p-3 border text-center transition-all relative flex flex-col justify-between ${
                  isOwned
                    ? 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer group hover:scale-[1.02]'
                    : 'bg-gray-100/70 border-gray-200 opacity-60 cursor-pointer'
                }`}
              >
                {/* Badge: Number of copies (Mockup 3: e.g. x1, x2, x3) */}
                {isOwned && card.count_copies > 0 && (
                  <div className="absolute top-2 right-2 bg-gray-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
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
      {/* MODAL DETALLE DE CARTA CON SPRITE ANIMADO, STATS Y ATAQUES */}
      {/* ======================================================== */}
      {inspectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-gray-200 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setInspectedCard(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-bold text-gray-400">
                #{inspectedCard.id.toString().padStart(3, '0')}
              </span>
              <h3 className="text-2xl font-black text-gray-900">
                {inspectedCard.is_registered ? inspectedCard.name : '??? (No Registrado)'}
              </h3>
              {inspectedCard.is_registered && (
                <div className="flex justify-center gap-1.5">
                  {inspectedCard.types?.map((t, idx) => (
                    <span key={idx} className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sprite Animado de PokéAPI Showdown */}
            <div className="h-44 bg-gradient-to-b from-blue-50 to-indigo-50/50 rounded-2xl flex items-center justify-center relative p-3 border border-blue-100">
              <img
                src={
                  inspectedCard.is_registered 
                    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${inspectedCard.id}.gif` 
                    : inspectedCard.artwork_url
                }
                alt={inspectedCard.name}
                className={`max-h-36 object-contain filter drop-shadow-xl ${
                  !inspectedCard.is_registered ? 'brightness-0 opacity-20' : ''
                }`}
                onError={(e) => {
                  e.target.src = inspectedCard.artwork_url;
                }}
              />
            </div>

            {/* Si está registrado, mostrar copias y sus ataques variados */}
            {inspectedCard.is_registered ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>Copias en tu colección ({inspectedCard.ownedCopies?.length || 1}):</span>
                  <span className="text-blue-600">Nivel Máximo: {inspectedCard.max_level || 1}</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {inspectedCard.ownedCopies?.map((copy, cidx) => {
                    const fastMove = copy.moves?.[0] || { name: 'Ataque Rápido', power: 12 };
                    const chargedMove = copy.moves?.[1] || { name: 'Ataque Cargado', power: 75 };

                    return (
                      <div key={copy.user_card_id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-gray-900">Copia #{cidx + 1} · Nivel {copy.level}</span>
                          <span className="text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full font-black text-[10px]">
                            IV {copy.iv_percentage || 85}% ⭐⭐⭐
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center text-gray-600">
                          <div className="bg-white p-1 rounded border">HP: {copy.max_hp}</div>
                          <div className="bg-white p-1 rounded border">ATQ: {copy.atk}</div>
                          <div className="bg-white p-1 rounded border">DEF: {copy.def || 45}</div>
                          <div className="bg-white p-1 rounded border">SPD: {copy.spd || 50}</div>
                        </div>

                        {/* Distinct Moveset for this Copy */}
                        <div className="flex items-center justify-between text-[10px] bg-white px-2 py-1 rounded border">
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
              <div className="text-center py-4 text-xs text-gray-500">
                <p>Aún no has descubierto esta carta. ¡Abre sobres gratis o en la tienda para conseguirla y registrarla en tu Pokédex!</p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
