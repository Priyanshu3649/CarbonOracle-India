import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const translations: Record<string, string> = {
  "Acacia arabica": "Babool",
  "Acacia catechu": "Khair",
  "Acacia leucophloea": "Reonja",
  "Azadirachta indica": "Neem",
  "Mangifera indica": "Mango",
  "Tectona grandis": "Teak",
  "Eucalyptus globulus": "Eucalyptus",
  "Ficus benghalensis": "Banyan",
  "Dalbergia sissoo": "Shisham (Rosewood)",
  "Ficus religiosa": "Peepal",
  "Terminalia arjuna": "Arjun",
  "Aegle marmelos": "Bael",
  "Albizzia lebbek": "Siris",
  "Artocarpus heterophylla": "Jackfruit",
  "Bombax ceiba": "Silk Cotton Tree",
  "Butea monosperma": "Palash",
  "Cassia fistula": "Amaltas",
  "Cocos nucifera": "Coconut Palm",
  "Dalbergia latifolia": "Indian Rosewood",
  "Diospyros melanoxylon": "Tendu",
  "Emblica officinalis": "Amla",
  "Gmelina arborea": "Gamhar",
  "Madhuca indica": "Mahua",
  "Moringa oleifera": "Drumstick Tree",
  "Pongamia pinnata": "Karanj",
  "Prosopis juliflora": "Vilayati Babool",
  "Pterocarpus marsupium": "Indian Beech",
  "Santalum album": "Sandalwood",
  "Shorea robusta": "Sal Tree",
  "Syzygium cumini": "Jamun",
  "Tamarindus indica": "Tamarind",
  "Terminalia bellirica": "Bahera",
  "Terminalia chebula": "Harad",
  "Ziziphus mauritiana": "Ber",
  "Artocarpus comunis": "Breadfruit",
  "Chloroxylon swietenia": "East Indian Satinwood",
  "Michelia champaca": "Champak",
  "Olea europaea": "Olive",
  "Pinus roxburghii": "Chir Pine"
};

async function main() {
  const species = await prisma.species.findMany();
  let updated = 0;

  for (const s of species) {
    if (translations[s.scientific_name]) {
      await prisma.species.update({
        where: { id: s.id },
        data: { common_name: translations[s.scientific_name] }
      });
      updated++;
    } else if (s.common_name === s.scientific_name) {
      // If it contains spp., let's at least make it look like a common categorization
      if (s.common_name.includes('spp.')) {
        await prisma.species.update({
          where: { id: s.id },
          data: { common_name: s.common_name.replace('spp.', 'Species') }
        });
        updated++;
      }
    }
  }

  console.log(`Updated ${updated} common names successfully.`);
}

main().finally(() => prisma.$disconnect());
