import React from 'react';
import { Heart, Diamond, Award, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingView({ onOpenAuth, onExplore }) {
  const { user } = useAuth();

  return (
    <div className="space-y-12 py-6">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 sm:p-12 border border-blue-100 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 bg-blue-100/80 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full">
              <Sparkles size={14} className="text-blue-600" />
              <span>Juego Web de Cartas Coleccionables Pokémon</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Colecciona, evoluciona <br className="hidden sm:inline" />
              <span className="text-blue-600">y compite</span> con tus Pokémon
            </h1>

            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Abre sobres gratis cada 4 horas, completa tu Pokédex, intercambia cartas y reta a tus amigos en intensos combates estratégicos.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              {user ? (
                <button
                  onClick={() => onExplore('sobres-tienda')}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all flex items-center space-x-2"
                >
                  <span>Ir a Sobres y Tienda</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
                  >
                    Empezar gratis
                  </button>
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-6 py-3.5 bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 font-bold rounded-xl shadow-sm transition-all"
                  >
                    Ver cómo funciona
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Floating Pokemon Cards Showcase (Mockup 1) */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[320px]">
            {/* Background Glow */}
            <div className="absolute w-72 h-72 bg-blue-300/30 rounded-full filter blur-3xl -z-10"></div>

            <div className="grid grid-cols-2 gap-4 max-w-sm w-full">
              {/* Pikachu */}
              <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-100 flex flex-col items-center animate-float">
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" 
                  alt="Pikachu"
                  className="w-24 h-24 object-contain filter drop-shadow-md"
                />
                <span className="text-xs font-bold text-gray-800 mt-2">Pikachu #025</span>
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1">Eléctrico</span>
              </div>

              {/* Squirtle */}
              <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg border border-blue-100 flex flex-col items-center animate-float [animation-delay:1s]">
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png" 
                  alt="Squirtle"
                  className="w-24 h-24 object-contain filter drop-shadow-md"
                />
                <span className="text-xs font-bold text-gray-800 mt-2">Squirtle #007</span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1">Agua</span>
              </div>

              {/* Eevee */}
              <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-100 flex flex-col items-center animate-float [animation-delay:1.5s]">
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png" 
                  alt="Eevee"
                  className="w-24 h-24 object-contain filter drop-shadow-md"
                />
                <span className="text-xs font-bold text-gray-800 mt-2">Eevee #133</span>
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full mt-1">Normal</span>
              </div>

              {/* Charmander */}
              <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg border border-orange-100 flex flex-col items-center animate-float [animation-delay:0.5s]">
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" 
                  alt="Charmander"
                  className="w-24 h-24 object-contain filter drop-shadow-md"
                />
                <span className="text-xs font-bold text-gray-800 mt-2">Charmander #004</span>
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mt-1">Fuego</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3 Experience Cards (Mockup 1) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Jugador gratuito */}
        <div className="bg-white rounded-2xl p-6 border-t-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Heart size={22} className="fill-blue-500 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Jugador gratuito</h3>
            <p className="text-xs font-bold text-blue-600 mt-0.5 mb-3">Sobre gratis cada 4 horas</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pokédex, pase de batalla gratuito, intercambios de cartas y retos amistosos entre amigos.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-blue-600 font-semibold">
            <span>100% Sin costo para siempre</span>
          </div>
        </div>

        {/* Card 2: PokéGemas */}
        <div className="bg-white rounded-2xl p-6 border-t-4 border-cyan-500 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
              <Diamond size={22} className="fill-cyan-500 text-cyan-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">PokéGemas</h3>
            <p className="text-xs font-bold text-cyan-600 mt-0.5 mb-3">Moneda premium</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Se compran con dinero real vía Stripe, se pueden canjear por PokéMonedas o sobres legendarios garantizados.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-cyan-600 font-semibold">
            <span>Paquetes desde $99 MXN</span>
          </div>
        </div>

        {/* Card 3: Pase de Batalla Premium */}
        <div className="bg-white rounded-2xl p-6 border-t-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 font-black">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">P</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Pase de Batalla Premium</h3>
            <p className="text-xs font-bold text-amber-600 mt-0.5 mb-3">Recompensas exclusivas</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Mejores premios, un sobre premium diario durante el mes y un Pokémon en su última evolución garantizado en el nivel 50.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-amber-600 font-semibold">
            <span>Incluye Blastoise EX Nv. 50</span>
          </div>
        </div>

      </section>

      {/* Academic Cover Information (Page 1) */}
      <section className="bg-white rounded-2xl p-6 border border-gray-200 text-center max-w-2xl mx-auto shadow-sm">
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Proyecto Final</h4>
        <h2 className="text-xl font-black text-gray-800">Programación Web · Universidad Vasco de Quiroga (UVAQ)</h2>
        <div className="mt-3 text-sm text-gray-600 space-y-1">
          <p><span className="font-semibold text-gray-800">Profesor:</span> Nicolás Zamora Ramos</p>
          <p><span className="font-semibold text-gray-800">Alumna:</span> Arantza Venegas Valencia (Matrícula: 20010164)</p>
          <p><span className="font-semibold text-gray-800">Fecha de entrega:</span> 8 de noviembre de 2026</p>
        </div>
      </section>

    </div>
  );
}
