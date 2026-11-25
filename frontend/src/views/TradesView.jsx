import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  ArrowLeftRight,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Copy,
  Clock,
  History
} from 'lucide-react';
import TradeProposalModal from './TradeProposalModal';
import { trackEvent } from '../utils/analytics';

export default function TradesView({
  initialFriendId = null,
  initialOfferedUserCardId = null,
  initialOpenModal = false,
  onTradesChanged
}) {
  const { user, refreshUser } = useAuth();
  const [trades, setTrades] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(initialOpenModal);
  const [modalFriendId, setModalFriendId] = useState(initialFriendId);
  const [modalCardId, setModalCardId] = useState(initialOfferedUserCardId);

  useEffect(() => {
    fetchTradesAndData();
  }, []);

  useEffect(() => {
    if (initialOpenModal) {
      setModalFriendId(initialFriendId);
      setModalCardId(initialOfferedUserCardId);
      setShowCreateModal(true);
    }
  }, [initialOpenModal, initialFriendId, initialOfferedUserCardId]);

  const fetchTradesAndData = async () => {
    setLoading(true);
    try {
      const [tradesRes, albumRes] = await Promise.all([
        apiRequest('/trades'),
        apiRequest('/cards/album')
      ]);
      setTrades(tradesRes.trades || []);
      setAlbumCards(albumRes.cards || []);
    } catch (err) {
      console.error('Error fetching trade data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTrade = async (tradeId) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest(`/trades/${tradeId}/accept`, 'POST');
      setMessage({ text: res.message, type: 'success' });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      trackEvent('trade_accepted', { trade_id: tradeId });
      await refreshUser();
      await fetchTradesAndData();
      if (onTradesChanged) onTradesChanged();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTrade = async (tradeId) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest(`/trades/${tradeId}/cancel`, 'POST');
      setMessage({ text: res.message, type: 'success' });
      await fetchTradesAndData();
      if (onTradesChanged) onTradesChanged();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Calcular cartas repetidas disponibles para tradear (x2+)
  const duplicateGroups = React.useMemo(() => {
    const map = new Map();
    for (const c of albumCards) {
      if (!map.has(c.card_id)) {
        map.set(c.card_id, { ...c, copies: [c] });
      } else {
        map.get(c.card_id).copies.push(c);
      }
    }
    return Array.from(map.values()).filter(g => g.copies.length >= 2);
  }, [albumCards]);

  const pendingTrades = trades.filter(t => t.status === 'pending');
  const incomingPending = pendingTrades.filter(t => t.receiver_id === user?.id);
  const outgoingPending = pendingTrades.filter(t => t.sender_id === user?.id);
  const historyTrades = trades.filter(t => t.status !== 'pending').slice(0, 8);

  return (
    <div className="space-y-6 select-none text-slate-100">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0b1222] p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <ArrowLeftRight size={20} className="text-cyan-400 shrink-0" />
            <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">Intercambio con Amigos</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Cambia cartas repetidas (o cualquiera libre de tu colección) con tus amigos aceptados en una transacción atómica segura (+100 XP para ambos).
          </p>
        </div>

        <button
          onClick={() => {
            setModalFriendId(null);
            setModalCardId(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 shrink-0 uppercase tracking-wider"
        >
          <PlusCircle size={16} />
          <span>Proponer Intercambio</span>
        </button>
      </div>

      {/* Visualización de cartas repetidas listas para intercambiar */}
      <div className="bg-[#0b1222] rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Copy size={15} className="text-emerald-400" />
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
              Tus Cartas Repetidas Listas para Tradear ({duplicateGroups.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Al tener 2 o más copias conservas la especie en tu Pokédex
          </span>
        </div>

        {duplicateGroups.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no tienes cartas repetidas, pero también puedes intercambiar cualquier carta libre de tu álbum.
          </p>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {duplicateGroups.map((grp) => {
              const freeCopy = grp.copies.find(c => !c.in_pending_trade) || grp.copies[0];
              return (
                <button
                  key={grp.card_id}
                  onClick={() => {
                    setModalFriendId(null);
                    setModalCardId(freeCopy.user_card_id);
                    setShowCreateModal(true);
                  }}
                  className="shrink-0 flex items-center space-x-2.5 bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 hover:border-cyan-500/50 rounded-2xl px-3 py-2 transition-all text-left"
                >
                  <img src={grp.sprite_url || grp.artwork_url} alt={grp.name} className="w-9 h-9 object-contain" />
                  <div>
                    <span className="text-xs font-bold text-slate-100 block">{grp.name}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      x{grp.copies.length} copias · Tradear
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success'
            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
            : 'bg-red-950/70 text-red-300 border border-red-500/40'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Propuestas Pendientes */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-9 h-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando propuestas...</p>
        </div>
      ) : pendingTrades.length > 0 ? (
        <div className="space-y-4">
          {incomingPending.length > 0 && (
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 px-1">
              Propuestas Recibidas ({incomingPending.length})
            </h3>
          )}

          {pendingTrades.map((trade) => {
            const isUserSender = trade.sender_id === user?.id;
            const otherPartyName = isUserSender ? trade.receiver_username : trade.sender_username;

            return (
              <div
                key={trade.id}
                className="bg-[#0b1222] rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono font-semibold border-b border-slate-800/80 pb-3">
                  <span>
                    Propuesta #{trade.id} ·{' '}
                    <strong className={isUserSender ? 'text-cyan-400' : 'text-amber-300'}>
                      {isUserSender ? `Esperando a ${otherPartyName}` : `${trade.sender_username} quiere intercambiar`}
                    </strong>
                  </span>
                  <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                </div>

                {/* Comparación */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                  {/* Ofrecida */}
                  <div className="md:col-span-5 bg-[#0e1628] rounded-2xl p-4 border border-slate-800 flex flex-col items-center text-center">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 self-start">
                      {isUserSender ? 'Tú ofreces' : `${trade.sender_username} ofrece`}
                    </span>
                    <div className="h-32 flex items-center justify-center p-2 bg-slate-950/60 rounded-xl border border-slate-900 w-full">
                      <img
                        src={trade.offered_card_artwork}
                        alt={trade.offered_card_name}
                        className="max-h-full object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]"
                      />
                    </div>
                    <div className="mt-2.5 space-y-1">
                      <h4 className="text-base font-black text-slate-100">
                        {trade.offered_card_name}{' '}
                        <span className="text-xs font-mono text-cyan-400">Nv.{trade.offered_card_level || 1}</span>
                      </h4>
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block">
                        {isUserSender
                          ? (trade.sender_card_copies > 1 ? `Repetida (x${trade.sender_card_copies})` : 'Copia única (x1)')
                          : (parseInt(trade.receiver_has_offered) === 0 ? '¡Te falta en Pokédex!' : `Ya tienes x${trade.receiver_has_offered}`)
                        }
                      </span>
                    </div>
                  </div>

                  {/* Flecha */}
                  <div className="md:col-span-1 flex items-center justify-center py-1">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                      <ArrowLeftRight size={18} />
                    </div>
                  </div>

                  {/* Solicitada */}
                  <div className="md:col-span-5 bg-[#0e1628] rounded-2xl p-4 border border-slate-800 flex flex-col items-center text-center">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 self-start">
                      {isUserSender ? `Recibes de ${otherPartyName}` : 'Tú entregas a cambio'}
                    </span>
                    <div className="h-32 flex items-center justify-center p-2 bg-slate-950/60 rounded-xl border border-slate-900 w-full">
                      <img
                        src={trade.requested_card_artwork}
                        alt={trade.requested_card_name}
                        className="max-h-full object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]"
                      />
                    </div>
                    <div className="mt-2.5 space-y-1">
                      <h4 className="text-base font-black text-slate-100">{trade.requested_card_name}</h4>
                      <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-0.5 rounded-full inline-block">
                        {isUserSender
                          ? (parseInt(trade.sender_has_requested) === 0 ? 'Falta en tu Pokédex' : `Ya tienes x${trade.sender_has_requested}`)
                          : (trade.receiver_card_copies > 1 ? `Tienes repetida (x${trade.receiver_card_copies})` : 'Tu única copia (x1)')
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleCancelTrade(trade.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center space-x-1"
                  >
                    <X size={14} />
                    <span>{isUserSender ? 'Cancelar Propuesta' : 'Rechazar'}</span>
                  </button>

                  {!isUserSender ? (
                    <button
                      onClick={() => handleConfirmTrade(trade.id)}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5 uppercase tracking-wider"
                    >
                      <Check size={15} />
                      <span>Aceptar Intercambio</span>
                    </button>
                  ) : (
                    <span className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] font-mono text-amber-300 flex items-center space-x-1.5">
                      <Clock size={13} />
                      <span>Esperando a {otherPartyName}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0b1222] rounded-3xl p-8 sm:p-10 text-center border border-slate-800 shadow-xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
            <ArrowLeftRight size={28} />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-100">No tienes intercambios pendientes</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Haz clic en "Proponer Intercambio" o usa el botón Intercambiar junto a cualquiera de tus amigos o cartas.
          </p>
        </div>
      )}

      {/* Historial breve */}
      {historyTrades.length > 0 && (
        <div className="bg-[#0b1222] rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-black text-slate-300 uppercase tracking-wider">
            <History size={15} className="text-slate-400" />
            <span>Historial Reciente</span>
          </div>
          <div className="space-y-2">
            {historyTrades.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-850 text-xs">
                <span className="text-slate-300">
                  <strong>{t.sender_username}</strong> ({t.offered_card_name}) ↔ <strong>{t.receiver_username}</strong> ({t.requested_card_name})
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  t.status === 'accepted'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}>
                  {t.status === 'accepted' ? 'Completado' : t.status === 'rejected' ? 'Rechazado' : 'Cancelado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TradeProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialFriendId={modalFriendId}
        initialOfferedUserCardId={modalCardId}
        onTradeCreated={async (msg) => {
          setMessage({ text: msg, type: 'success' });
          await fetchTradesAndData();
          if (onTradesChanged) onTradesChanged();
        }}
      />
    </div>
  );
}
