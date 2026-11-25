import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, CheckCircle2, AlertCircle, KeyRound, RefreshCw, Sparkles, Send, Zap } from 'lucide-react';
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
      setInfoMessage('Hemos enviado un código de verificación de 6 dígitos a tu correo electrónico.');
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
    setInfoMessage('');
    setLoading(true);
    try {
      await apiRequest('/auth/resend-code', 'POST', { email });
      setInfoMessage('Se ha enviado un nuevo código de verificación a tu correo.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', 'POST', { email });
      setInfoMessage('Hemos enviado un código de recuperación a tu correo electrónico.');
      setMode('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#0b1222] rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-750 flex flex-col md:flex-row relative text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors border border-slate-800"
        >
          <X size={18} />
        </button>

        {/* Left Side: Art & Quick Demo */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#0c162c] via-[#091122] to-[#060b17] p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 relative overflow-hidden">
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Pokémon TCG Oficial</span>
            <h3 className="text-2xl font-black text-slate-100 leading-tight">Tu colección te espera</h3>
            <p className="text-xs text-slate-400 pt-1">
              Colecciona cartas de alta calidad con stats de combate, movimientos tácticos y animaciones de RPG.
            </p>
          </div>

          {/* Animated PokéAPI Sprites */}
          <div className="my-6 flex items-center justify-center space-x-3 relative z-10">
            <div className="p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif" 
                alt="Pikachu"
                className="w-16 h-16 object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]"
              />
            </div>
            <div className="p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif" 
                alt="Squirtle"
                className="w-16 h-16 object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]"
              />
            </div>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 relative z-10">
            <p className="text-[10px] font-mono font-bold text-cyan-400 mb-2 uppercase tracking-wider flex items-center space-x-1">
              <Zap size={12} />
              <span>Accesos Rápidos de Prueba:</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => quickLogin('ash')}
                className="bg-slate-900 hover:bg-slate-850 hover:text-cyan-300 border border-slate-800 px-2 py-1.5 rounded-lg text-left text-slate-300 font-bold truncate transition-colors"
              >
                Ash_MX (Premium)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('arantza')}
                className="bg-slate-900 hover:bg-slate-850 hover:text-rose-400 border border-slate-800 px-2 py-1.5 rounded-lg text-left text-slate-300 font-bold truncate transition-colors"
              >
                Arantza (Admin)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('gary')}
                className="bg-slate-900 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800 px-2 py-1.5 rounded-lg text-left text-slate-300 font-bold truncate transition-colors"
              >
                Gary_Oak (Admin)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('misty')}
                className="bg-slate-900 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 px-2 py-1.5 rounded-lg text-left text-slate-300 font-bold truncate transition-colors"
              >
                Misty_01 (Normal)
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Form */}
        <div className="md:w-7/12 p-8 sm:p-10 flex flex-col justify-center">
          
          {error && (
            <div className="mb-4 p-3 bg-red-950/70 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-100">Iniciar Sesión</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Accede a tu baraja, progreso de Pokédex y combates RPG.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">
                    Correo electrónico o Usuario
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="entrenador@correo.com"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono font-bold text-slate-400">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setInfoMessage(''); }}
                      className="text-[11px] text-cyan-400 hover:underline font-semibold"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Entrar al Juego'}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">o</span>
                </div>

                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setInfoMessage(''); }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold rounded-xl text-xs transition-colors"
                >
                  Crear Usuario Nuevo
                </button>
              </form>
            </div>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-100">Crear Cuenta</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Protege tu progreso y colecciona cartas con otros entrenadores.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Nombre de Entrenador</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="TuNombre_99"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      placeholder="entrenador@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setInfoMessage(''); }}
                    className="text-xs text-cyan-400 font-bold hover:underline"
                  >
                    ¿Ya tienes cuenta? Inicia sesión aquí
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VERIFY EMAIL */}
          {mode === 'verify' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-100">Verifica tu Correo</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ingresa el código de 6 dígitos que enviamos a tu correo electrónico.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Código de verificación</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    className="w-full text-center tracking-widest text-2xl font-mono font-black py-3 bg-slate-900 border border-slate-800 rounded-xl text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-md text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Confirmar y Entrar'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-xs text-cyan-400 font-bold hover:underline inline-flex items-center space-x-1"
                  >
                    <RefreshCw size={13} />
                    <span>¿No recibiste el código? Reenviar código</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-100">Recuperar Contraseña</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ingresa tu correo registrado para enviarte un código de recuperación.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      placeholder="entrenador@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-md text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Send size={15} />
                  <span>{loading ? 'Enviando...' : 'Enviar Código de Recuperación'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-xs text-slate-400 hover:text-slate-100 font-semibold"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* RESET PASSWORD */}
          {mode === 'reset' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-100">Nueva Contraseña</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ingresa el código que te enviamos por correo y tu nueva clave.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Código de seguridad (6 dígitos)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    className="w-full text-center tracking-widest text-xl font-mono font-black py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-md text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? 'Cambiando...' : 'Guardar Nueva Contraseña'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-xs text-slate-400 hover:text-slate-100 font-semibold"
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
