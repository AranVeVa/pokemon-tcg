// Catálogo completo de Ataques Rápidos y Cargados tipo Pokémon GO / TCG
const MOVES = {
  // --- AGUA ---
  pistola_agua: {
    id: 'pistola_agua',
    name: 'Pistola Agua',
    type: 'Agua',
    category: 'fast',
    power: 14,
    energyGen: 15,
    animationType: 'water',
    description: 'Dispara un potente chorro de agua a presión contra el oponente.'
  },
  burbuja: {
    id: 'burbuja',
    name: 'Burbuja',
    type: 'Agua',
    category: 'fast',
    power: 12,
    energyGen: 20,
    animationType: 'water',
    description: 'Lanza una ráfaga de burbujas densas que desconciertan al rival.'
  },
  hidrobomba: {
    id: 'hidrobomba',
    name: 'Hidrobomba',
    type: 'Agua',
    category: 'charged',
    power: 85,
    energyCost: 65,
    animationType: 'water',
    description: 'Arremete con un masivo torrente de agua de impacto demoledor.'
  },
  acua_cola: {
    id: 'acua_cola',
    name: 'Acua Cola',
    type: 'Agua',
    category: 'charged',
    power: 55,
    energyCost: 35,
    animationType: 'water',
    description: 'Golpea al oponente velozmente balanceando una cola cargada de agua.'
  },
  rayo_burbuja: {
    id: 'rayo_burbuja',
    name: 'Rayo Burbuja',
    type: 'Agua',
    category: 'charged',
    power: 60,
    energyCost: 45,
    animationType: 'water',
    description: 'Ráfaga concentrada de burbujas que estallan reduciendo la velocidad rival.'
  },

  // --- FUEGO ---
  ascuas: {
    id: 'ascuas',
    name: 'Ascuas',
    type: 'Fuego',
    category: 'fast',
    power: 15,
    energyGen: 16,
    animationType: 'fire',
    description: 'Dispara pequeñas llamaradas candentes que queman al objetivo.'
  },
  giro_fuego: {
    id: 'giro_fuego',
    name: 'Giro Fuego',
    type: 'Fuego',
    category: 'fast',
    power: 16,
    energyGen: 14,
    animationType: 'fire',
    description: 'Envuelve al enemigo en un torbellino ardiente de fuego continuo.'
  },
  lanzallamas: {
    id: 'lanzallamas',
    name: 'Lanzallamas',
    type: 'Fuego',
    category: 'charged',
    power: 70,
    energyCost: 50,
    animationType: 'fire',
    description: 'Exhala un torrente incesante de llamas de alta temperatura.'
  },
  llamarada: {
    id: 'llamarada',
    name: 'Llamarada',
    type: 'Fuego',
    category: 'charged',
    power: 95,
    energyCost: 80,
    animationType: 'fire',
    description: 'Incinera el campo de batalla con una explosión estelar de fuego masivo.'
  },
  fuego_fatuo: {
    id: 'fuego_fatuo',
    name: 'Fuego Fatuo',
    type: 'Fuego',
    category: 'charged',
    power: 50,
    energyCost: 30,
    animationType: 'fire',
    description: 'Llama mística que debilita el ataque del contrincante.'
  },

  // --- PLANTA ---
  latigo_cepa: {
    id: 'latigo_cepa',
    name: 'Látigo Cepa',
    type: 'Planta',
    category: 'fast',
    power: 13,
    energyGen: 18,
    animationType: 'grass',
    description: 'Azota implacablemente al rival con veloces lianas flexibles.'
  },
  hoja_afilada: {
    id: 'hoja_afilada',
    name: 'Hoja Afilada',
    type: 'Planta',
    category: 'fast',
    power: 18,
    energyGen: 12,
    animationType: 'grass',
    description: 'Lanza hojas cortantes como navajas con alta probabilidad de crítico.'
  },
  rayo_solar: {
    id: 'rayo_solar',
    name: 'Rayo Solar',
    type: 'Planta',
    category: 'charged',
    power: 100,
    energyCost: 85,
    animationType: 'grass',
    description: 'Concentra la energía solar pura para desatar un haz radiante destructor.'
  },
  bomba_lodo: {
    id: 'bomba_lodo',
    name: 'Bomba Lodo',
    type: 'Veneno',
    category: 'charged',
    power: 65,
    energyCost: 45,
    animationType: 'grass',
    description: 'Lanza una masa tóxica que explota cubriendo de ácido al rival.'
  },

  // --- ELÉCTRICO ---
  impactrueno: {
    id: 'impactrueno',
    name: 'Impactrueno',
    type: 'Eléctrico',
    category: 'fast',
    power: 12,
    energyGen: 20,
    animationType: 'electric',
    description: 'Descarga un chispazo eléctrico de alto voltaje directo al rival.'
  },
  chispa: {
    id: 'chispa',
    name: 'Chispa',
    type: 'Eléctrico',
    category: 'fast',
    power: 14,
    energyGen: 17,
    animationType: 'electric',
    description: 'Emite chispas electrostáticas que paralizan momentáneamente.'
  },
  rayo: {
    id: 'rayo',
    name: 'Rayo',
    type: 'Eléctrico',
    category: 'charged',
    power: 80,
    energyCost: 55,
    animationType: 'electric',
    description: 'Invoca un colosal relámpago que cae fulminantemente sobre el oponente.'
  },
  trueno: {
    id: 'trueno',
    name: 'Trueno',
    type: 'Eléctrico',
    category: 'charged',
    power: 95,
    energyCost: 75,
    animationType: 'electric',
    description: 'La máxima tormenta eléctrica desciende sacudiendo toda la arena.'
  },

  // --- FANTASMA / PSÍQUICO ---
  lenguetazo: {
    id: 'lenguetazo',
    name: 'Lenguetazo',
    type: 'Fantasma',
    category: 'fast',
    power: 11,
    energyGen: 22,
    animationType: 'ghost',
    description: 'Lame al enemigo con una lengua espectral helada que estremece.'
  },
  confusion: {
    id: 'confusion',
    name: 'Confusión',
    type: 'Psíquico',
    category: 'fast',
    power: 17,
    energyGen: 13,
    animationType: 'psychic',
    description: 'Onda mental telequinética que sacude el cerebro del enemigo.'
  },
  bola_sombra: {
    id: 'bola_sombra',
    name: 'Bola Sombra',
    type: 'Fantasma',
    category: 'charged',
    power: 85,
    energyCost: 50,
    animationType: 'ghost',
    description: 'Condensa materia oscura en una esfera espectral que estalla con furia.'
  },
  psiquico: {
    id: 'psiquico',
    name: 'Psíquico',
    type: 'Psíquico',
    category: 'charged',
    power: 80,
    energyCost: 50,
    animationType: 'psychic',
    description: 'Poderosa onda psíquica que fractura las defensas del contrincante.'
  },

  // --- HIELO ---
  canto_helado: {
    id: 'canto_helado',
    name: 'Canto Helado',
    type: 'Hielo',
    category: 'fast',
    power: 13,
    energyGen: 18,
    animationType: 'ice',
    description: 'Lanza esquirlas de hielo a velocidad supersónica.'
  },
  rayo_hielo: {
    id: 'rayo_hielo',
    name: 'Rayo Hielo',
    type: 'Hielo',
    category: 'charged',
    power: 80,
    energyCost: 55,
    animationType: 'ice',
    description: 'Rayo bajo cero que congela de inmediato las extremidades del rival.'
  },
  ventisca: {
    id: 'ventisca',
    name: 'Ventisca',
    type: 'Hielo',
    category: 'charged',
    power: 95,
    energyCost: 75,
    animationType: 'ice',
    description: 'Desata una tormenta de nieve ártica glacial sobre el contrincante.'
  },

  // --- NORMAL / LUCHA / OTROS ---
  ataque_rapido: {
    id: 'ataque_rapido',
    name: 'Ataque Rápido',
    type: 'Normal',
    category: 'fast',
    power: 12,
    energyGen: 16,
    animationType: 'normal',
    description: 'Se abalanza con una aceleración vertiginosa imperceptible a la vista.'
  },
  placaje: {
    id: 'placaje',
    name: 'Placaje',
    type: 'Normal',
    category: 'fast',
    power: 13,
    energyGen: 15,
    animationType: 'normal',
    description: 'Carga con todo el peso de su cuerpo derribando al adversario.'
  },
  golpe_cuerpo: {
    id: 'golpe_cuerpo',
    name: 'Golpe Cuerpo',
    type: 'Normal',
    category: 'charged',
    power: 60,
    energyCost: 40,
    animationType: 'normal',
    description: 'Se deja caer con tremendo impacto corporal sobre el enemigo.'
  },
  hiperrayo: {
    id: 'hiperrayo',
    name: 'Hiperrayo',
    type: 'Normal',
    category: 'charged',
    power: 110,
    energyCost: 90,
    animationType: 'normal',
    description: 'Haz gigantesco de energía concentrada de máxima potencia destructiva.'
  },
  terremoto: {
    id: 'terremoto',
    name: 'Terremoto',
    type: 'Tierra',
    category: 'charged',
    power: 95,
    energyCost: 75,
    animationType: 'ground',
    description: 'Sacude la corteza terrestre provocando grietas y seísmos devastadores.'
  },
  // --- HADA / DRAGÓN / LUCHA / ROCA / VENENO / BICHO / VOLADOR ---
  viento_feérico: {
    id: 'viento_feerico',
    name: 'Viento Feérico',
    type: 'Hada',
    category: 'fast',
    power: 14,
    energyGen: 18,
    animationType: 'psychic',
    description: 'Envuelve al rival en un torbellino mágico de energía feérica.'
  },
  fuerza_lunar: {
    id: 'fuerza_lunar',
    name: 'Fuerza Lunar',
    type: 'Hada',
    category: 'charged',
    power: 90,
    energyCost: 65,
    animationType: 'psychic',
    description: 'Invoca el poder luminoso de la luna para impactar al oponente.'
  },
  dragoaliento: {
    id: 'dragoaliento',
    name: 'Dragoaliento',
    type: 'Dragón',
    category: 'fast',
    power: 16,
    energyGen: 15,
    animationType: 'fire',
    description: 'Exhala una ráfaga mística de energía dracónica.'
  },
  garra_dragon: {
    id: 'garra_dragon',
    name: 'Garra Dragón',
    type: 'Dragón',
    category: 'charged',
    power: 80,
    energyCost: 50,
    animationType: 'fire',
    description: 'Desgarra al oponente con afiladas garras imbuídas de poder dragón.'
  },
  golpe_karate: {
    id: 'golpe_karate',
    name: 'Golpe Karate',
    type: 'Lucha',
    category: 'fast',
    power: 15,
    energyGen: 16,
    animationType: 'normal',
    description: 'Certero golpe marcial que rompe la guardia del adversario.'
  },
  a_bocajarro: {
    id: 'a_bocajarro',
    name: 'A Bocajarro',
    type: 'Lucha',
    category: 'charged',
    power: 95,
    energyCost: 70,
    animationType: 'normal',
    description: 'Embiste cuerpo a cuerpo sin reservas con potencia devastadora.'
  },
  lanzarrocas: {
    id: 'lanzarrocas',
    name: 'Lanzarrocas',
    type: 'Roca',
    category: 'fast',
    power: 15,
    energyGen: 15,
    animationType: 'ground',
    description: 'Arroja pesados peñascos contra el objetivo.'
  },
  avalancha: {
    id: 'avalancha',
    name: 'Avalancha',
    type: 'Roca',
    category: 'charged',
    power: 80,
    energyCost: 55,
    animationType: 'ground',
    description: 'Desata un alud de rocas gigantes sobre el campo.'
  },
  picotazo_ven: {
    id: 'picotazo_ven',
    name: 'Picotazo Venenoso',
    type: 'Veneno',
    category: 'fast',
    power: 13,
    energyGen: 18,
    animationType: 'grass',
    description: 'Aguijonea rápidamente inyectando toxinas.'
  },
  ataque_ala: {
    id: 'ataque_ala',
    name: 'Ataque Ala',
    type: 'Volador',
    category: 'fast',
    power: 14,
    energyGen: 17,
    animationType: 'normal',
    description: 'Golpea al rival desplegando sus alas a gran velocidad.'
  },
  pajaro_osado: {
    id: 'pajaro_osado',
    name: 'Pájaro Osado',
    type: 'Volador',
    category: 'charged',
    power: 90,
    energyCost: 65,
    animationType: 'normal',
    description: 'Se lanza en picada envuelto en aire cortante.'
  },
  picadura: {
    id: 'picadura',
    name: 'Picadura',
    type: 'Bicho',
    category: 'fast',
    power: 13,
    energyGen: 18,
    animationType: 'grass',
    description: 'Muerde velozmente al rival drenando su ventaja.'
  },
  tijera_x: {
    id: 'tijera_x',
    name: 'Tijera X',
    type: 'Bicho',
    category: 'charged',
    power: 75,
    energyCost: 45,
    animationType: 'grass',
    description: 'Corta en cruz con extremidades afiladas como guadañas.'
  }
};

