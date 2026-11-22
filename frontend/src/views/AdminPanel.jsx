import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { showAlert } from '../utils/gameAlert';
import { 
  ShieldAlert, 
  Users, 
  Image, 
  Percent, 
  Calendar, 
  CreditCard, 
  Search, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  X
} from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const [adminTab, setAdminTab] = useState('usuarios'); // 'usuarios' | 'cartas' | 'probabilidades' | 'temporadas' | 'pagos'
  
  // Data states
  const [usersList, setUsersList] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 350);
  
  const [cardsList, setCardsList] = useState([]);
  const [cardSearch, setCardSearch] = useState('');
  const debouncedCardSearch = useDebounce(cardSearch, 350);
  const [editingCard, setEditingCard] = useState(null);

  const [configs, setConfigs] = useState({});
  const [paymentsList, setPaymentsList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [adminTab, debouncedUserSearch, debouncedCardSearch]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (adminTab === 'usuarios') {
        const data = await apiRequest(`/admin/users?search=${encodeURIComponent(debouncedUserSearch)}`);
        setUsersList(data.users || []);
        const rolesMap = {};
        data.users?.forEach(u => { rolesMap[u.id] = u.role; });
        setUserRoles(rolesMap);
      } else if (adminTab === 'cartas') {
        const data = await apiRequest(`/admin/cards?search=${encodeURIComponent(debouncedCardSearch)}`);
        setCardsList(data.cards || []);
      } else if (adminTab === 'probabilidades' || adminTab === 'temporadas') {
        const data = await apiRequest('/admin/config');
        setConfigs(data.configs || {});
      } else if (adminTab === 'pagos') {
        const data = await apiRequest('/admin/payments');
        setPaymentsList(data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar rol de usuario
  const handleSaveUserRole = async (targetUserId) => {
    setActionLoading(true);
    try {
      const role = userRoles[targetUserId];
      const res = await apiRequest(`/admin/users/${targetUserId}/role`, 'PUT', { role });
      showAlert.success('Rol Actualizado', res.message);
      await fetchAdminData();
    } catch (err) {
      showAlert.error('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar configuración de probabilidades o temporada
  const handleSaveConfig = async (key, value) => {
    setActionLoading(true);
    try {
      const res = await apiRequest(`/admin/config/${key}`, 'PUT', { value });
      showAlert.success('Configuración Guardada', res.message);
      await fetchAdminData();
    } catch (err) {
      showAlert.error('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar cambios de carta
  const handleSaveCard = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await apiRequest(`/admin/cards/${editingCard.id}`, 'PUT', editingCard);
      showAlert.success('Carta Guardada', res.message);
      setEditingCard(null);
      await fetchAdminData();
    } catch (err) {
      showAlert.error('Error al guardar carta', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none text-slate-100">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-rose-950 text-rose-400 border border-rose-500/30">
              <ShieldAlert size={20} />
            </span>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Panel de Administración</h1>
          </div>
          <span className="text-xs font-mono font-bold text-rose-400 block mt-0.5">
            Módulo con privilegios de Super Administrador (UVAQ)
          </span>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/70 text-red-300 border border-red-500/40'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Admin Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'usuarios', label: 'Usuarios y Roles', icon: Users },
          { id: 'cartas', label: 'Cartas e Imágenes', icon: Image },
          { id: 'probabilidades', label: 'Probabilidades de Sobres', icon: Percent },
          { id: 'temporadas', label: 'Temporadas del Pase', icon: Calendar },
          { id: 'pagos', label: 'Auditoría Stripe', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setAdminTab(tab.id); setMessage({ text: '', type: '' }); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-rose-950/90 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-950/50' 
                  : 'bg-[#0b1222] text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: USUARIOS Y ROLES */}
      {adminTab === 'usuarios' && (
        <div className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-black text-slate-100">Gestión de Roles de Usuario</h3>
            
            {/* Search Box */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar usuario o correo..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAdminData()}
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 sm:w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Usuario</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3">Rol Actual</th>
                  <th className="pb-3 pr-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 font-bold flex items-center justify-center text-xs font-mono">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-100">{u.username}</span>
                      </div>
                    </td>

                    <td className="py-3.5 text-slate-400 font-mono">
                      {u.email}
                    </td>

                    <td className="py-3.5">
                      <select
                        value={userRoles[u.id] || u.role}
                        onChange={(e) => setUserRoles({ ...userRoles, [u.id]: e.target.value })}
                        className="py-1 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Premium">Premium</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>

                    <td className="py-3.5 pr-2 text-right">
                      <button
                        onClick={() => handleSaveUserRole(u.id)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
                      >
                        Guardar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CARTAS E IMÁGENES */}
      {adminTab === 'cartas' && (
        <div className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-black text-slate-100">Catálogo de Cartas e Imágenes</h3>
            
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAdminData()}
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 sm:w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto p-1 scrollbar-thin">
            {cardsList.map((card) => (
              <div 
                key={card.id}
                onClick={() => setEditingCard(card)}
                className="p-3 bg-[#0e1628] hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-center cursor-pointer transition-all hover:scale-105"
              >
                <img src={card.artwork_url} alt={card.name} className="w-16 h-16 mx-auto object-contain filter drop-shadow" />
                <span className="text-[10px] font-mono text-slate-500 block mt-1">#{card.id}</span>
                <span className="text-xs font-black text-slate-100 block truncate">{card.name}</span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 capitalize">{card.rarity}</span>
              </div>
            ))}
          </div>

          {/* Modal Edición de Carta */}
          {editingCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <form onSubmit={handleSaveCard} className="bg-[#0b1222] rounded-3xl p-6 max-w-md w-full border border-slate-750 shadow-2xl space-y-4 text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-base font-black text-slate-100">Editar Carta #{editingCard.id} - {editingCard.name}</h4>
                  <button type="button" onClick={() => setEditingCard(null)} className="text-slate-400 hover:text-slate-100">
                    <X size={18} />
                  </button>
                </div>
                
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingCard.name}
                    onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-400 mb-1">HP Base</label>
                    <input
                      type="number"
                      value={editingCard.hp_base}
                      onChange={(e) => setEditingCard({ ...editingCard, hp_base: parseInt(e.target.value) })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Ataque Base</label>
                    <input
                      type="number"
                      value={editingCard.atk_base}
                      onChange={(e) => setEditingCard({ ...editingCard, atk_base: parseInt(e.target.value) })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Rareza</label>
                  <select
                    value={editingCard.rarity}
                    onChange={(e) => setEditingCard({ ...editingCard, rarity: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="comun">comun</option>
                    <option value="poco_comun">poco_comun</option>
                    <option value="rara">rara</option>
                    <option value="legendario">legendario</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">URL Artwork Oficial</label>
                  <input
                    type="text"
                    value={editingCard.artwork_url}
                    onChange={(e) => setEditingCard({ ...editingCard, artwork_url: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-[10px] text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold rounded-xl text-xs border border-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs shadow"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROBABILIDADES */}
      {adminTab === 'probabilidades' && (
        <div className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          <h3 className="text-base font-black text-slate-100">Configuración de Probabilidades de Sobres</h3>
          <p className="text-xs text-slate-400">
            Ajusta las tasas de aparición de cartas según el tipo de sobre coleccionable.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['pack_rates_normal', 'pack_rates_special', 'pack_rates_legendary'].map((key) => {
              const rates = configs[key] || {};
              const title = key === 'pack_rates_normal' ? 'Sobre Normal' :
                            key === 'pack_rates_special' ? 'Sobre Especial' : 'Sobre Legendario';

              return (
                <div key={key} className="p-5 bg-[#0e1628] rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-black text-sm text-slate-100">{title}</h4>
                  
                  {['comun', 'poco_comun', 'rara', 'legendario'].map((rarity) => (
                    <div key={rarity} className="flex items-center justify-between text-xs">
                      <span className="capitalize font-mono font-bold text-slate-400">{rarity}:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={rates[rarity] ?? 0}
                        onChange={(e) => {
                          const updated = { ...configs, [key]: { ...rates, [rarity]: parseFloat(e.target.value) || 0 } };
                          setConfigs(updated);
                        }}
                        className="w-20 p-1 bg-slate-900 border border-slate-800 rounded text-center font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  ))}

                  <button
                    onClick={() => handleSaveConfig(key, configs[key])}
                    disabled={actionLoading}
                    className="w-full py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs mt-2 shadow"
                  >
                    Guardar Tasas
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TEMPORADAS */}
      {adminTab === 'temporadas' && (
        <div className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6 max-w-xl">
          <h3 className="text-base font-black text-slate-100">Configuración de Temporadas</h3>
          <p className="text-xs text-slate-400">
            Modifica la temporada temática del Pase de Batalla según la estación del año o evento.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Nombre de la Temporada</label>
              <input
                type="text"
                value={configs.season_info?.name || 'Temporada Primavera'}
                onChange={(e) => setConfigs({ ...configs, season_info: { ...configs.season_info, name: e.target.value } })}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={() => handleSaveConfig('season_info', configs.season_info)}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs shadow"
            >
              Guardar Temporada
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: PAGOS EN STRIPE */}
      {adminTab === 'pagos' && (
        <div className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          <h3 className="text-base font-black text-slate-100">Historial y Auditoría de Pagos en Stripe</h3>
          <p className="text-xs text-slate-400">
            Registro de compras realizadas mediante Stripe Checkout en entorno de prueba.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono font-bold uppercase tracking-wider">
                  <th className="pb-3">ID Pago</th>
                  <th className="pb-3">Usuario</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3">Producto</th>
                  <th className="pb-3">Monto (MXN)</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {paymentsList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="py-3 font-mono text-slate-500">#{p.id}</td>
                    <td className="py-3 font-bold text-slate-200">{p.username || 'Entrenador'}</td>
                    <td className="py-3 text-slate-400 font-mono">{p.customer_email}</td>
                    <td className="py-3 font-semibold text-cyan-400">{p.product_type}</td>
                    <td className="py-3 font-mono font-black text-slate-100">${parseFloat(p.amount_mxn).toFixed(2)}</td>
                    <td className="py-3">
                      <span className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 font-mono">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
