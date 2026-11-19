// Service to fetch and enrich Pokémon data from PokéAPI
const TYPE_TRANSLATIONS = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  grass: 'Planta',
  electric: 'Eléctrico',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  steel: 'Acero',
  fairy: 'Hada'
};

const LEGENDARIES = [144, 145, 146, 150, 151];
const RARES = [3, 6, 9, 31, 34, 38, 59, 65, 68, 94, 103, 130, 131, 143, 149];

function determineRarity(id, stage) {
  if (LEGENDARIES.includes(id)) return 'legendario';
  if (RARES.includes(id) || stage === 3) return 'rara';
  if (stage === 2) return 'poco_comun';
  return 'comun';
}

async function fetchPokemonFromPokeApi(id) {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const types = data.types.map(t => TYPE_TRANSLATIONS[t.type.name] || t.type.name);
    const hp = data.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
    const atk = data.stats.find(s => s.stat.name === 'attack')?.base_stat || 50;
    const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
    const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

    return {
      id,
      name,
      types,
      hp_base: hp,
      atk_base: atk,
      sprite_url: spriteUrl,
      artwork_url: artworkUrl
    };
  } catch (error) {
    console.error(`Error fetching Pokémon #${id} from PokéAPI:`, error.message);
    return null;
  }
}

module.exports = {
  TYPE_TRANSLATIONS,
  LEGENDARIES,
  determineRarity,
  fetchPokemonFromPokeApi
};
