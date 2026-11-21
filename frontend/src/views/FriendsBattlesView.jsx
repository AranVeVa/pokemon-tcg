import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Search, 
  UserPlus, 
  Swords, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Zap,
  Flame,
  Heart
} from 'lucide-react';
import BattleArenaModal from './BattleArenaModal';

export default function FriendsBattlesView() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [teamCards, setTeamCards] = useState([]);
  const [selectedLeadCardId, setSelectedLeadCardId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Combat Modal State
  const [activeBattleConfig, setActiveBattleConfig] = useState(null); // { opponentName, battleType }

  useEffect(() => {
    fetchFriendsAndTeam();
  }, []);

  const fetchFriendsAndTeam = async () => {
    setLoading(true);
    try {
      const [friendsData, teamData] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/battles/team')
      ]);
      setFriends(friendsData.friends);
      setTeamCards(teamData.team);
      if (teamData.team.length > 0) {
        setSelectedLeadCardId(teamData.team[0].user_card_id);
      }
    } catch (err) {
      console.error('Error al obtener amigos o equipo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await apiRequest(`/friends/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(data.users);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      const res = await apiRequest('/friends/add', 'POST', { friendId });
      setMessage({ text: res.message, type: 'success' });
      setSearchQuery('');
      setSearchResults([]);
      await fetchFriendsAndTeam();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const startBattle = (opponentName, battleType) => {
    setActiveBattleConfig({ opponentName, battleType });
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Amigos y Retos</h1>
        <p className="text-xs text-gray-500">
          Combates estratégicos por turnos con animaciones de PokéAPI, ataques elementales y cálculo de daño por stats.
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

      {/* ======================================================== */}
      {/* SELECTOR DE POKÉMON LÍDER DEL EQUIPO CON STATS & ATAQUES */}
      {/* ======================================================== */}
      <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900">Tu Equipo de Combate</h3>
            <p className="text-xs text-gray-500">Haz clic en una carta para seleccionarla como Pokémon Líder de entrada.</p>
          </div>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full self-start">
            Ataques y Stats únicos tipo Pokémon GO
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {teamCards.map((card) => {
            const isSelected = card.user_card_id === selectedLeadCardId;
            const fastMove = card.moves?.[0] || { name: 'Ataque Rápido', power: 12 };
            const chargedMove = card.moves?.[1] || { name: 'Golpe Cargado', power: 70 };

            return (
              <div 
                key={card.user_card_id}
                onClick={() => setSelectedLeadCardId(card.user_card_id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100' 
                    : 'border-gray-200 bg-gray-50/70 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] text-gray-400 font-bold">#{card.card_id}</span>
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                      IV {card.iv_percentage || 85}% ⭐⭐⭐
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <img 
                      src={card.animated_front_url || card.sprite_url} 
                      alt={card.name} 
                      className="w-14 h-14 object-contain filter drop-shadow" 
                    />
                    <div>
                      <h4 className="font-black text-sm text-gray-900 leading-tight">{card.name}</h4>
                      <span className="text-[11px] font-bold text-blue-600">Nivel {card.level}</span>
                      <div className="flex gap-1 mt-0.5">
                        {card.types?.map((t, tidx) => (
                          <span key={tidx} className="text-[9px] font-bold bg-white px-1.5 py-0.2 rounded border text-gray-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center mt-3 pt-2 border-t border-gray-200/60 text-gray-600">
                    <div className="bg-white p-1 rounded">
                      <span className="text-red-600 block">HP</span>
                      <span>{card.current_hp}/{card.max_hp}</span>
                    </div>
                    <div className="bg-white p-1 rounded">
                      <span className="text-blue-600 block">ATQ</span>
                      <span>{card.atk}</span>
                    </div>
                    <div className="bg-white p-1 rounded">
                      <span className="text-emerald-600 block">DEF</span>
                      <span>{card.def || 45}</span>
                    </div>
                  </div>

                  {/* Attacks List */}
                  <div className="mt-2 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-gray-100">
                      <span className="font-semibold text-gray-700">⚡ {fastMove.name}</span>
                      <span className="font-black text-gray-900">{fastMove.power} dmg</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-gray-100">
                      <span className="font-semibold text-amber-700">💥 {chargedMove.name}</span>
                      <span className="font-black text-gray-900">{chargedMove.power} dmg</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-center">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isSelected ? '✓ Pokémon Líder Seleccionado' : 'Elegir Líder'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Search Bar (Mockup 9: "Buscar usuarios por nombre...") */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuarios por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
        >
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-700">Resultados encontrados:</span>
          <div className="space-y-2">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-gray-900">{u.username}</span>
                  <span className="text-gray-400 ml-2">({u.email})</span>
                </div>
                {u.is_already_friend ? (
                  <span className="text-gray-400 font-semibold">Ya son amigos</span>
                ) : (
                  <button
                    onClick={() => handleAddFriend(u.id)}
                    className="px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700"
                  >
                    Agregar amigo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List (Mockup 9: "Mis amigos (4)") */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-base font-black text-gray-900">
          Mis amigos ({friends.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-xs text-gray-400">Cargando amigos...</div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div 
                key={friend.id}
                className="p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                {/* Friend Profile */}
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow">
                    {friend.username.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-gray-900 leading-tight">{friend.username}</h4>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${friend.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {friend.is_online ? 'En línea' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Challenge Buttons (Mockup 9: [Reto amistoso] [Reto normal]) */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startBattle(friend.username, 'amistoso')}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-blue-600 border border-blue-300 font-bold rounded-xl text-xs shadow-sm transition-all"
                  >
                    Reto amistoso
                  </button>
                  <button
                    onClick={() => startBattle(friend.username, 'normal')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200 hover:shadow-lg transition-all"
                  >
                    Reto normal
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </section>

      {/* Explanation Box (Mockup 9 Bottom Box) */}
      <section className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 text-xs text-gray-600 space-y-1">
        <p>• <strong className="text-gray-800">Reto amistoso (Sparring):</strong> otorga menos XP, sin bajas permanentes (los Pokémon se restauran automáticamente).</p>
        <p>• <strong className="text-gray-800">Reto normal (Competitivo):</strong> más XP e items, pero tus Pokémon pueden quedar debilitados durante la partida.</p>
      </section>

      {/* Interactive Battle Modal */}
      {activeBattleConfig && (
        <BattleArenaModal
          opponentName={activeBattleConfig.opponentName}
          battleType={activeBattleConfig.battleType}
          initialCardId={selectedLeadCardId}
          onClose={() => setActiveBattleConfig(null)}
          onBattleFinished={() => fetchFriendsAndTeam()}
        />
      )}

    </div>
  );
}
