import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Search, Filter, Sparkles, ChevronRight } from 'lucide-react';

const TYPES = [
  'Todos', 'Planta', 'Fuego', 'Agua', 'Eléctrico', 'Normal', 
  'Veneno', 'Tierra', 'Bicho', 'Lucha', 'Psíquico', 'Roca', 
  'Fantasma', 'Dragón', 'Hielo', 'Hada', 'Acero'
];

export default function PokedexView({ onSelectPokemonForUpgrade }) {
  const [cards, setCards] = useState([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');

  useEffect(() => {
    fetchPokedex();
  }, []);

  const fetchPokedex = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/cards/pokedex');
      setCards(data.cards);
      setTotalRegistered(data.totalRegistered);
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
          {/* Search Input */}
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

          {/* Type Dropdown */}
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
                onClick={() => isOwned && onSelectPokemonForUpgrade && onSelectPokemonForUpgrade(card.id)}
                className={`rounded-2xl p-3 border text-center transition-all relative flex flex-col justify-between ${
                  isOwned
                    ? 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer group'
                    : 'bg-gray-100/70 border-gray-200 opacity-60'
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

    </div>
  );
}
