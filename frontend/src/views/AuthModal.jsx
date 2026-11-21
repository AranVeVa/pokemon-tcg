import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, CheckCircle2, AlertCircle, KeyRound, RefreshCw, Sparkles, Send } from 'lucide-react';
import { apiRequest } from '../api';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'verify' | 'forgot' | 'reset'
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, refreshUser } = useAuth();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(emailOrUsername, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await register(username, email, password);
      setInfoMessage(`📧 Correo de verificación enviado con Resend. (Código de prueba: ${res.verificationCode})`);
      setMode('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/auth/verify-email', 'POST', { code: verificationCode });
      await refreshUser();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/auth/resend-verification', 'POST');
      setInfoMessage(`📧 Nuevo código enviado por Resend a tu correo: ${res.verificationCode}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/auth/forgot-password', 'POST', { email });
      setInfoMessage(`📧 Código de recuperación enviado por Resend. (Código: ${res.resetCode})`);
      setMode('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/auth/reset-password', 'POST', {
        email,
        code: resetCode,
        newPassword
      });
      setInfoMessage(res.message);
      setMode('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (userKey) => {
    setError('');
    setLoading(true);
    try {
      if (userKey === 'ash') {
        await login('Ash_MX', 'password123');
      } else if (userKey === 'gary') {
        await login('Gary_Oak', 'password123');
      } else if (userKey === 'arantza') {
        await login('Arantza', '20010164');
      } else if (userKey === 'misty') {
        await login('Misty_01', 'password123');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 flex flex-col md:flex-row relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors shadow-sm"
        >
          <X size={20} />
        </button>

        {/* Left Side: Illustration & Quick Demo */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-1 relative z-10">
            <span className="text-xs uppercase tracking-widest text-blue-200 font-bold">Pokémon TCG</span>
            <h3 className="text-2xl font-black leading-tight">Tu colección te espera.</h3>
            <p className="text-xs text-blue-200/90 pt-1">
              Colecciona cartas con stats únicas, ataques variados y combates animados.
            </p>
          </div>

          {/* Animated PokéAPI Sprites */}
          <div className="my-6 flex items-center justify-center space-x-3 relative z-10">
            <img 
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif" 
              alt="Pikachu"
              className="w-20 h-20 object-contain filter drop-shadow-lg"
            />
            <img 
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif" 
              alt="Squirtle"
              className="w-20 h-20 object-contain filter drop-shadow-lg"
            />
          </div>

          {/* Quick Demo Access Bar */}
          <div className="bg-blue-950/60 p-3 rounded-2xl border border-blue-600/40 relative z-10">
            <p className="text-[11px] font-bold text-blue-200 mb-2 uppercase tracking-wide">
              ⚡ Accesos Rápidos de Demostración:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => quickLogin('ash')}
                className="bg-blue-600/80 hover:bg-blue-500 px-2 py-1.5 rounded-lg text-left text-white font-medium truncate transition-colors"
              >
                Ash_MX (Premium)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('arantza')}
                className="bg-red-600/80 hover:bg-red-500 px-2 py-1.5 rounded-lg text-left text-white font-medium truncate transition-colors"
              >
                Arantza (Admin)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('gary')}
                className="bg-indigo-600/80 hover:bg-indigo-500 px-2 py-1.5 rounded-lg text-left text-white font-medium truncate transition-colors"
              >
                Gary_Oak (Admin)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('misty')}
                className="bg-teal-600/80 hover:bg-teal-500 px-2 py-1.5 rounded-lg text-left text-white font-medium truncate transition-colors"
              >
                Misty_01 (Normal)
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Form */}
        <div className="md:w-7/12 p-8 sm:p-10 flex flex-col justify-center">
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* LOGIN */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Bienvenido</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Inicia sesión para acceder a tu baraja y combates.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Correo electrónico o Usuario
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="entrenador@correo.com"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setInfoMessage(''); }}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Entrar al juego'}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-gray-400">o</span>
                </div>

                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setInfoMessage(''); }}
                  className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold rounded-xl text-xs transition-colors"
                >
                  Crear usuario nuevo
                </button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* REGISTER */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Crear cuenta</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Verificación de cuenta enviada por <strong>Resend</strong>.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de Entrenador</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="TuNombre_99"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="entrenador@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear mi cuenta con Resend'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setInfoMessage(''); }}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    ¿Ya tienes cuenta? Inicia sesión aquí
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERIFY EMAIL (RESEND) */}
          {/* ======================================================== */}
          {mode === 'verify' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Verifica tu correo</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Enviamos un código de 6 dígitos con <strong>Resend</strong> a tu correo asignado.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código de verificación</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    className="w-full text-center tracking-widest text-2xl font-black py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md text-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Confirmar y Entrar'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center space-x-1"
                  >
                    <RefreshCw size={13} />
                    <span>Reenviar código por correo con Resend</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORGOT PASSWORD */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Recuperar Contraseña</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa tu correo para enviarte un código de seguridad mediante <strong>Resend</strong>.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="entrenador@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Send size={15} />
                  <span>{loading ? 'Enviando...' : 'Enviar código con Resend'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* RESET PASSWORD */}
          {/* ======================================================== */}
          {mode === 'reset' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Nueva Contraseña</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa el código que te enviamos por correo y tu nueva clave.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código de seguridad (6 dígitos)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    className="w-full text-center tracking-widest text-xl font-black py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md text-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Cambiando...' : 'Guardar nueva contraseña'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
                  >
                    Volver a Iniciar Sesión
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