// Generador de ataques para una especie
function generateMovesForPokemon(types, pokemonName = '') {
  const primaryType = types[0] || 'Normal';
  
  let fastPool = ['placaje', 'ataque_rapido'];
  let chargedPool = ['golpe_cuerpo', 'hiperrayo'];

  if (primaryType === 'Agua' || types.includes('Agua')) {
    fastPool = ['pistola_agua', 'burbuja'];
    chargedPool = ['hidrobomba', 'acua_cola', 'rayo_burbuja', 'rayo_hielo'];
  } else if (primaryType === 'Fuego' || types.includes('Fuego')) {
    fastPool = ['ascuas', 'giro_fuego'];
    chargedPool = ['lanzallamas', 'llamarada', 'fuego_fatuo'];
  } else if (primaryType === 'Planta' || types.includes('Planta')) {
    fastPool = ['latigo_cepa', 'hoja_afilada'];
    chargedPool = ['rayo_solar', 'bomba_lodo'];
  } else if (primaryType === 'Eléctrico' || types.includes('Eléctrico')) {
    fastPool = ['impactrueno', 'chispa'];
    chargedPool = ['rayo', 'trueno'];
  } else if (primaryType === 'Fantasma' || types.includes('Fantasma')) {
    fastPool = ['lenguetazo'];
    chargedPool = ['bola_sombra', 'psiquico'];
  } else if (primaryType === 'Psíquico' || types.includes('Psíquico')) {
    fastPool = ['confusion', 'ataque_rapido'];
    chargedPool = ['psiquico', 'bola_sombra'];
  } else if (primaryType === 'Hielo' || types.includes('Hielo')) {
    fastPool = ['canto_helado', 'burbuja'];
    chargedPool = ['rayo_hielo', 'ventisca', 'hidrobomba'];
  } else if (primaryType === 'Hada' || types.includes('Hada')) {
    fastPool = ['viento_feérico', 'ataque_rapido'];
    chargedPool = ['fuerza_lunar', 'psiquico'];
  } else if (primaryType === 'Dragón' || types.includes('Dragón')) {
    fastPool = ['dragoaliento', 'ataque_rapido'];
    chargedPool = ['garra_dragon', 'hiperrayo'];
  } else if (primaryType === 'Lucha' || types.includes('Lucha')) {
    fastPool = ['golpe_karate', 'placaje'];
    chargedPool = ['a_bocajarro', 'golpe_cuerpo'];
  } else if (primaryType === 'Roca' || primaryType === 'Tierra' || types.includes('Tierra') || types.includes('Roca')) {
    fastPool = ['lanzarrocas', 'placaje'];
    chargedPool = ['terremoto', 'avalancha'];
  } else if (primaryType === 'Veneno' || types.includes('Veneno')) {
    fastPool = ['picotazo_ven', 'placaje'];
    chargedPool = ['bomba_lodo', 'golpe_cuerpo'];
  } else if (primaryType === 'Bicho' || types.includes('Bicho')) {
    fastPool = ['picadura', 'ataque_rapido'];
    chargedPool = ['tijera_x', 'golpe_cuerpo'];
  } else if (primaryType === 'Volador' || types.includes('Volador')) {
    fastPool = ['ataque_ala', 'ataque_rapido'];
    chargedPool = ['pajaro_osado', 'golpe_cuerpo'];
  }

  // Selección aleatoria para generar variantes únicas
  const fastKey = fastPool[Math.floor(Math.random() * fastPool.length)];
  const chargedKey = chargedPool[Math.floor(Math.random() * chargedPool.length)];

  // Movimiento 3: Golpe Táctico Veloz
  const tacticalMove = {
    id: 'tactical_strike',
    name: primaryType === 'Agua' ? 'Acua Jet' :
          primaryType === 'Fuego' ? 'Nitrocarga' :
          primaryType === 'Eléctrico' ? 'Chispa Rápida' :
          primaryType === 'Planta' ? 'Hoja Afilada' :
          primaryType === 'Hada' ? 'Brillo Mágico' : 'Ataque Rápido',
    type: primaryType,
    category: 'tactical',
    power: 28,
    critBonus: 0.35,
    energyGen: 12,
    animationType: primaryType.toLowerCase(),
    description: 'Ataque táctico veloz con +35% de probabilidad de Golpe Crítico.'
  };

  // Movimiento 4: Movimiento de Refuerzo / Escudo
  const guardMove = {
    id: 'guard_buff',
    name: primaryType === 'Fuego' ? 'Danza Dragón' :
          primaryType === 'Planta' ? 'Síntesis' :
          primaryType === 'Agua' ? 'Refugio Marino' :
          primaryType === 'Hada' ? 'Luz Lunar' : 'Escudo Férreo',
    type: primaryType,
    category: 'buff',
    power: 0,
    buffType: primaryType === 'Fuego' ? 'atk' : 'def',
    buffValue: 1.35,
    energyGen: 25,
    healAmount: (primaryType === 'Planta' || primaryType === 'Hada') ? 25 : 0,
    animationType: 'buff',
    description: 'Canaliza energía táctica (+25⚡) y potencia las estadísticas de combate.'
  };

  return [
    MOVES[fastKey] || MOVES.placaje, 
    MOVES[chargedKey] || MOVES.golpe_cuerpo,
    tacticalMove,
    guardMove
  ];
}

