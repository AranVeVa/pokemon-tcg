// Tabla de efectividad de tipos en ES Module para el FrontEnd
export const TYPE_EFFECTIVENESS = {
  Fuego: { Planta: 1.5, Bicho: 1.5, Hielo: 1.5, Agua: 0.7, Roca: 0.7, Fuego: 0.7 },
  Agua: { Fuego: 1.5, Tierra: 1.5, Roca: 1.5, Agua: 0.7, Planta: 0.7, Dragón: 0.7 },
  Planta: { Agua: 1.5, Tierra: 1.5, Roca: 1.5, Fuego: 0.7, Planta: 0.7, Veneno: 0.7, Volador: 0.7 },
  Eléctrico: { Agua: 1.5, Volador: 1.5, Eléctrico: 0.7, Planta: 0.7, Tierra: 0.5 },
  Hielo: { Planta: 1.5, Tierra: 1.5, Volador: 1.5, Dragón: 1.5, Fuego: 0.7, Agua: 0.7, Hielo: 0.7 },
  Fantasma: { Psíquico: 1.5, Fantasma: 1.5, Normal: 0.5 },
  Psíquico: { Lucha: 1.5, Veneno: 1.5, Psíquico: 0.7 },
  Tierra: { Fuego: 1.5, Eléctrico: 1.5, Veneno: 1.5, Roca: 1.5, Planta: 0.7, Volador: 0.5 },
  Normal: { Fantasma: 0.5, Roca: 0.7 }
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
