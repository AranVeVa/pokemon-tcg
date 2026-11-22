import React from 'react';
import { 
  Heart, 
  Diamond, 
  Trophy, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Flame, 
  Droplets, 
  Activity,
  Layers,
  Sword,
  Compass,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Datos auténticos de las 4 cartas destacadas de Kanto
const FEATURED_CARDS = [
  {
    id: 25,
    name: 'Pikachu',
    hp: 70,
    type: 'Eléctrico',
    typeColor: 'text-amber-400',
    typeBadge: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
    typeGlow: 'from-amber-500/20 via-transparent to-transparent',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    icon: Zap,
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    moveName: 'Impactrueno',
    moveDmg: 30,
    moveEnergy: 15,
    rarity: 'Rara Holográfica',
    collectorNo: '025/151'
  },
  {
    id: 7,
    name: 'Squirtle',
    hp: 60,
    type: 'Agua',
    typeColor: 'text-blue-400',
    typeBadge: 'bg-blue-950/80 border-blue-500/40 text-blue-300',
    typeGlow: 'from-blue-500/20 via-transparent to-transparent',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    icon: Droplets,
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
    moveName: 'Pistola Agua',
    moveDmg: 25,
    moveEnergy: 15,
    rarity: 'Común',
    collectorNo: '007/151'
  },
  {
    id: 133,
    name: 'Eevee',
    hp: 60,
    type: 'Normal',
    typeColor: 'text-slate-300',
    typeBadge: 'bg-slate-900 border-slate-600 text-slate-300',
    typeGlow: 'from-slate-500/20 via-transparent to-transparent',
    borderColor: 'border-slate-700 hover:border-slate-500',
    icon: Activity,
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
    moveName: 'Ataque Rápido',
    moveDmg: 20,
    moveEnergy: 10,
    rarity: 'Poco Común',
    collectorNo: '133/151'
  },
  {
    id: 4,
    name: 'Charmander',
    hp: 60,
    type: 'Fuego',
    typeColor: 'text-red-400',
    typeBadge: 'bg-red-950/80 border-red-500/40 text-red-300',
    typeGlow: 'from-red-500/20 via-transparent to-transparent',
    borderColor: 'border-red-500/40 hover:border-red-400',
    icon: Flame,
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
    moveName: 'Ascuas',
    moveDmg: 30,
    moveEnergy: 15,
    rarity: 'Común',
    collectorNo: '004/151'
  }
];

export default function LandingView({ onOpenAuth, onExplore }) {
  const { user } = useAuth();

  return (
    <div className="space-y-14 py-4 select-none">
      
      {/* ======================================================== */}
      {/* 1. EDITORIAL & CINEMATIC HERO SECTION */}
      {/* ======================================================== */}
      <section className="bg-gradient-to-br from-[#0c1527] via-[#090f1d] to-[#060913] rounded-3xl p-6 sm:p-10 lg:p-12 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative overflow-hidden">
        
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-[100px] pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Left Column: Title, Narrative & Strategic CTAs */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="inline-flex items-center space-x-2 bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              <Sparkles size={13} className="text-cyan-400" />
              <span className="tracking-wide uppercase text-[10px]">Juego Oficial Web de Cartas Coleccionables</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-[1.1]">
              Colecciona, evoluciona <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                y compite
              </span> con tus Pokémon
            </h1>

            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Abre sobres gratis cada 4 horas, completa tu Pokédex, intercambia cartas con amigos y enfréntate en intensos combates estratégicos por turnos estilo RPG con mecánicas de Pokémon GO.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3.5 pt-2">
              {user ? (
                <button
                  onClick={() => onExplore('sobres-tienda')}
                  className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center space-x-2 uppercase tracking-wider"
                >
                  <span>Ir a Sobres y Tienda</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="px-6 py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all uppercase tracking-wider flex items-center space-x-2"
                  >
                    <span>Empezar Gratis</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-750 font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
                  >
                    Ver Cómo Funciona
                  </button>
                </>
              )}
            </div>

            {/* Feature Highlights Bar */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-400">
              <div>
                <span className="block text-slate-200 font-bold font-sans">151 Kanto</span>
                <span className="text-[10px] text-slate-500">Pokédex completa</span>
              </div>
              <div>
                <span className="block text-slate-200 font-bold font-sans">Cada 4 Horas</span>
                <span className="text-[10px] text-slate-500">Sobre gratuito</span>
              </div>
              <div>
                <span className="block text-slate-200 font-bold font-sans">Combates RPG</span>
                <span className="text-[10px] text-slate-500">Turnos y relevos</span>
              </div>
            </div>

          </div>

          {/* Right Column: Layered 3D Protagonist Pokémon Showcase */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[340px]">
            
            {/* Center Glowing Energy Core */}
            <div className="absolute w-64 h-64 bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 rounded-full filter blur-2xl pointer-events-none"></div>

            {/* Background Layer Card (Tilted Left) */}
            <div className="absolute -left-2 sm:left-4 top-6 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl bg-[#0d1629] border border-cyan-500/30 p-2.5 shadow-xl -rotate-12 transition-transform hover:-rotate-6 pointer-events-none opacity-60">
              <div className="w-full h-full rounded-xl bg-slate-950 flex flex-col items-center justify-center p-2 border border-slate-800">
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" 
                  alt="Charizard"
                  className="max-h-24 sm:max-h-28 object-contain filter drop-shadow opacity-90"
                />
                <span className="text-[10px] font-bold text-slate-400 mt-2 font-mono">Charizard #006</span>
              </div>
            </div>

            {/* Background Layer Card (Tilted Right) */}
            <div className="absolute -right-2 sm:right-4 bottom-6 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl bg-[#0d1629] border border-purple-500/30 p-2.5 shadow-xl rotate-12 transition-transform hover:rotate-6 pointer-events-none opacity-60">
              <div className="w-full h-full rounded-xl bg-slate-950 flex flex-col items-center justify-center p-2 border border-slate-800">
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png" 
                  alt="Mewtwo"
                  className="max-h-24 sm:max-h-28 object-contain filter drop-shadow opacity-90"
                />
                <span className="text-[10px] font-bold text-slate-400 mt-2 font-mono">Mewtwo #150</span>
              </div>
            </div>

            {/* Foreground Protagonist TCG Card (Pikachu Gold EX) */}
            <div className="relative z-10 w-48 sm:w-56 h-68 sm:h-80 rounded-2xl bg-gradient-to-b from-[#18263f] via-[#0d1629] to-[#070b14] border-2 border-amber-400/70 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.25)] holo-card animate-float">
              
              {/* Card Header */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-amber-500/30 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono text-amber-400">#025</span>
                  <span className="font-black text-slate-100">Pikachu</span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] font-mono text-amber-300">
                  <span>HP 70</span>
                  <Zap size={11} className="fill-amber-400 text-amber-400" />
                </div>
              </div>

              {/* Artwork Viewport */}
              <div className="h-36 sm:h-44 my-2 rounded-xl bg-radial from-amber-500/10 via-slate-950 to-slate-950 border border-slate-800 flex items-center justify-center p-2 relative overflow-hidden">
                <img 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" 
                  alt="Pikachu Protagonista"
                  className="max-h-32 sm:max-h-38 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
                />
              </div>

              {/* Card Attack Detail */}
              <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-850 text-slate-300">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-amber-300">Impactrueno</span>
                  <span className="font-mono text-slate-100">30 dmg</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                  Dispara una ráfaga de electricidad que puede paralizar al objetivo.
                </p>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800 text-[9px] font-mono text-slate-500">
                <span>Rara Holográfica</span>
                <span className="text-amber-400 font-bold">EDICIÓN KANTO</span>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. THE 4 FEATURED POKÉMON COLLECTOR CARDS */}
      {/* ======================================================== */}
      <section className="space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center space-x-2">
              <Layers size={20} className="text-cyan-400" />
              <span>Cartas Coleccionables Destacadas</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Acabado físico de carta coleccionable con estadísticas reales, tipos elementales y artwork oficial.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-bold self-start sm:self-auto bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Kanto Series · Gen 1
          </span>
        </div>

        {/* 4 Collector Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURED_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <div 
                key={card.id}
                className={`tcg-card p-4 flex flex-col justify-between ${card.borderColor}`}
              >
                <div>
                  {/* Top Bar: Name, HP & Element */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block font-normal">#{card.id.toString().padStart(3, '0')}</span>
                      <h3 className="font-black text-sm text-slate-100 tracking-wide">{card.name}</h3>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-cyan-400 block">HP {card.hp}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center space-x-1 ${card.typeBadge}`}>
                        <Icon size={9} />
                        <span>{card.type}</span>
                      </span>
                    </div>
                  </div>

                  {/* Artwork Window with Radial Spotlight */}
                  <div className={`h-40 my-3 rounded-2xl bg-gradient-to-b ${card.typeGlow} bg-slate-950 border border-slate-850 flex items-center justify-center p-3 relative overflow-hidden group`}>
                    <img 
                      src={card.artwork} 
                      alt={card.name}
                      className="max-h-32 object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  {/* Signature Attack Box */}
                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-200">{card.moveName}</span>
                      <span className="font-mono text-cyan-400 font-bold">{card.moveDmg} dmg</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Energía: +{card.moveEnergy}</span>
                      <span className="font-mono">{card.rarity}</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Meta */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>{card.collectorNo}</span>
                  <span className="text-slate-400 font-bold uppercase tracking-wider">TCG Kanto</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. THE 3 EXPERIENCE TIERS */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center space-x-2">
            <Compass size={20} className="text-cyan-400" />
            <span>Modalidades y Experiencia de Juego</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sistemas equilibrados diseñados para jugadores gratuitos y coleccionistas competitivos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Jugador Gratuito */}
          <div className="bg-gradient-to-b from-[#0c1527] to-[#070b14] rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/40 shadow-lg transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Heart size={20} className="fill-cyan-400 text-cyan-400" />
              </div>
              <h3 className="text-base font-black text-slate-100">Jugador Gratuito</h3>
              <span className="inline-block text-[11px] font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                Sobre gratis cada 4 horas
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Acceso completo a la Pokédex, pase de batalla gratuito con 50 niveles, intercambios de cartas y retos amistosos (sparring) sin costo.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-800 flex items-center text-xs text-cyan-400 font-bold font-mono">
              <ShieldCheck size={14} className="mr-1.5" />
              <span>100% Sin Costo Para Siempre</span>
            </div>
          </div>

          {/* Card 2: PokéGemas */}
          <div className="bg-gradient-to-b from-[#0c1527] to-[#070b14] rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/40 shadow-lg transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Diamond size={20} className="fill-cyan-400 text-cyan-400" />
              </div>
              <h3 className="text-base font-black text-slate-100">PokéGemas</h3>
              <span className="inline-block text-[11px] font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                Moneda Premium
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adquiribles de forma segura mediante Stripe para canjear por sobres legendarios garantizados, boosters especiales y mejoras de cartas.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-800 flex items-center text-xs text-cyan-400 font-bold font-mono">
              <span>Paquetes Oficiales desde $99 MXN</span>
            </div>
          </div>

          {/* Card 3: Pase de Batalla Premium */}
          <div className="bg-gradient-to-b from-[#182035] via-[#0d1629] to-[#070b14] rounded-2xl p-6 border border-amber-500/40 hover:border-amber-400 shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/50 text-amber-400 flex items-center justify-center">
                <Trophy size={20} className="text-amber-400" />
              </div>
              <h3 className="text-base font-black text-slate-100">Pase de Batalla Premium</h3>
              <span className="inline-block text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                Recompensas Exclusivas
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Un sobre diario adicional durante 30 días, premios de gemas en cada nivel y la carta exclusiva de Blastoise EX garantizada al alcanzar el nivel 50.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-amber-500/30 flex items-center text-xs text-amber-400 font-bold font-mono">
              <Award size={14} className="mr-1.5" />
              <span>Incluye Blastoise EX Nv. 50</span>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. ACADEMIC CREDENTIALS CERTIFICATE PLAQUE */}
      {/* ======================================================== */}
      <section className="bg-[#0b1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl text-center max-w-3xl mx-auto space-y-3">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
          Proyecto Integrador · Licenciatura en Tecnologías de la Información
        </span>
        <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
          Universidad Vasco de Quiroga (UVAQ) · Programación Web
        </h2>
        <div className="text-xs text-slate-400 space-y-1 pt-1 font-mono">
          <p><strong className="text-slate-300 font-sans">Catedrático:</strong> Nicolás Zamora Ramos</p>
          <p><strong className="text-slate-300 font-sans">Alumna:</strong> Arantza Venegas Valencia (Matrícula: 20010164)</p>
          <p><strong className="text-slate-300 font-sans">Entrega Oficial:</strong> Noviembre 2026 · Proyecto Pokémon TCG Web</p>
        </div>
      </section>

    </div>
  );
}
