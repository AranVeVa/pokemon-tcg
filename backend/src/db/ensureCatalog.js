const db = require('./index');

const CATALOG_ITEMS = [
  {
    item_key: 'potion_30',
    name: 'Poción +30 HP',
    description: 'Curación pequeña. Recupera 30 puntos de vida de un Pokémon.',
    effect_type: 'heal_flat',
    effect_value: 30,
    rarity: 'comun',
    icon: 'potion'
  },
  {
    item_key: 'super_potion_75',
    name: 'Superpoción +75 HP',
    description: 'Curación media. Recupera 75 puntos de vida de un Pokémon.',
    effect_type: 'heal_flat',
    effect_value: 75,
    rarity: 'poco_comun',
    icon: 'super_potion'
  },
  {
    item_key: 'hyper_potion_150',
    name: 'Hiperpoción +150 HP',
    description: 'Curación avanzada. Recupera 150 puntos de vida en combate o mochila.',
    effect_type: 'heal_flat',
    effect_value: 150,
    rarity: 'rara',
    icon: 'hyper_potion'
  },
  {
    item_key: 'heal_full',
    name: 'Cura Total',
    description: 'Restaura el 100% de la vida de un Pokémon al instante.',
    effect_type: 'heal_percent',
    effect_value: 100,
    rarity: 'rara',
    icon: 'heal_full'
  },
  {
    item_key: 'revive_10',
    name: 'Revivir 10%',
    description: 'Revive a un Pokémon debilitado con 10% de salud.',
    effect_type: 'revive_percent',
    effect_value: 10,
    rarity: 'comun',
    icon: 'revive_10'
  },
  {
    item_key: 'revive_50',
    name: 'Revivir 50%',
    description: 'Revive a un Pokémon debilitado con 50% de salud.',
    effect_type: 'revive_percent',
    effect_value: 50,
    rarity: 'poco_comun',
    icon: 'revive_50'
  },
  {
    item_key: 'revive_full',
    name: 'Revivir Máximo',
    description: 'Revive a un Pokémon debilitado con salud completa (100%).',
    effect_type: 'revive_full',
    effect_value: 100,
    rarity: 'rara',
    icon: 'revive_full'
  },
  {
    item_key: 'energy_boost',
    name: 'Carga de Energía +40⚡',
    description: 'Tónico de combate: recarga +40⚡ de energía para ataques cargados.',
    effect_type: 'battle_energy',
    effect_value: 40,
    rarity: 'poco_comun',
    icon: 'energy'
  },
  {
    item_key: 'attack_tonic',
    name: 'Tónico de Ataque +25%',
    description: 'Potencia en +25% el ataque de tu Pokémon activo en combate.',
    effect_type: 'battle_atk_buff',
    effect_value: 25,
    rarity: 'poco_comun',
    icon: 'atk_tonic'
  },
  {
    item_key: 'defense_tonic',
    name: 'Tónico Férreo +25%',
    description: 'Refuerza en +25% la defensa de tu Pokémon activo en combate.',
    effect_type: 'battle_def_buff',
    effect_value: 25,
    rarity: 'poco_comun',
    icon: 'def_tonic'
  },
  {
    item_key: 'prisma_evolucion',
    name: 'Prisma Evolutivo',
    description: 'Gema rara de evolución. Evoluciona una carta en Nivel 5 sin necesitar copias repetidas.',
    effect_type: 'evolve_stage',
    effect_value: 1,
    rarity: 'rara',
    icon: 'prism'
  },
  {
    item_key: 'prisma_maestro',
    name: 'Prisma Arcoíris Maestro',
    description: 'Gema legendaria ultra rara. Evoluciona cualquier carta en cualquier nivel (1-5) sin copias repetidas.',
    effect_type: 'evolve_any',
    effect_value: 1,
    rarity: 'legendario',
    icon: 'prism_master'
  }
];

const DEFAULT_SYSTEM_CONFIGS = {
  season_info: { name: 'Temporada Primavera', start: '2026-03-01', end: '2026-06-30' },
  pack_rates_normal: { comun: 0.78, poco_comun: 0.17, rara: 0.05, legendario: 0.00 },
  pack_rates_special: { comun: 0.42, poco_comun: 0.36, rara: 0.19, legendario: 0.03 },
  pack_rates_legendary: { comun: 0.00, poco_comun: 0.25, rara: 0.45, legendario: 0.30 },
  item_drop_rates: {
    potion_30: 0.34,
    revive_10: 0.18,
    super_potion_75: 0.15,
    revive_50: 0.10,
    energy_boost: 0.07,
    attack_tonic: 0.05,
    defense_tonic: 0.04,
    hyper_potion_150: 0.03,
    heal_full: 0.02,
    revive_full: 0.01,
    prisma_evolucion: 0.008,
    prisma_maestro: 0.002
  }
};

let initializedPromise = null;

/**
 * Sincroniza de forma idempotente (sin borrar datos de usuarios) los nuevos ítems,
 * columnas opcionales y configuraciones por defecto en la base de datos activa.
 */
async function ensureCatalogInitialized() {
  if (initializedPromise) return initializedPromise;

  initializedPromise = (async () => {
    try {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;
      `);

      await db.query(`
        ALTER TABLE user_cards
        ADD COLUMN IF NOT EXISTS def INT DEFAULT 50,
        ADD COLUMN IF NOT EXISTS spd INT DEFAULT 50,
        ADD COLUMN IF NOT EXISTS iv_percentage INT DEFAULT 85,
        ADD COLUMN IF NOT EXISTS moves JSONB DEFAULT '[]'::jsonb;
      `);

      for (const item of CATALOG_ITEMS) {
        await db.query(`
          INSERT INTO items (item_key, name, description, effect_type, effect_value, rarity, icon)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (item_key) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            effect_type = EXCLUDED.effect_type,
            effect_value = EXCLUDED.effect_value,
            rarity = EXCLUDED.rarity,
            icon = EXCLUDED.icon
        `, [
          item.item_key,
          item.name,
          item.description,
          item.effect_type,
          item.effect_value,
          item.rarity,
          item.icon
        ]);
      }

      for (const [key, val] of Object.entries(DEFAULT_SYSTEM_CONFIGS)) {
        await db.query(`
          INSERT INTO system_config (key, value)
          VALUES ($1, $2)
          ON CONFLICT (key) DO NOTHING
        `, [key, JSON.stringify(val)]);
      }

      // Actualizar item_drop_rates si aún tiene el catálogo antiguo de solo 5 ítems
      const dropCfg = await db.query("SELECT value FROM system_config WHERE key = 'item_drop_rates'");
      if (dropCfg.rows.length > 0 && dropCfg.rows[0].value && !dropCfg.rows[0].value.prisma_evolucion) {
        await db.query(
          "UPDATE system_config SET value = $1, updated_at = NOW() WHERE key = 'item_drop_rates'",
          [JSON.stringify(DEFAULT_SYSTEM_CONFIGS.item_drop_rates)]
        );
      }

      console.log('✅ Catálogo de ítems (12), prismas evolutivos y configuración verificados.');
    } catch (err) {
      console.warn('⚠️ Aviso en ensureCatalogInitialized:', err.message);
      initializedPromise = null;
    }
  })();

  return initializedPromise;
}

module.exports = {
  CATALOG_ITEMS,
  DEFAULT_SYSTEM_CONFIGS,
  ensureCatalogInitialized
};
