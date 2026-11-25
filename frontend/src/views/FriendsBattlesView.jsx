import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { showAlert } from '../utils/gameAlert';
import { 
  Users, 
  Search, 
  UserPlus, 
  Swords, 
  Heart,
  Edit3,
  X,
  Check,
  Bell,
  Clock,
  ArrowLeftRight
} from 'lucide-react';
import BattleArenaModal from './BattleArenaModal';
import TradesView from './TradesView';
import TradeProposalModal from './TradeProposalModal';

export default function FriendsBattlesView({ initialSubTab = 'amigos', onSubTabChange, refreshSignal = 0 }) {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState(initialSubTab); // 'amigos' | 'intercambios'

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (refreshSignal > 0) {
      fetchFriendsAndTeam();
      fetchPendingTradesCount();
    }
  }, [refreshSignal]);

  const changeSubTab = (next) => {
    setSubTab(next);
    if (onSubTabChange) onSubTabChange(next);
  };
  const [friends, setFriends] = useState([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [pendingTradesCount, setPendingTradesCount] = useState(0);

  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [activeBattles, setActiveBattles] = useState([]);

  const [teamCards, setTeamCards] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [selectedLeadCardId, setSelectedLeadCardId] = useState(null);
  
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [teamSaveLoading, setTeamSaveLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Combate en vivo activo
  const [activeBattleData, setActiveBattleData] = useState(null);

  // Modal directo de intercambio con un amigo desde su fila
  const [tradeFriendId, setTradeFriendId] = useState(null);

  useEffect(() => {
    fetchFriendsAndTeam();
    fetchChallenges();
    fetchPendingTradesCount();
  }, []);

  // Polling cada 3 segundos para detectar solicitudes, retos e intercambios entrantes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChallenges();
      fetchFriendsOnly();
      fetchPendingTradesCount();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.trim().length >= 2) {
      handleSearchDirect(debouncedSearchQuery.trim());
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  const fetchPendingTradesCount = async () => {
    try {
      const res = await apiRequest('/trades');
      const incoming = (res.trades || []).filter(t => t.status === 'pending' && t.receiver_id === user?.id);
      setPendingTradesCount(incoming.length);
    } catch (err) {
      // ignore background poll errors
    }
  };

  const fetchFriendsOnly = async () => {
    try {
      const friendsData = await apiRequest('/friends');
      setFriends(friendsData.friends || []);
      setIncomingFriendRequests(friendsData.incomingRequests || []);
      setSentFriendRequests(friendsData.sentRequests || []);
    } catch (err) {
      console.warn('Error refrescando amigos:', err.message);
    }
  };

  const fetchChallenges = async () => {
    try {
      const data = await apiRequest('/battles/challenges');
      setIncomingChallenges(data.incoming || []);
      setActiveBattles(data.active || []);
    } catch (err) {
      console.warn('Error refrescando retos:', err.message);
    }
  };

  const fetchFriendsAndTeam = async () => {
    setLoading(true);
    try {
      const [friendsData, teamData, albumData] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/battles/team'),
        apiRequest('/cards/album')
      ]);
      setFriends(friendsData.friends || []);
      setIncomingFriendRequests(friendsData.incomingRequests || []);
      setSentFriendRequests(friendsData.sentRequests || []);
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

  const handleSearchDirect = async (queryText) => {
    if (!queryText) return;
    setSearching(true);
    try {
      const data = await apiRequest(`/friends/search?query=${encodeURIComponent(queryText)}`);
      setSearchResults(data.users || []);
    } catch (err) {
      console.warn('Error buscando usuarios:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    handleSearchDirect(searchQuery.trim());
  };

  const handleHealEntireTeam = async () => {
    try {
      const res = await apiRequest('/battles/heal-team', 'POST');
      showAlert.success('Centro Pokémon', res.message);
      await fetchFriendsAndTeam();
    } catch (err) {
      showAlert.error('Error', err.message);
    }
  };

  const handleSendFriendRequest = async (friendId) => {
    try {
      const res = await apiRequest('/friends/add', 'POST', { friendId });
      showAlert.success('Solicitud Enviada', res.message);
      if (debouncedSearchQuery) handleSearchDirect(debouncedSearchQuery);
      await fetchFriendsOnly();
    } catch (err) {
      showAlert.error('Error', err.message);
    }
  };

  const handleRespondFriendRequest = async (requestId, action) => {
    try {
      const res = await apiRequest('/friends/respond', 'POST', { requestId, action });
      showAlert.success(action === 'accept' ? '¡Nuevo Amigo!' : 'Solicitud Rechazada', res.message);
      await fetchFriendsOnly();
    } catch (err) {
      showAlert.error('Error', err.message);
    }
  };

  const handleChallengeFriend = async (friend, battleType) => {
    try {
      const res = await apiRequest('/battles/challenge', 'POST', {
        opponentId: friend.id,
        battleType,
        selectedUserCardId: selectedLeadCardId
      });
      if (res?.battle) {
        setActiveBattleData(res.battle);
      }
    } catch (err) {
      showAlert.error('No se pudo enviar el reto', err.message);
    }
  };

  const handleAcceptChallenge = async (challengeId) => {
    try {
      const res = await apiRequest(`/battles/live/${challengeId}/accept`, 'POST', {
        selectedUserCardId: selectedLeadCardId
      });
      if (res?.battle) {
        setActiveBattleData(res.battle);
        await fetchChallenges();
      }
    } catch (err) {
      showAlert.error('Error al aceptar', err.message);
    }
  };

  const handleRejectChallenge = async (challengeId) => {
    try {
      await apiRequest(`/battles/live/${challengeId}/reject`, 'POST');
      await fetchChallenges();
    } catch (err) {
      showAlert.error('Error', err.message);
    }
  };

  const handleOpenActiveBattle = async (battleId) => {
    try {
      const res = await apiRequest(`/battles/live/${battleId}`);
      if (res?.battle) {
        setActiveBattleData(res.battle);
      }
    } catch (err) {
      showAlert.error('Error', err.message);
    }
  };

  const handleSaveTeamSelection = async () => {
    if (selectedTeamIds.length === 0) {
      showAlert.warning('Equipo Incompleto', 'Debes seleccionar al menos 1 Pokémon.');
      return;
    }
    setTeamSaveLoading(true);
    try {
      const res = await apiRequest('/battles/set-team', 'POST', {
        teamCardIds: selectedTeamIds
      });
      showAlert.success('Equipo Guardado', res.message);
      setIsEditingTeam(false);
      await fetchFriendsAndTeam();
    } catch (err) {
      showAlert.error('Error', err.message);
    } finally {
      setTeamSaveLoading(false);
    }
  };

  const toggleCardInTeam = (userCardId) => {
    if (selectedTeamIds.includes(userCardId)) {
      setSelectedTeamIds(prev => prev.filter(id => id !== userCardId));
    } else {
      if (selectedTeamIds.length >= 3) {
        showAlert.info('Límite de Equipo', 'Tu equipo ya tiene 3 Pokémon. Quita uno primero.');
        return;
      }
      setSelectedTeamIds(prev => [...prev, userCardId]);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Header + Sub-tabs internos (sin agregar al menú lateral) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">Amigos, Combates e Intercambios</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Agrega entrenadores, arma tu equipo de 3 Pokémon, rétalos o intercambia cartas repetidas.
          </p>
        </div>

        <div className="inline-flex bg-slate-900 p-1 rounded-xl self-start sm:self-auto border border-slate-800 max-w-full">
          <button
            onClick={() => changeSubTab('amigos')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              subTab === 'amigos' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={14} />
            <span>Amigos y Retos</span>
          </button>
          <button
            onClick={() => changeSubTab('intercambios')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              subTab === 'intercambios' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight size={14} />
            <span>Intercambios</span>
            {pendingTradesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-slate-950 font-black">
                {pendingTradesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {subTab === 'intercambios' ? (
        <TradesView
          key={`trades-${refreshSignal}`}
          onTradesChanged={() => {
            fetchPendingTradesCount();
            fetchFriendsAndTeam();
          }}
        />
      ) : (
        <>
          {/* 3-POKÉMON TEAM CONFIGURATION */}
          <section className="bg-[#0b1222] rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                    Mi Equipo (3 Pokémon)
                  </h3>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    {teamCards.length}/3
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Elige a tu líder de entrada o cambia los 3 miembros de tu equipo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={handleHealEntireTeam}
                  className="px-3.5 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                >
                  <Heart size={14} className="fill-emerald-400 text-emerald-400" />
                  <span>Centro Pokémon</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedTeamIds(teamCards.map(c => c.user_card_id));
                    setIsEditingTeam(true);
                  }}
                  className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                >
                  <Edit3 size={14} />
                  <span>Seleccionar Equipo</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((slotIdx) => {
                const card = teamCards[slotIdx];
                if (!card) {
                  return (
                    <div 
                      key={slotIdx}
                      onClick={() => setIsEditingTeam(true)}
                      className="p-5 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] text-center space-y-2"
                    >
                      <UserPlus size={18} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-400">Ranura {slotIdx + 1} Vacía</span>
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
                        ? 'border-cyan-500/80 bg-slate-900/90 shadow-lg ring-1 ring-cyan-500/40' 
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                          {slotIdx === 0 ? 'Líder' : `Compañero #${slotIdx + 1}`}
                        </span>
                        <span className="bg-amber-950/60 text-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                          IV {card.iv_percentage || 85}%
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <img src={card.animated_front_url || card.sprite_url} alt={card.name} className="w-14 h-14 object-contain shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-100 leading-tight truncate">{card.name}</h4>
                          <span className="text-[11px] font-semibold text-cyan-400">Nivel {card.level}</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {card.types?.map((t, tidx) => (
                              <span key={tidx} className="text-[9px] font-bold bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 text-slate-300">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

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

                      <div className="mt-2 space-y-1 text-[10px] font-mono">
                        <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-slate-850 text-slate-300">
                          <span className="truncate">{fastMove.name}</span>
                          <span className="text-cyan-400 font-bold ml-1 shrink-0">{fastMove.power}</span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-slate-850 text-slate-300">
                          <span className="truncate text-amber-300">{chargedMove.name}</span>
                          <span className="text-amber-400 font-bold ml-1 shrink-0">{chargedMove.power}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 text-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-500 border border-slate-800'
                      }`}>
                        {isSelected ? 'Líder' : 'Elegir Líder'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* BUSCADOR DE ENTRENADORES */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl w-full">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar entrenadores por nombre o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-[#0b1222] border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-3.5 sm:px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 font-bold rounded-xl text-xs sm:text-sm shadow-sm shrink-0"
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="bg-[#0b1222] p-4 rounded-2xl border border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-300">Entrenadores encontrados:</span>
              <div className="space-y-2">
                {searchResults.map((u) => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-900 rounded-xl text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-100">{u.username}</span>
                      <span className="text-slate-500 ml-2 break-all">({u.email})</span>
                    </div>
                    {u.friendship_status === 'accepted' ? (
                      <span className="text-emerald-400 font-semibold shrink-0">Ya son amigos</span>
                    ) : u.friendship_status === 'pending' ? (
                      <span className="text-amber-400 font-semibold shrink-0">
                        {u.is_sender ? 'Solicitud enviada' : 'Solicitud pendiente'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(u.id)}
                        className="px-3 py-1.5 bg-slate-800 text-cyan-400 hover:bg-slate-750 border border-cyan-500/30 font-bold rounded-lg text-xs self-start sm:self-auto shrink-0"
                      >
                        Enviar solicitud
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MIS AMIGOS, RETOS E INTERCAMBIOS */}
          <section className="bg-[#0b1222] rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                Mis Amigos ({friends.length})
              </h3>
              {sentFriendRequests.length > 0 && (
                <span className="text-[11px] text-amber-400 font-mono">
                  {sentFriendRequests.length} {sentFriendRequests.length === 1 ? 'solicitud enviada pendiente' : 'solicitudes enviadas pendientes'}
                </span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500">Cargando amigos...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Aún no tienes amigos. Busca jugadores arriba y envíales una solicitud de amistad.
              </div>
            ) : (
              <div className="space-y-2.5">
                {friends.map((friend) => (
                  <div 
                    key={friend.id}
                    className="p-3.5 bg-slate-900/60 hover:bg-slate-900 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                        {friend.username.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{friend.username}</h4>
                        <span className="text-[10px] text-slate-500 block truncate">{friend.email}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setTradeFriendId(friend.id)}
                        className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1"
                        title="Proponer intercambio de cartas con este amigo"
                      >
                        <ArrowLeftRight size={13} />
                        <span>Intercambiar</span>
                      </button>
                      <button
                        onClick={() => handleChallengeFriend(friend, 'amistoso')}
                        className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs shadow-sm transition-all"
                        title="Todos los Pokémon combaten igualados a Nivel 5"
                      >
                        Amistoso
                      </button>
                      <button
                        onClick={() => handleChallengeFriend(friend, 'normal')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs shadow-sm transition-all"
                      >
                        Retar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* MODAL CONFIGURAR EQUIPO */}
      {isEditingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-4 sm:p-6 max-w-3xl w-full max-h-[92dvh] flex flex-col justify-between shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">Seleccionar Equipo de 3</h3>
                <p className="text-xs text-slate-400">Elegidos: {selectedTeamIds.length}/3</p>
              </div>
              <button onClick={() => setIsEditingTeam(false)} className="text-slate-500 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

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
                        <img src={card.sprite_url} alt={card.name} className="max-h-full object-contain" />
                      </div>
                      <div className="mt-2 pt-1 border-t border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono block">Nv. {card.level}</span>
                        <h5 className="text-xs font-bold text-slate-200 truncate">{card.name}</h5>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsEditingTeam(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTeamSelection}
                disabled={teamSaveLoading || selectedTeamIds.length === 0}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/50 font-bold text-xs rounded-xl"
              >
                {teamSaveLoading ? 'Guardando...' : 'Guardar Equipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROPONER INTERCAMBIO DIRECTO DESDE AMIGO */}
      <TradeProposalModal
        isOpen={Boolean(tradeFriendId)}
        onClose={() => setTradeFriendId(null)}
        initialFriendId={tradeFriendId}
        onTradeCreated={(msg) => {
          showAlert.success('¡Propuesta Enviada!', msg);
          fetchPendingTradesCount();
          setSubTab('intercambios');
        }}
      />

      {/* ARENA EN VIVO */}
      {activeBattleData && (
        <BattleArenaModal
          initialBattle={activeBattleData}
          onClose={() => {
            setActiveBattleData(null);
            fetchChallenges();
            fetchFriendsAndTeam();
          }}
          onBattleFinished={() => {
            fetchChallenges();
            fetchFriendsAndTeam();
          }}
        />
      )}
    </div>
  );
}
