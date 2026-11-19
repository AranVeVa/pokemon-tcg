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
  AlertCircle 
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
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-gray-500">Cargando Pase de Batalla...</p>
      </div>
    );
  }

  const { seasonName, userLevel, currentXp, xpForNextLevel, isPremium, rewards } = passData;
  const progressPercent = Math.min(100, (currentXp / xpForNextLevel) * 100);

  // Filtramos un rango alrededor del nivel actual (e.g. del 14 al 24) o permitimos scroll
  const visibleRewards = rewards.slice(Math.max(0, userLevel - 4), Math.min(50, userLevel + 8));

  return (
    <div className="space-y-8 pb-12">
      
      {/* Title & Season Tag (Mockup 8) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Pase de Batalla · <span className="text-blue-600">{seasonName}</span>
          </h1>
          <p className="text-xs text-gray-500">
            Sube de nivel ganando partidas y completando combates para desbloquear recompensas exclusivas.
          </p>
        </div>

        {!isPremium && (
          <button
            onClick={onOpenStripe}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-200 transition-all flex items-center space-x-2 self-start sm:self-auto"
          >
            <Crown size={16} />
            <span>Desbloquear Premium ($149 MXN)</span>
          </button>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Level Progress Banner (Mockup 8) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-black text-gray-900">Nivel {userLevel}</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                {seasonName}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <strong className="text-gray-800">{currentXp.toLocaleString()}</strong> / {xpForNextLevel.toLocaleString()} XP para el nivel {userLevel + 1}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-gray-400">Temporada Primavera</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-0.5 border border-gray-200">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </section>

      {/* Main Tracks Grid (Mockup 8) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 9 Cols: The Dual Tracks (Free & Premium) */}
        <div className="lg:col-span-9 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-8 overflow-x-auto">
          
          {/* Track 1: Pase Gratuito */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Gift size={14} />
              </div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Pase gratuito</h3>
            </div>

            <div className="flex items-center space-x-3 overflow-x-auto pb-4">
              {visibleRewards.map((r) => (
                <div 
                  key={`free-${r.level}`}
                  className={`w-28 shrink-0 rounded-2xl p-3 border text-center flex flex-col justify-between transition-all ${
                    r.free.claimed
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : r.free.canClaim
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-md animate-pulse'
                        : 'bg-white border-gray-200'
                  }`}
                >
                  <span className="text-[11px] font-bold text-gray-500">Nv. {r.level}</span>
                  
                  <div className="my-2 h-10 flex items-center justify-center">
                    <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-900 font-black text-xs flex items-center justify-center shadow-inner">
                      P
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-gray-700 truncate block">
                    {r.free.title}
                  </span>

                  <div className="mt-2">
                    {r.free.claimed ? (
                      <span className="text-[10px] font-bold text-green-600 flex items-center justify-center space-x-0.5">
                        <Check size={12} />
                        <span>Reclamado</span>
                      </span>
                    ) : r.free.canClaim ? (
                      <button
                        onClick={() => handleClaimReward(r.level, 'free')}
                        disabled={actionLoading}
                        className="w-full py-1 bg-blue-600 text-white font-bold rounded-lg text-[10px] shadow"
                      >
                        Reclamar
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-400">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track 2: Pase Premium (Solo Premium) */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Crown size={14} />
                </div>
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide">Pase premium</h3>
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Solo Premium
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 overflow-x-auto pb-4">
              {visibleRewards.map((r) => (
                <div 
                  key={`prem-${r.level}`}
                  className={`w-28 shrink-0 rounded-2xl p-3 border text-center flex flex-col justify-between transition-all ${
                    r.premium.claimed
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : r.premium.canClaim
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200 shadow-md animate-pulse'
                        : 'bg-white border-amber-200'
                  }`}
                >
                  <span className="text-[11px] font-bold text-amber-800">Nv. {r.level}</span>
                  
                  <div className="my-2 h-10 flex items-center justify-center">
                    <span className="w-4 h-4 rotate-45 bg-cyan-500 rounded-sm inline-block shadow-sm"></span>
                  </div>

                  <span className="text-[10px] font-bold text-gray-800 truncate block">
                    {r.premium.title}
                  </span>

                  <div className="mt-2">
                    {r.premium.claimed ? (
                      <span className="text-[10px] font-bold text-green-600 flex items-center justify-center space-x-0.5">
                        <Check size={12} />
                        <span>Reclamado</span>
                      </span>
                    ) : r.premium.isLocked ? (
                      <span className="text-[10px] font-bold text-gray-400 flex items-center justify-center space-x-0.5">
                        <Lock size={11} />
                        <span>Bloqueado</span>
                      </span>
                    ) : r.premium.canClaim ? (
                      <button
                        onClick={() => handleClaimReward(r.level, 'premium')}
                        disabled={actionLoading}
                        className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] shadow"
                      >
                        Reclamar
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-400">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 3 Cols: Nivel 50 Guaranteed Card (Mockup 8) */}
        <div className="lg:col-span-3 bg-gradient-to-b from-amber-50 via-yellow-50 to-white rounded-3xl p-6 border-2 border-amber-300 shadow-lg text-center space-y-4">
          <div className="inline-flex items-center space-x-1.5 text-xs font-black text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full shadow-sm">
            <Crown size={14} />
            <span>Nivel 50 Garantizado</span>
          </div>

          <div className="h-48 flex items-center justify-center relative">
            <img 
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png" 
              alt="Blastoise EX"
              className="max-h-full object-contain filter drop-shadow-xl hover:scale-105 transition-transform animate-float"
            />
          </div>

          <div>
            <h4 className="text-base font-black text-gray-900">Blastoise EX</h4>
            <span className="text-xs font-bold text-amber-700 block">Evolución final garantizada</span>
            <p className="text-[11px] text-gray-500 mt-1">
              Estadísticas mejoradas exclusivas:<br />
              <strong className="text-red-600">330 HP</strong> · <strong className="text-blue-600">190 ATQ</strong>
            </p>
          </div>

          <div className="pt-2">
            <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl block border border-amber-200">
              Solo Pase Premium
            </span>
          </div>
        </div>

      </section>

    </div>
  );
}
