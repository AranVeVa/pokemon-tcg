import React from 'react';
import { 
  Package, 
  BookOpen, 
  Trophy, 
  Users, 
  Flame, 
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();

  const menuItems = [
    { id: 'sobres-tienda', label: 'Sobres y Tienda', shortLabel: 'Tienda', icon: Package },
    { id: 'pokedex', label: 'Pokédex', shortLabel: 'Pokédex', icon: BookOpen },
    { id: 'pase-batalla', label: 'Pase de Batalla', shortLabel: 'Pase', icon: Trophy },
    { id: 'amigos-retos', label: 'Amigos y Combates', shortLabel: 'Amigos', icon: Users },
    { id: 'mejorar-evolucionar', label: 'Mejorar y Evolucionar', shortLabel: 'Evolución', icon: Flame },
  ];

  if (user && user.role === 'Admin') {
    menuItems.push({
      id: 'super-admin',
      label: 'Super Admin',
      shortLabel: 'Admin',
      icon: ShieldAlert,
      isAdminOnly: true
    });
  }

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#0a0f1d] border-r border-slate-800 min-h-[calc(100vh-4rem)] p-4 flex-col justify-between shrink-0 shadow-lg select-none">
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
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1222]/95 backdrop-blur-md border-t border-slate-800 px-1 pt-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] flex items-center justify-between shadow-2xl select-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center px-0.5 py-1 rounded-xl transition-all ${
                isActive
                  ? item.isAdminOnly
                    ? 'text-red-400'
                    : 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={17} />
              <span className="text-[9px] font-bold mt-0.5 truncate w-full text-center">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
