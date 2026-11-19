import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sword, 
  Shield, 
  Heart, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

export default function BattleArenaModal({ 
  opponentName = 'Misty_01', 
  battleType = 'normal', // 'amistoso' | 'normal'
  onClose,
  onBattleFinished
}) {
  const { user, refreshUser } = useAuth();
  const [battleState, setBattleState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [battleLogs, setBattleLogs] = useState([]);
  const [selectedTargetCardId, setSelectedTargetCardId] = useState(null);
  const [itemUsageMode, setItemUsageMode] = useState(null); // itemKey being used
  const [isGameOver, setIsGameOver] = useState(false);
  const [battleResult, setBattleResult] = useState(null); // 'victoria' | 'derrota'
  const [rewardInfo, setRewardInfo] = useState(null);

  useEffect(() => {
    startBattle();
  }, []);

  const startBattle = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/battles/start', 'POST', {
        opponentName,
        battleType,
        opponentCardId: 131 // Lapras (Mockup 10)
      });

      // Asegurar valores válidos para el combate
      const userActive = data.activeUserCard;
      userActive.current_hp = userActive.current_hp > 0 ? userActive.current_hp : Math.round(userActive.max_hp * 0.55); // 55/100 como en Mockup 10

      setBattleState({
        ...data,
        activeUserCard: userActive
      });

      // Obtener mochila de items
      const teamData = await apiRequest('/battles/team');
      setBattleState(prev => ({
        ...prev,
        userTeam: teamData.team,
        items: teamData.items
      }));

      setBattleLogs([
        `¡Comienza el ${battleType === 'normal' ? 'Reto Normal' : 'Reto Amistoso'} contra ${opponentName}!`,
        `${opponentName} envía a ${data.opponent.name} (Nv. ${data.opponent.level}).`,
        `¡Adelante, ${userActive.name}!`
      ]);
    } catch (err) {
      alert(`Error al iniciar combate: ${err.message}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Turno de Ataque
  const handleAttack = () => {
    if (isGameOver || actionLoading) return;
    setActionLoading(true);

    const { activeUserCard, opponent } = battleState;

    // 1. Daño del jugador
    const userDamage = Math.round((activeUserCard.atk * 0.45) + (Math.random() * 10));
    const newOpponentHp = Math.max(0, opponent.currentHp - userDamage);

    const newLogs = [
      ...battleLogs,
      `💥 ¡${activeUserCard.name} atacó con fuerza! Infligió ${userDamage} de daño a ${opponent.name}.`
    ];

    if (newOpponentHp <= 0) {
      // Victoria
      newLogs.push(`🏆 ¡${opponent.name} ha sido derrotado! ¡Ganaste el combate!`);
      setBattleLogs(newLogs);
      setBattleState(prev => ({
        ...prev,
        opponent: { ...prev.opponent, currentHp: 0 }
      }));
      finishBattle('victoria', activeUserCard.current_hp);
      return;
    }

    // 2. Contraataque del rival
    setTimeout(() => {
      const oppDamage = Math.round((opponent.atk * 0.35) + (Math.random() * 8));
      const newUserHp = Math.max(0, activeUserCard.current_hp - oppDamage);

      newLogs.push(`⚡ ${opponent.name} contraataca causando ${oppDamage} de daño.`);

      if (newUserHp <= 0) {
        newLogs.push(`💀 ¡${activeUserCard.name} ha quedado fuera de combate!`);
        setBattleLogs(newLogs);
        setBattleState(prev => ({
          ...prev,
          opponent: { ...prev.opponent, currentHp: newOpponentHp },
          activeUserCard: { ...prev.activeUserCard, current_hp: 0 }
        }));
        finishBattle('derrota', 0);
      } else {
        setBattleLogs(newLogs);
        setBattleState(prev => ({
          ...prev,
          opponent: { ...prev.opponent, currentHp: newOpponentHp },
          activeUserCard: { ...prev.activeUserCard, current_hp: newUserHp }
        }));
        setActionLoading(false);
      }
    }, 600);
  };

  // Usar item desde la mochila (Mockup 10)
  const handleUseItemOnCard = async (itemKey, targetUserCardId) => {
    setActionLoading(true);
    try {
      const res = await apiRequest('/items/use', 'POST', {
        itemKey,
        userCardId: targetUserCardId
      });

      // Actualizar estado local del equipo y mochila
      setBattleState(prev => {
        const updatedTeam = prev.userTeam.map(c => 
          c.user_card_id === targetUserCardId ? { ...c, current_hp: res.card.current_hp } : c
        );

        let updatedActive = prev.activeUserCard;
        if (updatedActive.user_card_id === targetUserCardId) {
          updatedActive = { ...updatedActive, current_hp: res.card.current_hp };
        }

        const updatedItems = prev.items.map(i =>
          i.item_key === itemKey ? { ...i, quantity: res.remainingQuantity } : i
        );

        return {
          ...prev,
          userTeam: updatedTeam,
          activeUserCard: updatedActive,
          items: updatedItems
        };
      });

      setBattleLogs(prev => [...prev, `🧪 ${res.message}`]);
      setItemUsageMode(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Finalizar combate y registrar en BD
  const finishBattle = async (result, finalHp) => {
    setIsGameOver(true);
    setBattleResult(result);

    try {
      const res = await apiRequest('/battles/finish', 'POST', {
        battleType,
        opponentName,
        result,
        activeUserCardId: battleState.activeUserCard.user_card_id,
        finalUserHp: finalHp
      });

      setRewardInfo(res);
      if (result === 'victoria') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
      await refreshUser();
      if (onBattleFinished) onBattleFinished();
    } catch (err) {
      console.error('Error al registrar final de batalla:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !battleState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-bold text-sm">Entrando al campo de batalla...</p>
        </div>
      </div>
    );
  }

  const { activeUserCard, opponent, userTeam, items } = battleState;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-gray-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Header Bar (Mockup 10) */}
        <div className="bg-gray-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
            <h3 className="font-black text-sm tracking-wide">
              {battleType === 'normal' ? 'Reto normal' : 'Reto amistoso'} contra {opponentName}
            </h3>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-gray-900 font-extrabold flex items-center justify-center text-[10px]">P</span>
              <span>{(user?.coins || 0).toLocaleString()}</span>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Combat Battlefield Arena (Mockup 10) */}
        <div className="p-6 bg-gradient-to-b from-blue-50/50 via-indigo-50/30 to-white relative overflow-hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* User Active Pokemon (Left) */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-full bg-white/90 backdrop-blur p-3 rounded-2xl border border-blue-200 shadow-sm max-w-xs">
                <div className="flex items-center justify-between text-xs font-black text-gray-800 mb-1">
                  <span>{activeUserCard.name} Nv. {activeUserCard.level}</span>
                  <span className={activeUserCard.current_hp === 0 ? 'text-red-600' : 'text-gray-600'}>
                    {activeUserCard.current_hp} / {activeUserCard.max_hp}
                  </span>
                </div>
                {/* HP Bar */}
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeUserCard.current_hp > 50 ? 'bg-green-500' :
                      activeUserCard.current_hp > 20 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, (activeUserCard.current_hp / activeUserCard.max_hp) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Artwork */}
              <div className="h-44 flex items-center justify-center">
                <img 
                  src={activeUserCard.artwork_url} 
                  alt={activeUserCard.name} 
                  className={`h-40 object-contain filter drop-shadow-xl transition-transform ${
                    activeUserCard.current_hp === 0 ? 'grayscale rotate-12 opacity-60' : 'animate-float'
                  }`}
                />
              </div>
            </div>

            {/* Opponent Pokemon (Right) */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-full bg-white/90 backdrop-blur p-3 rounded-2xl border border-blue-200 shadow-sm max-w-xs">
                <div className="flex items-center justify-between text-xs font-black text-gray-800 mb-1">
                  <span>{opponent.name} Nv. {opponent.level}</span>
                  <span className="text-gray-600">{opponent.currentHp} / {opponent.maxHp}</span>
                </div>
                {/* HP Bar */}
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (opponent.currentHp / opponent.maxHp) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Artwork */}
              <div className="h-44 flex items-center justify-center">
                <img 
                  src={opponent.artwork_url} 
                  alt={opponent.name} 
                  className={`h-40 object-contain filter drop-shadow-xl transition-transform ${
                    opponent.currentHp === 0 ? 'grayscale -rotate-12 opacity-60' : 'animate-float [animation-delay:1s]'
                  }`}
                />
              </div>
            </div>

          </div>

          {/* Controls Bar */}
          {!isGameOver && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={handleAttack}
                disabled={actionLoading || activeUserCard.current_hp === 0}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-black text-sm rounded-2xl shadow-lg shadow-red-200 hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <Sword size={18} />
                <span>Atacar</span>
              </button>
            </div>
          )}

          {/* Combat Log Box */}
          <div className="mt-4 bg-gray-950/90 text-gray-200 text-xs p-3 rounded-xl max-h-24 overflow-y-auto font-mono space-y-1">
            {battleLogs.slice(-4).map((log, lidx) => (
              <div key={lidx}>{log}</div>
            ))}
          </div>

        </div>

        {/* ========================================================== */}
        {/* LOWER SECTION: Mockup 10 "Tu equipo" & "Mochila de items" */}
        {/* ========================================================== */}
        <div className="p-6 bg-white border-t border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Section: "Tu equipo" (Mockup 10) */}
          <div className="md:col-span-5 space-y-2">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Tu equipo</h4>
            
            <div className="space-y-2">
              {userTeam.map((card) => {
                const isFainted = card.current_hp === 0;
                const isActive = card.user_card_id === activeUserCard.user_card_id;

                return (
                  <div 
                    key={card.user_card_id}
                    onClick={() => {
                      if (itemUsageMode) {
                        handleUseItemOnCard(itemUsageMode, card.user_card_id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      itemUsageMode ? 'ring-2 ring-blue-400 cursor-pointer hover:bg-blue-50' : ''
                    } ${
                      isActive 
                        ? 'bg-blue-50 border-blue-300' 
                        : isFainted 
                          ? 'bg-red-50 border-red-200 opacity-75' 
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img src={card.sprite_url} alt={card.name} className="w-8 h-8 object-contain" />
                      <div>
                        <span className="font-bold text-gray-900 block leading-tight">{card.name}</span>
                        <span className={`text-[10px] font-semibold ${
                          isActive ? 'text-blue-600' : isFainted ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isActive ? 'Activo' : isFainted ? 'Debilitado' : 'Listo'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-gray-500 font-bold block">
                        {card.current_hp} / {card.max_hp} HP
                      </span>
                      {itemUsageMode && (
                        <span className="text-[10px] text-blue-600 font-bold underline">
                          Aplicar aquí
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: "Mochila de items" (Mockup 10) */}
          <div className="md:col-span-7 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Mochila de items</h4>
              {itemUsageMode && (
                <button
                  onClick={() => setItemUsageMode(null)}
                  className="text-[11px] text-red-600 font-bold hover:underline"
                >
                  Cancelar uso
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {items?.map((item) => {
                const hasQuantity = item.quantity > 0;
                const isSelected = itemUsageMode === item.item_key;

                return (
                  <div 
                    key={item.item_key}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-gray-900">{item.name}</span>
                        <span className="text-[10px] font-black text-gray-500">x{item.quantity}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 block capitalize">{item.rarity}</span>
                    </div>

                    <button
                      onClick={() => setItemUsageMode(item.item_key)}
                      disabled={!hasQuantity || actionLoading}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        hasQuantity
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Usar
                    </button>
                  </div>
                );
              })}
            </div>

            {itemUsageMode && (
              <p className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg font-semibold animate-pulse text-center">
                👉 Ahora haz clic en el Pokémon de "Tu equipo" donde deseas aplicar este objeto.
              </p>
            )}
          </div>

        </div>

        {/* Game Over Modal Screen */}
        {isGameOver && rewardInfo && (
          <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">
                {battleResult === 'victoria' ? '🎉 ¡Victoria Magistral!' : 'Derrota en combate'}
              </h3>
              <p className="text-xs text-blue-200">
                {rewardInfo.message}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs font-bold">
                <span>+{rewardInfo.xpEarned} XP de Pase</span>
                <span>+{rewardInfo.coinsEarned} PokéMonedas</span>
                {rewardInfo.itemDropped && (
                  <span className="text-amber-300">🎁 ¡Obtuviste {rewardInfo.itemDropped}!</span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white text-gray-900 font-bold rounded-xl text-xs hover:bg-gray-100 shadow transition-colors"
            >
              Cerrar y Volver
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
