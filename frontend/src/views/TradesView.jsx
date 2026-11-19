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

      setTrades(tradesRes.trades);
      setFriends(friendsRes.friends);
      setAlbumCards(albumRes.cards);
      setCatalogCards(pokedexRes.cards);

      if (friendsRes.friends.length > 0) setSelectedFriendId(friendsRes.friends[0].id);
      if (albumRes.cards.length > 0) setSelectedOfferedCardId(albumRes.cards[0].user_card_id);
      if (pokedexRes.cards.length > 0) setSelectedRequestedCardId(pokedexRes.cards[0].id);
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
    <div className="space-y-8 pb-12">
      
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Intercambio de cartas</h1>
          <p className="text-xs text-gray-500">
            Intercambia cartas repetidas por Pokémon que te faltan en la Pokédex de forma 100% segura mediante transacciones atómicas en PostgreSQL.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <PlusCircle size={16} />
          <span>Proponer Intercambio</span>
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Trade Showcase (Mockup 7: Tú ofreces Eevee <-> Recibes de Misty_01 Lapras) */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500">Cargando propuestas de intercambio...</p>
        </div>
      ) : pendingTrades.length > 0 ? (
        <div className="space-y-6">
          {pendingTrades.map((trade) => {
            const isUserSender = trade.sender_id === user?.id;
            const otherPartyName = isUserSender ? trade.receiver_username : trade.sender_username;

            return (
              <div 
                key={trade.id}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6"
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs text-gray-400 font-semibold border-b border-gray-100 pb-3">
                  <span>Propuesta #{trade.id} · Estado: <strong className="text-blue-600">Pendiente de confirmación</strong></span>
                  <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                </div>

                {/* 2 Cards Comparison (Mockup 7) */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                  
                  {/* Left Side: "Tú ofreces" */}
                  <div className="md:col-span-5 bg-gradient-to-b from-gray-50 to-white rounded-2xl p-5 border border-gray-200 flex flex-col items-center text-center shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 self-start">
                      {isUserSender ? 'Tú ofreces' : `Ofrecido por ${trade.sender_username}`}
                    </span>

                    <div className="h-40 flex items-center justify-center p-2">
                      <img 
                        src={trade.offered_card_artwork} 
                        alt={trade.offered_card_name}
                        className="max-h-full object-contain filter drop-shadow hover:scale-105 transition-transform" 
                      />
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-black text-gray-900">{trade.offered_card_name}</h3>
                      <p className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full mt-1">
                        Copia repetida (x{trade.sender_card_copies || 4})
                      </p>
                    </div>
                  </div>

                  {/* Middle: Icon <> */}
                  <div className="md:col-span-1 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                      <ArrowLeftRight size={22} />
                    </div>
                  </div>

                  {/* Right Side: "Recibes de Misty_01" */}
                  <div className="md:col-span-5 bg-gradient-to-b from-gray-50 to-white rounded-2xl p-5 border border-gray-200 flex flex-col items-center text-center shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 self-start">
                      {isUserSender ? `Recibes de ${otherPartyName}` : 'Tú entregas'}
                    </span>

                    <div className="h-40 flex items-center justify-center p-2">
                      <img 
                        src={trade.requested_card_artwork} 
                        alt={trade.requested_card_name}
                        className="max-h-full object-contain filter drop-shadow hover:scale-105 transition-transform" 
                      />
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-black text-gray-900">{trade.requested_card_name}</h3>
                      <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mt-1">
                        {parseInt(trade.sender_has_requested) === 0 ? 'Te falta en tu Pokédex' : 'Ya registrada en tu Pokédex'}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Action Buttons (Mockup 7: [Cancelar] [Confirmar intercambio]) */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleCancelTrade(trade.id)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={() => handleConfirmTrade(trade.id)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200 hover:shadow-lg transition-all flex items-center space-x-2"
                  >
                    <Check size={16} />
                    <span>Confirmar intercambio</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <ArrowLeftRight size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No tienes intercambios pendientes en este momento</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            ¡Usa el botón "Proponer Intercambio" para ofrecer una de tus copias repetidas a un amigo a cambio del Pokémon que necesitas!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs shadow"
          >
            Proponer intercambio ahora
          </button>
        </div>
      )}

      {/* Propose Trade Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-gray-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-gray-900">Proponer Nuevo Intercambio</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTrade} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Amigo con quien intercambiar:</label>
                <select
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  {friends.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.username} ({f.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Carta que tú ofreces:</label>
                <select
                  value={selectedOfferedCardId}
                  onChange={(e) => setSelectedOfferedCardId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  {albumCards.map((c) => (
                    <option key={c.user_card_id} value={c.user_card_id}>
                      {c.name} (Nv. {c.level}) · #{c.card_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pokémon que solicitas recibir:</label>
                <select
                  value={selectedRequestedCardId}
                  onChange={(e) => setSelectedRequestedCardId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  {catalogCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id.toString().padStart(3, '0')} - {c.name} ({c.types?.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow"
                >
                  {actionLoading ? 'Enviando...' : 'Enviar propuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
