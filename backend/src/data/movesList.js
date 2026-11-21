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
  }
};

// Generador de ataques para una especie (permite variaciones tipo Pokémon GO)
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
  }

  // Selección aleatoria para generar variantes únicas (tipo Pokémon GO)
  const fastKey = fastPool[Math.floor(Math.random() * fastPool.length)];
  const chargedKey = chargedPool[Math.floor(Math.random() * chargedPool.length)];

  return [MOVES[fastKey] || MOVES.placaje, MOVES[chargedKey] || MOVES.golpe_cuerpo];
}

// Tabla de efectividad de tipos
const TYPE_EFFECTIVENESS = {
  Fuego: { Planta: 1.5, Bicho: 1.5, Hielo: 1.5, Agua: 0.7, Roca: 0.7, Fuego: 0.7 },
  Agua: { Fuego: 1.5, Tierra: 1.5, Roca: 1.5, Agua: 0.7, Planta: 0.7, Dragon: 0.7 },
  Planta: { Agua: 1.5, Tierra: 1.5, Roca: 1.5, Fuego: 0.7, Planta: 0.7, Veneno: 0.7, Volador: 0.7 },
  Eléctrico: { Agua: 1.5, Volador: 1.5, Eléctrico: 0.7, Planta: 0.7, Tierra: 0.5 },
  Hielo: { Planta: 1.5, Tierra: 1.5, Volador: 1.5, Dragón: 1.5, Fuego: 0.7, Agua: 0.7, Hielo: 0.7 },
  Fantasma: { Psíquico: 1.5, Fantasma: 1.5, Normal: 0.5 },
  Psíquico: { Lucha: 1.5, Veneno: 1.5, Psíquico: 0.7 },
  Tierra: { Fuego: 1.5, Eléctrico: 1.5, Veneno: 1.5, Roca: 1.5, Planta: 0.7, Volador: 0.5 },
  Normal: { Fantasma: 0.5, Roca: 0.7 }
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
