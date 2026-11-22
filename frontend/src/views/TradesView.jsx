import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { ArrowLeftRight, Check, X, Sparkles, CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react';

export default function TradesView({ onGoToPokedex }) {
  const { user, refreshUser } = useAuth();
  const [trades, setTrades] = useState([]);
  const [friends, setFriends] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [catalogCards, setCatalogCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Propose Trade Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [selectedOfferedCardId, setSelectedOfferedCardId] = useState('');
  const [selectedRequestedCardId, setSelectedRequestedCardId] = useState('');

  useEffect(() => {
    fetchTradesAndData();
  }, []);

  const fetchTradesAndData = async () => {
    setLoading(true);
    try {
      const [tradesRes, friendsRes, albumRes, pokedexRes] = await Promise.all([
        apiRequest('/trades'),
        apiRequest('/friends'),
        apiRequest('/cards/album'),
        apiRequest('/cards/pokedex')
      ]);

      setTrades(tradesRes.trades || []);
      setFriends(friendsRes.friends || []);
      setAlbumCards(albumRes.cards || []);
      setCatalogCards(pokedexRes.cards || []);

      if (friendsRes.friends?.length > 0) setSelectedFriendId(friendsRes.friends[0].id);
      if (albumRes.cards?.length > 0) setSelectedOfferedCardId(albumRes.cards[0].user_card_id);
      if (pokedexRes.cards?.length > 0) setSelectedRequestedCardId(pokedexRes.cards[0].id);
    } catch (err) {
      console.error('Error fetching trade data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Confirmar intercambio en transacción de PostgreSQL
  const handleConfirmTrade = async (tradeId) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest(`/trades/${tradeId}/accept`, 'POST');
      setMessage({ text: res.message, type: 'success' });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      await refreshUser();
      await fetchTradesAndData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancelar intercambio
  const handleCancelTrade = async (tradeId) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest(`/trades/${tradeId}/cancel`, 'POST');
      setMessage({ text: res.message, type: 'success' });
      await fetchTradesAndData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Crear propuesta de intercambio
  const handleCreateTrade = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/trades/create', 'POST', {
        receiverId: parseInt(selectedFriendId),
        offeredUserCardId: parseInt(selectedOfferedCardId),
        requestedCardId: parseInt(selectedRequestedCardId)
      });
      setMessage({ text: res.message, type: 'success' });
      setShowCreateModal(false);
      await fetchTradesAndData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingTrades = trades.filter(t => t.status === 'pending');

  return (
    <div className="space-y-8 pb-12 select-none text-slate-100">
      
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ArrowLeftRight size={24} className="text-cyan-400" />
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Intercambio de Cartas</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Intercambia cartas repetidas por Pokémon que te faltan en la Pokédex de forma 100% segura mediante transacciones atómicas de PostgreSQL.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 self-start sm:self-auto uppercase tracking-wider"
        >
          <PlusCircle size={16} />
          <span>Proponer Intercambio</span>
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/70 text-red-300 border border-red-500/40'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Trade Showcase */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando propuestas de intercambio...</p>
        </div>
      ) : pendingTrades.length > 0 ? (
        <div className="space-y-6">
          {pendingTrades.map((trade) => {
            const isUserSender = trade.sender_id === user?.id;
            const otherPartyName = isUserSender ? trade.receiver_username : trade.sender_username;

            return (
              <div 
                key={trade.id}
                className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6"
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono font-semibold border-b border-slate-800/80 pb-3">
                  <span>Propuesta #{trade.id} · Estado: <strong className="text-cyan-400">Pendiente de confirmación</strong></span>
                  <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                </div>

                {/* 2 Cards Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                  
                  {/* Left Side: "Tú ofreces" */}
                  <div className="md:col-span-5 bg-[#0e1628] rounded-2xl p-5 border border-slate-800 flex flex-col items-center text-center shadow-md">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 self-start">
                      {isUserSender ? 'Tú ofreces' : `Ofrecido por ${trade.sender_username}`}
                    </span>

                    <div className="h-40 flex items-center justify-center p-2 bg-slate-950/60 rounded-xl border border-slate-900 w-full">
                      <img 
                        src={trade.offered_card_artwork} 
                        alt={trade.offered_card_name}
                        className="max-h-full object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)] hover:scale-105 transition-transform" 
                      />
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-black text-slate-100">{trade.offered_card_name}</h3>
                      <p className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-full mt-1 inline-block">
                        Copia repetida (x{trade.sender_card_copies || 4})
                      </p>
                    </div>
                  </div>

                  {/* Middle: Icon <> */}
                  <div className="md:col-span-1 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                      <ArrowLeftRight size={22} />
                    </div>
                  </div>

                  {/* Right Side: "Recibes de Misty_01" */}
                  <div className="md:col-span-5 bg-[#0e1628] rounded-2xl p-5 border border-slate-800 flex flex-col items-center text-center shadow-md">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 self-start">
                      {isUserSender ? `Recibes de ${otherPartyName}` : 'Tú entregas'}
                    </span>

                    <div className="h-40 flex items-center justify-center p-2 bg-slate-950/60 rounded-xl border border-slate-900 w-full">
                      <img 
                        src={trade.requested_card_artwork} 
                        alt={trade.requested_card_name}
                        className="max-h-full object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)] hover:scale-105 transition-transform" 
                      />
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-black text-slate-100">{trade.requested_card_name}</h3>
                      <p className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-0.5 rounded-full mt-1 inline-block">
                        {parseInt(trade.sender_has_requested) === 0 ? 'Falta en tu Pokédex' : 'Ya registrada en tu Pokédex'}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => handleCancelTrade(trade.id)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={() => handleConfirmTrade(trade.id)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 uppercase tracking-wider"
                  >
                    <Check size={16} />
                    <span>Confirmar Intercambio</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0b1222] rounded-3xl p-12 text-center border border-slate-800 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
            <ArrowLeftRight size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-100">No tienes intercambios pendientes en este momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Usa el botón "Proponer Intercambio" para ofrecer una de tus copias repetidas a un amigo a cambio del Pokémon que necesitas.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-xs shadow-lg shadow-cyan-500/20 uppercase tracking-wider"
          >
            Proponer Intercambio Ahora
          </button>
        </div>
      )}

      {/* Propose Trade Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-750 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-100">Proponer Nuevo Intercambio</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTrade} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Amigo con quien intercambiar:</label>
                <select
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {friends.map((f) => (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                      {f.username} ({f.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Carta que tú ofreces:</label>
                <select
                  value={selectedOfferedCardId}
                  onChange={(e) => setSelectedOfferedCardId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {albumCards.map((c) => (
                    <option key={c.user_card_id} value={c.user_card_id} className="bg-slate-900 text-slate-200">
                      {c.name} (Nv. {c.level}) · #{c.card_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Pokémon que solicitas recibir:</label>
                <select
                  value={selectedRequestedCardId}
                  onChange={(e) => setSelectedRequestedCardId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {catalogCards.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                      #{c.id.toString().padStart(3, '0')} - {c.name} ({c.types?.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-xs shadow-md uppercase tracking-wider"
                >
                  {actionLoading ? 'Enviando...' : 'Enviar Propuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
