import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/gameAlert';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sword, 
  Shield, 
  Heart, 
  Zap, 
  Sparkles, 
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
  Clock,
  Trophy,
  Skull,
  ChevronRight,
  Flag,
  Loader2
} from 'lucide-react';
import { 
  getEffectivenessMultiplier, 
  getEffectivenessLabel 
} from '../utils/typeEffectiveness';
import { battleAudio } from '../utils/battleAudio';

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
  initialBattle,
  battleId: propBattleId,
  onClose,
  onBattleFinished
}) {
  const { user, refreshUser } = useAuth();
  const [battle, setBattle] = useState(initialBattle || null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!initialBattle);
  const [actionLoading, setActionLoading] = useState(false);

  const [soundOn, setSoundOn] = useState(true);
  const [activeMenuTab, setActiveMenuTab] = useState('attack');

  // Cinematic FX
  const [activeAnimation, setActiveAnimation] = useState(null);
  const [floatingDamage, setFloatingDamage] = useState(null);
  const [attackerAction, setAttackerAction] = useState(null);
  const [hitTarget, setHitTarget] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [chargedCircleFX, setChargedCircleFX] = useState(false);

  const lastProcessedEventId = useRef(initialBattle?.lastEvent?.id || null);
  const activeBattleId = battle?.id || propBattleId;

  useEffect(() => {
    fetchTeamItems();
    if (!initialBattle && propBattleId) {
      syncBattleState(propBattleId);
    }
  }, []);

  // Polling continuo cuando está pendiente de aceptación o esperando jugada del rival
  useEffect(() => {
    if (!activeBattleId) return;
    if (battle && ['finished', 'rejected', 'cancelled'].includes(battle.status)) return;

    const interval = setInterval(() => {
      syncBattleState(activeBattleId);
    }, 1500);

    return () => clearInterval(interval);
  }, [activeBattleId, battle?.status]);

  // Efecto al recibir evento nuevo del servidor (ataques, curaciones, cambios, fin)
  useEffect(() => {
    if (!battle) return;

    if (battle.mustISwitch) {
      setActiveMenuTab('switch');
    }

    if (battle.status === 'rejected') {
      showAlert.info('Reto Rechazado', `${battle.opponentName} rechazó el combate.`);
      onClose();
      return;
    }

    if (battle.status === 'cancelled') {
      showAlert.info('Reto Cancelado', 'El reto ha sido cancelado o expiró.');
      onClose();
      return;
    }

    const ev = battle.lastEvent;
    if (ev && ev.id && ev.id !== lastProcessedEventId.current) {
      lastProcessedEventId.current = ev.id;
      triggerEventFX(ev);
    }

    if (battle.status === 'finished') {
      if (battle.didIWin) {
        battleAudio.playVictory();
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      }
      refreshUser();
      if (onBattleFinished) onBattleFinished();
    }
  }, [battle]);

  const fetchTeamItems = async () => {
    try {
      const data = await apiRequest('/battles/team');
      setItems(data.items || []);
    } catch (e) {
      console.warn('Error cargando items:', e);
    }
  };

  const syncBattleState = async (id) => {
    try {
      const res = await apiRequest(`/battles/live/${id}`);
      if (res?.battle) {
        setBattle(res.battle);
      }
    } catch (err) {
      console.warn('Error sincronizando batalla:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerEventFX = (ev) => {
    const isActorMe = ev.actorId === user?.id;

    if (ev.actionType === 'attack') {
      if (ev.isCharged) {
        setChargedCircleFX(true);
        battleAudio.playAttack(ev.moveType, true);
      } else {
        battleAudio.playAttack(ev.moveType, false);
      }

      setAttackerAction(isActorMe ? 'player' : 'opp');
      setActiveAnimation(ev.animationType || 'normal');
      setHitTarget(isActorMe ? 'opp' : 'player');
      setScreenShake(true);

      if (ev.isCrit) battleAudio.playCrit();

      setFloatingDamage({
        text: `-${ev.damage} HP`,
        extra: ev.effectivenessText,
        target: isActorMe ? 'opp' : 'player'
      });

      setTimeout(() => {
        setChargedCircleFX(false);
        setAttackerAction(null);
        setHitTarget(null);
        setActiveAnimation(null);
        setScreenShake(false);
        setFloatingDamage(null);
      }, 950);
    } else if (ev.actionType === 'heal') {
      battleAudio.playHeal();
      setFloatingDamage({
        text: `+${ev.healAmount || 50} HP`,
        extra: 'Poción de Campo',
        target: isActorMe ? 'player' : 'opp',
        isHeal: true
      });
      setTimeout(() => setFloatingDamage(null), 950);
    } else if (ev.actionType === 'shield') {
      battleAudio.playShield();
    } else if (ev.actionType === 'buff') {
      setActiveAnimation('buff');
      setTimeout(() => setActiveAnimation(null), 700);
    }
  };

  const toggleSound = () => {
    const newState = battleAudio.toggle();
    setSoundOn(newState);
  };

  const sendAction = async (payload) => {
    if (!battle || actionLoading) return;
    setActionLoading(true);
    battleAudio.playButton();
    try {
      const res = await apiRequest(`/battles/live/${battle.id}/action`, 'POST', payload);
      if (res?.battle) {
        if (res.battle.lastEvent?.id) {
          lastProcessedEventId.current = res.battle.lastEvent.id;
          triggerEventFX(res.battle.lastEvent);
        }
        setBattle(res.battle);
        if (payload.actionType === 'switch' && !res.battle.mustISwitch) {
          setActiveMenuTab('attack');
        }
      }
    } catch (err) {
      showAlert.error('Jugada no válida', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPending = async () => {
    if (!battle) return;
    try {
      await apiRequest(`/battles/live/${battle.id}/cancel`, 'POST');
      onClose();
    } catch (err) {
      onClose();
    }
  };

  const handleForfeit = async () => {
    const confirmed = await showAlert.confirm(
      '¿Rendirse?',
      'Si te rindes ahora, la victoria será otorgada a tu rival.',
      'Sí, rendirme',
      'Seguir luchando'
    );
    if (confirmed) {
      sendAction({ actionType: 'forfeit' });
    }
  };

  if (loading || !battle) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="text-center space-y-3 p-8 bg-[#0b1222] rounded-3xl border border-slate-800 shadow-2xl">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-200 font-bold text-sm">Conectando al estadio...</p>
        </div>
      </div>
    );
  }

  // Pantalla de espera mientras el rival acepta o rechaza el reto
  if (battle.status === 'pending') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center mx-auto">
            <Loader2 size={32} className="text-cyan-400 animate-spin" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/70 px-3 py-1 rounded-full border border-cyan-500/30">
              {battle.battleType === 'amistoso' ? 'Combate Amistoso · Nv. 5' : 'Combate Competitivo'}
            </span>
            <h2 className="text-xl font-black text-slate-100 mt-3">
              Esperando a {battle.opponentName}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Le hemos enviado tu reto de combate. La arena se abrirá en cuanto acepte el desafío.
            </p>
          </div>

          <button
            onClick={handleCancelPending}
            className="w-full py-2.5 bg-slate-900 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 font-bold text-xs rounded-xl transition-all"
          >
            Cancelar Reto
          </button>
        </div>
      </div>
    );
  }

  const activeUserCard = battle.myTeam?.[battle.myActiveIdx] || battle.myTeam?.[0];
  const opponentCard = battle.oppTeam?.[battle.oppActiveIdx] || battle.oppTeam?.[0];

  if (!activeUserCard || !opponentCard) {
    return null;
  }

  const availableMoves = activeUserCard.moves || [];
  const isMyTurn = battle.isMyTurn;
  const mustSwitch = battle.mustISwitch;
  const energy = battle.myEnergy || 0;
  const isGameOver = battle.status === 'finished';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md select-none text-slate-100">
      <div className={`w-full max-w-5xl bg-[#070b14] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative transition-transform ${screenShake ? 'animate-shake' : ''}`}>
        
        {/* 1. HUD HEADER */}
        <div className="bg-[#0b1120] px-4 sm:px-6 py-3 border-b border-slate-800/80 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30">
              {battle.battleType === 'amistoso' ? 'Combate Amistoso · Nv. 5' : 'Combate Competitivo'}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-200">
              vs {battle.opponentName}
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                soundOn ? 'bg-slate-900 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="hidden sm:inline text-[11px]">{soundOn ? 'Audio ON' : 'Silencio'}</span>
            </button>

            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/20">
              <Clock size={13} />
              <span>Turno {battle.turnNumber}</span>
            </div>

            {!isGameOver && (
              <button
                onClick={handleForfeit}
                className="p-1.5 text-rose-400 hover:bg-rose-950/60 border border-rose-500/30 rounded-xl transition-colors"
                title="Rendirse"
              >
                <Flag size={16} />
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              title="Minimizar combate"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. 3D ARENA */}
        <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-[#0a0f1d] to-[#060913]">
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

          {/* TURN BANNER */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
            {mustSwitch ? (
              <div className="bg-red-950/85 backdrop-blur-md border border-red-500/50 text-red-200 px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center space-x-1.5">
                <AlertCircle size={14} className="text-red-400" />
                <span>Tu Pokémon cayó. Selecciona un compañero abajo para continuar.</span>
              </div>
            ) : isMyTurn ? (
              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Tu turno: elige tu jugada</span>
              </div>
            ) : (
              <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-amber-300 px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1.5">
                <Loader2 size={13} className="text-amber-400 animate-spin" />
                <span>Esperando jugada de {battle.opponentName}...</span>
              </div>
            )}
            {battle.myShield && (
              <span className="block mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Escudo Activo (-75% daño rival)
              </span>
            )}
          </div>

          {/* FX OVERLAYS */}
          {chargedCircleFX && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="w-52 h-52 rounded-full border-2 border-amber-400 animate-charged-ring flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border border-yellow-300 animate-ping"></div>
              </div>
              <div className="absolute text-center">
                <span className="text-xl font-black text-amber-300 tracking-wider">ATAQUE CARGADO</span>
              </div>
            </div>
          )}

          {activeAnimation && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              {activeAnimation === 'fire' && (
                <div className="w-full h-full bg-red-600/20 animate-pulse flex items-center justify-center">
                  <Flame size={130} className="text-red-500 animate-bounce" />
                </div>
              )}
              {activeAnimation === 'water' && (
                <div className="w-full h-full bg-blue-600/20 animate-pulse flex items-center justify-center">
                  <Droplets size={130} className="text-blue-400 animate-bounce" />
                </div>
              )}
              {activeAnimation === 'electric' && (
                <div className="w-full h-full bg-amber-400/20 animate-ping flex items-center justify-center">
                  <Zap size={140} className="text-amber-400" />
                </div>
              )}
              {activeAnimation === 'grass' && (
                <div className="w-full h-full bg-emerald-600/20 flex items-center justify-center">
                  <Leaf size={130} className="text-emerald-400 animate-spin" />
                </div>
              )}
              {activeAnimation === 'buff' && (
                <div className="w-full h-full bg-cyan-500/15 flex items-center justify-center">
                  <Shield size={130} className="text-cyan-400 animate-shield-pulse" />
                </div>
              )}
              {activeAnimation === 'normal' && (
                <div className="w-full h-full bg-white/15 animate-ping flex items-center justify-center">
                  <Sword size={120} className="text-white" />
                </div>
              )}
            </div>
          )}

          {/* OPPONENT HALF */}
          <div className="flex justify-end items-start w-full relative z-10 pr-2 sm:pr-8">
            <div className="flex flex-col-reverse sm:flex-row items-center sm:space-x-5">
              
              <div className="bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl w-60 sm:w-64 relative mt-2 sm:mt-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-100 mb-1">
                  <span className="tracking-wide uppercase">{opponentCard.name}</span>
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-500/20">
                    Nv. {opponentCard.level}
                  </span>
                </div>

                {/* Team alive indicators */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>{battle.opponentName}</span>
                  <div className="flex space-x-1">
                    {battle.oppTeam.map((c, idx) => (
                      <span
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full border ${
                          c.current_hp > 0 ? 'bg-rose-500 border-rose-300' : 'bg-slate-800 border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span className="font-bold text-red-400">HP</span>
                  <span>{opponentCard.current_hp} / {opponentCard.max_hp}</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      opponentCard.current_hp > opponentCard.max_hp * 0.5 ? 'bg-emerald-500' :
                      opponentCard.current_hp > opponentCard.max_hp * 0.2 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, (opponentCard.current_hp / opponentCard.max_hp) * 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-1 border-t border-slate-800">
                  <span>ATQ {opponentCard.atk}</span>
                  <span>DEF {opponentCard.def}</span>
                  <span>SPD {opponentCard.spd}</span>
                </div>

                {floatingDamage && floatingDamage.target === 'opp' && (
                  <div className={`absolute -top-10 left-4 animate-float-damage bg-slate-900/95 font-black text-sm px-3 py-1 rounded-xl shadow-xl z-30 pointer-events-none ${
                    floatingDamage.isHeal ? 'text-emerald-400 border border-emerald-500/50' : 'text-red-400 border border-red-500/50'
                  }`}>
                    {floatingDamage.text}
                    {floatingDamage.extra && <span className="block text-[9px] font-bold text-amber-300">{floatingDamage.extra}</span>}
                  </div>
                )}
              </div>

              <div className="relative flex flex-col items-center">
                <div className="h-32 sm:h-40 w-32 sm:w-40 flex items-center justify-center relative">
                  <img 
                    src={opponentCard.animated_front_url || opponentCard.artwork_url} 
                    alt={opponentCard.name}
                    className={`max-h-32 sm:max-h-36 object-contain filter drop-shadow-[0_12px_12px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                      attackerAction === 'opp' ? 'animate-opp-lunge' : ''
                    } ${
                      hitTarget === 'opp' ? 'brightness-150 contrast-200 hue-rotate-180 animate-pulse' : ''
                    } ${
                      opponentCard.current_hp === 0 ? 'grayscale rotate-90 opacity-30' : ''
                    }`}
                    onError={(e) => { e.target.src = opponentCard.artwork_url; }}
                  />
                  {battle.oppShield && (
                    <div className="absolute inset-0 border-3 border-red-400 rounded-full animate-shield-pulse pointer-events-none"></div>
                  )}
                </div>
                <div className="w-32 sm:w-44 h-7 rounded-[100%] bg-gradient-to-r from-red-500/10 via-red-500/30 to-red-500/10 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] -mt-3"></div>
              </div>

            </div>
          </div>

          {/* PLAYER HALF */}
          <div className="flex justify-start items-end w-full relative z-10 pl-2 sm:pl-8">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-5">
              
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
                  {battle.myShield && (
                    <div className="absolute inset-0 border-3 border-cyan-400 rounded-full animate-shield-pulse pointer-events-none"></div>
                  )}
                </div>
                <div className="w-32 sm:w-44 h-7 rounded-[100%] bg-gradient-to-r from-cyan-500/10 via-cyan-500/30 to-cyan-500/10 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] -mt-3"></div>
              </div>

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

                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mb-0.5">
                    <span className="flex items-center space-x-1">
                      <Zap size={11} className="fill-amber-400 text-amber-400" />
                      <span>Energía</span>
                    </span>
                    <span className="font-mono text-amber-400">{energy}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        energy >= 45 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${energy}%` }}
                    ></div>
                  </div>
                </div>

                {floatingDamage && floatingDamage.target === 'player' && (
                  <div className={`absolute -top-10 right-4 animate-float-damage bg-slate-900/95 font-black text-sm px-3 py-1 rounded-xl shadow-xl z-30 pointer-events-none ${
                    floatingDamage.isHeal ? 'text-emerald-400 border border-emerald-500/50' : 'text-red-400 border border-red-500/50'
                  }`}>
                    {floatingDamage.text}
                    {floatingDamage.extra && <span className="block text-[9px] font-bold text-amber-300">{floatingDamage.extra}</span>}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* 3. CONSOLE DECK */}
        <div className="bg-[#080d1a] border-t border-slate-800 p-3 sm:p-4 z-20">
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => { setActiveMenuTab('attack'); battleAudio.playButton(); }}
              disabled={mustSwitch}
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
              disabled={mustSwitch}
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
              disabled={mustSwitch}
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
                  : mustSwitch
                    ? 'bg-red-950/80 text-red-300 border border-red-500/60 animate-pulse'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              <ArrowLeftRight size={15} />
              <span>RELEVO ({battle.myTeam.filter(c => c.current_hp > 0).length}/{battle.myTeam.length})</span>
            </button>
          </div>

          {activeMenuTab === 'attack' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {availableMoves.map((move, midx) => {
                const typeStyle = TYPE_CONFIG[move.type] || TYPE_CONFIG.Normal;
                const IconComponent = typeStyle.icon;
                const isCharged = move.category === 'charged';
                const hasChargedEnergy = energy >= (move.energyCost || 45);
                const isMoveDisabled = actionLoading || !isMyTurn || (isCharged && !hasChargedEnergy) || activeUserCard.current_hp === 0 || mustSwitch;

                const effectiveness = getEffectivenessMultiplier(move.type, opponentCard.types || []);
                const effectLabel = getEffectivenessLabel(effectiveness);

                return (
                  <button
                    key={midx}
                    onClick={() => sendAction({ actionType: 'attack', moveIndex: midx })}
                    disabled={isMoveDisabled}
                    className={`min-h-[58px] p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isCharged && hasChargedEnergy && isMyTurn
                        ? 'bg-slate-900 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:scale-[1.02]'
                        : isMoveDisabled
                          ? 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
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
                            {energy}/{move.energyCost || 45} ⚡
                          </span>
                        ) : move.category === 'tactical' ? (
                          <span className="text-pink-400">CRIT +40%</span>
                        ) : move.category === 'buff' ? (
                          <span className="text-cyan-400">+ATQ / +25⚡</span>
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

          {activeMenuTab === 'shield' && (
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Shield size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Escudo Protector</h4>
                  <p className="text-[11px] text-slate-400">
                    Reduce el próximo golpe recibido en un <strong className="text-cyan-400">75%</strong>. Consume tu turno.
                  </p>
                </div>
              </div>

              <button
                onClick={() => sendAction({ actionType: 'shield' })}
                disabled={actionLoading || !isMyTurn || battle.myShield || mustSwitch}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 border border-cyan-500/50 font-bold text-xs rounded-xl shadow-md transition-all"
              >
                {battle.myShield ? 'Escudo Activo' : 'Activar Escudo'}
              </button>
            </div>
          )}

          {activeMenuTab === 'bag' && (
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Heart size={15} className="fill-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-100 block">Poción de Campo (+50 HP)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Consume tu turno al usarla</span>
                  </div>
                </div>

                <button
                  onClick={() => sendAction({ actionType: 'heal' })}
                  disabled={actionLoading || !isMyTurn || mustSwitch || activeUserCard.current_hp >= activeUserCard.max_hp}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-black text-[11px] rounded-lg uppercase"
                >
                  {activeUserCard.current_hp >= activeUserCard.max_hp ? 'HP Lleno' : 'Curar'}
                </button>
              </div>
            </div>
          )}

          {activeMenuTab === 'switch' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {battle.myTeam.map((card, idx) => {
                const isActive = idx === battle.myActiveIdx;
                const isFainted = card.current_hp <= 0;
                const canClick = !isActive && !isFainted && isMyTurn && !actionLoading;

                return (
                  <div
                    key={card.user_card_id || idx}
                    onClick={() => canClick && sendAction({ actionType: 'switch', switchIndex: idx })}
                    className={`min-h-[58px] p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-slate-950 border-cyan-500/60 ring-1 ring-cyan-500/30'
                        : isFainted
                          ? 'bg-slate-950/40 border-slate-850 opacity-50 cursor-not-allowed'
                          : canClick
                            ? 'bg-slate-950 hover:bg-slate-850 border-slate-800 cursor-pointer hover:border-purple-500/50'
                            : 'bg-slate-950/60 border-slate-850 opacity-70 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img src={card.sprite_url} alt={card.name} className="w-8 h-8 object-contain" />
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">{card.name}</span>
                        <span className={`text-[10px] font-semibold ${
                          isActive ? 'text-cyan-400' : isFainted ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {isActive ? 'En combate' : isFainted ? 'Debilitado' : `Nv. ${card.level}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 font-bold block">
                        {card.current_hp} / {card.max_hp} HP
                      </span>
                      {canClick && (
                        <span className="text-[10px] text-purple-400 font-bold flex items-center justify-end">
                          <span>Enviar</span>
                          <ChevronRight size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2 bg-[#050811] rounded-xl px-3 py-1.5 border border-slate-850 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span className="truncate">
              {battle.battleLogs?.[battle.battleLogs.length - 1] || 'Combate en progreso...'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. END GAME MODAL */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1222] border border-slate-750 rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-slate-900 border border-slate-700">
              {battle.didIWin ? <Trophy size={28} className="text-amber-400" /> : <Skull size={28} className="text-red-400" />}
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-wider">
                {battle.didIWin ? 'Victoria' : 'Derrota'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {battle.didIWin
                  ? `Derrotaste a ${battle.opponentName}.`
                  : `${battle.opponentName} ganó el combate.`}
              </p>
            </div>

            {battle.rewards && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-left space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">EXP Obtenida:</span>
                  <span className="font-bold text-cyan-400">+{battle.rewards.xpEarned} EXP</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">PokéMonedas:</span>
                  <span className="font-bold text-amber-400">+{battle.rewards.coinsEarned} P</span>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Regresar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
