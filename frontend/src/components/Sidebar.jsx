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
  Sparkles
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

  // Super Admin tab (only for Admin role)
  if (user && user.role === 'Admin') {
    menuItems.push({
      id: 'super-admin',
      label: 'Super Admin',
      icon: ShieldAlert,
      isAdminOnly: true
    });
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 shadow-sm">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Menú Principal
        </div>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? item.isAdminOnly 
                    ? 'bg-red-600 text-white shadow-md shadow-red-200' 
                    : 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : item.isAdminOnly
                    ? 'text-red-700 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
              }`}
            >
              <Icon size={19} className={isActive ? 'text-white' : item.isAdminOnly ? 'text-red-600' : 'text-gray-500'} />
              <span>{item.label}</span>
              {item.isAdminOnly && (
                <span className={`ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'
                }`}>
                  Admin
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl text-xs space-y-1 text-gray-600">
        <div className="flex items-center space-x-1.5 text-blue-700 font-bold">
          <Sparkles size={14} />
          <span>UVAQ · Prog. Web</span>
        </div>
        <p className="text-[11px] text-gray-500">
          Pokémon TCG · 2026<br />
          <span className="font-semibold text-gray-700">Arantza Venegas V.</span>
        </p>
      </div>
    </aside>
  );
}
