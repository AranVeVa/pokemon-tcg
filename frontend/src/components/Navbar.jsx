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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => setActiveTab(user ? 'sobres-tienda' : 'landing')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center border-2 border-white shadow-md relative overflow-hidden group-hover:rotate-12 transition-transform">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-600"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white"></div>
            <div className="absolute w-full h-1 bg-gray-900 top-1/2 -translate-y-1/2"></div>
            <div className="absolute w-3 h-3 bg-white border-2 border-gray-900 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"></div>
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900">
            Pokémon <span className="text-red-600">TCG</span>
          </span>
        </div>

        {/* Public Landing Links */}
        {!user && (
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-gray-600">
            <button 
              onClick={() => setActiveTab('landing')}
              className="hover:text-blue-600 transition-colors"
            >
              Cómo funciona
            </button>
            <button 
              onClick={() => setActiveTab('landing')} 
              className="hover:text-blue-600 transition-colors"
            >
              Pase de Batalla
            </button>
            <button 
              onClick={() => setActiveTab('landing')} 
              className="hover:text-blue-600 transition-colors"
            >
              PokéGemas
            </button>
          </nav>
        )}

        {/* Action / User Bar */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {user ? (
            <>
              {/* PokéMonedas Badge */}
              <div 
                title="PokéMonedas obtenidas jugando partidas"
                className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-amber-800 text-xs sm:text-sm font-bold shadow-sm"
              >
                <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-900 font-extrabold flex items-center justify-center text-[11px] shadow-inner">
                  P
                </span>
                <span>{(user.coins || 0).toLocaleString()}</span>
              </div>

              {/* PokéGemas Badge (Click opens Stripe shop) */}
              <button 
                onClick={onOpenStripe}
                title="PokéGemas premium. ¡Haz clic para comprar!"
                className="flex items-center space-x-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-full text-cyan-800 text-xs sm:text-sm font-bold shadow-sm transition-all"
              >
                <span className="w-3.5 h-3.5 rotate-45 bg-cyan-500 rounded-sm inline-block shadow-sm"></span>
                <span>{(user.gems || 0).toLocaleString()}</span>
                <span className="text-xs text-cyan-600 hidden sm:inline ml-0.5">+</span>
              </button>

              {/* User Avatar Circle */}
              <div className="flex items-center space-x-2 pl-1 border-l border-gray-200">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow ${
                    user.role === 'Admin' ? 'bg-red-600 ring-2 ring-red-300' :
                    user.role === 'Premium' ? 'bg-amber-500 ring-2 ring-amber-300' : 'bg-blue-600'
                  }`}
                  title={`${user.username} (${user.role})`}
                >
                  {getInitials(user.username)}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-gray-800 leading-tight">{user.username}</span>
                  <span className={`text-[10px] font-semibold leading-none ${
                    user.role === 'Admin' ? 'text-red-600' :
                    user.role === 'Premium' ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                Crear cuenta
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
