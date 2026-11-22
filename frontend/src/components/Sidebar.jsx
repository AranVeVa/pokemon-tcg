import React from 'react';
import { 
  Package, 
  BookOpen, 
  Trophy, 
  Users, 
  Flame, 
  Settings, 
  Home, 
  ShieldAlert,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();

  const menuItems = [
    { id: 'landing', label: 'Inicio', icon: Home },
    { id: 'sobres-tienda', label: 'Sobres y Tienda', icon: Package },
    { id: 'pokedex', label: 'Pokédex', icon: BookOpen },
    { id: 'pase-batalla', label: 'Pase de Batalla', icon: Trophy },
    { id: 'amigos-retos', label: 'Amigos y Retos', icon: Users },
    { id: 'mejorar-evolucionar', label: 'Mi Perfil (Mejorar)', icon: Flame },
  ];

  if (user && user.role === 'Admin') {
    menuItems.push({
      id: 'super-admin',
      label: 'Super Admin',
      icon: ShieldAlert,
      isAdminOnly: true
    });
  }

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 shadow-lg select-none">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Menú de Juego
        </div>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? item.isAdminOnly 
                    ? 'bg-red-950/80 text-red-200 border border-red-500/50 shadow-md' 
                    : 'bg-slate-850 text-cyan-400 border border-cyan-500/40 shadow-md shadow-cyan-950/50'
                  : item.isAdminOnly
                    ? 'text-red-400 hover:bg-red-950/40 border border-transparent'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon size={17} className={isActive ? (item.isAdminOnly ? 'text-red-400' : 'text-cyan-400') : 'text-slate-500'} />
              <span>{item.label}</span>
              {item.isAdminOnly && (
                <span className={`ml-auto text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-red-800 text-white' : 'bg-red-950 text-red-400 border border-red-800'
                }`}>
                  Admin
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Plaque */}
      <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-2xl text-xs space-y-1">
        <div className="flex items-center space-x-1.5 text-cyan-400 font-bold text-[11px]">
          <Sparkles size={13} />
          <span>UVAQ · Prog. Web</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Pokémon TCG · 2026<br />
          <span className="font-semibold text-slate-300">Arantza Venegas V.</span>
        </p>
      </div>
    </aside>
  );
}
