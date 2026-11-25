import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Lock, 
  Check, 
  Sparkles, 
  Gift, 
  Crown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Gem,
  Coins
} from 'lucide-react';

export default function BattlePassView({ onOpenStripe }) {
  const { user, refreshUser } = useAuth();
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchBattlePass();
  }, []);

  const fetchBattlePass = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/battle-pass');
      setPassData(data);
    } catch (err) {
      console.error('Error fetching battle pass:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (level, track) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiRequest('/battle-pass/claim', 'POST', { level, track });
      setMessage({ text: res.message, type: 'success' });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      await refreshUser();
      await fetchBattlePass();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !passData) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando Pase de Batalla...</p>
      </div>
    );
  }

  const { seasonName, userLevel, currentXp, xpForNextLevel, isPremium, rewards } = passData;
  const progressPercent = Math.min(100, (currentXp / xpForNextLevel) * 100);

  // Mostrar todos los 50 niveles del Pase de Batalla
  const visibleRewards = rewards;

  return (
    <div className="space-y-8 pb-12 select-none text-slate-100">
      
      {/* Title & Season Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy size={24} className="text-amber-400" />
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Pase de Batalla · <span className="text-cyan-400">{seasonName}</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gana experiencia en combates RPG y abriendo sobres para desbloquear 50 niveles de recompensas.
          </p>
        </div>

        {!isPremium && (
          <button
            onClick={onOpenStripe}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 self-start sm:self-auto uppercase tracking-wider"
          >
            <Crown size={16} />
            <span>Desbloquear Premium ($149 MXN)</span>
          </button>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/70 text-red-300 border border-red-500/40'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Level Progress Banner */}
      <section className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-black text-slate-100 tracking-tight">Nivel {userLevel}</span>
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/30">
                {seasonName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              <strong className="text-cyan-400 font-mono">{currentXp.toLocaleString()}</strong> / <span className="font-mono">{xpForNextLevel.toLocaleString()} XP</span> para el nivel {userLevel + 1}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Temporada Activa</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 shadow-sm shadow-cyan-500/50"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </section>

      {/* Main Tracks Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 9 Cols: The Dual Tracks (Free & Premium) */}
        <div className="lg:col-span-9 bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-8 overflow-x-auto">
          
          {/* Track 1: Pase Gratuito */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Gift size={15} />
                </div>
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Pase Gratuito</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Niveles 1 - {rewards.length} · Desliza →</span>
            </div>

            <div className="flex items-center space-x-3 overflow-x-auto pb-4 scrollbar-thin">
              {visibleRewards.map((r) => (
                <div 
                  key={`free-${r.level}`}
                  className={`w-28 shrink-0 rounded-2xl p-3 border text-center flex flex-col justify-between transition-all ${
                    r.free.claimed
                      ? 'bg-slate-900/40 border-slate-850 opacity-50'
                      : r.free.canClaim
                        ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                        : 'bg-[#080d1a] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-mono font-bold text-slate-400">Nv. {r.level}</span>
                  
                  <div className="my-2 h-10 flex items-center justify-center">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-xs flex items-center justify-center shadow-inner">
                      <Coins size={16} />
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-200 truncate block">
                    {r.free.title}
                  </span>

                  <div className="mt-2">
                    {r.free.claimed ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-center space-x-0.5">
                        <Check size={12} />
                        <span>Reclamado</span>
                      </span>
                    ) : r.free.canClaim ? (
                      <button
                        onClick={() => handleClaimReward(r.level, 'free')}
                        disabled={actionLoading}
                        className="w-full py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-lg text-[10px] shadow-sm uppercase tracking-wide"
                      >
                        Reclamar
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track 2: Pase Premium (Solo Premium) */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Crown size={15} />
                </div>
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">Pase Premium</h3>
                <span className="text-[10px] font-mono font-extrabold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Solo Premium
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 overflow-x-auto pb-4 scrollbar-thin">
              {visibleRewards.map((r) => (
                <div 
                  key={`prem-${r.level}`}
                  className={`w-28 shrink-0 rounded-2xl p-3 border text-center flex flex-col justify-between transition-all ${
                    r.premium.claimed
                      ? 'bg-slate-900/40 border-slate-850 opacity-50'
                      : r.premium.canClaim
                        ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                        : 'bg-[#080d1a] border-slate-800 hover:border-amber-500/30'
                  }`}
                >
                  <span className="text-[11px] font-mono font-bold text-amber-400">Nv. {r.level}</span>
                  
                  <div className="my-2 h-10 flex items-center justify-center">
                    <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black text-xs flex items-center justify-center shadow-inner">
                      <Gem size={16} />
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-200 truncate block">
                    {r.premium.title}
                  </span>

                  <div className="mt-2">
                    {r.premium.claimed ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-center space-x-0.5">
                        <Check size={12} />
                        <span>Reclamado</span>
                      </span>
                    ) : r.premium.isLocked ? (
                      <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center space-x-0.5">
                        <Lock size={11} />
                        <span>Bloqueado</span>
                      </span>
                    ) : r.premium.canClaim ? (
                      <button
                        onClick={() => handleClaimReward(r.level, 'premium')}
                        disabled={actionLoading}
                        className="w-full py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-[10px] shadow uppercase tracking-wide"
                      >
                        Reclamar
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 3 Cols: Nivel 50 Guaranteed Card */}
        <div className="lg:col-span-3 bg-gradient-to-b from-[#161c2e] via-[#0e1627] to-[#090e18] rounded-3xl p-6 border-2 border-amber-500/40 shadow-2xl text-center space-y-4">
          <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40 shadow-sm uppercase tracking-wider">
            <Crown size={14} className="text-amber-400" />
            <span>Nivel 50 Garantizado</span>
          </div>

          <div className="h-48 flex items-center justify-center relative">
            <img 
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png" 
              alt="Blastoise EX"
              className="max-h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] hover:scale-105 transition-transform animate-float"
            />
          </div>

          <div>
            <h4 className="text-lg font-black text-slate-100">Blastoise EX</h4>
            <span className="text-xs font-bold text-cyan-400 block">Evolución final garantizada</span>
            <p className="text-[11px] text-slate-400 mt-2">
              Estadísticas de combate de élite:<br />
              <strong className="text-emerald-400 font-mono">330 HP</strong> · <strong className="text-rose-400 font-mono">190 ATQ</strong>
            </p>
          </div>

          <div className="pt-2">
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-3 py-1.5 rounded-xl block border border-amber-500/30">
              Exclusivo Pase Premium
            </span>
          </div>
        </div>

      </section>

    </div>
  );
}
