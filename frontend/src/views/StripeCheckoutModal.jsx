import React, { useState } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { X, CreditCard, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';

const PRODUCTS = [
  {
    id: 'pass_premium',
    name: 'Pase de Batalla Premium',
    priceMxn: 149.00,
    subtitle: 'Rol Premium, sobre diario y premios exclusivos',
  },
  {
    id: 'gems_1000',
    name: '1,000 PokéGemas',
    priceMxn: 99.00,
    subtitle: 'Moneda premium para sobres épicos',
  },
  {
    id: 'gems_3000',
    name: '3,000 PokéGemas',
    priceMxn: 249.00,
    subtitle: 'Incluye bonificación especial (+500)',
  }
];

export default function StripeCheckoutModal({ initialProductId = 'pass_premium', onClose }) {
  const { user, refreshUser } = useAuth();
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [email, setEmail] = useState(user?.email || 'entrenador@correo.com');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12 / 30');
  const [cvc, setCvc] = useState('123');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const selectedProduct = PRODUCTS.find(p => p.id === selectedProductId) || PRODUCTS[0];

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Intentar primero con la API de sesión
      const sessionRes = await apiRequest('/payments/create-checkout-session', 'POST', {
        productId: selectedProduct.id
      });

      // Si existe URL externa de Stripe real
      if (sessionRes.url) {
        window.location.href = sessionRes.url;
        return;
      }

      // Si es simulación local de prueba
      const confirmRes = await apiRequest('/payments/confirm-payment', 'POST', {
        productId: selectedProduct.id,
        sessionId: sessionRes.sessionId
      });

      setSuccess(true);
      setSuccessMsg(confirmRes.message);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      await refreshUser();
    } catch (err) {
      alert(`Error en el pago: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto select-none text-slate-100">
      <div className="bg-[#0b1222] rounded-3xl max-w-2xl w-full border border-slate-750 shadow-2xl overflow-hidden relative my-auto">
        
        {/* Top Sandbox Notice */}
        <div className="bg-amber-950/80 text-amber-300 text-center py-2 px-4 text-xs font-mono font-black tracking-wider uppercase border-b border-amber-500/30 flex items-center justify-center space-x-2">
          <ShieldCheck size={16} className="text-amber-400" />
          <span>ENTORNO DE PRUEBA · Stripe Checkout Sandbox</span>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors border border-slate-800"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-black text-slate-100">¡Pago Exitoso!</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              {successMsg}
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
              >
                Continuar Jugando
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay} className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left 6 cols: Resumen del pedido */}
            <div className="md:col-span-6 space-y-4 border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-100 mb-4">Resumen del Pedido</h3>

                <div className="space-y-3">
                  {PRODUCTS.map((prod) => (
                    <label
                      key={prod.id}
                      className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedProductId === prod.id 
                          ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/40' 
                          : 'border-slate-800 hover:border-slate-700 bg-[#0e1628]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <input
                            type="radio"
                            name="product"
                            checked={selectedProductId === prod.id}
                            onChange={() => setSelectedProductId(prod.id)}
                            className="mt-1 text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-750"
                          />
                          <div>
                            <span className="text-xs font-black text-slate-100 block leading-tight">
                              {prod.name}
                            </span>
                            <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                              {prod.subtitle}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-black text-cyan-300">
                          ${prod.priceMxn.toFixed(2)}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Total a Pagar</span>
                <span className="text-xl font-mono font-black text-slate-100">
                  ${selectedProduct.priceMxn.toFixed(2)} MXN
                </span>
              </div>
            </div>

            {/* Right 6 cols: Pagar con tarjeta */}
            <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-100 mb-4">Pagar con Tarjeta</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 mb-1">Número de Tarjeta</label>
                    <div className="relative">
                      <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-slate-400 mb-1">Vencimiento</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-cyan-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-slate-400 mb-1">CVC</label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-cyan-500 text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : `Pagar $${selectedProduct.priceMxn.toFixed(2)} MXN`}
                </button>

                <p className="text-[10px] text-center text-slate-500 flex items-center justify-center space-x-1 font-mono">
                  <Lock size={11} />
                  <span>Transacción encriptada con Stripe</span>
                </p>
              </div>

            </div>

          </form>
        )}

      </div>
    </div>
  );
}
