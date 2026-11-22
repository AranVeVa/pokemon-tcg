import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRightLeft,
  Volume2,
  VolumeX,
  Backpack,
  Target,
  Clock,
  Award
} from 'lucide-react';
import { 
  getEffectivenessMultiplier, 
  getEffectivenessLabel, 
  get4MovesForCard 
} from '../utils/typeEffectiveness';
import { battleAudio } from '../utils/battleAudio';

// Helper de estilos por tipo elemental
const TYPE_COLORS = {
  Fuego: { bg: 'bg-red-500', glow: 'shadow-red-500/50', border: 'border-red-400', text: 'text-red-400', badge: 'bg-red-950/80 text-red-300 border-red-500/40', icon: Flame },
  Agua: { bg: 'bg-blue-500', glow: 'shadow-blue-500/50', border: 'border-blue-400', text: 'text-blue-400', badge: 'bg-blue-950/80 text-blue-300 border-blue-500/40', icon: Droplets },
  Planta: { bg: 'bg-emerald-500', glow: 'shadow-emerald-500/50', border: 'border-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40', icon: Leaf },
  Eléctrico: { bg: 'bg-amber-400', glow: 'shadow-amber-400/50', border: 'border-amber-400', text: 'text-amber-400', badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40', icon: Zap },
  Fantasma: { bg: 'bg-purple-600', glow: 'shadow-purple-600/50', border: 'border-purple-400', text: 'text-purple-400', badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40', icon: Ghost },
  Psíquico: { bg: 'bg-pink-500', glow: 'shadow-pink-500/50', border: 'border-pink-400', text: 'text-pink-400', badge: 'bg-pink-950/80 text-pink-300 border-pink-500/40', icon: Eye },
  Hielo: { bg: 'bg-cyan-400', glow: 'shadow-cyan-400/50', border: 'border-cyan-400', text: 'text-cyan-400', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40', icon: Snowflake },
  Normal: { bg: 'bg-gray-400', glow: 'shadow-gray-400/50', border: 'border-gray-400', text: 'text-gray-300', badge: 'bg-gray-800 text-gray-300 border-gray-600', icon: Activity }
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
  
  // Turn State RPG: 'player' | 'opp'
  const [turn, setTurn] = useState('player');
  const [turnNumber, setTurnNumber] = useState(1);

  // Audio Toggle
  const [soundOn, setSoundOn] = useState(true);

  // Command Deck Sub-view: 'attack' | 'shield' | 'bag' | 'switch'
  const [activeMenuTab, setActiveMenuTab] = useState('attack');

  // Pokémon GO Energy Gauge (0 - 100%)
  const [energy, setEnergy] = useState(20);
  const [oppEnergy, setOppEnergy] = useState(15);

  // Buffs / Shields
  const [playerShieldActive, setPlayerShieldActive] = useState(false);
  const [playerAtkBuff, setPlayerAtkBuff] = useState(1.0);
  const [playerDefBuff, setPlayerDefBuff] = useState(1.0);

  // Cinematic FX
  const [activeAnimation, setActiveAnimation] = useState(null); // 'fire' | 'water' | 'electric' | 'grass' | 'ghost' | 'normal' | 'buff'
  const [floatingDamage, setFloatingDamage] = useState(null); // { text, extra, target: 'player'|'opp', isHeal: bool }
  const [attackerAction, setAttackerAction] = useState(null); // 'player' | 'opp'
  const [hitTarget, setHitTarget] = useState(null); // 'player' | 'opp'
  const [screenShake, setScreenShake] = useState(false);
  const [chargedCircleFX, setChargedCircleFX] = useState(false);

  // End Game
  const [isGameOver, setIsGameOver] = useState(false);
  const [battleResult, setBattleResult] = useState(null);
  const [rewardInfo, setRewardInfo] = useState(null);

  useEffect(() => {
    startBattle();
  }, []);

  const toggleSound = () => {
    const newState = battleAudio.toggle();
    setSoundOn(newState);
  };

  const startBattle = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/battles/start', 'POST', {
        opponentName,
        battleType,
        selectedUserCardId: initialCardId,
        opponentCardId: 131 // Lapras
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
        `🏟️ ¡BIENVENIDO AL ESTADIO DE COMBATE POKÉMON!`,
        `⚔️ Reto: ${battleType === 'normal' ? 'Competitivo Oficial' : 'Combate Amistoso (Sparring)'} contra ${opponentName}.`,
        `👤 ${opponentName} envía al combate a ${data.opponent.name} (Nv. ${data.opponent.level})!`,
        `⭐ ¡Adelante, ${userActive.name}! (IV: ${userActive.iv_percentage || 85}% ⭐⭐⭐)`
      ]);
    } catch (err) {
      alert(`Error al iniciar combate: ${err.message}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Calcular daño usando Stats, Multiplicadores, STAB, Crítico y Buffs
  const calculateDamage = (attacker, defender, move, isAttackerPlayer) => {
    let mult = 1.0;
    try {
      mult = getEffectivenessMultiplier(move.type, defender.types || []);
    } catch (e) {
      mult = 1.0;
    }

    const hasStab = attacker.types?.includes(move.type);
    const stabBonus = hasStab ? 1.25 : 1.0;

    // Crítico
    const baseCritRate = (attacker.spd || 50) / 280;
    const extraCrit = move.critBonus || 0;
    const isCrit = Math.random() < Math.min(0.65, baseCritRate + extraCrit);
    const critMultiplier = isCrit ? 1.6 : 1.0;

    // Buffs
    const atkMultiplier = isAttackerPlayer ? playerAtkBuff : 1.0;
    let defMultiplier = !isAttackerPlayer ? playerDefBuff : 1.0;

    // Escudo Protector (Pokémon GO Shield / Dodge)
    if (!isAttackerPlayer && playerShieldActive) {
      defMultiplier *= 4.0; // Reduce el daño un 75%
    }

    const rawAtk = (attacker.atk || 50) * atkMultiplier;
    const rawDef = Math.max(15, (defender.def || 45) * defMultiplier);
    const baseDamage = ((rawAtk * (move.power || 20)) / (rawDef * 1.4)) * mult * stabBonus * critMultiplier;
    const damage = Math.max(4, Math.round(baseDamage + (Math.random() * 5)));

    let effectivenessText = '';
    if (mult >= 1.5) effectivenessText = '¡Es súper eficaz!';
    else if (mult <= 0.7) effectivenessText = 'No es muy eficaz...';
    if (isCrit) effectivenessText += ' ¡GOLPE CRÍTICO!';
    if (!isAttackerPlayer && playerShieldActive) effectivenessText += ' 🛡️ ¡Escudo absorbió el 75%!';

    return { damage, mult, isCrit, effectivenessText };
  };

  // 1. EJECUTAR ATAQUE DEL JUGADOR
  const handlePlayerAttack = (move) => {
    if (isGameOver || actionLoading || turn !== 'player') return;
    
    // Si es cargado y no alcanza energía
    if (move.category === 'charged' && energy < (move.energyCost || 45)) {
      alert(`¡Necesitas ${move.energyCost || 45}⚡ de Energía para usar ${move.name}!`);
      return;
    }

    setActionLoading(true);
    battleAudio.playButton();

    const { activeUserCard, opponent } = battleState;

    // Si es movimiento de Buff / Estado
    if (move.category === 'buff') {
      executeBuffMove(move, activeUserCard);
      return;
    }

    // Efecto Pokémon GO de Círculo Cargado
    const isCharged = move.category === 'charged';
    if (isCharged) {
      setChargedCircleFX(true);
      battleAudio.playAttack(move.type, true);
    } else {
      battleAudio.playAttack(move.type, false);
    }

    setAttackerAction('player');
    setActiveAnimation(move.animationType || 'normal');

    setTimeout(() => {
      setChargedCircleFX(false);
      setAttackerAction(null);
      setHitTarget('opp');
      setScreenShake(true);

      const { damage, mult, isCrit, effectivenessText } = calculateDamage(activeUserCard, opponent, move, true);
      const newOpponentHp = Math.max(0, opponent.currentHp - damage);

      if (isCrit) battleAudio.playCrit();

      // Flotante de daño
      setFloatingDamage({
        text: `-${damage} HP`,
        extra: effectivenessText,
        target: 'opp'
      });

      // Gestionar Energía
      let newEnergy = energy;
      if (move.category === 'charged') {
        newEnergy = Math.max(0, energy - (move.energyCost || 45));
      } else {
        newEnergy = Math.min(100, energy + (move.energyGen || 18));
      }
      setEnergy(newEnergy);

      const newLogs = [
        ...battleLogs,
        `💥 ¡${activeUserCard.name} usó ${move.name}! Daño: ${damage}. ${effectivenessText}`
      ];

      setTimeout(() => {
        setHitTarget(null);
        setActiveAnimation(null);
        setFloatingDamage(null);
        setScreenShake(false);

        // Victoria
        if (newOpponentHp <= 0) {
          battleAudio.playVictory();
          newLogs.push(`🏆 ¡${opponent.name} enemigo ha caído! ¡Victoria para ${user.username}!`);
          setBattleLogs(newLogs);
          setBattleState(prev => ({
            ...prev,
            opponent: { ...prev.opponent, currentHp: 0 }
          }));
          finishBattle('victoria', activeUserCard.current_hp);
          return;
        }

        // Actualizar vida rival y pasar turno a la IA
        setBattleState(prev => ({
          ...prev,
          opponent: { ...prev.opponent, currentHp: newOpponentHp }
        }));
        setBattleLogs(newLogs);
        setTurn('opp');

        // Turno del Rival tras 750ms
        setTimeout(() => {
          executeOpponentTurn(newOpponentHp);
        }, 750);

      }, 700);

    }, isCharged ? 800 : 450);
  };

  // Movimiento de Buff / Refuerzo
  const executeBuffMove = (move, activeUserCard) => {
    setActiveAnimation('buff');
    battleAudio.playShield();

    setTimeout(() => {
      setActiveAnimation(null);
      setEnergy(prev => Math.min(100, prev + (move.energyGen || 25)));

      let logMsg = `🛡️ ¡${activeUserCard.name} usó ${move.name}!`;

      if (move.buffType === 'atk') {
        setPlayerAtkBuff(prev => prev * 1.35);
        logMsg += ' ¡Su Ataque aumentó un 35%!';
      } else if (move.healAmount) {
        const healed = Math.min(activeUserCard.max_hp, activeUserCard.current_hp + move.healAmount);
        setBattleState(prev => ({
          ...prev,
          activeUserCard: { ...prev.activeUserCard, current_hp: healed }
        }));
        setFloatingDamage({ text: `+${move.healAmount} HP`, target: 'player', isHeal: true });
        logMsg += ` ¡Recuperó +${move.healAmount} HP!`;
      } else {
        setPlayerDefBuff(prev => prev * 1.35);
        logMsg += ' ¡Su Defensa aumentó un 35%!';
      }

      setBattleLogs(prev => [...prev, logMsg]);

      setTimeout(() => {
        setFloatingDamage(null);
        setTurn('opp');
        setTimeout(() => {
          executeOpponentTurn(battleState.opponent.currentHp);
        }, 750);
      }, 700);

    }, 500);
  };

  // 2. ACTIVAR ESCUDO / ESQUIVAR (POKÉMON GO SHIELD)
  const handleActivateShield = () => {
    if (isGameOver || actionLoading || turn !== 'player') return;
    setActionLoading(true);
    battleAudio.playShield();

    setPlayerShieldActive(true);
    setEnergy(prev => Math.min(100, prev + 25)); // Esquivar / cubrirse da energía

    setBattleLogs(prev => [
      ...prev,
      `🛡️ ¡${battleState.activeUserCard.name} adopta POSICIÓN DEFENSIVA! Daño rival reducido 75% y +25⚡ de Energía!`
    ]);

    setTimeout(() => {
      setTurn('opp');
      setTimeout(() => {
        executeOpponentTurn(battleState.opponent.currentHp);
      }, 700);
    }, 600);
  };

  // 3. TURNO DEL RIVAL (IA RPG)
  const executeOpponentTurn = (currentOppHp) => {
    const { activeUserCard, opponent } = battleState;
    if (currentOppHp <= 0 || isGameOver) return;

    // Movimientos del rival
    const oppMoves = opponent.moves || [];
    let chosenMove = oppMoves[0] || { name: 'Placaje Rápido', power: 18, type: 'Normal', animationType: 'normal' };

    // Si la IA tiene energía para su ataque cargado (50%+), lo lanza
    if (oppMoves.length > 1 && oppEnergy >= 45) {
      chosenMove = oppMoves[1];
      setOppEnergy(0);
      battleAudio.playAttack(chosenMove.type || 'normal', true);
    } else {
      setOppEnergy(prev => Math.min(100, prev + 22));
      battleAudio.playAttack(chosenMove.type || 'normal', false);
    }

    setAttackerAction('opp');
    setActiveAnimation(chosenMove.animationType || 'normal');

    setTimeout(() => {
      setAttackerAction(null);
      setHitTarget('player');
      setScreenShake(true);

      const { damage, mult, isCrit, effectivenessText } = calculateDamage(opponent, activeUserCard, chosenMove, false);
      const newUserHp = Math.max(0, activeUserCard.current_hp - damage);

      setFloatingDamage({
        text: `-${damage} HP`,
        extra: effectivenessText,
        target: 'player'
      });

      const updatedLogs = [
        ...battleLogs,
        `⚡ ${opponent.name} rival lanzó ${chosenMove.name}! Recibiste ${damage} de daño. ${effectivenessText}`
      ];

      setTimeout(() => {
        setHitTarget(null);
        setActiveAnimation(null);
        setFloatingDamage(null);
        setScreenShake(false);
        setPlayerShieldActive(false); // El escudo se consume tras absorber el golpe

        if (newUserHp <= 0) {
          battleAudio.playDefeat();
          updatedLogs.push(`💀 ¡${activeUserCard.name} ha caído debilitado!`);
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
          // Vuelve el turno al jugador
          setTurn('player');
          setTurnNumber(prev => prev + 1);
          setActionLoading(false);
        }
      }, 700);

    }, 500);
  };

  // 4. USAR OBJETO EN COMBATE (POCIONES / REVIVIR)
  const handleUseItemInBattle = async (itemKey) => {
    if (isGameOver || actionLoading) return;
    setActionLoading(true);
    battleAudio.playHeal();

    try {
      const activeCardId = battleState.activeUserCard.user_card_id;
      const res = await apiRequest('/items/use', 'POST', {
        itemKey,
        userCardId: activeCardId
      });

      const healAmount = res.card.current_hp - battleState.activeUserCard.current_hp;

      setBattleState(prev => ({
        ...prev,
        activeUserCard: { ...prev.activeUserCard, current_hp: res.card.current_hp },
        items: prev.items.map(i => i.item_key === itemKey ? { ...i, quantity: res.remainingQuantity } : i)
      }));

      setFloatingDamage({
        text: `+${healAmount} HP`,
        extra: '¡Curación!',
        target: 'player',
        isHeal: true
      });

      setBattleLogs(prev => [
        ...prev,
        `🧪 ¡Usaste ${res.item?.name || 'Objeto'} en ${battleState.activeUserCard.name}! Recuperó ${healAmount} HP.`
      ]);

      setTimeout(() => {
        setFloatingDamage(null);
        setActiveMenuTab('attack');
        // Pasar turno al rival tras usar objeto
        setTurn('opp');
        setTimeout(() => {
          executeOpponentTurn(battleState.opponent.currentHp);
        }, 700);
      }, 800);

    } catch (err) {
      alert(`No se pudo usar el objeto: ${err.message}`);
      setActionLoading(false);
    }
  };

  // 5. RELEVAR / CAMBIAR POKÉMON EN COMBATE
  const handleSwitchPokemon = (targetCard) => {
    if (isGameOver || actionLoading) return;
    if (targetCard.current_hp <= 0 && battleType === 'normal') {
      alert(`${targetCard.name} está debilitado. Usa un Revivir en la mochila para devolverlo al combate.`);
      return;
    }
    if (targetCard.user_card_id === battleState.activeUserCard.user_card_id) {
      setActiveMenuTab('attack');
      return;
    }

    setActionLoading(true);
    battleAudio.playSwitchSound?.();

    setBattleState(prev => ({
      ...prev,
      activeUserCard: targetCard
    }));
    setEnergy(15);
    setPlayerAtkBuff(1.0);
    setPlayerDefBuff(1.0);

    setBattleLogs(prev => [
      ...prev,
      `🔄 ¡Regresa ${battleState.activeUserCard.name}! ¡Adelante, ${targetCard.name}!`
    ]);

    setTimeout(() => {
      setActiveMenuTab('attack');
      setTurn('opp');
      setTimeout(() => {
        executeOpponentTurn(battleState.opponent.currentHp);
      }, 700);
    }, 600);
  };

  // FINALIZAR COMBATE
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
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-md">
        <div className="text-center text-white space-y-4">
          <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-cyan-500/50"></div>
          <div>
            <h3 className="text-lg font-black tracking-wider text-cyan-300">CARGANDO ESTADIO AAA...</h3>
            <p className="text-xs text-gray-400">Preparando arena 3D, sprites Showdown y tabla de turnos</p>
          </div>
        </div>
      </div>
    );
  }

  const { activeUserCard, opponent, userTeam, items } = battleState;
  const availableMoves = get4MovesForCard(activeUserCard);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-950/90 backdrop-blur-md animate-fade-in select-none">
      
      {/* AAA ARENA CONTAINER - Locked Responsive Height, No Scrollbar */}
      <div className={`bg-gradient-to-b from-slate-950 via-slate-900 to-gray-950 text-white rounded-3xl w-full max-w-5xl h-[94vh] max-h-[880px] border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col justify-between relative ${screenShake ? 'animate-screen-shake' : ''}`}>

        {/* ======================================================== */}
        {/* 1. TOP HEADER & ESPORTS STATUS BAR */}
        {/* ======================================================== */}
        <div className="bg-slate-900/90 backdrop-blur-md px-5 py-2.5 flex items-center justify-between border-b border-cyan-500/20 z-20">
          <div className="flex items-center space-x-3">
            <span className={`w-3 h-3 rounded-full ${battleType === 'normal' ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`}></span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  {battleType === 'normal' ? 'COMBATE OFICIAL' : 'SPARRING AMISTOSO'}
                </span>
                <span className="text-xs font-bold text-gray-300">vs <strong className="text-white">{opponentName}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                soundOn ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300' : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
              title={soundOn ? 'Desactivar Audio' : 'Activar Audio'}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hidden sm:inline text-[11px]">{soundOn ? 'Audio ON' : 'Mudo'}</span>
            </button>

            {/* Turn Counter Badge */}
            <div className="flex items-center space-x-1.5 text-xs font-black text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/30">
              <Clock size={14} />
              <span>TURNO #{turnNumber}</span>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
              title="Rendirse o Salir"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. 3D PERSPECTIVE BATTLE STADIUM VIEWPORT */}
        {/* ======================================================== */}
        <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/80 via-slate-900 to-gray-950">
          
          {/* Neon Floor Grid & Perspective Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

          {/* TURN INDICATOR FLOATING BANNER */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
            {turn === 'player' ? (
              <div className="bg-cyan-500/20 backdrop-blur-md border border-cyan-400/60 text-cyan-200 px-4 py-1 rounded-full text-xs font-black tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse flex items-center space-x-2">
                <Sparkles size={14} className="text-cyan-300" />
                <span>⭐ TU TURNO: SELECCIONA UN ATAQUE O ACCIÓN</span>
              </div>
            ) : (
              <div className="bg-amber-500/20 backdrop-blur-md border border-amber-400/60 text-amber-200 px-4 py-1 rounded-full text-xs font-black tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center space-x-2">
                <Clock size={14} className="text-amber-400 animate-spin" />
                <span>⏳ EL RIVAL ESTÁ PENSANDO SU ATAQUE...</span>
              </div>
            )}
            {playerShieldActive && (
              <span className="block mt-1 text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                🛡️ ESCUDO ACTIVO (-75% DAÑO RIVAL)
              </span>
            )}
          </div>

          {/* Pokémon GO Charged Attack Ring FX */}
          {chargedCircleFX && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 rounded-full border-4 border-amber-400 animate-charged-ring flex items-center justify-center">
                <div className="w-40 h-40 rounded-full border-2 border-yellow-300 animate-ping"></div>
              </div>
              <div className="absolute text-center">
                <span className="text-2xl font-black text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,1)]">
                  ¡ATAQUE CARGADO!
                </span>
                <span className="block text-xs font-bold text-white tracking-widest uppercase">¡POTENCIA MÁXIMA!</span>
              </div>
            </div>
          )}

          {/* Elemental Animations Overlay */}
          {activeAnimation && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              {activeAnimation === 'fire' && (
                <div className="w-full h-full bg-red-600/25 animate-pulse flex items-center justify-center">
                  <Flame size={140} className="text-red-500 animate-bounce drop-shadow-[0_0_45px_rgba(239,68,68,1)]" />
                </div>
              )}
              {activeAnimation === 'water' && (
                <div className="w-full h-full bg-blue-600/25 animate-pulse flex items-center justify-center">
                  <Droplets size={140} className="text-blue-400 animate-bounce drop-shadow-[0_0_45px_rgba(59,130,246,1)]" />
                </div>
              )}
              {activeAnimation === 'electric' && (
                <div className="w-full h-full bg-yellow-400/25 animate-ping flex items-center justify-center">
                  <Zap size={150} className="text-amber-400 drop-shadow-[0_0_50px_rgba(245,158,11,1)]" />
                </div>
              )}
              {activeAnimation === 'grass' && (
                <div className="w-full h-full bg-emerald-600/25 flex items-center justify-center">
                  <Leaf size={140} className="text-emerald-400 animate-spin drop-shadow-[0_0_45px_rgba(16,185,129,1)]" />
                </div>
              )}
              {activeAnimation === 'buff' && (
                <div className="w-full h-full bg-cyan-500/20 flex items-center justify-center">
                  <Shield size={140} className="text-cyan-400 animate-shield-pulse" />
                </div>
              )}
              {activeAnimation === 'normal' && (
                <div className="w-full h-full bg-white/20 animate-ping flex items-center justify-center">
                  <Sword size={130} className="text-white drop-shadow-2xl" />
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* OPPONENT ARENA HALF (TOP-RIGHT 3D DAIS) */}
          {/* ======================================================== */}
          <div className="flex justify-end items-start w-full relative z-10 pr-2 sm:pr-8">
            <div className="flex flex-col-reverse sm:flex-row items-center sm:space-x-6">
              
              {/* Opponent Info Plaque (Glassmorphic) */}
              <div className="bg-slate-900/85 backdrop-blur-md p-3.5 rounded-2xl border border-red-500/30 shadow-xl w-64 relative mt-2 sm:mt-0">
                <div className="flex items-center justify-between text-xs font-black text-white mb-1">
                  <span className="tracking-wide uppercase">{opponent.name}</span>
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-500/30">
                    Nv. {opponent.level}
                  </span>
                </div>

                {/* HP Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1">
                  <span className="font-bold text-red-400">HP</span>
                  <span>{opponent.currentHp} / {opponent.maxHp}</span>
                </div>
                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      opponent.currentHp > opponent.maxHp * 0.5 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                      opponent.currentHp > opponent.maxHp * 0.2 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 
                      'bg-gradient-to-r from-red-600 to-red-400 animate-pulse'
                    }`}
                    style={{ width: `${Math.max(0, (opponent.currentHp / opponent.maxHp) * 100)}%` }}
                  ></div>
                </div>

                {/* Stats chips */}
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mt-2 pt-1 border-t border-slate-800">
                  <span>ATQ {opponent.atk || 45}</span>
                  <span>DEF {opponent.def || 40}</span>
                  <span>SPD {opponent.spd || 45}</span>
                </div>

                {/* Floating Damage on Opponent */}
                {floatingDamage && floatingDamage.target === 'opp' && (
                  <div className="absolute -top-10 left-4 animate-float-damage bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-base px-3 py-1 rounded-xl shadow-2xl border border-red-400 z-30 pointer-events-none">
                    {floatingDamage.text}
                    {floatingDamage.extra && (
                      <span className="block text-[10px] font-bold text-yellow-300">{floatingDamage.extra}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Opponent 3D Battle Dais & Animated Sprite */}
              <div className="relative flex flex-col items-center">
                <div className="h-36 sm:h-44 w-36 sm:w-44 flex items-center justify-center relative">
                  <img 
                    src={opponent.animated_front_url || opponent.artwork_url} 
                    alt={opponent.name}
                    className={`max-h-36 sm:max-h-40 object-contain filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                      attackerAction === 'opp' ? 'animate-opp-lunge' : ''
                    } ${
                      hitTarget === 'opp' ? 'brightness-150 contrast-200 hue-rotate-180 animate-pulse' : ''
                    } ${
                      opponent.currentHp === 0 ? 'grayscale rotate-90 opacity-40' : ''
                    }`}
                    onError={(e) => { e.target.src = opponent.artwork_url; }}
                  />
                </div>
                {/* 3D Platform Ring */}
                <div className="w-36 sm:w-48 h-8 rounded-[100%] bg-gradient-to-r from-red-500/20 via-red-500/40 to-red-500/20 border-2 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.5)] -mt-4"></div>
              </div>

            </div>
          </div>

          {/* ======================================================== */}
          {/* PLAYER ARENA HALF (BOTTOM-LEFT 3D DAIS) */}
          {/* ======================================================== */}
          <div className="flex justify-start items-end w-full relative z-10 pl-2 sm:pr-8">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6">
              
              {/* Player 3D Battle Dais & Animated Back Sprite */}
              <div className="relative flex flex-col items-center">
                <div className="h-36 sm:h-44 w-36 sm:w-44 flex items-center justify-center relative">
                  <img 
                    src={activeUserCard.animated_back_url || activeUserCard.artwork_url} 
                    alt={activeUserCard.name}
                    className={`max-h-36 sm:max-h-40 object-contain filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                      attackerAction === 'player' ? 'animate-player-lunge' : ''
                    } ${
                      hitTarget === 'player' ? 'brightness-150 contrast-200 hue-rotate-90 animate-pulse' : ''
                    } ${
                      activeUserCard.current_hp === 0 ? 'grayscale rotate-45 opacity-40' : ''
                    }`}
                    onError={(e) => { e.target.src = activeUserCard.artwork_url; }}
                  />
                  {playerShieldActive && (
                    <div className="absolute inset-0 border-4 border-cyan-400 rounded-full animate-shield-pulse pointer-events-none"></div>
                  )}
                </div>
                {/* 3D Platform Ring */}
                <div className="w-36 sm:w-48 h-8 rounded-[100%] bg-gradient-to-r from-cyan-500/20 via-cyan-500/40 to-cyan-500/20 border-2 border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.5)] -mt-4"></div>
              </div>

              {/* Player Info Plaque (Glassmorphic) */}
              <div className="bg-slate-900/85 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/30 shadow-xl w-64 sm:w-72 relative mt-2 sm:mt-0">
                <div className="flex items-center justify-between text-xs font-black text-white mb-1">
                  <span className="tracking-wide uppercase">{activeUserCard.name}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Nv. {activeUserCard.level}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/30">
                      IV {activeUserCard.iv_percentage || 85}%
                    </span>
                  </div>
                </div>

                {/* HP Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1">
                  <span className="font-bold text-cyan-400">HP</span>
                  <span>{activeUserCard.current_hp} / {activeUserCard.max_hp}</span>
                </div>
                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeUserCard.current_hp > activeUserCard.max_hp * 0.5 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                      activeUserCard.current_hp > activeUserCard.max_hp * 0.2 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 
                      'bg-gradient-to-r from-red-600 to-red-400 animate-pulse'
                    }`}
                    style={{ width: `${Math.max(0, (activeUserCard.current_hp / activeUserCard.max_hp) * 100)}%` }}
                  ></div>
                </div>

                {/* Pokémon GO Energy Charge Gauge */}
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300 mb-0.5">
                    <span className="flex items-center space-x-1">
                      <Zap size={11} className="fill-cyan-400 text-cyan-400" />
                      <span>Energía de Ataque Cargado</span>
                    </span>
                    <span className="font-mono">{energy}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-cyan-900">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        energy >= 45 
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                      }`}
                      style={{ width: `${energy}%` }}
                    ></div>
                  </div>
                </div>

                {/* Floating Damage on Player */}
                {floatingDamage && floatingDamage.target === 'player' && (
                  <div className={`absolute -top-10 right-4 animate-float-damage text-white font-black text-base px-3 py-1 rounded-xl shadow-2xl z-30 pointer-events-none ${
                    floatingDamage.isHeal 
                      ? 'bg-gradient-to-r from-emerald-600 to-green-700 border border-green-400' 
                      : 'bg-gradient-to-r from-red-600 to-rose-700 border border-red-400'
                  }`}>
                    {floatingDamage.text}
                    {floatingDamage.extra && (
                      <span className="block text-[10px] font-bold text-yellow-300">{floatingDamage.extra}</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* 3. AAA RPG COMMAND DECK (ALWAYS VISIBLE AT BOTTOM) */}
        {/* ======================================================== */}
        <div className="bg-slate-950 border-t-2 border-cyan-500/40 p-3 sm:p-4 z-20">
          
          {/* Main 4 Action Mode Tabs (Classic Turn-Based RPG Layout) */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => { setActiveMenuTab('attack'); battleAudio.playButton(); }}
              className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'attack'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-400 scale-[1.02]'
                  : 'bg-slate-900 hover:bg-slate-800 text-gray-300 border border-gray-800'
              }`}
            >
              <Sword size={16} />
              <span>⚔️ LUCHAR</span>
            </button>

            <button
              onClick={() => { setActiveMenuTab('shield'); battleAudio.playButton(); }}
              className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'shield'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400 scale-[1.02]'
                  : 'bg-slate-900 hover:bg-slate-800 text-gray-300 border border-gray-800'
              }`}
            >
              <Shield size={16} />
              <span>🛡️ ESQUIVAR</span>
            </button>

            <button
              onClick={() => { setActiveMenuTab('bag'); battleAudio.playButton(); }}
              className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'bag'
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400 scale-[1.02]'
                  : 'bg-slate-900 hover:bg-slate-800 text-gray-300 border border-gray-800'
              }`}
            >
              <Backpack size={16} />
              <span>🎒 MOCHILA</span>
            </button>

            <button
              onClick={() => { setActiveMenuTab('switch'); battleAudio.playButton(); }}
              className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'switch'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] border border-purple-400 scale-[1.02]'
                  : 'bg-slate-900 hover:bg-slate-800 text-gray-300 border border-gray-800'
              }`}
            >
              <ArrowRightLeft size={16} />
              <span>🔄 CAMBIAR</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: 4-MOVE ATTACK DECK (PROMINENT & HIGH CONTRAST) */}
          {/* ======================================================== */}
          {activeMenuTab === 'attack' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {availableMoves.map((move, midx) => {
                const style = TYPE_COLORS[move.type] || TYPE_COLORS.Normal;
                const IconComponent = style.icon;
                const isCharged = move.category === 'charged';
                const hasChargedEnergy = energy >= (move.energyCost || 45);
                const isMoveDisabled = actionLoading || turn !== 'player' || (isCharged && !hasChargedEnergy) || activeUserCard.current_hp === 0;

                const effectiveness = getEffectivenessMultiplier(move.type, opponent.types || []);
                const effectLabel = getEffectivenessLabel(effectiveness);

                return (
                  <button
                    key={midx}
                    onClick={() => handlePlayerAttack(move)}
                    disabled={isMoveDisabled}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isCharged && hasChargedEnergy
                        ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-pulse hover:scale-[1.03]'
                        : isMoveDisabled
                          ? 'bg-slate-900/60 border-gray-800 text-gray-500 opacity-60 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-800/90 border-slate-700 hover:border-cyan-400/70 hover:scale-[1.02] shadow-md'
                    }`}
                  >
                    {/* Top Row: Type Badge + Category */}
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center space-x-1 ${style.badge}`}>
                        <IconComponent size={10} />
                        <span>{move.type}</span>
                      </span>
                      <span className="text-[10px] font-bold font-mono text-gray-400 uppercase">
                        {isCharged ? (
                          <span className={hasChargedEnergy ? 'text-amber-400 font-black' : 'text-gray-500'}>
                            {energy}/{move.energyCost || 45}⚡
                          </span>
                        ) : move.category === 'tactical' ? (
                          <span className="text-pink-400 font-black">CRIT +40%</span>
                        ) : move.category === 'buff' ? (
                          <span className="text-cyan-400 font-black">+DEF/+25⚡</span>
                        ) : (
                          <span className="text-emerald-400 font-black">+{move.energyGen || 18}⚡</span>
                        )}
                      </span>
                    </div>

                    {/* Middle: Move Name */}
                    <div className="my-1">
                      <h4 className="text-sm font-black text-white tracking-tight flex items-center space-x-1">
                        <span>{move.name}</span>
                        {isCharged && hasChargedEnergy && <Sparkles size={14} className="text-amber-400 animate-spin" />}
                      </h4>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">
                        {move.description}
                      </p>
                    </div>

                    {/* Bottom: Power & Effectiveness vs Opponent */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 w-full mt-1">
                      <span className="text-xs font-black text-cyan-300">
                        {move.power > 0 ? `PWR ${move.power}` : 'ESTADO'}
                      </span>
                      {move.power > 0 && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${effectLabel.color}`}>
                          {effectLabel.text}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DEFENDER / ESQUIVAR (POKÉMON GO SHIELD) */}
          {/* ======================================================== */}
          {activeMenuTab === 'shield' && (
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                  <Shield size={28} className="animate-shield-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Escudo Defensivo y Esquiva Táctica</h4>
                  <p className="text-xs text-gray-400">
                    Reduce el daño del próximo ataque rival en un <strong className="text-cyan-300">75%</strong> y canaliza <strong className="text-amber-300">+25⚡ de Energía</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={handleActivateShield}
                disabled={actionLoading || turn !== 'player' || playerShieldActive}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center space-x-2"
              >
                <Shield size={16} />
                <span>{playerShieldActive ? '¡ESCUDO YA ACTIVO!' : 'ACTIVAR ESCUDO AHORA'}</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MOCHILA DE ITEMS EN COMBATE */}
          {/* ======================================================== */}
          {activeMenuTab === 'bag' && (
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-emerald-500/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {items?.map((item) => (
                  <div 
                    key={item.item_key}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-black text-white block">{item.name}</span>
                      <span className="text-[10px] text-gray-400">Cant: x{item.quantity}</span>
                    </div>

                    <button
                      onClick={() => handleUseItemInBattle(item.item_key)}
                      disabled={actionLoading || turn !== 'player' || item.quantity <= 0}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-[11px] rounded-lg transition-all"
                    >
                      Usar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: RELEVAR / CAMBIAR POKÉMON */}
          {/* ======================================================== */}
          {activeMenuTab === 'switch' && (
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-purple-500/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {userTeam?.map((card) => {
                  const isActive = card.user_card_id === activeUserCard.user_card_id;
                  const isFainted = card.current_hp <= 0;

                  return (
                    <div
                      key={card.user_card_id}
                      onClick={() => !isActive && !isFainted && handleSwitchPokemon(card)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isActive
                          ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-500/40 cursor-default'
                          : isFainted
                            ? 'bg-red-950/40 border-red-800 opacity-60 cursor-not-allowed'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <img src={card.sprite_url} alt={card.name} className="w-8 h-8 object-contain" />
                        <div>
                          <span className="text-xs font-black text-white block">{card.name}</span>
                          <span className={`text-[10px] font-bold ${
                            isActive ? 'text-purple-300' : isFainted ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {isActive ? 'Activo en combate' : isFainted ? 'Debilitado' : 'Listo para entrar'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-gray-400 font-bold block">
                          {card.current_hp} / {card.max_hp} HP
                        </span>
                        {!isActive && !isFainted && (
                          <span className="text-[10px] text-purple-400 font-bold underline">Relevar</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Realtime Action Ticker Log */}
          <div className="mt-2.5 bg-black/60 rounded-xl px-3 py-1.5 border border-slate-800/80 text-[11px] font-mono text-gray-300 flex items-center justify-between">
            <span className="truncate">
              {battleLogs[battleLogs.length - 1] || 'Combate en curso...'}
            </span>
            <span className="text-[10px] text-gray-500 font-bold ml-2 shrink-0">
              Log ({battleLogs.length})
            </span>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. POST-BATTLE VICTORY / DEFEAT MODAL OVERLAY */}
      {/* ======================================================== */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-cyan-400 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-[0_0_50px_rgba(6,182,212,0.4)]">
            
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl shadow-xl border-2 border-white/20">
              {battleResult === 'victoria' ? '🏆' : '💀'}
            </div>

            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                {battleResult === 'victoria' ? '¡VICTORIA ÉPICA!' : '¡DERROTA EN COMBATE!'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {battleResult === 'victoria'
                  ? `Has derrotado a ${opponentName} en el Estadio Pokémon.`
                  : `${opponentName} ha superado a tu equipo esta vez.`}
              </p>
            </div>

            {/* Recompensas */}
            {rewardInfo && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">EXP Ganada:</span>
                  <span className="font-black text-cyan-400">+{rewardInfo.expEarned || 120} EXP</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">PokéMonedas:</span>
                  <span className="font-black text-amber-400">+{rewardInfo.coinsEarned || 75} P</span>
                </div>
                {rewardInfo.itemReward && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-gray-400">Recompensa de item:</span>
                    <span className="font-black text-emerald-400">{rewardInfo.itemReward.name}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-cyan-500/40 transition-all"
            >
              Continuar al Menú Principal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
