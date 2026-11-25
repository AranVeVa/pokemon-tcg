import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar({ onOpenAuth, onOpenStripe, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'PK';
    const parts = name.split(/[ _-]/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-[#0b1222]/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 shadow-xl select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand / Game Logo */}
        <div 
          onClick={() => setActiveTab(user ? 'sobres-tienda' : 'landing')}
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-600 flex items-center justify-center border-2 border-slate-900 shadow-[0_0_15px_rgba(239,68,68,0.4)] relative overflow-hidden group-hover:rotate-12 transition-transform">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-600"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white"></div>
            <div className="absolute w-full h-1 bg-slate-950 top-1/2 -translate-y-1/2"></div>
            <div className="absolute w-3 h-3 bg-white border-2 border-slate-950 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 shadow-sm"></div>
          </div>
          <span className="text-base sm:text-xl font-black tracking-tight text-slate-100 flex items-center space-x-1">
            <span>POKÉMON</span>
            <span className="text-red-500 font-extrabold ml-1 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/40 text-[10px] sm:text-xs">TCG</span>
          </span>
        </div>

        {/* Action / User Bar */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {user ? (
            <>
              {/* PokéMonedas Badge */}
              <div 
                title="PokéMonedas obtenidas jugando partidas"
                className="flex items-center space-x-1.5 bg-slate-900 border border-amber-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-amber-300 text-[11px] sm:text-xs font-mono font-bold shadow-sm"
              >
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px] sm:text-[10px] shadow">
                  P
                </span>
                <span>{(user.coins || 0).toLocaleString()}</span>
              </div>

              {/* PokéGemas Badge (Click opens Stripe shop) */}
              <button 
                onClick={onOpenStripe}
                title="PokéGemas premium. ¡Haz clic para adquirir!"
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-850 border border-cyan-500/40 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-cyan-300 text-[11px] sm:text-xs font-mono font-bold shadow-sm transition-all"
              >
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rotate-45 bg-cyan-400 rounded-xs inline-block shadow"></span>
                <span>{(user.gems || 0).toLocaleString()}</span>
                <span className="text-[10px] text-cyan-400 ml-0.5 font-bold">+</span>
              </button>

              {/* User Avatar */}
              <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-slate-100 shadow ${
                    user.role === 'Admin' ? 'bg-red-600 ring-2 ring-red-400/50' :
                    user.role === 'Premium' ? 'bg-amber-600 ring-2 ring-amber-400/50' : 'bg-slate-800 border border-slate-700'
                  }`}
                  title={`${user.username} (${user.role})`}
                >
                  {getInitials(user.username)}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-100 leading-tight">{user.username}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    user.role === 'Admin' ? 'text-red-400' :
                    user.role === 'Premium' ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-850 rounded-xl transition-colors"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-xl transition-colors border border-slate-750"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl shadow-md shadow-cyan-500/20 transition-all uppercase tracking-wider"
              >
                Crear Cuenta
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
