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
  Heart,
  Edit3,
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import BattleArenaModal from './BattleArenaModal';

export default function FriendsBattlesView() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [teamCards, setTeamCards] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [selectedLeadCardId, setSelectedLeadCardId] = useState(null);
  
  // Team Editor Modal State
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]); // Array of 3 user_card_ids
  const [teamSaveLoading, setTeamSaveLoading] = useState(false);

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
      const [friendsData, teamData, albumData] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/battles/team'),
        apiRequest('/cards/album')
      ]);
      setFriends(friendsData.friends || []);
      setTeamCards(teamData.team || []);
      setAlbumCards(albumData.cards || []);

      if (teamData.team && teamData.team.length > 0) {
        setSelectedLeadCardId(teamData.team[0].user_card_id);
        setSelectedTeamIds(teamData.team.map(c => c.user_card_id));
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
      setSearchResults(data.users || []);
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

  // Guardar la selección de 3 Pokémon
  const handleSaveTeamSelection = async () => {
    if (selectedTeamIds.length === 0) {
      alert('Debes seleccionar al menos 1 Pokémon para tu equipo.');
      return;
    }
    setTeamSaveLoading(true);
    try {
      const res = await apiRequest('/battles/set-team', 'POST', {
        teamCardIds: selectedTeamIds
      });
      setMessage({ text: res.message, type: 'success' });
      setIsEditingTeam(false);
      await fetchFriendsAndTeam();
    } catch (err) {
      alert(`Error al guardar equipo: ${err.message}`);
    } finally {
      setTeamSaveLoading(false);
    }
  };

  const toggleCardInTeam = (userCardId) => {
    if (selectedTeamIds.includes(userCardId)) {
      // Si ya está, quitarlo
      setSelectedTeamIds(prev => prev.filter(id => id !== userCardId));
    } else {
      // Si no está, agregar si son menos de 3
      if (selectedTeamIds.length >= 3) {
        alert('Tu equipo ya tiene 3 Pokémon. Deselecciona uno primero para agregar otro.');
        return;
      }
      setSelectedTeamIds(prev => [...prev, userCardId]);
    }
  };

  return (
    <div className="space-y-8 pb-12 select-none">
      
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Amigos y Retos</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Combates estratégicos por turnos con estadísticas reales, tabla de tipos y relevos de equipo.
        </p>
      </div>

      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/60 text-red-300 border border-red-500/40'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3-POKÉMON TEAM PREVIEW & CONFIGURATION */}
      {/* ======================================================== */}
      <section className="bg-[#0b1222] rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                Equipo de Combate (3 Pokémon)
              </h3>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                {teamCards.length}/3 Seleccionados
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en una carta para marcarla como Líder de entrada, o edita los 3 miembros del equipo.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedTeamIds(teamCards.map(c => c.user_card_id));
              setIsEditingTeam(true);
            }}
            className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Edit3 size={14} />
            <span>Seleccionar los 3 Pokémon</span>
          </button>
        </div>

        {/* 3 Team Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((slotIdx) => {
            const card = teamCards[slotIdx];
            if (!card) {
              return (
                <div 
                  key={slotIdx}
                  onClick={() => setIsEditingTeam(true)}
                  className="p-5 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[190px] text-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-500">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">Ranura {slotIdx + 1} Vacía</span>
                    <span className="text-[11px] text-cyan-500 underline font-semibold">Asignar Pokémon</span>
                  </div>
                </div>
              );
            }

            const isSelected = card.user_card_id === selectedLeadCardId;
            const fastMove = card.moves?.[0] || { name: 'Ataque Rápido', power: 14 };
            const chargedMove = card.moves?.[1] || { name: 'Ataque Cargado', power: 75 };

            return (
              <div 
                key={card.user_card_id}
                onClick={() => setSelectedLeadCardId(card.user_card_id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'border-cyan-500/80 bg-slate-900/90 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/40' 
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80'
                }`}
              >
                <div>
                  {/* Slot Title + IV Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      {slotIdx === 0 ? 'Líder de Entrada' : `Compañero #${slotIdx + 1}`}
                    </span>
                    <span className="bg-amber-950/60 text-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                      IV {card.iv_percentage || 85}%
                    </span>
                  </div>

                  {/* Sprite & Info */}
                  <div className="flex items-center space-x-3">
                    <img 
                      src={card.animated_front_url || card.sprite_url} 
                      alt={card.name} 
                      className="w-14 h-14 object-contain filter drop-shadow" 
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 leading-tight">{card.name}</h4>
                      <span className="text-[11px] font-semibold text-cyan-400">Nivel {card.level}</span>
                      <div className="flex gap-1 mt-0.5">
                        {card.types?.map((t, tidx) => (
                          <span key={tidx} className="text-[9px] font-bold bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 text-slate-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono font-bold text-center mt-3 pt-2 border-t border-slate-800 text-slate-400">
                    <div className="bg-slate-950 p-1 rounded border border-slate-850">
                      <span className="text-red-400 block text-[9px]">HP</span>
                      <span>{card.current_hp}/{card.max_hp}</span>
                    </div>
                    <div className="bg-slate-950 p-1 rounded border border-slate-850">
                      <span className="text-cyan-400 block text-[9px]">ATQ</span>
                      <span>{card.atk}</span>
                    </div>
                    <div className="bg-slate-950 p-1 rounded border border-slate-850">
                      <span className="text-emerald-400 block text-[9px]">DEF</span>
                      <span>{card.def || 45}</span>
                    </div>
                  </div>

                  {/* Moves Preview */}
                  <div className="mt-2 space-y-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-slate-850 text-slate-300">
                      <span className="truncate">{fastMove.name}</span>
                      <span className="text-cyan-400 font-bold ml-1">{fastMove.power} dmg</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-slate-850 text-slate-300">
                      <span className="truncate text-amber-300">{chargedMove.name}</span>
                      <span className="text-amber-400 font-bold ml-1">{chargedMove.power} dmg</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-500 border border-slate-800'
                  }`}>
                    {isSelected ? 'Líder Seleccionado' : 'Elegir como Líder'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* User Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar usuarios o contrincantes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0b1222] border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
        >
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-[#0b1222] p-4 rounded-2xl border border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-300">Resultados encontrados:</span>
          <div className="space-y-2">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-100">{u.username}</span>
                  <span className="text-slate-500 ml-2">({u.email})</span>
                </div>
                {u.is_already_friend ? (
                  <span className="text-slate-500 font-semibold">Ya son amigos</span>
                ) : (
                  <button
                    onClick={() => handleAddFriend(u.id)}
                    className="px-3 py-1 bg-slate-800 text-cyan-400 hover:bg-slate-750 border border-cyan-500/30 font-bold rounded-lg text-xs"
                  >
                    Agregar amigo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends & Sparring Partners List */}
      <section className="bg-[#0b1222] rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
          Lista de Amigos y Sparring ({friends.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">Cargando contrincantes...</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Aún no tienes amigos agregados. Usa el buscador arriba para encontrar jugadores.
          </div>
        ) : (
          <div className="space-y-2.5">
            {friends.map((friend) => (
              <div 
                key={friend.id}
                className="p-3.5 bg-slate-900/60 hover:bg-slate-900 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center text-xs">
                    {friend.username.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{friend.username}</h4>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${friend.is_online ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                      <span className="text-[10px] text-slate-500">
                        {friend.is_online ? 'En línea' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Challenge Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startBattle(friend.username, 'amistoso')}
                    className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs shadow-sm transition-all"
                  >
                    Reto amistoso
                  </button>
                  <button
                    onClick={() => startBattle(friend.username, 'normal')}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs shadow-sm transition-all"
                  >
                    Reto normal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rules Notice */}
      <section className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 text-xs text-slate-400 space-y-1">
        <p>• <strong className="text-slate-300">Reto amistoso (Sparring):</strong> Práctica sin desgaste. Los Pokémon se restauran al 100% al inicio y fin del combate.</p>
        <p>• <strong className="text-slate-300">Reto normal (Oficial):</strong> Otorga mayores recompensas de EXP y monedas. El daño recibido persiste hasta usar objetos de curación.</p>
      </section>

      {/* ======================================================== */}
      {/* MODAL PARA SELECCIONAR LOS 3 POKÉMON DEL EQUIPO */}
      {/* ======================================================== */}
      {isEditingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] flex flex-col justify-between shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">
                  Configurar Equipo de Combate
                </h3>
                <p className="text-xs text-slate-400">
                  Selecciona exactamente 3 Pokémon de tu álbum ({selectedTeamIds.length}/3 elegidos).
                </p>
              </div>
              <button 
                onClick={() => setIsEditingTeam(false)}
                className="text-slate-500 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Album Grid to Pick 3 */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[55vh]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {albumCards.map((card) => {
                  const isChecked = selectedTeamIds.includes(card.user_card_id);

                  return (
                    <div
                      key={card.user_card_id}
                      onClick={() => toggleCardInTeam(card.user_card_id)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col justify-between ${
                        isChecked 
                          ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/30' 
                          : 'bg-slate-950 hover:bg-slate-900 border-slate-800 opacity-80'
                      }`}
                    >
                      {isChecked && (
                        <div className="absolute top-2 right-2 bg-cyan-500 text-slate-950 rounded-full p-0.5">
                          <Check size={12} />
                        </div>
                      )}

                      <div className="h-16 flex items-center justify-center">
                        <img src={card.sprite_url} alt={card.name} className="max-h-full object-contain filter drop-shadow" />
                      </div>

                      <div className="mt-2 pt-1 border-t border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono block">Nv. {card.level}</span>
                        <h5 className="text-xs font-bold text-slate-200 truncate">{card.name}</h5>
                        <span className="text-[9px] text-amber-400 font-mono">IV {card.iv_percentage || 85}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Seleccionados: <strong className="text-cyan-400">{selectedTeamIds.length} de 3</strong>
              </span>

              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditingTeam(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTeamSelection}
                  disabled={teamSaveLoading || selectedTeamIds.length === 0}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/50 font-bold text-xs rounded-xl shadow transition-all"
                >
                  {teamSaveLoading ? 'Guardando...' : 'Guardar Equipo de 3'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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
