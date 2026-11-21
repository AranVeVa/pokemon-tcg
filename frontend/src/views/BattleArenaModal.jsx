import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sword, 
  Shield, 
  Heart, 
  Zap, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Flame,
  Droplets,
  Leaf,
  Ghost,
  Eye,
  Snowflake,
  Activity,
  ArrowRightLeft
} from 'lucide-react';
import { getEffectivenessMultiplier } from '../../../backend/src/data/movesList';

// Helper de iconos y colores por tipo de ataque
const TYPE_STYLES = {
  Fuego: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-400', lightBg: 'bg-red-50', icon: Flame },
  Agua: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-400', lightBg: 'bg-blue-50', icon: Droplets },
  Planta: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-400', lightBg: 'bg-emerald-50', icon: Leaf },
  Eléctrico: { bg: 'bg-amber-400', text: 'text-amber-600', border: 'border-amber-400', lightBg: 'bg-amber-50', icon: Zap },
  Fantasma: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-400', lightBg: 'bg-purple-50', icon: Ghost },
  Psíquico: { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-400', lightBg: 'bg-pink-50', icon: Eye },
  Hielo: { bg: 'bg-cyan-400', text: 'text-cyan-600', border: 'border-cyan-400', lightBg: 'bg-cyan-50', icon: Snowflake },
  Normal: { bg: 'bg-gray-400', text: 'text-gray-600', border: 'border-gray-400', lightBg: 'bg-gray-50', icon: Activity },
};

export default function BattleArenaModal({ 
  opponentName = 'Misty_01', 
  battleType = 'normal', // 'amistoso' | 'normal'
  initialCardId,
  onClose,
  onBattleFinished
}) {
  const { user, refreshUser } = useAuth();
  const [battleState, setBattleState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [battleLogs, setBattleLogs] = useState([]);
  
  // Battle Energy Meter (0 - 100) para el ataque cargado tipo Pokémon GO
  const [energy, setEnergy] = useState(0);
  const [oppEnergy, setOppEnergy] = useState(0);

  // FX & Animation States
  const [activeAnimation, setActiveAnimation] = useState(null); // 'fire' | 'water' | 'electric' | 'grass' | 'ghost' | 'ice' | 'normal'
  const [floatingDamage, setFloatingDamage] = useState(null); // { text, typeMultiplier, isCrit, target: 'player'|'opp' }
  const [attackerAction, setAttackerAction] = useState(null); // 'player' | 'opp'
  const [hitTarget, setHitTarget] = useState(null); // 'player' | 'opp'

  // Items usage
  const [itemUsageMode, setItemUsageMode] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [battleResult, setBattleResult] = useState(null);
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
        selectedUserCardId: initialCardId,
        opponentCardId: 131 // Lapras (Mockup 10)
      });

      const userActive = data.activeUserCard;
      if (userActive.current_hp <= 0 && battleType === 'amistoso') {
        userActive.current_hp = userActive.max_hp;
      }

      setBattleState({
        ...data,
        activeUserCard: userActive
      });

      const teamData = await apiRequest('/battles/team');
      setBattleState(prev => ({
        ...prev,
        userTeam: teamData.team,
        items: teamData.items
      }));

      setBattleLogs([
        `¡Comienza el ${battleType === 'normal' ? 'Reto Normal' : 'Reto Amistoso (Sparring)'} contra ${opponentName}!`,
        `${opponentName} envía a ${data.opponent.name} (Nv. ${data.opponent.level}).`,
        `¡Adelante, ${userActive.name}! (IV: ${userActive.iv_percentage || 85}%)`
      ]);
    } catch (err) {
      alert(`Error al iniciar combate: ${err.message}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Calcular daño usando Stats (ATK vs DEF, Tipo de Movimiento, STAB y Crítico)
  const calculateDamage = (attacker, defender, move) => {
    // Multiplicador elemental (Tabla de Tipos)
    let mult = 1.0;
    try {
      mult = getEffectivenessMultiplier(move.type, defender.types || []);
    } catch (e) {
      mult = 1.0;
    }

    // STAB (Same Type Attack Bonus): x1.2 si el tipo del ataque coincide con el Pokémon
    const hasStab = attacker.types?.includes(move.type);
    const stabBonus = hasStab ? 1.2 : 1.0;

    // Probabilidad de Golpe Crítico basado en Speed
    const critChance = Math.min(0.25, (attacker.spd || 50) / 250);
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? 1.5 : 1.0;

    // Fórmula equilibrada: (Ataque * Poder / Defensa) * Multiplicadores
    const atkStat = attacker.atk || 50;
    const defStat = Math.max(20, defender.def || 45);
    const rawDamage = ((atkStat * (move.power || 20)) / (defStat * 1.5)) * mult * stabBonus * critMultiplier;
    const damage = Math.max(5, Math.round(rawDamage + (Math.random() * 4)));

    let effectivenessText = '';
    if (mult >= 1.5) effectivenessText = '¡Es súper eficaz!';
    else if (mult <= 0.7) effectivenessText = 'No es muy eficaz...';
    if (isCrit) effectivenessText += ' ¡Golpe Crítico!';

    return { damage, mult, isCrit, effectivenessText };
  };

  // Ejecutar ataque seleccionado por el jugador
  const executePlayerMove = (move) => {
    if (isGameOver || actionLoading) return;
    setActionLoading(true);

    const { activeUserCard, opponent } = battleState;

    // 1. Iniciar Animación de Ataque del Jugador
    setAttackerAction('player');
    setActiveAnimation(move.animationType || 'normal');

    setTimeout(() => {
      // Impacto en el rival
      setAttackerAction(null);
      setHitTarget('opp');

      const { damage, mult, isCrit, effectivenessText } = calculateDamage(activeUserCard, opponent, move);
      const newOpponentHp = Math.max(0, opponent.currentHp - damage);

      // Flotante de daño
      setFloatingDamage({
        text: `-${damage}`,
        extra: effectivenessText,
        mult,
        isCrit,
        target: 'opp'
      });

      // Gestionar Energía
      let newEnergy = energy;
      if (move.category === 'fast') {
        newEnergy = Math.min(100, energy + (move.energyGen || 20));
      } else {
        newEnergy = Math.max(0, energy - (move.energyCost || 50));
      }
      setEnergy(newEnergy);

      const newLogs = [
        ...battleLogs,
        `💥 ¡${activeUserCard.name} usó ${move.name}! Infligió ${damage} de daño. ${effectivenessText}`
      ];

      setTimeout(() => {
        setHitTarget(null);
        setActiveAnimation(null);
        setFloatingDamage(null);

        // Verificar si rival fue derrotado
        if (newOpponentHp <= 0) {
          newLogs.push(`🏆 ¡${opponent.name} ha sido derrotado! ¡Victoria para ${user.username}!`);
          setBattleLogs(newLogs);
          setBattleState(prev => ({
            ...prev,
            opponent: { ...prev.opponent, currentHp: 0 }
          }));
          finishBattle('victoria', activeUserCard.current_hp);
          return;
        }

        // Actualizar vida rival
        setBattleState(prev => ({
          ...prev,
          opponent: { ...prev.opponent, currentHp: newOpponentHp }
        }));
        setBattleLogs(newLogs);

        // 2. Contraataque del Rival (IA)
        setTimeout(() => {
          executeOpponentCounterAttack(newOpponentHp);
        }, 700);

      }, 700);

    }, 500);
  };

  // Contraataque de la IA del rival
  const executeOpponentCounterAttack = (currentOppHp) => {
    const { activeUserCard, opponent } = battleState;
    if (currentOppHp <= 0 || isGameOver) return;

    // Elegir ataque del rival
    const oppMoves = opponent.moves || [];
    let chosenMove = oppMoves[0] || { name: 'Placaje', power: 15, animationType: 'normal', type: 'Normal' };

    // Si tiene energía para cargado, lo desata
    if (oppMoves.length > 1 && oppEnergy >= 50) {
      chosenMove = oppMoves[1];
      setOppEnergy(0);
    } else {
      setOppEnergy(prev => Math.min(100, prev + 25));
    }

    setAttackerAction('opp');
    setActiveAnimation(chosenMove.animationType || 'normal');

    setTimeout(() => {
      setAttackerAction(null);
      setHitTarget('player');

      const { damage, mult, isCrit, effectivenessText } = calculateDamage(opponent, activeUserCard, chosenMove);
      const newUserHp = Math.max(0, activeUserCard.current_hp - damage);

      setFloatingDamage({
        text: `-${damage}`,
        extra: effectivenessText,
        mult,
        isCrit,
        target: 'player'
      });

      const updatedLogs = [
        ...battleLogs,
        `⚡ ${opponent.name} respondió con ${chosenMove.name} causando ${damage} de daño. ${effectivenessText}`
      ];

      setTimeout(() => {
        setHitTarget(null);
        setActiveAnimation(null);
        setFloatingDamage(null);

        if (newUserHp <= 0) {
          updatedLogs.push(`💀 ¡${activeUserCard.name} ha quedado fuera de combate!`);
          setBattleLogs(updatedLogs);
          setBattleState(prev => ({
            ...prev,
            activeUserCard: { ...prev.activeUserCard, current_hp: 0 }
          }));
          finishBattle('derrota', 0);
        } else {
          setBattleLogs(updatedLogs);
          setBattleState(prev => ({
            ...prev,
            activeUserCard: { ...prev.activeUserCard, current_hp: newUserHp }
          }));
          setActionLoading(false);
        }
      }, 700);

    }, 500);
  };

  // Usar item desde la mochila (Mockup 10)
  const handleUseItemOnCard = async (itemKey, targetUserCardId) => {
    setActionLoading(true);
    try {
      const res = await apiRequest('/items/use', 'POST', {
        itemKey,
        userCardId: targetUserCardId
      });

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

  // Cambiar Pokémon activo en combate
  const handleSwitchPokemon = (card) => {
    if (card.current_hp <= 0 && battleType === 'normal') {
      alert(`${card.name} está debilitado. Usa un revividor para devolverlo al combate.`);
      return;
    }
    setBattleState(prev => ({
      ...prev,
      activeUserCard: card
    }));
    setEnergy(0);
    setBattleLogs(prev => [...prev, `🔄 ¡Cambiaste a ${card.name}!`]);
  };

  // Finalizar combate
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
        confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
      }
      await refreshUser();
      if (onBattleFinished) onBattleFinished();
    } catch (err) {
      console.error('Error al registrar combate:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !battleState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-bold text-sm">Cargando campo de batalla animado...</p>
        </div>
      </div>
    );
  }

  const { activeUserCard, opponent, userTeam, items } = battleState;
  const userMoves = activeUserCard.moves || [];
  const fastMove = userMoves[0] || { name: 'Ataque Rápido', power: 12, type: 'Normal', energyGen: 15 };
  const chargedMove = userMoves[1] || { name: 'Golpe Cargado', power: 75, type: 'Normal', energyCost: 50 };
  const canUseCharged = energy >= (chargedMove.energyCost || 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-300 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 text-white px-6 py-3 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <span className={`w-3 h-3 rounded-full ${battleType === 'normal' ? 'bg-red-500 animate-ping' : 'bg-green-400'}`}></span>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {battleType === 'normal' ? '⚔️ Reto Normal Competitivo' : '🤝 Reto Amistoso (Sparring)'} contra {opponentName}
              </h3>
              <span className="text-[10px] text-gray-400">
                {battleType === 'normal' ? 'Daño permanente · Premios de items' : 'Práctica amistosa · Pokémon 100% restaurados'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-gray-800 px-2.5 py-1 rounded-full">
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

        {/* ======================================================== */}
        {/* BATTLEFIELD WITH ANIMATED SPRITES & VISUAL FX OVERLAYS */}
        {/* ======================================================== */}
        <div className="p-6 bg-gradient-to-b from-sky-100 via-slate-50 to-emerald-50/40 relative overflow-hidden min-h-[300px]">
          
          {/* Elemental Attack FX Overlay */}
          {activeAnimation && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              {activeAnimation === 'fire' && (
                <div className="w-full h-full bg-red-600/30 animate-pulse flex items-center justify-center">
                  <Flame size={120} className="text-red-500 animate-bounce drop-shadow-[0_0_35px_rgba(239,68,68,0.9)]" />
                </div>
              )}
              {activeAnimation === 'water' && (
                <div className="w-full h-full bg-blue-600/25 animate-pulse flex items-center justify-center">
                  <Droplets size={120} className="text-blue-500 animate-bounce drop-shadow-[0_0_35px_rgba(59,130,246,0.9)]" />
                </div>
              )}
              {activeAnimation === 'electric' && (
                <div className="w-full h-full bg-yellow-400/30 animate-ping flex items-center justify-center">
                  <Zap size={140} className="text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,1)]" />
                </div>
              )}
              {activeAnimation === 'grass' && (
                <div className="w-full h-full bg-emerald-600/25 flex items-center justify-center">
                  <Leaf size={120} className="text-emerald-500 animate-spin drop-shadow-[0_0_35px_rgba(16,185,129,0.9)]" />
                </div>
              )}
              {activeAnimation === 'ghost' && (
                <div className="w-full h-full bg-purple-900/40 flex items-center justify-center">
                  <Ghost size={120} className="text-purple-400 animate-pulse drop-shadow-[0_0_35px_rgba(147,51,234,0.9)]" />
                </div>
              )}
              {activeAnimation === 'ice' && (
                <div className="w-full h-full bg-cyan-300/30 flex items-center justify-center">
                  <Snowflake size={120} className="text-cyan-400 animate-spin drop-shadow-[0_0_35px_rgba(34,211,238,0.9)]" />
                </div>
              )}
              {activeAnimation === 'normal' && (
                <div className="w-full h-full bg-white/40 animate-ping flex items-center justify-center">
                  <Sword size={110} className="text-gray-800 drop-shadow-lg" />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
            
            {/* Player's Pokémon (Left - Back Animated Sprite facing enemy) */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-full bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-blue-200 shadow-md max-w-xs relative">
                <div className="flex items-center justify-between text-xs font-black text-gray-900 mb-1">
                  <span>{activeUserCard.name} Nv. {activeUserCard.level}</span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    IV {activeUserCard.iv_percentage || 85}%
                  </span>
                </div>

                {/* HP Bar */}
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                  <span>HP</span>
                  <span>{activeUserCard.current_hp} / {activeUserCard.max_hp}</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeUserCard.current_hp > activeUserCard.max_hp * 0.5 ? 'bg-green-500' :
                      activeUserCard.current_hp > activeUserCard.max_hp * 0.2 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, (activeUserCard.current_hp / activeUserCard.max_hp) * 100)}%` }}
                  ></div>
                </div>

                {/* Energy Bar for Charged Attack */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-blue-700">
                    <span className="flex items-center space-x-1">
                      <Zap size={11} className="fill-blue-600 text-blue-600" />
                      <span>Energía de Ataque</span>
                    </span>
                    <span>{energy}%</span>
                  </div>
                  <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${energy}%` }}
                    ></div>
                  </div>
                </div>

                {/* Floating Damage on Player */}
                {floatingDamage && floatingDamage.target === 'player' && (
                  <div className="absolute -top-6 right-2 animate-bounce bg-red-600 text-white font-black text-sm px-2.5 py-1 rounded-xl shadow-lg z-20">
                    {floatingDamage.text}
                    {floatingDamage.extra && (
                      <span className="block text-[9px] font-bold text-yellow-200">{floatingDamage.extra}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Player Sprite: Gen 5 / Showdown Animated Back Sprite */}
              <div className="h-44 flex items-center justify-center relative">
                <img 
                  src={activeUserCard.animated_back_url || activeUserCard.artwork_url} 
                  alt={activeUserCard.name}
                  className={`max-h-40 object-contain filter drop-shadow-xl transition-all duration-200 ${
                    attackerAction === 'player' ? 'translate-x-8 scale-110' : ''
                  } ${
                    hitTarget === 'player' ? 'brightness-150 contrast-200 animate-pulse hue-rotate-90' : ''
                  } ${
                    activeUserCard.current_hp === 0 ? 'grayscale rotate-45 opacity-50' : ''
                  }`}
                  onError={(e) => {
                    // Fallback to front animated or artwork if back animated fails
                    e.target.src = activeUserCard.artwork_url;
                  }}
                />
              </div>
            </div>

            {/* Opponent's Pokémon (Right - Front Animated Sprite facing player) */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-full bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-blue-200 shadow-md max-w-xs relative">
                <div className="flex items-center justify-between text-xs font-black text-gray-900 mb-1">
                  <span>{opponent.name} Nv. {opponent.level}</span>
                  <span className="text-[10px] text-gray-400 font-bold">{opponentName}</span>
                </div>

                {/* HP Bar */}
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                  <span>HP</span>
                  <span>{opponent.currentHp} / {opponent.maxHp}</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (opponent.currentHp / opponent.maxHp) * 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 mt-2 pt-1 border-t border-gray-100">
                  <span>DEF: {opponent.def || 40}</span>
                  <span>ATQ: {opponent.atk || 45}</span>
                  <span>SPD: {opponent.spd || 45}</span>
                </div>

                {/* Floating Damage on Opponent */}
                {floatingDamage && floatingDamage.target === 'opp' && (
                  <div className="absolute -top-6 left-2 animate-bounce bg-red-600 text-white font-black text-sm px-2.5 py-1 rounded-xl shadow-lg z-20">
                    {floatingDamage.text}
                    {floatingDamage.extra && (
                      <span className="block text-[9px] font-bold text-yellow-200">{floatingDamage.extra}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Opponent Sprite: Gen 5 / Showdown Animated Front Sprite */}
              <div className="h-44 flex items-center justify-center relative">
                <img 
                  src={opponent.animated_front_url || opponent.artwork_url} 
                  alt={opponent.name}
                  className={`max-h-40 object-contain filter drop-shadow-xl transition-all duration-200 ${
                    attackerAction === 'opp' ? '-translate-x-8 scale-110' : ''
                  } ${
                    hitTarget === 'opp' ? 'brightness-150 contrast-200 animate-pulse hue-rotate-180' : ''
                  } ${
                    opponent.currentHp === 0 ? 'grayscale -rotate-45 opacity-50' : ''
                  }`}
                  onError={(e) => {
                    e.target.src = opponent.artwork_url;
                  }}
                />
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* MOVE SELECTION BUTTONS (Fast Move + Charged Move) */}
          {/* ======================================================== */}
          {!isGameOver && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              
              {/* 1. Ataque Rápido */}
              <button
                onClick={() => executePlayerMove(fastMove)}
                disabled={actionLoading || activeUserCard.current_hp === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all flex items-center space-x-2.5 group"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Sword size={16} />
                </div>
                <div className="text-left">
                  <span className="text-xs uppercase tracking-tight block font-bold text-blue-100">Ataque Rápido</span>
                  <span className="text-sm font-black">{fastMove.name} ({fastMove.power} dmg)</span>
                </div>
              </button>

              {/* 2. Ataque Cargado (Glows when energy >= cost) */}
              <button
                onClick={() => executePlayerMove(chargedMove)}
                disabled={actionLoading || !canUseCharged || activeUserCard.current_hp === 0}
                className={`px-6 py-3 font-black rounded-2xl shadow-lg transition-all flex items-center space-x-2.5 ${
                  canUseCharged
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:scale-105 text-white shadow-amber-300 animate-pulse'
                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Zap size={16} className={canUseCharged ? 'fill-yellow-300 text-yellow-300' : ''} />
                </div>
                <div className="text-left">
                  <span className="text-xs uppercase tracking-tight block font-bold">
                    {canUseCharged ? '¡ATAQUE CARGADO LISTO!' : `Cargado (${energy}/${chargedMove.energyCost || 50}⚡)`}
                  </span>
                  <span className="text-sm font-black">{chargedMove.name} ({chargedMove.power} dmg)</span>
                </div>
              </button>

            </div>
          )}

          {/* Combat Log Box */}
          <div className="mt-4 bg-gray-950/90 text-gray-200 text-xs p-3 rounded-xl max-h-24 overflow-y-auto font-mono space-y-1 border border-gray-800">
            {battleLogs.slice(-4).map((log, lidx) => (
              <div key={lidx}>{log}</div>
            ))}
          </div>

        </div>

        {/* ======================================================== */}
        {/* LOWER SECTION: Mockup 10 "Tu equipo" & "Mochila de items" */}
        {/* ======================================================== */}
        <div className="p-5 sm:p-6 bg-white border-t border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Section: "Tu equipo" (Mockup 10 + Switcher) */}
          <div className="md:col-span-5 space-y-2">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
              Tu equipo (haz clic para cambiar)
            </h4>
            
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
                      } else if (!isActive && !isGameOver) {
                        handleSwitchPokemon(card);
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                      itemUsageMode ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                    } ${
                      isActive 
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' 
                        : isFainted 
                          ? 'bg-red-50/70 border-red-200 opacity-70' 
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img src={card.sprite_url} alt={card.name} className="w-8 h-8 object-contain" />
                      <div>
                        <span className="font-bold text-gray-900 block leading-tight">{card.name}</span>
                        <span className={`text-[10px] font-semibold ${
                          isActive ? 'text-blue-600 font-bold' : isFainted ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isActive ? 'Activo en arena' : isFainted ? 'Debilitado' : 'Listo'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-gray-500 font-bold block">
                        {card.current_hp} / {card.max_hp} HP
                      </span>
                      {itemUsageMode && (
                        <span className="text-[10px] text-blue-600 font-bold underline">
                          Aplicar objeto
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
                👉 Ahora haz clic en el Pokémon de "Tu equipo" para curarlo o revivirlo.
              </p>
            )}
          </div>

        </div>

        {/* Victory / Defeat Screen */}
        {isGameOver && rewardInfo && (
          <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-gray-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-blue-800">
            <div>
              <h3 className="text-xl font-black">
                {battleResult === 'victoria' ? '🎉 ¡Victoria Magistral!' : 'Derrota en combate'}
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {rewardInfo.message}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs font-bold">
                <span>+{rewardInfo.xpEarned} XP de Pase</span>
                <span>+{rewardInfo.coinsEarned} PokéMonedas</span>
                {rewardInfo.itemDropped && (
                  <span className="text-amber-300">🎁 ¡Item obtenido: {rewardInfo.itemDropped}!</span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white text-gray-900 font-bold rounded-xl text-xs hover:bg-gray-100 shadow-md transition-colors shrink-0"
            >
              Cerrar y Volver
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
