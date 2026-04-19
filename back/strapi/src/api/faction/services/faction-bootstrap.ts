import { Core } from '@strapi/strapi';

const DEFAULT_FACTIONS = [
  { name: 'Neutre', code: 'NEUTRAL', description: 'Sans affiliation particulière.', lore: "La zone grise entre les puissances.", style: {} },
  { name: 'Hégémonie Martienne', code: 'MARS', description: 'Puissance militaire disciplinée.', lore: "L'ordre par la force.", style: { color: '#e74c3c' } },
  { name: 'Exode Pélagique', code: 'PELAGIC', description: "Maîtres des profondeurs et de l'adaptation.", lore: "L'océan est notre berceau et notre tombe.", style: { color: '#3498db' } },
  { name: 'Héritiers des Cendres', code: 'ASHES', description: 'Survivants des terres désolées.', lore: "Renaître de nos propres ruines.", style: { color: '#e67e22' } },
  { name: 'Omni-Réseau', code: 'OMNI', description: 'Intelligence collective et cybernétique.', lore: "L'information est le sang du monde.", style: { color: '#9b59b6' } },
  { name: 'Chœur Synthétique', code: 'SYNTH', description: "Harmonie entre l'organique et la machine.", lore: "Une seule voix, un seul but.", style: { color: '#1abc9c' } },
  { name: 'Éveil Chthonien', code: 'CHTHON', description: 'Horreurs des profondeurs terrestres.', lore: "Ce qui dort doit se réveiller.", style: { color: '#2c3e50' } },
  { name: 'Incursion Dissonante', code: 'DISSONANCE', description: "Entités d'une autre dimension.", lore: "La réalité est une illusion fragile.", style: { color: '#f1c40f' } },
  { name: 'Ferrailleurs de la Ceinture', code: 'SCRAPPERS', description: 'Ingénieux récupérateurs spatiaux.', lore: "Rien ne se perd, tout se transforme.", style: { color: '#95a5a6' } },
  { name: 'Fléau Spore', code: 'SPORE', description: 'Infection fongique dévorante.', lore: "Nous sommes partout. Nous sommes vous.", style: { color: '#27ae60' } },
];

export async function bootstrapFactions(strapi: Core.Strapi) {
  console.log('🌱 Checking Factions bootstrap...');

  for (const factionData of DEFAULT_FACTIONS) {
    const existing = await strapi.entityService.findMany('api::faction.faction', {
      filters: { code: factionData.code },
    });

    if (existing.length === 0) {
      await strapi.entityService.create('api::faction.faction', {
        data: factionData,
      });
      console.log(`✅ Faction created: ${factionData.name} (${factionData.code})`);
    }
  }
}
