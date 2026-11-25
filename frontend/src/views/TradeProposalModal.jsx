import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import confetti from 'canvas-confetti';
import {
  X,
  ArrowLeftRight,
  Users,
  AlertCircle,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { trackEvent } from '../utils/analytics';

export default function TradeProposalModal({
  isOpen,
  onClose,
  onTradeCreated,
  initialFriendId = null,
  initialOfferedUserCardId = null,
  initialSpeciesId = null
}) {
  const [friends, setFriends] = useState([]);
  const [albumCards, setAlbumCards] = useState([]);
  const [friendCards, setFriendCards] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [selectedOfferedCardId, setSelectedOfferedCardId] = useState('');
  const [selectedRequestedCardId, setSelectedRequestedCardId] = useState('');
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingFriendCards, setLoadingFriendCards] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadInitialData();
  }, [isOpen, initialFriendId, initialOfferedUserCardId, initialSpeciesId]);

  useEffect(() => {
    if (!isOpen || !selectedFriendId) {
      setFriendCards([]);
      setSelectedRequestedCardId('');
      return;
    }
    loadFriendCards(selectedFriendId);
  }, [isOpen, selectedFriendId]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [friendsRes, albumRes] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/cards/album')
      ]);

      const friendsList = friendsRes.friends || [];
      const albumList = albumRes.cards || [];
      setFriends(friendsList);
      setAlbumCards(albumList);

      // Contar copias por especie para detectar repetidas
      const countBySpecies = {};
      albumList.forEach(c => {
        countBySpecies[c.card_id] = (countBySpecies[c.card_id] || 0) + 1;
      });

      const availableToOffer = albumList.filter(c => !c.in_pending_trade);

      // Seleccionar amigo inicial
      const targetFriend = initialFriendId
        ? friendsList.find(f => f.id === parseInt(initialFriendId, 10))
        : friendsList[0];
      setSelectedFriendId(targetFriend ? String(targetFriend.id) : '');

      // Seleccionar carta ofrecida inicial
      let defaultOffered = null;
      if (initialOfferedUserCardId) {
        defaultOffered = availableToOffer.find(c => c.user_card_id === parseInt(initialOfferedUserCardId, 10));
      } else if (initialSpeciesId) {
        defaultOffered = availableToOffer.find(c => c.card_id === parseInt(initialSpeciesId, 10));
      }
      if (!defaultOffered) {
        // Preferir una repetida libre primero
        defaultOffered = availableToOffer.find(c => countBySpecies[c.card_id] > 1) || availableToOffer[0];
      }

      if (defaultOffered) {
        setSelectedOfferedCardId(String(defaultOffered.user_card_id));
        if (countBySpecies[defaultOffered.card_id] > 1 && !initialOfferedUserCardId && !initialSpeciesId) {
          setOnlyDuplicates(true);
        } else {
          setOnlyDuplicates(false);
        }
      } else {
        setSelectedOfferedCardId('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'No se pudieron cargar tus amigos o cartas');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendCards = async (friendId) => {
    setLoadingFriendCards(true);
    try {
      const res = await apiRequest(`/trades/friend-cards/${friendId}`);
      const list = res.cards || [];
      setFriendCards(list);
      if (list.length > 0) {
        // Preferir una que falte en mi Pokédex
        const missing = list.find(c => Number(c.my_copies) === 0);
        setSelectedRequestedCardId(String((missing || list[0]).card_id));
      } else {
        setSelectedRequestedCardId('');
      }
    } catch (err) {
      setFriendCards([]);
      setSelectedRequestedCardId('');
    } finally {
      setLoadingFriendCards(false);
    }
  };

  if (!isOpen) return null;

  const speciesCounts = {};
  albumCards.forEach(c => {
    speciesCounts[c.card_id] = (speciesCounts[c.card_id] || 0) + 1;
  });

  const offerableCards = albumCards.filter(c => {
    if (c.in_pending_trade) return false;
    if (onlyDuplicates) return (speciesCounts[c.card_id] || 0) > 1;
    return true;
  });

  const chosenOfferCard = albumCards.find(c => String(c.user_card_id) === String(selectedOfferedCardId));
  const chosenRequestCard = friendCards.find(c => String(c.card_id) === String(selectedRequestedCardId));
  const chosenOfferCount = chosenOfferCard ? (speciesCounts[chosenOfferCard.card_id] || 1) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFriendId || !selectedOfferedCardId || !selectedRequestedCardId) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiRequest('/trades/create', 'POST', {
        receiverId: parseInt(selectedFriendId, 10),
        offeredUserCardId: parseInt(selectedOfferedCardId, 10),
        requestedCardId: parseInt(selectedRequestedCardId, 10)
      });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      trackEvent('trade_proposed', {
        offered_card_id: chosenOfferCard?.card_id,
        requested_card_id: parseInt(selectedRequestedCardId, 10)
      });
      if (onTradeCreated) onTradeCreated(res.message);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto select-none">
      <div className="bg-[#0b1222] rounded-3xl p-4 sm:p-6 max-w-xl w-full border border-slate-750 shadow-2xl space-y-4 text-slate-100 max-h-[92dvh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <ArrowLeftRight size={18} className="text-cyan-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-black text-slate-100 truncate">Proponer Intercambio</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl text-xs font-semibold bg-red-950/70 text-red-300 border border-red-500/40 flex items-center space-x-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-bold">Cargando colecciones...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <Users size={34} className="mx-auto text-slate-500" />
            <h4 className="text-sm font-black text-slate-200">Necesitas al menos un amigo aceptado</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Agrega a tus compañeros en "Amigos y Combates" para poder enviarles propuestas de intercambio.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Amigo */}
            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-400 mb-1 uppercase">
                1. Amigo con quien intercambiar
              </label>
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

            {/* 2. Carta que tú ofreces + filtro de repetidas */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  2. Carta que tú entregas
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextOnly = !onlyDuplicates;
                    setOnlyDuplicates(nextOnly);
                    const nextList = albumCards.filter(c => !c.in_pending_trade && (!nextOnly || (speciesCounts[c.card_id] || 0) > 1));
                    if (nextList.length > 0 && !nextList.some(c => String(c.user_card_id) === String(selectedOfferedCardId))) {
                      setSelectedOfferedCardId(String(nextList[0].user_card_id));
                    }
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center space-x-1 ${
                    onlyDuplicates
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-750'
                  }`}
                >
                  <Copy size={11} />
                  <span>{onlyDuplicates ? 'Mostrando solo repetidas' : 'Filtrar solo repetidas'}</span>
                </button>
              </div>

              {offerableCards.length === 0 ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300">
                  {onlyDuplicates
                    ? 'No tienes cartas repetidas libres en este momento. Desactiva el filtro para ver tus cartas únicas.'
                    : 'No tienes cartas libres disponibles para intercambiar.'}
                </div>
              ) : (
                <select
                  value={selectedOfferedCardId}
                  onChange={(e) => setSelectedOfferedCardId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {offerableCards.map((c) => {
                    const qty = speciesCounts[c.card_id] || 1;
                    return (
                      <option key={c.user_card_id} value={c.user_card_id} className="bg-slate-900 text-slate-200">
                        #{c.card_id.toString().padStart(3, '0')} {c.name} · Nv.{c.level} · IV {c.iv_percentage || 85}% ({qty > 1 ? `Repetida x${qty}` : 'Única x1'})
                      </option>
                    );
                  })}
                </select>
              )}

              {chosenOfferCard && chosenOfferCount === 1 && (
                <p className="text-[11px] text-amber-300 flex items-center space-x-1.5 bg-amber-950/30 border border-amber-500/30 px-2.5 py-1.5 rounded-xl">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>Esta es tu única copia de {chosenOfferCard.name}. Al aceptarse, pasará al álbum de tu amigo.</span>
                </p>
              )}
            </div>

            {/* 3. Carta del amigo que solicitas */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase">
                3. Pokémon disponible en la colección de tu amigo
              </label>

              {loadingFriendCards ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                  Consultando cartas disponibles de tu amigo...
                </div>
              ) : friendCards.length === 0 ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300">
                  Este amigo aún no tiene cartas registradas disponibles para intercambiar.
                </div>
              ) : (
                <select
                  value={selectedRequestedCardId}
                  onChange={(e) => setSelectedRequestedCardId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {friendCards.map((c) => (
                    <option key={c.card_id} value={c.card_id} className="bg-slate-900 text-slate-200">
                      #{c.card_id.toString().padStart(3, '0')} {c.name} · Amigo tiene x{c.friend_copies} · {Number(c.my_copies) === 0 ? '★ Te falta' : `Ya tienes x${c.my_copies}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Vista previa visual del Trade */}
            {chosenOfferCard && chosenRequestCard && (
              <div className="grid grid-cols-11 gap-2 items-center bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
                <div className="col-span-5 text-center space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Entregas</span>
                  <img
                    src={chosenOfferCard.artwork_url || chosenOfferCard.sprite_url}
                    alt={chosenOfferCard.name}
                    className="h-16 mx-auto object-contain"
                  />
                  <span className="text-xs font-black text-slate-100 block truncate">{chosenOfferCard.name}</span>
                  <span className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    chosenOfferCount > 1 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                  }`}>
                    {chosenOfferCount > 1 ? `Repetida x${chosenOfferCount}` : 'Única x1'}
                  </span>
                </div>

                <div className="col-span-1 flex justify-center">
                  <ArrowLeftRight size={18} className="text-cyan-400" />
                </div>

                <div className="col-span-5 text-center space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Recibes</span>
                  <img
                    src={chosenRequestCard.artwork_url || chosenRequestCard.sprite_url}
                    alt={chosenRequestCard.name}
                    className="h-16 mx-auto object-contain"
                  />
                  <span className="text-xs font-black text-slate-100 block truncate">{chosenRequestCard.name}</span>
                  <span className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    Number(chosenRequestCard.my_copies) === 0
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}>
                    {Number(chosenRequestCard.my_copies) === 0 ? 'Falta en Pokédex' : `Ya tienes x${chosenRequestCard.my_copies}`}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedOfferedCardId || !selectedRequestedCardId}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-black rounded-xl text-xs shadow-md uppercase tracking-wider"
              >
                {submitting ? 'Enviando...' : 'Enviar Propuesta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
