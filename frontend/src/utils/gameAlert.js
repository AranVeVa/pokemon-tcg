import Swal from 'sweetalert2';

/**
 * SweetAlert2 personalizado con la dirección de arte oficial de Pokémon TCG Web
 * Paleta Midnight Gaming (#0b1222), bordes cian/neón y tipografía de videojuego.
 */
const GameSwal = Swal.mixin({
  background: '#0b1222',
  color: '#f8fafc',
  width: 'min(92vw, 28rem)',
  confirmButtonColor: '#0284c7', // cyan-600
  cancelButtonColor: '#334155',  // slate-700
  denyButtonColor: '#e11d48',    // rose-600
  customClass: {
    popup: 'rounded-3xl border border-slate-750 shadow-2xl font-sans',
    title: 'text-lg font-black tracking-tight text-slate-100',
    htmlContainer: 'text-xs text-slate-300 font-medium',
    confirmButton: 'px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-0 transition-all hover:scale-105',
    cancelButton: 'px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-all',
    denyButton: 'px-5 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-500/30'
  },
  buttonsStyling: true
});

export const showAlert = {
  success: (title, text, options = {}) => {
    return GameSwal.fire({
      icon: 'success',
      title,
      text,
      iconColor: '#34d399', // emerald-400
      ...options
    });
  },
  error: (title, text, options = {}) => {
    return GameSwal.fire({
      icon: 'error',
      title,
      text,
      iconColor: '#f43f5e', // rose-500
      ...options
    });
  },
  warning: (title, text, options = {}) => {
    return GameSwal.fire({
      icon: 'warning',
      title,
      text,
      iconColor: '#fbbf24', // amber-400
      ...options
    });
  },
  info: (title, text, options = {}) => {
    return GameSwal.fire({
      icon: 'info',
      title,
      text,
      iconColor: '#38bdf8', // cyan-400
      ...options
    });
  },
  confirm: async (title, text, confirmText = 'Aceptar', cancelText = 'Cancelar') => {
    const res = await GameSwal.fire({
      title,
      text,
      icon: 'question',
      iconColor: '#38bdf8',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true
    });
    return res.isConfirmed;
  }
};

export default GameSwal;
