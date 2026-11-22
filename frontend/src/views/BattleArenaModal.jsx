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
  CheckCircle2, 
  AlertCircle,
  Flame,
  Droplets,
  Leaf,
  Ghost,
  Eye,
  Snowflake,
  Activity,
  ArrowLeftRight,
  Volume2,
  VolumeX,
  Briefcase,
  Target,
  Clock,
  Trophy,
  Skull,
  ChevronRight
} from 'lucide-react';
import { 
  getEffectivenessMultiplier, 
  getEffectivenessLabel, 
  get4MovesForCard 
} from '../utils/typeEffectiveness';
import { battleAudio } from '../utils/battleAudio';

// Helper de estilos e iconos por tipo elemental
const TYPE_CONFIG = {
  Fuego: { text: 'text-red-400', badge: 'bg-red-950/70 text-red-300 border-red-500/30', icon: Flame },
  Agua: { text: 'text-blue-400', badge: 'bg-blue-950/70 text-blue-300 border-blue-500/30', icon: Droplets },
  Planta: { text: 'text-emerald-400', badge: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30', icon: Leaf },
  Eléctrico: { text: 'text-amber-400', badge: 'bg-amber-950/70 text-amber-300 border-amber-500/30', icon: Zap },
  Fantasma: { text: 'text-purple-400', badge: 'bg-purple-950/70 text-purple-300 border-purple-500/30', icon: Ghost },
  Psíquico: { text: 'text-pink-400', badge: 'bg-pink-950/70 text-pink-300 border-pink-500/30', icon: Eye },
  Hielo: { text: 'text-cyan-400', badge: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/30', icon: Snowflake },
  Normal: { text: 'text-slate-300', badge: 'bg-slate-800 text-slate-300 border-slate-600', icon: Activity }
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

  // Replacement State when Active Pokémon Faints
  const [mustSwitchCard, setMustSwitchCard] = useState(false);

  // Cinematic FX
  const [activeAnimation, setActiveAnimation] = useState(null);
  const [floatingDamage, setFloatingDamage] = useState(null);
  const [attackerAction, setAttackerAction] = useState(null);
  const [hitTarget, setHitTarget] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [chargedCircleFX, setChargedCircleFX] = useState(false);

  // End Game
  const [isGameOver, setIsGameOver] = useState(false);
  const [battleResult, setBattleResult] = useState(null);
  const [rewardInfo, setRewardInfo] = useState(null);

  // Refs to avoid stale closures in async timeouts
  const activeCardRef = useRef(null);
  const userTeamRef = useRef([]);
  const opponentHpRef = useRef(0);

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

      let team = data.userTeam || [];
      let userActive = data.activeUserCard;

      if (battleType === 'amistoso') {
        team = team.map(c => ({ ...c, current_hp: c.max_hp }));
        if (userActive) userActive.current_hp = userActive.max_hp;
      }

      activeCardRef.current = userActive;
      userTeamRef.current = team;
      opponentHpRef.current = data.opponent?.currentHp || 300;

      const teamData = await apiRequest('/battles/team');

      setBattleState({
        ...data,
        activeUserCard: userActive,
        userTeam: team,
        items: teamData.items || []
      });

      setBattleLogs([
        `Estadio Pokémon — Inicio de Combate.`,
        `Modalidad: ${battleType === 'normal' ? 'Combate Oficial Clasificatorio' : 'Sparring Amistoso'}.`,
        `${opponentName} envía a ${data.opponent.name} (Nv. ${data.opponent.level}).`,
        `¡Adelante, ${userActive.name}! (IV: ${userActive.iv_percentage || 85}%).`
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

    const baseCritRate = (attacker.spd || 50) / 280;
    const extraCrit = move.critBonus || 0;
    const isCrit = Math.random() < Math.min(0.65, baseCritRate + extraCrit);
    const critMultiplier = isCrit ? 1.6 : 1.0;

    const atkMultiplier = isAttackerPlayer ? playerAtkBuff : 1.0;
    let defMultiplier = !isAttackerPlayer ? playerDefBuff : 1.0;

    if (!isAttackerPlayer && playerShieldActive) {
      defMultiplier *= 4.0; // Reduce 75%
    }

    const rawAtk = (attacker.atk || 50) * atkMultiplier;
    const rawDef = Math.max(15, (defender.def || 45) * defMultiplier);
    const baseDamage = ((rawAtk * (move.power || 20)) / (rawDef * 1.4)) * mult * stabBonus * critMultiplier;
    const damage = Math.max(4, Math.round(baseDamage + (Math.random() * 5)));

    let effectivenessText = '';
    if (mult >= 1.5) effectivenessText = '¡Súper eficaz!';
    else if (mult <= 0.7) effectivenessText = 'Poco eficaz...';
    if (isCrit) effectivenessText += ' ¡Golpe Crítico!';
    if (!isAttackerPlayer && playerShieldActive) effectivenessText += ' [Escudo mitigó 75%]';

    return { damage, mult, isCrit, effectivenessText };
  };

  // 1. EJECUTAR ATAQUE DEL JUGADOR
  const handlePlayerAttack = (move) => {
    if (isGameOver || actionLoading || turn !== 'player' || mustSwitchCard) return;
    
    if (move.category === 'charged' && energy < (move.energyCost || 45)) {
      alert(`Requiere ${move.energyCost || 45} de Energía para ${move.name}.`);
      return;
    }

    setActionLoading(true);
    battleAudio.playButton();

    const activeCard = activeCardRef.current || battleState.activeUserCard;
    const { opponent } = battleState;

    if (move.category === 'buff') {
      executeBuffMove(move, activeCard);
      return;
    }

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

      const { damage, mult, isCrit, effectivenessText } = calculateDamage(activeCard, opponent, move, true);
      const newOpponentHp = Math.max(0, opponent.currentHp - damage);
      opponentHpRef.current = newOpponentHp;

      if (isCrit) battleAudio.playCrit();

      setFloatingDamage({
        text: `-${damage} HP`,
        extra: effectivenessText,
        target: 'opp'
      });

      let newEnergy = energy;
      if (move.category === 'charged') {
        newEnergy = Math.max(0, energy - (move.energyCost || 45));
      } else {
        newEnergy = Math.min(100, energy + (move.energyGen || 18));
      }
      setEnergy(newEnergy);

      const newLogs = [
        ...battleLogs,
        `${activeCard.name} usó ${move.name}: ${damage} de daño. ${effectivenessText}`
      ];

      setTimeout(() => {
        setHitTarget(null);
        setActiveAnimation(null);
        setFloatingDamage(null);
        setScreenShake(false);

        // Victoria
        if (newOpponentHp <= 0) {
          battleAudio.playVictory();
          newLogs.push(`¡${opponent.name} ha caído debilitado! Victoria para ${user.username}.`);
          setBattleLogs(newLogs);
          setBattleState(prev => ({
            ...prev,
            opponent: { ...prev.opponent, currentHp: 0 }
          }));
          finishBattle('victoria', activeCard.current_hp);
          return;
        }

        // Actualizar vida rival y pasar turno al oponente
        setBattleState(prev => ({
          ...prev,
          opponent: { ...prev.opponent, currentHp: newOpponentHp }
        }));
        setBattleLogs(newLogs);
        setTurn('opp');

        setTimeout(() => {
          executeOpponentTurn(newOpponentHp, activeCardRef.current);
        }, 700);

      }, 700);

    }, isCharged ? 750 : 450);
  };

  // Movimiento de Refuerzo / Buff
  const executeBuffMove = (move, activeCard) => {
    setActiveAnimation('buff');
    battleAudio.playShield();

    setTimeout(() => {
      setActiveAnimation(null);
      setEnergy(prev => Math.min(100, prev + (move.energyGen || 25)));

      let logMsg = `${activeCard.name} usó ${move.name}.`;

      if (move.buffType === 'atk') {
        setPlayerAtkBuff(prev => prev * 1.35);
        logMsg += ' Ataque aumentado en 35%.';
      } else if (move.healAmount) {
        const healed = Math.min(activeCard.max_hp, activeCard.current_hp + move.healAmount);
        activeCard.current_hp = healed;
        activeCardRef.current = { ...activeCard };
        setBattleState(prev => ({
          ...prev,
          activeUserCard: { ...activeCard }
        }));
        setFloatingDamage({ text: `+${move.healAmount} HP`, target: 'player', isHeal: true });
        logMsg += ` Recuperó ${move.healAmount} HP.`;
      } else {
        setPlayerDefBuff(prev => prev * 1.35);
        logMsg += ' Defensa aumentada en 35%.';
      }

      setBattleLogs(prev => [...prev, logMsg]);

      setTimeout(() => {
        setFloatingDamage(null);
        setTurn('opp');
        setTimeout(() => {
          executeOpponentTurn(opponentHpRef.current, activeCardRef.current);
        }, 700);
      }, 650);

    }, 500);
  };

  // 2. ACTIVAR ESCUDO / ESQUIVA
  const handleActivateShield = () => {
    if (isGameOver || actionLoading || turn !== 'player' || mustSwitchCard) return;
    setActionLoading(true);
    battleAudio.playShield();

    setPlayerShieldActive(true);
    setEnergy(prev => Math.min(100, prev + 25));

    const activeCard = activeCardRef.current || battleState.activeUserCard;
    setBattleLogs(prev => [
      ...prev,
      `${activeCard.name} adopta posición defensiva. Daño reducido en 75% y +25 de energía.`
    ]);

    setTimeout(() => {
      setTurn('opp');
      setTimeout(() => {
        executeOpponentTurn(opponentHpRef.current, activeCardRef.current);
      }, 700);
    }, 600);
  };

  // 3. TURNO DEL RIVAL (IA RPG)
  const executeOpponentTurn = (currentOppHp, targetPlayerCard) => {
    if (currentOppHp <= 0 || isGameOver) return;
    const opponent = battleState.opponent;
    const activeCard = targetPlayerCard || activeCardRef.current || battleState.activeUserCard;

    // Si el Pokémon activo ya estaba debilitado (ej. tras caer), no atacar
    if (activeCard.current_hp <= 0) {
      setActionLoading(false);
      setTurn('player');
      return;
    }

    const oppMoves = opponent.moves || [];
    let chosenMove = oppMoves[0] || { name: 'Placaje Rápido', power: 18, type: 'Normal', animationType: 'normal' };

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

      const { damage, mult, isCrit, effectivenessText } = calculateDamage(opponent, activeCard, chosenMove, false);
      const newUserHp = Math.max(0, activeCard.current_hp - damage);

      // Actualizar tarjeta activa y equipo en los refs
      activeCard.current_hp = newUserHp;
      activeCardRef.current = { ...activeCard };

      const updatedTeam = (userTeamRef.current || []).map(c => 
        c.user_card_id === activeCard.user_card_id ? { ...c, current_hp: newUserHp } : c
      );
      userTeamRef.current = updatedTeam;

      setFloatingDamage({
        text: `-${damage} HP`,
        extra: effectivenessText,
        target: 'player'
      });

      const updatedLogs = [
        ...battleLogs,
        `${opponent.name} rival lanzó ${chosenMove.name}: infligió ${damage} de daño. ${effectivenessText}`
      ];

      setTimeout(() => {
        setHitTarget(null);
        setActiveAnimation(null);
        setFloatingDamage(null);
        setScreenShake(false);
        setPlayerShieldActive(false);

        setBattleState(prev => ({
          ...prev,
          activeUserCard: { ...activeCard },
          userTeam: updatedTeam
        }));

        // Si el Pokémon activo ha quedado debilitado
        if (newUserHp <= 0) {
          updatedLogs.push(`${activeCard.name} ha caído debilitado.`);
          setBattleLogs(updatedLogs);

          // Verificar si aún quedan otros Pokémon con vida en el equipo de 3
          const remainingAlive = updatedTeam.filter(c => c.current_hp > 0);

          if (remainingAlive.length > 0) {
            // NO ES DERROTA: El jugador puede relevar con otro Pokémon del equipo
            setMustSwitchCard(true);
            setActiveMenuTab('switch');
            setActionLoading(false);
            setTurn('player');
          } else {
            // TODOS los Pokémon han caído: Ahora sí es derrota
            battleAudio.playDefeat();
            updatedLogs.push('Todos los Pokémon de tu equipo han sido debilitados.');
            setBattleLogs(updatedLogs);
            finishBattle('derrota', 0);
          }
        } else {
          // El combate sigue normalmente
          setBattleLogs(updatedLogs);
          setTurn('player');
          setTurnNumber(prev => prev + 1);
          setActionLoading(false);
        }
      }, 700);

    }, 500);
  };

  // 4. USAR OBJETO EN COMBATE
  const handleUseItemInBattle = async (itemKey) => {
    if (isGameOver || actionLoading || mustSwitchCard) return;
    setActionLoading(true);
    battleAudio.playHeal();

    try {
      const activeCard = activeCardRef.current || battleState.activeUserCard;
      const res = await apiRequest('/items/use', 'POST', {
        itemKey,
        userCardId: activeCard.user_card_id
      });

      const healAmount = res.card.current_hp - activeCard.current_hp;
      activeCard.current_hp = res.card.current_hp;
      activeCardRef.current = { ...activeCard };

      const updatedTeam = userTeamRef.current.map(c => 
        c.user_card_id === activeCard.user_card_id ? { ...c, current_hp: res.card.current_hp } : c
      );
      userTeamRef.current = updatedTeam;

      setBattleState(prev => ({
        ...prev,
        activeUserCard: { ...activeCard },
        userTeam: updatedTeam,
        items: prev.items.map(i => i.item_key === itemKey ? { ...i, quantity: res.remainingQuantity } : i)
      }));

      setFloatingDamage({
        text: `+${healAmount} HP`,
        extra: 'Recuperado',
        target: 'player',
        isHeal: true
      });

      setBattleLogs(prev => [
        ...prev,
        `Usaste ${res.item?.name || 'Objeto'} en ${activeCard.name}: recuperó ${healAmount} HP.`
      ]);

      setTimeout(() => {
        setFloatingDamage(null);
        setActiveMenuTab('attack');
        setTurn('opp');
        setTimeout(() => {
          executeOpponentTurn(opponentHpRef.current, activeCardRef.current);
        }, 700);
      }, 750);

    } catch (err) {
      alert(`No se pudo usar el objeto: ${err.message}`);
      setActionLoading(false);
    }
  };

  // 5. RELEVAR / CAMBIAR POKÉMON EN COMBATE (Corregido y blindado contra falsas derrotas)
  const handleSwitchPokemon = (targetCard) => {
    if (isGameOver || actionLoading) return;
    
    // Si la carta seleccionada está debilitada
    if (targetCard.current_hp <= 0 && battleType === 'normal') {
      alert(`${targetCard.name} está debilitado. Usa un Revivir en la mochila para devolverlo al combate.`);
      return;
    }

    // Si ya es la carta activa
    if (activeCardRef.current && targetCard.user_card_id === activeCardRef.current.user_card_id) {
      setActiveMenuTab('attack');
      return;
    }

    setActionLoading(true);
    battleAudio.playSwitchSound?.();

    const previousCard = activeCardRef.current || battleState.activeUserCard;
    const wasReplacementDueToFaint = mustSwitchCard;

    // Actualizar referencia y estado
    activeCardRef.current = targetCard;
    setMustSwitchCard(false);
    setEnergy(15);
    setPlayerAtkBuff(1.0);
    setPlayerDefBuff(1.0);

    setBattleState(prev => ({
      ...prev,
      activeUserCard: targetCard
    }));

    setBattleLogs(prev => [
      ...prev,
      wasReplacementDueToFaint 
        ? `¡Adelante, ${targetCard.name}! Entra al terreno de combate.`
        : `Regresa ${previousCard.name}. ¡Adelante, ${targetCard.name}!`
    ]);

    setTimeout(() => {
      setActiveMenuTab('attack');
      
      // Si fue relevo porque el anterior se debilitó, el nuevo Pokémon toma el turno directamente
      if (wasReplacementDueToFaint) {
        setTurn('player');
        setActionLoading(false);
      } else {
        // Si fue cambio voluntario a mitad del turno, el rival ejecuta su turno contra el nuevo Pokémon
        setTurn('opp');
        setTimeout(() => {
          executeOpponentTurn(opponentHpRef.current, targetCard);
        }, 700);
      }
    }, 600);
  };

  // FINALIZAR COMBATE
  const finishBattle = async (result, finalHp) => {
    setIsGameOver(true);
    setBattleResult(result);

    try {
      const activeCard = activeCardRef.current || battleState.activeUserCard;
      const res = await apiRequest('/battles/finish', 'POST', {
        battleType,
        opponentName,
        result,
        activeUserCardId: activeCard.user_card_id,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090d16]/95 backdrop-blur-md">
        <div className="text-center text-slate-100 space-y-4">
          <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-cyan-500/30"></div>
          <div>
            <h3 className="text-sm font-black tracking-widest uppercase text-cyan-400">Estadio Pokémon</h3>
            <p className="text-xs text-slate-400 mt-1">Cargando escenario y estadísticas de combate...</p>
          </div>
        </div>
      </div>
    );
  }

  const { activeUserCard, opponent, userTeam, items } = battleState;
  const availableMoves = get4MovesForCard(activeUserCard);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#050811]/90 backdrop-blur-md animate-fade-in select-none">
      
      {/* ARENA CONTAINER (Locked responsive viewport, no scrollbar overflow) */}
      <div className={`bg-gradient-to-b from-[#0d1527] via-[#090e1c] to-[#060913] text-slate-100 rounded-3xl w-full max-w-5xl h-[94vh] max-h-[860px] border border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between relative ${screenShake ? 'animate-screen-shake' : ''}`}>

        {/* ======================================================== */}
        {/* 1. TOP HEADER - ELEGANT NAVIGATION & STATUS BAR */}
        {/* ======================================================== */}
        <div className="bg-[#0b1222]/90 backdrop-blur-md px-5 py-2.5 flex items-center justify-between border-b border-slate-800/80 z-20">
          <div className="flex items-center space-x-3">
            <span className={`w-2.5 h-2.5 rounded-full ${battleType === 'normal' ? 'bg-red-500' : 'bg-emerald-400'}`}></span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300">
                  {battleType === 'normal' ? 'Combate Oficial' : 'Sparring Amistoso'}
                </span>
                <span className="text-xs font-semibold text-slate-400">vs <strong className="text-slate-100">{opponentName}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                soundOn ? 'bg-slate-900 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={soundOn ? 'Desactivar audio' : 'Activar audio'}
            >
              {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="hidden sm:inline text-[11px]">{soundOn ? 'Audio ON' : 'Silencio'}</span>
            </button>

            {/* Turn Counter */}
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/20">
              <Clock size={13} />
              <span>Turno {turnNumber}</span>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              title="Salir del combate"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. 3D BATTLE ARENA VIEWPORT */}
        {/* ======================================================== */}
        <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-[#0a0f1d] to-[#060913]">
          
          {/* Subtle Geometric Field Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

          {/* TURN INDICATOR FLOATING BANNER */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
            {mustSwitchCard ? (
              <div className="bg-red-950/80 backdrop-blur-md border border-red-500/50 text-red-200 px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg animate-pulse flex items-center space-x-1.5">
                <AlertCircle size={14} className="text-red-400" />
                <span>Pokémon debilitado. Selecciona un compañero abajo para continuar.</span>
              </div>
            ) : turn === 'player' ? (
              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg flex items-center space-x-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Tu turno: Selecciona una acción</span>
              </div>
            ) : (
              <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-amber-300 px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg flex items-center space-x-1.5">
                <Clock size={13} className="text-amber-400 animate-spin" />
                <span>Turno del rival...</span>
              </div>
            )}
            {playerShieldActive && (
              <span className="block mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Escudo Activo (-75% daño rival)
              </span>
            )}
          </div>

          {/* Charged Attack Concentric Ring FX */}
          {chargedCircleFX && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="w-52 h-52 rounded-full border-2 border-amber-400 animate-charged-ring flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border border-yellow-300 animate-ping"></div>
              </div>
              <div className="absolute text-center">
                <span className="text-xl font-black text-amber-300 tracking-wider">
                  ATAQUE CARGADO
                </span>
                <span className="block text-[10px] font-semibold text-slate-300 tracking-widest uppercase">Potencia Máxima</span>
              </div>
            </div>
          )}

          {/* Elemental Animations Overlay */}
          {activeAnimation && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              {activeAnimation === 'fire' && (
                <div className="w-full h-full bg-red-600/20 animate-pulse flex items-center justify-center">
                  <Flame size={130} className="text-red-500 animate-bounce drop-shadow-[0_0_35px_rgba(239,68,68,0.8)]" />
                </div>
              )}
              {activeAnimation === 'water' && (
                <div className="w-full h-full bg-blue-600/20 animate-pulse flex items-center justify-center">
                  <Droplets size={130} className="text-blue-400 animate-bounce drop-shadow-[0_0_35px_rgba(59,130,246,0.8)]" />
                </div>
              )}
              {activeAnimation === 'electric' && (
                <div className="w-full h-full bg-amber-400/20 animate-ping flex items-center justify-center">
                  <Zap size={140} className="text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.9)]" />
                </div>
              )}
              {activeAnimation === 'grass' && (
                <div className="w-full h-full bg-emerald-600/20 flex items-center justify-center">
                  <Leaf size={130} className="text-emerald-400 animate-spin drop-shadow-[0_0_35px_rgba(16,185,129,0.8)]" />
                </div>
              )}
              {activeAnimation === 'buff' && (
                <div className="w-full h-full bg-cyan-500/15 flex items-center justify-center">
                  <Shield size={130} className="text-cyan-400 animate-shield-pulse" />
                </div>
              )}
              {activeAnimation === 'normal' && (
                <div className="w-full h-full bg-white/15 animate-ping flex items-center justify-center">
                  <Sword size={120} className="text-white drop-shadow-xl" />
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* OPPONENT ARENA HALF (TOP-RIGHT 3D DAIS) */}
          {/* ======================================================== */}
          <div className="flex justify-end items-start w-full relative z-10 pr-2 sm:pr-8">
            <div className="flex flex-col-reverse sm:flex-row items-center sm:space-x-5">
              
              {/* Opponent Info Plaque */}
              <div className="bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl w-60 sm:w-64 relative mt-2 sm:mt-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-100 mb-1">
                  <span className="tracking-wide uppercase">{opponent.name}</span>
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-500/20">
                    Nv. {opponent.level}
                  </span>
                </div>

                {/* HP Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span className="font-bold text-red-400">HP</span>
                  <span>{opponent.currentHp} / {opponent.maxHp}</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      opponent.currentHp > opponent.maxHp * 0.5 ? 'bg-emerald-500' :
                      opponent.currentHp > opponent.maxHp * 0.2 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, (opponent.currentHp / opponent.maxHp) * 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-1 border-t border-slate-800">
                  <span>ATQ {opponent.atk || 45}</span>
                  <span>DEF {opponent.def || 40}</span>
                  <span>SPD {opponent.spd || 45}</span>
                </div>

                {/* Floating Damage on Opponent */}
                {floatingDamage && floatingDamage.target === 'opp' && (
                  <div className="absolute -top-10 left-4 animate-float-damage bg-slate-900/95 text-red-400 border border-red-500/50 font-black text-sm px-3 py-1 rounded-xl shadow-xl z-30 pointer-events-none">
                    {floatingDamage.text}
                    {floatingDamage.extra && (
                      <span className="block text-[9px] font-bold text-amber-300">{floatingDamage.extra}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Opponent 3D Battle Dais & Animated Sprite */}
              <div className="relative flex flex-col items-center">
                <div className="h-32 sm:h-40 w-32 sm:w-40 flex items-center justify-center relative">
                  <img 
                    src={opponent.animated_front_url || opponent.artwork_url} 
                    alt={opponent.name}
                    className={`max-h-32 sm:max-h-36 object-contain filter drop-shadow-[0_12px_12px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                      attackerAction === 'opp' ? 'animate-opp-lunge' : ''
                    } ${
                      hitTarget === 'opp' ? 'brightness-150 contrast-200 hue-rotate-180 animate-pulse' : ''
                    } ${
                      opponent.currentHp === 0 ? 'grayscale rotate-90 opacity-30' : ''
                    }`}
                    onError={(e) => { e.target.src = opponent.artwork_url; }}
                  />
                </div>
                {/* 3D Platform Ring */}
                <div className="w-32 sm:w-44 h-7 rounded-[100%] bg-gradient-to-r from-red-500/10 via-red-500/30 to-red-500/10 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] -mt-3"></div>
              </div>

            </div>
          </div>

          {/* ======================================================== */}
          {/* PLAYER ARENA HALF (BOTTOM-LEFT 3D DAIS) */}
          {/* ======================================================== */}
          <div className="flex justify-start items-end w-full relative z-10 pl-2 sm:pl-8">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-5">
              
              {/* Player 3D Battle Dais & Animated Back Sprite */}
              <div className="relative flex flex-col items-center">
                <div className="h-32 sm:h-40 w-32 sm:w-40 flex items-center justify-center relative">
                  <img 
                    src={activeUserCard.animated_back_url || activeUserCard.artwork_url} 
                    alt={activeUserCard.name}
                    className={`max-h-32 sm:max-h-36 object-contain filter drop-shadow-[0_12px_12px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                      attackerAction === 'player' ? 'animate-player-lunge' : ''
                    } ${
                      hitTarget === 'player' ? 'brightness-150 contrast-200 hue-rotate-90 animate-pulse' : ''
                    } ${
                      activeUserCard.current_hp === 0 ? 'grayscale rotate-45 opacity-30' : ''
                    }`}
                    onError={(e) => { e.target.src = activeUserCard.artwork_url; }}
                  />
                  {playerShieldActive && (
                    <div className="absolute inset-0 border-3 border-cyan-400 rounded-full animate-shield-pulse pointer-events-none"></div>
                  )}
                </div>
                {/* 3D Platform Ring */}
                <div className="w-32 sm:w-44 h-7 rounded-[100%] bg-gradient-to-r from-cyan-500/10 via-cyan-500/30 to-cyan-500/10 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] -mt-3"></div>
              </div>

              {/* Player Info Plaque */}
              <div className="bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl w-60 sm:w-68 relative mt-2 sm:mt-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-100 mb-1">
                  <span className="tracking-wide uppercase">{activeUserCard.name}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      Nv. {activeUserCard.level}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/20">
                      IV {activeUserCard.iv_percentage || 85}%
                    </span>
                  </div>
                </div>

                {/* HP Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span className="font-bold text-cyan-400">HP</span>
                  <span>{activeUserCard.current_hp} / {activeUserCard.max_hp}</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeUserCard.current_hp > activeUserCard.max_hp * 0.5 ? 'bg-emerald-500' :
                      activeUserCard.current_hp > activeUserCard.max_hp * 0.2 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, (activeUserCard.current_hp / activeUserCard.max_hp) * 100)}%` }}
                  ></div>
                </div>

                {/* Energy Gauge */}
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mb-0.5">
                    <span className="flex items-center space-x-1">
                      <Zap size={11} className="fill-amber-400 text-amber-400" />
                      <span>Energía de Ataque</span>
                    </span>
                    <span className="font-mono text-amber-400">{energy}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        energy >= 45 
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${energy}%` }}
                    ></div>
                  </div>
                </div>

                {/* Floating Damage on Player */}
                {floatingDamage && floatingDamage.target === 'player' && (
                  <div className={`absolute -top-10 right-4 animate-float-damage bg-slate-900/95 font-black text-sm px-3 py-1 rounded-xl shadow-xl z-30 pointer-events-none ${
                    floatingDamage.isHeal 
                      ? 'text-emerald-400 border border-emerald-500/50' 
                      : 'text-red-400 border border-red-500/50'
                  }`}>
                    {floatingDamage.text}
                    {floatingDamage.extra && (
                      <span className="block text-[9px] font-bold text-amber-300">{floatingDamage.extra}</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* 3. AAA ACTION CONSOLE DECK (DOCKED AT BOTTOM, NO EMOJIS) */}
        {/* ======================================================== */}
        <div className="bg-[#080d1a] border-t border-slate-800 p-3 sm:p-4 z-20">
          
          {/* Main 4 Action Mode Tabs */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => { setActiveMenuTab('attack'); battleAudio.playButton(); }}
              disabled={mustSwitchCard}
              className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'attack'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50 shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800 disabled:opacity-40'
              }`}
            >
              <Sword size={15} />
              <span>LUCHAR</span>
            </button>

            <button
              onClick={() => { setActiveMenuTab('shield'); battleAudio.playButton(); }}
              disabled={mustSwitchCard}
              className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'shield'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50 shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800 disabled:opacity-40'
              }`}
            >
              <Shield size={15} />
              <span>DEFENDER</span>
            </button>

            <button
              onClick={() => { setActiveMenuTab('bag'); battleAudio.playButton(); }}
              disabled={mustSwitchCard}
              className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'bag'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50 shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800 disabled:opacity-40'
              }`}
            >
              <Briefcase size={15} />
              <span>MOCHILA</span>
            </button>

            <button
              onClick={() => { setActiveMenuTab('switch'); battleAudio.playButton(); }}
              className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all ${
                activeMenuTab === 'switch'
                  ? 'bg-slate-800 text-purple-400 border border-purple-500/50 shadow-md'
                  : mustSwitchCard
                    ? 'bg-red-950/80 text-red-300 border border-red-500/60 animate-pulse'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              <ArrowLeftRight size={15} />
              <span>RELEVO ({userTeam?.filter(c => c.current_hp > 0).length || 1}/3)</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: 4-MOVE ATTACK DECK */}
          {/* ======================================================== */}
          {activeMenuTab === 'attack' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {availableMoves.map((move, midx) => {
                const typeStyle = TYPE_CONFIG[move.type] || TYPE_CONFIG.Normal;
                const IconComponent = typeStyle.icon;
                const isCharged = move.category === 'charged';
                const hasChargedEnergy = energy >= (move.energyCost || 45);
                const isMoveDisabled = actionLoading || turn !== 'player' || (isCharged && !hasChargedEnergy) || activeUserCard.current_hp === 0 || mustSwitchCard;

                const effectiveness = getEffectivenessMultiplier(move.type, opponent.types || []);
                const effectLabel = getEffectivenessLabel(effectiveness);

                return (
                  <button
                    key={midx}
                    onClick={() => handlePlayerAttack(move)}
                    disabled={isMoveDisabled}
                    className={`min-h-[58px] p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isCharged && hasChargedEnergy
                        ? 'bg-slate-900 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:scale-[1.02]'
                        : isMoveDisabled
                          ? 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-750 hover:border-cyan-500/60 hover:scale-[1.01] shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center space-x-1 ${typeStyle.badge}`}>
                        <IconComponent size={10} />
                        <span>{move.type}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                        {isCharged ? (
                          <span className={hasChargedEnergy ? 'text-amber-400' : 'text-slate-500'}>
                            {energy}/{move.energyCost || 45} Energía
                          </span>
                        ) : move.category === 'tactical' ? (
                          <span className="text-pink-400">CRIT +40%</span>
                        ) : move.category === 'buff' ? (
                          <span className="text-cyan-400">+DEF / +25⚡</span>
                        ) : (
                          <span className="text-emerald-400">+{move.energyGen || 18}⚡</span>
                        )}
                      </span>
                    </div>

                    <div className="my-0.5">
                      <h4 className="text-xs font-black text-slate-100 flex items-center space-x-1">
                        <span>{move.name}</span>
                        {isCharged && hasChargedEnergy && <Sparkles size={12} className="text-amber-400" />}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {move.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 w-full mt-1">
                      <span className="text-[11px] font-black text-cyan-400 font-mono">
                        {move.power > 0 ? `PWR ${move.power}` : 'ESTADO'}
                      </span>
                      {move.power > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${effectLabel.color}`}>
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
          {/* TAB 2: DEFENDER / ESQUIVAR */}
          {/* ======================================================== */}
          {activeMenuTab === 'shield' && (
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Shield size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Postura Defensiva y Esquiva Táctica</h4>
                  <p className="text-[11px] text-slate-400">
                    Reduce el daño del próximo golpe en un <strong className="text-cyan-400">75%</strong> y canaliza <strong className="text-amber-400">+25 de Energía</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={handleActivateShield}
                disabled={actionLoading || turn !== 'player' || playerShieldActive || mustSwitchCard}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 border border-cyan-500/50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
              >
                <Shield size={14} />
                <span>{playerShieldActive ? 'Escudo ya activo' : 'Activar Escudo'}</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MOCHILA DE ITEMS */}
          {/* ======================================================== */}
          {activeMenuTab === 'bag' && (
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {items?.map((item) => (
                  <div 
                    key={item.item_key}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">x{item.quantity}</span>
                    </div>

                    <button
                      onClick={() => handleUseItemInBattle(item.item_key)}
                      disabled={actionLoading || turn !== 'player' || item.quantity <= 0 || mustSwitchCard}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] rounded-lg transition-all"
                    >
                      Usar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: RELEVAR / CAMBIAR POKÉMON DEL EQUIPO (3 POKÉMON) */}
          {/* ======================================================== */}
          {activeMenuTab === 'switch' && (
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
              {mustSwitchCard && (
                <div className="bg-amber-950/60 border border-amber-500/40 p-2 rounded-xl text-center">
                  <span className="text-xs font-bold text-amber-300">
                    Tu Pokémon activo ha caído. Haz clic en un compañero con vida para enviarlo al combate:
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {userTeam?.map((card) => {
                  const isActive = card.user_card_id === activeUserCard.user_card_id;
                  const isFainted = card.current_hp <= 0;

                  return (
                    <div
                      key={card.user_card_id}
                      onClick={() => !isActive && !isFainted && handleSwitchPokemon(card)}
                      className={`min-h-[58px] p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-slate-950 border-cyan-500/60 ring-1 ring-cyan-500/30 cursor-default'
                          : isFainted
                            ? 'bg-slate-950/40 border-slate-850 opacity-50 cursor-not-allowed'
                            : 'bg-slate-950 hover:bg-slate-850 border-slate-800 cursor-pointer hover:border-purple-500/50 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <img src={card.sprite_url} alt={card.name} className="w-8 h-8 object-contain" />
                        <div>
                          <span className="text-xs font-bold text-slate-100 block">{card.name}</span>
                          <span className={`text-[10px] font-semibold ${
                            isActive ? 'text-cyan-400 font-bold' : isFainted ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {isActive ? 'Activo en combate' : isFainted ? 'Debilitado' : 'Disponible'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-400 font-bold block">
                          {card.current_hp} / {card.max_hp} HP
                        </span>
                        {!isActive && !isFainted && (
                          <span className="text-[10px] text-purple-400 font-bold flex items-center justify-end space-x-0.5">
                            <span>Relevar</span>
                            <ChevronRight size={11} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Realtime Action Ticker Log */}
          <div className="mt-2 bg-[#050811] rounded-xl px-3 py-1.5 border border-slate-850 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span className="truncate">
              {battleLogs[battleLogs.length - 1] || 'Combate en progreso...'}
            </span>
            <span className="text-[10px] text-slate-600 font-bold ml-2 shrink-0">
              Registro ({battleLogs.length})
            </span>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. POST-BATTLE VICTORY / DEFEAT MODAL */}
      {/* ======================================================== */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-4 shadow-2xl">
            
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-100">
              {battleResult === 'victoria' ? <Trophy size={28} className="text-amber-400" /> : <Skull size={28} className="text-red-400" />}
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-wider">
                {battleResult === 'victoria' ? 'Victoria' : 'Derrota'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {battleResult === 'victoria'
                  ? `Has superado a ${opponentName} en el Estadio Pokémon.`
                  : `${opponentName} ha superado a tu equipo en esta ocasión.`}
              </p>
            </div>

            {/* Recompensas */}
            {rewardInfo && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-left space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">EXP Obtenida:</span>
                  <span className="font-bold text-cyan-400">+{rewardInfo.expEarned || 120} EXP</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">PokéMonedas:</span>
                  <span className="font-bold text-amber-400">+{rewardInfo.coinsEarned || 75} P</span>
                </div>
                {rewardInfo.itemReward && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Objeto recibido:</span>
                    <span className="font-bold text-emerald-400">{rewardInfo.itemReward.name}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Regresar al Menú Principal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
