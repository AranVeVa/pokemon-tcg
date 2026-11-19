import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
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
  Plus
} from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const [adminTab, setAdminTab] = useState('usuarios'); // 'usuarios' | 'cartas' | 'probabilidades' | 'temporadas' | 'pagos'
  
  // Data states
  const [usersList, setUsersList] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [userSearch, setUserSearch] = useState('');
  
  const [cardsList, setCardsList] = useState([]);
  const [cardSearch, setCardSearch] = useState('');
  const [editingCard, setEditingCard] = useState(null);

  const [configs, setConfigs] = useState({});
  const [paymentsList, setPaymentsList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [adminTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (adminTab === 'usuarios') {
        const data = await apiRequest(`/admin/users?search=${encodeURIComponent(userSearch)}`);
        setUsersList(data.users);
        const rolesMap = {};
        data.users.forEach(u => { rolesMap[u.id] = u.role; });
        setUserRoles(rolesMap);
      } else if (adminTab === 'cartas') {
        const data = await apiRequest(`/admin/cards?search=${encodeURIComponent(cardSearch)}`);
        setCardsList(data.cards);
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

  // Guardar rol de usuario (Mockup 5)
  const handleSaveUserRole = async (userId) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });
    const selectedRole = userRoles[userId];

    try {
      const res = await apiRequest(`/admin/users/${userId}/role`, 'PUT', { role: selectedRole });
      setMessage({ text: res.message, type: 'success' });
      await fetchAdminData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar configuración de probabilidades o temporada
  const handleSaveConfig = async (key, value) => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await apiRequest(`/admin/config/${key}`, 'PUT', { value });
      setMessage({ text: res.message, type: 'success' });
      await fetchAdminData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar cambios de carta
  const handleSaveCard = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await apiRequest(`/admin/cards/${editingCard.id}`, 'PUT', editingCard);
      setMessage({ text: res.message, type: 'success' });
      setEditingCard(null);
      await fetchAdminData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-red-100 text-red-700">
              <ShieldAlert size={20} />
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Panel de Super Administrador</h1>
          </div>
          <span className="text-xs font-bold text-red-600 block mt-0.5">
            Visible solo para el Super Admin
          </span>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Admin Tabs Bar (Mockup 5) */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'usuarios', label: 'Usuarios y Roles', icon: Users },
          { id: 'cartas', label: 'Cartas e Imágenes', icon: Image },
          { id: 'probabilidades', label: 'Probabilidades', icon: Percent },
          { id: 'temporadas', label: 'Temporadas', icon: Calendar },
          { id: 'pagos', label: 'Pagos en Stripe', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setAdminTab(tab.id); setMessage({ text: '', type: '' }); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USUARIOS Y ROLES (Mockup 5) */}
      {/* ======================================================== */}
      {adminTab === 'usuarios' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-black text-gray-900">Gestión de Roles de Usuario</h3>
            
            {/* Search Box */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuario o correo..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAdminData()}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-red-500 w-56 sm:w-64"
              />
            </div>
          </div>

          {/* Table (Mockup 5) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Usuario</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3">Rol actual</th>
                  <th className="pb-3 pr-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900">{u.username}</span>
                      </div>
                    </td>

                    <td className="py-3.5 text-gray-500 font-mono">
                      {u.email}
                    </td>

                    <td className="py-3.5">
                      <select
                        value={userRoles[u.id] || u.role}
                        onChange={(e) => setUserRoles({ ...userRoles, [u.id]: e.target.value })}
                        className="py-1 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-red-500 cursor-pointer"
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
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
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

      {/* ======================================================== */}
      {/* TAB 2: CARTAS E IMÁGENES */}
      {/* ======================================================== */}
      {adminTab === 'cartas' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-black text-gray-900">Catálogo de Cartas e Imágenes</h3>
            
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o número..."
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAdminData()}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-red-500 w-56 sm:w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto p-1">
            {cardsList.map((card) => (
              <div 
                key={card.id}
                onClick={() => setEditingCard(card)}
                className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl text-center cursor-pointer transition-all hover:scale-105"
              >
                <img src={card.artwork_url} alt={card.name} className="w-16 h-16 mx-auto object-contain filter drop-shadow" />
                <span className="text-[10px] font-mono text-gray-400 block mt-1">#{card.id}</span>
                <span className="text-xs font-black text-gray-900 block truncate">{card.name}</span>
                <span className="text-[10px] font-bold text-blue-600 capitalize">{card.rarity}</span>
              </div>
            ))}
          </div>

          {/* Modal Edición de Carta */}
          {editingCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
              <form onSubmit={handleSaveCard} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4">
                <h4 className="text-base font-black text-gray-900">Editar Carta #{editingCard.id} - {editingCard.name}</h4>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingCard.name}
                    onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                    className="w-full p-2 bg-gray-50 border rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">HP Base</label>
                    <input
                      type="number"
                      value={editingCard.hp_base}
                      onChange={(e) => setEditingCard({ ...editingCard, hp_base: parseInt(e.target.value) })}
                      className="w-full p-2 bg-gray-50 border rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ataque Base</label>
                    <input
                      type="number"
                      value={editingCard.atk_base}
                      onChange={(e) => setEditingCard({ ...editingCard, atk_base: parseInt(e.target.value) })}
                      className="w-full p-2 bg-gray-50 border rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Rareza</label>
                  <select
                    value={editingCard.rarity}
                    onChange={(e) => setEditingCard({ ...editingCard, rarity: e.target.value })}
                    className="w-full p-2 bg-gray-50 border rounded-xl text-xs font-bold"
                  >
                    <option value="comun">comun</option>
                    <option value="poco_comun">poco_comun</option>
                    <option value="rara">rara</option>
                    <option value="legendario">legendario</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">URL Imagen Artwork Oficial</label>
                  <input
                    type="text"
                    value={editingCard.artwork_url}
                    onChange={(e) => setEditingCard({ ...editingCard, artwork_url: e.target.value })}
                    className="w-full p-2 bg-gray-50 border rounded-xl text-xs font-mono text-[10px]"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PROBABILIDADES */}
      {/* ======================================================== */}
      {adminTab === 'probabilidades' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-base font-black text-gray-900">Configuración de Probabilidades de Sobres</h3>
          <p className="text-xs text-gray-500">
            Ajusta las tasas de aparición de cartas según el tipo de sobre.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['pack_rates_normal', 'pack_rates_special', 'pack_rates_legendary'].map((key) => {
              const rates = configs[key] || {};
              const title = key === 'pack_rates_normal' ? 'Sobre Normal' :
                            key === 'pack_rates_special' ? 'Sobre Especial' : 'Sobre Legendario';

              return (
                <div key={key} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="font-black text-sm text-gray-800">{title}</h4>
                  
                  {['comun', 'poco_comun', 'rara', 'legendario'].map((rarity) => (
                    <div key={rarity} className="flex items-center justify-between text-xs">
                      <span className="capitalize font-bold text-gray-600">{rarity}:</span>
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
                        className="w-20 p-1 bg-white border border-gray-200 rounded text-center font-bold"
                      />
                    </div>
                  ))}

                  <button
                    onClick={() => handleSaveConfig(key, configs[key])}
                    disabled={actionLoading}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs mt-2"
                  >
                    Guardar Tasas
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TEMPORADAS */}
      {/* ======================================================== */}
      {adminTab === 'temporadas' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 max-w-xl">
          <h3 className="text-base font-black text-gray-900">Configuración de Temporadas</h3>
          <p className="text-xs text-gray-500">
            Modifica la temporada temática del Pase de Batalla según la estación del año o evento.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Temporada</label>
              <input
                type="text"
                value={configs.season_info?.name || 'Temporada Primavera'}
                onChange={(e) => setConfigs({ ...configs, season_info: { ...configs.season_info, name: e.target.value } })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
              />
            </div>

            <button
              onClick={() => handleSaveConfig('season_info', configs.season_info)}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow"
            >
              Guardar Temporada
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: PAGOS EN STRIPE */}
      {/* ======================================================== */}
      {adminTab === 'pagos' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-base font-black text-gray-900">Historial y Auditoría de Pagos en Stripe</h3>
          <p className="text-xs text-gray-500">
            Registro de compras realizadas mediante Stripe Checkout en entorno de prueba.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">ID Pago</th>
                  <th className="pb-3">Usuario</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3">Producto</th>
                  <th className="pb-3">Monto (MXN)</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {paymentsList.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-gray-500">#{p.id}</td>
                    <td className="py-3 font-bold text-gray-900">{p.username || 'Entrenador'}</td>
                    <td className="py-3 text-gray-500">{p.customer_email}</td>
                    <td className="py-3 font-semibold text-blue-700">{p.product_type}</td>
                    <td className="py-3 font-black text-gray-900">${parseFloat(p.amount_mxn).toFixed(2)}</td>
                    <td className="py-3">
                      <span className="bg-green-100 text-green-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
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
