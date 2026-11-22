// Tabla de efectividad de tipos en ES Module para el FrontEnd
export const TYPE_EFFECTIVENESS = {
  Fuego: { Planta: 1.5, Bicho: 1.5, Hielo: 1.5, Acero: 1.5, Agua: 0.7, Roca: 0.7, Fuego: 0.7, Dragón: 0.7 },
  Agua: { Fuego: 1.5, Tierra: 1.5, Roca: 1.5, Agua: 0.7, Planta: 0.7, Dragón: 0.7 },
  Planta: { Agua: 1.5, Tierra: 1.5, Roca: 1.5, Fuego: 0.7, Planta: 0.7, Veneno: 0.7, Volador: 0.7, Bicho: 0.7, Dragón: 0.7, Acero: 0.7 },
  Eléctrico: { Agua: 1.5, Volador: 1.5, Eléctrico: 0.7, Planta: 0.7, Dragón: 0.7, Tierra: 0.5 },
  Hielo: { Planta: 1.5, Tierra: 1.5, Volador: 1.5, Dragón: 1.5, Fuego: 0.7, Agua: 0.7, Hielo: 0.7, Acero: 0.7 },
  Fantasma: { Psíquico: 1.5, Fantasma: 1.5, Siniestro: 0.7, Normal: 0.5 },
  Psíquico: { Lucha: 1.5, Veneno: 1.5, Psíquico: 0.7, Acero: 0.7, Siniestro: 0.5 },
  Tierra: { Fuego: 1.5, Eléctrico: 1.5, Veneno: 1.5, Roca: 1.5, Acero: 1.5, Planta: 0.7, Bicho: 0.7, Volador: 0.5 },
  Lucha: { Normal: 1.5, Hielo: 1.5, Roca: 1.5, Siniestro: 1.5, Acero: 1.5, Veneno: 0.7, Volador: 0.7, Psíquico: 0.7, Bicho: 0.7, Hada: 0.7, Fantasma: 0.5 },
  Roca: { Fuego: 1.5, Hielo: 1.5, Volador: 1.5, Bicho: 1.5, Lucha: 0.7, Tierra: 0.7, Acero: 0.7 },
  Dragón: { Dragón: 1.5, Acero: 0.7, Hada: 0.5 },
  Normal: { Fantasma: 0.5, Roca: 0.7, Acero: 0.7 }
};

export function getEffectivenessMultiplier(attackType, defenderTypes = []) {
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

export function getEffectivenessLabel(mult) {
  if (mult >= 1.5) return { text: '¡Súper Eficaz! (x' + mult + ')', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' };
  if (mult <= 0.7) return { text: 'Poco Eficaz (x' + mult + ')', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' };
  return { text: 'Daño Estándar (x1.0)', color: 'text-gray-300 bg-gray-700/40 border-gray-600/40' };
}

// Genera un set de 4 movimientos tácticos completos estilo RPG de Pokémon
export function get4MovesForCard(card) {
  if (!card) return [];
  const primaryType = (card.types && card.types[0]) || 'Normal';
  const existingMoves = card.moves || [];

  // Slot 1: Movimiento Rápido
  const fastMove = existingMoves[0] || {
    id: 'fast_auto',
    name: primaryType === 'Fuego' ? 'Ascuas' :
          primaryType === 'Agua' ? 'Pistola Agua' :
          primaryType === 'Planta' ? 'Látigo Cepa' :
          primaryType === 'Eléctrico' ? 'Impactrueno' :
          primaryType === 'Psíquico' ? 'Confusión' :
          primaryType === 'Fantasma' ? 'Lenguetazo' : 'Placaje Veloz',
    type: primaryType,
    category: 'fast',
    power: 16,
    energyGen: 18,
    animationType: primaryType.toLowerCase(),
    description: `Ataque primario de tipo ${primaryType}. Genera +18 de Energía.`
  };

  // Slot 2: Movimiento Cargado Definitivo
  const chargedMove = existingMoves[1] || {
    id: 'charged_auto',
    name: primaryType === 'Fuego' ? 'Llamarada Ígnea' :
          primaryType === 'Agua' ? 'Hidrobomba' :
          primaryType === 'Planta' ? 'Rayo Solar' :
          primaryType === 'Eléctrico' ? 'Trueno Fulminante' :
          primaryType === 'Psíquico' ? 'Psíquico Cósmico' :
          primaryType === 'Fantasma' ? 'Bola Sombra' : 'Hiperrayo',
    type: primaryType,
    category: 'charged',
    power: 85,
    energyCost: 45,
    animationType: primaryType.toLowerCase(),
    description: `Ataque masivo demoledor. Consume 45⚡ de Energía.`
  };

  // Slot 3: Movimiento Táctico (Alta probabilidad de Golpe Crítico)
  const tacticalMove = {
    id: 'tactical_move',
    name: primaryType === 'Agua' ? 'Acua Jet' :
          primaryType === 'Fuego' ? 'Nitrocarga' :
          primaryType === 'Eléctrico' ? 'Chispa Rápida' :
          primaryType === 'Planta' ? 'Hoja Afilada' :
          primaryType === 'Fantasma' ? 'Sombra Vil' :
          primaryType === 'Psíquico' ? 'Psicocorte' : 'Ataque Rápido',
    type: primaryType === 'Normal' ? 'Normal' : primaryType,
    category: 'tactical',
    power: 32,
    critBonus: 0.40, // 40% de probabilidad extra de crítico
    energyGen: 10,
    animationType: primaryType.toLowerCase(),
    description: 'Ataque táctico veloz con +40% de probabilidad de Golpe Crítico.'
  };

  // Slot 4: Movimiento de Estado / Refuerzo Defensivo
  const guardMove = {
    id: 'guard_move',
    name: primaryType === 'Agua' ? 'Refugio Marino' :
          primaryType === 'Fuego' ? 'Danza Dragón' :
          primaryType === 'Planta' ? 'Síntesis Solar' :
          primaryType === 'Eléctrico' ? 'Campo Eléctrico' :
          primaryType === 'Psíquico' ? 'Pantalla de Luz' : 'Fortaleza / Escudo',
    type: primaryType,
    category: 'buff',
    power: 0,
    buffType: primaryType === 'Fuego' ? 'atk' : 'def',
    buffValue: 1.35,
    energyGen: 25,
    healAmount: primaryType === 'Planta' ? 25 : 0,
    animationType: 'buff',
    description: primaryType === 'Fuego' 
      ? 'Aumenta el Ataque un 35% y canaliza +25⚡ de Energía.' 
      : primaryType === 'Planta'
        ? 'Restaura +25 HP y canaliza +25⚡ de Energía.'
        : 'Refuerza la Defensa un 35% y canaliza +25⚡ de Energía.'
  };

  return [fastMove, chargedMove, tacticalMove, guardMove];
}