// Tabla de efectividad de tipos
const TYPE_EFFECTIVENESS = {
  Fuego: { Planta: 1.5, Bicho: 1.5, Hielo: 1.5, Acero: 1.5, Agua: 0.7, Roca: 0.7, Fuego: 0.7, Dragón: 0.7 },
  Agua: { Fuego: 1.5, Tierra: 1.5, Roca: 1.5, Agua: 0.7, Planta: 0.7, Dragón: 0.7 },
  Planta: { Agua: 1.5, Tierra: 1.5, Roca: 1.5, Fuego: 0.7, Planta: 0.7, Veneno: 0.7, Volador: 0.7, Bicho: 0.7 },
  Eléctrico: { Agua: 1.5, Volador: 1.5, Eléctrico: 0.7, Planta: 0.7, Dragón: 0.7, Tierra: 0.5 },
  Hielo: { Planta: 1.5, Tierra: 1.5, Volador: 1.5, Dragón: 1.5, Fuego: 0.7, Agua: 0.7, Hielo: 0.7, Acero: 0.7 },
  Fantasma: { Psíquico: 1.5, Fantasma: 1.5, Siniestro: 0.7, Normal: 0.5 },
  Psíquico: { Lucha: 1.5, Veneno: 1.5, Psíquico: 0.7, Acero: 0.7, Siniestro: 0.5 },
  Tierra: { Fuego: 1.5, Eléctrico: 1.5, Veneno: 1.5, Roca: 1.5, Acero: 1.5, Planta: 0.7, Volador: 0.5 },
  Lucha: { Normal: 1.5, Hielo: 1.5, Roca: 1.5, Siniestro: 1.5, Acero: 1.5, Veneno: 0.7, Volador: 0.7, Psíquico: 0.7, Hada: 0.7, Fantasma: 0.5 },
  Roca: { Fuego: 1.5, Hielo: 1.5, Volador: 1.5, Bicho: 1.5, Lucha: 0.7, Tierra: 0.7, Acero: 0.7 },
  Dragón: { Dragón: 1.5, Acero: 0.7, Hada: 0.5 },
  Hada: { Lucha: 1.5, Dragón: 1.5, Siniestro: 1.5, Fuego: 0.7, Veneno: 0.7, Acero: 0.7 },
  Veneno: { Planta: 1.5, Hada: 1.5, Veneno: 0.7, Tierra: 0.7, Roca: 0.7, Fantasma: 0.7, Acero: 0.5 },
  Bicho: { Planta: 1.5, Psíquico: 1.5, Siniestro: 1.5, Fuego: 0.7, Lucha: 0.7, Veneno: 0.7, Volador: 0.7, Fantasma: 0.7, Hada: 0.7 },
  Volador: { Planta: 1.5, Lucha: 1.5, Bicho: 1.5, Eléctrico: 0.7, Roca: 0.7, Acero: 0.7 },
  Normal: { Fantasma: 0.5, Roca: 0.7, Acero: 0.7 }
};

function getEffectivenessMultiplier(attackType, defenderTypes = []) {
  let mult = 1.0;
  if (!attackType || !defenderTypes || defenderTypes.length === 0) return mult;

  const chart = TYPE_EFFECTIVENESS[attackType];
  if (!chart) return mult;

  for (const defType of defenderTypes) {
    if (chart[defType]) {
      mult *= chart[defType];
    }
  }
  return mult;
}

module.exports = {
  MOVES,
  generateMovesForPokemon,
  getEffectivenessMultiplier,
  TYPE_EFFECTIVENESS
};
