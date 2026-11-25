import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/gameAlert';
import confetti from 'canvas-confetti';
import {
  Swords,
  Clock,
  ArrowLeftRight,
  UserPlus,
  Check,
  X
} from 'lucide-react';
import BattleArenaModal from '../views/BattleArenaModal';

export default function GlobalLiveNotifications({ onGlobalAction }) {
  const { user, refreshUser } = useAuth();
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState([]);
  const [activeBattles, setActiveBattles] = useState([]);
  const [incomingTrades, setIncomingTrades] = useState([]);
  const [incomingFriends, setIncomingFriends] = useState([]);

  const [activeBattleData, setActiveBattleData] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [chRes, trRes, frRes] = await Promise.all([
        apiRequest('/battles/challenges'),
        apiRequest('/trades'),
        apiRequest('/friends')
      ]);

      setIncomingChallenges(chRes.incoming || []);
      setOutgoingChallenges(chRes.outgoing || []);
      setActiveBattles(chRes.active || []);
      setIncomingTrades((trRes.trades || []).filter(t => t.status === 'pending' && t.receiver_id === user.id));
      setIncomingFriends(frRes.incomingRequests || []);
    } catch (err) {
      // Silencioso en polling en segundo plano
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3500);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleAcceptChallenge = async (challengeId) => {
    setBusyId(`ch-acc-${challengeId}`);
    try {
      const res = await apiRequest(`/battles/live/${challengeId}/accept`, 'POST', {});
      if (res?.battle) {
        setActiveBattleData(res.battle);
        await fetchNotifications();
        if (onGlobalAction) onGlobalAction();
      }
    } catch (err) {
      showAlert.error('Error al aceptar reto', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectChallenge = async (challengeId) => {
    setBusyId(`ch-rej-${challengeId}`);
    try {
      await apiRequest(`/battles/live/${challengeId}/reject`, 'POST');
      await fetchNotifications();
      if (onGlobalAction) onGlobalAction();
    } catch (err) {
      showAlert.error('Error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelOutgoingChallenge = async (challengeId) => {
    setBusyId(`ch-can-${challengeId}`);
    try {
      await apiRequest(`/battles/live/${challengeId}/cancel`, 'POST');
      await fetchNotifications();
      if (onGlobalAction) onGlobalAction();
    } catch (err) {
      showAlert.error('Error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenBattle = async (battleId) => {
    setBusyId(`ch-open-${battleId}`);
    try {
      const res = await apiRequest(`/battles/live/${battleId}`);
      if (res?.battle) setActiveBattleData(res.battle);
    } catch (err) {
      showAlert.error('Error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRespondTrade = async (tradeId, accept) => {
    setBusyId(`tr-${tradeId}`);
    try {
      if (accept) {
        const res = await apiRequest(`/trades/${tradeId}/accept`, 'POST');
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        showAlert.success('¡Intercambio Completado!', res.message);
      } else {
        const res = await apiRequest(`/trades/${tradeId}/cancel`, 'POST');
        showAlert.info('Propuesta Rechazada', res.message);
      }
      await refreshUser();
      await fetchNotifications();
      if (onGlobalAction) onGlobalAction();
    } catch (err) {
      showAlert.error('Error en intercambio', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRespondFriend = async (requestId, action) => {
    setBusyId(`fr-${requestId}`);
    try {
      const res = await apiRequest('/friends/respond', 'POST', { requestId, action });
      showAlert.success(action === 'accept' ? '¡Nuevo Amigo!' : 'Solicitud Rechazada', res.message);
      await fetchNotifications();
      if (onGlobalAction) onGlobalAction();
    } catch (err) {
      showAlert.error('Error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const hasAny =
    incomingChallenges.length > 0 ||
    outgoingChallenges.length > 0 ||
    activeBattles.length > 0 ||
    incomingTrades.length > 0 ||
    incomingFriends.length > 0;

  if (!user || (!hasAny && !activeBattleData)) return null;

  return (
    <>
      {hasAny && (
        <div className="space-y-2.5 mb-5">
          {/* 1. Retos de combate entrantes (alguien te está esperando) */}
          {incomingChallenges.map((c) => (
            <div
              key={`in-ch-${c.id}`}
              className="bg-gradient-to-r from-cyan-950/95 via-[#0b1222] to-slate-900 border-2 border-cyan-500/60 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg shadow-cyan-500/10"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 animate-pulse shrink-0">
                  <Swords size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-slate-100 truncate">
                    ¡{c.challenger_name} te está esperando para combatir!
                  </h4>
                  <span className="text-[11px] text-cyan-300 font-semibold">
                    {c.battle_type === 'amistoso' ? 'Combate Amistoso (Nv. 5)' : 'Combate Competitivo'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleRejectChallenge(c.id)}
                  disabled={busyId !== null}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => handleAcceptChallenge(c.id)}
                  disabled={busyId !== null}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-xs shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Aceptar Reto
                </button>
              </div>
            </div>
          ))}

          {/* 2. Combates activos en curso */}
          {!activeBattleData && activeBattles.map((ab) => (
            <div
              key={`act-ch-${ab.id}`}
              className="bg-emerald-950/50 border border-emerald-500/50 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Clock size={17} className="text-emerald-400 animate-spin shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-emerald-200 truncate">
                    Combate en curso contra {ab.challenger_id === user?.id ? ab.opponent_name : ab.challenger_name}
                  </h4>
                  <span className="text-[11px] text-emerald-400/80">
                    {ab.battle_type === 'amistoso' ? 'Combate Amistoso' : 'Combate Competitivo'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleOpenBattle(ab.id)}
                disabled={busyId !== null}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow transition-all self-start sm:self-auto shrink-0"
              >
                Entrar al Combate
              </button>
            </div>
          ))}

          {/* 3. Retos salientes esperando respuesta */}
          {!activeBattleData && outgoingChallenges.map((oc) => (
            <div
              key={`out-ch-${oc.id}`}
              className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Clock size={16} className="text-amber-400 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-amber-200 truncate">
                  Esperando a que {oc.opponent_name} acepte tu reto...
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleCancelOutgoingChallenge(oc.id)}
                  disabled={busyId !== null}
                  className="px-3 py-1 bg-slate-950 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleOpenBattle(oc.id)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold"
                >
                  Ver Sala
                </button>
              </div>
            </div>
          ))}

          {/* 4. Propuestas de intercambio entrantes */}
          {incomingTrades.map((tr) => (
            <div
              key={`in-tr-${tr.id}`}
              className="bg-[#0b1222] border border-emerald-500/50 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <ArrowLeftRight size={17} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-100 truncate">
                    {tr.sender_username} propone intercambio: {tr.offered_card_name} ↔ {tr.requested_card_name}
                  </h4>
                  <span className="text-[11px] text-emerald-300">
                    Entregas {tr.requested_card_name} · Recibes {tr.offered_card_name} (Nv.{tr.offered_card_level || 1})
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleRespondTrade(tr.id, false)}
                  disabled={busyId !== null}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1"
                >
                  <X size={13} />
                  <span>Rechazar</span>
                </button>
                <button
                  onClick={() => handleRespondTrade(tr.id, true)}
                  disabled={busyId !== null}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center space-x-1"
                >
                  <Check size={13} />
                  <span>Aceptar</span>
                </button>
              </div>
            </div>
          ))}

          {/* 5. Solicitudes de amistad entrantes */}
          {incomingFriends.map((fr) => (
            <div
              key={`in-fr-${fr.request_id}`}
              className="bg-[#0b1222] border border-amber-500/40 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <UserPlus size={15} />
                </div>
                <span className="text-xs font-bold text-slate-100 truncate">
                  {fr.username} quiere ser tu amigo
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleRespondFriend(fr.request_id, 'reject')}
                  disabled={busyId !== null}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 rounded-xl text-xs font-bold"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => handleRespondFriend(fr.request_id, 'accept')}
                  disabled={busyId !== null}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black"
                >
                  Aceptar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Arena abierta desde la barra global */}
      {activeBattleData && (
        <BattleArenaModal
          initialBattle={activeBattleData}
          onClose={() => {
            setActiveBattleData(null);
            fetchNotifications();
            if (onGlobalAction) onGlobalAction();
          }}
          onBattleFinished={() => {
            fetchNotifications();
            if (onGlobalAction) onGlobalAction();
          }}
        />
      )}
    </>
  );
}
