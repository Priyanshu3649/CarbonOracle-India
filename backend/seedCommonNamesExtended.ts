import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const exactMatches: Record<string, string> = {
  "Acacia arabica": "Babool",
  "Acacia catechu": "Khair",
  "Acacia leucophloea": "Reonja",
  "Azadirachta indica": "Neem",
  "Mangifera indica": "Mango",
  "Tectona grandis": "Teak",
  "Eucalyptus globulus": "Blue Gum Eucalyptus",
  "Ficus benghalensis": "Banyan",
  "Dalbergia sissoo": "Shisham (North Indian Rosewood)",
  "Ficus religiosa": "Peepal",
  "Terminalia arjuna": "Arjun",
  "Aegle marmelos": "Bael",
  "Artocarpus heterophylla": "Jackfruit",
  "Bombax ceiba": "Red Silk Cotton Tree",
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
  "Pinus roxburghii": "Chir Pine",
  "Ceiba pentandra": "Kapok",
  "Anacardium excelsum": "Wild Cashew",
  "Araucaria bidwillii": "Bunya Pine",
  "Balanites aegyptiaca": "Desert Date"
};

const genusMatches: Record<string, string> = {
  "Acacia": "Acacia",
  "Albizia": "Albizia",
  "Albizzia": "Albizia",
  "Alstonia": "Cheesewood / Pattern-wood",
  "Anacardium": "Cashew",
  "Artocarpus": "Jackfruit / Breadfruit family",
  "Aspidosperma": "Peroba / Quebracho",
  "Astronium": "Goncalo Alves",
  "Bombax": "Silk Cotton Tree",
  "Brosimum": "Bloodwood / Snakewood",
  "Calophyllum": "Bintangor",
  "Canarium": "Canarium",
  "Carapa": "Crabwood",
  "Caryocar": "Pequi",
  "Casearia": "Silver-wood",
  "Cassia": "Cassia",
  "Casuarina": "Sheoak",
  "Cecropia": "Trumpet Tree",
  "Cedrela": "Cedar",
  "Celtis": "Hackberry",
  "Chlorophora": "Fustic",
  "Cinnamomum": "Cinnamon / Laurel",
  "Cocos": "Coconut",
  "Cola": "Cola",
  "Combretodendron": "Stinkwood",
  "Copaifera": "Copal",
  "Cordia": "Cordia / Bocote",
  "Croton": "Croton",
  "Cynometra": "Cynometra",
  "Dacrydium": "Rimu",
  "Dacryodes": "Safou / African Pear",
  "Dalbergia": "Rosewood",
  "Dialium": "Keranji",
  "Dillenia": "Simpor",
  "Diospyros": "Ebony",
  "Dipterocarpus": "Keruing",
  "Drypetes": "Drypetes",
  "Dysoxylum": "Dysoxylum",
  "Entandrophragma": "Mahogany (Sapele/Utile)",
  "Eperua": "Wallaba",
  "Erythrina": "Coral Tree",
  "Eschweilera": "Mata Mata",
  "Eucalyptus": "Eucalyptus",
  "Eugenia": "Stopper",
  "Fagara": "Satinwood",
  "Ficus": "Fig",
  "Garcinia": "Mangosteen",
  "Gardenia": "Gardenia",
  "Gmelina": "Gmelina",
  "Khaya": "African Mahogany",
  "Lophira": "Ekki",
  "Lovoa": "Ironwood",
  "Macaranga": "Macaranga",
  "Magnolia": "Magnolia",
  "Manilkara": "Sapodilla",
  "Melaleuca": "Paperbark",
  "Milicia": "Iroko",
  "Morus": "Mulberry",
  "Myristica": "Nutmeg",
  "Nauclea": "Opepe",
  "Palaquium": "Bullet Wood",
  "Parkia": "Locust Bean",
  "Peltogyne": "Purpleheart",
  "Pinus": "Pine",
  "Piptadeniastrum": "Dahoma",
  "Pithecellobium": "Monkeypod",
  "Podocarpus": "Plum Pine",
  "Pometia": "Kasai",
  "Pouteria": "Aningeria",
  "Pterocarpus": "Padauk",
  "Quercus": "Oak",
  "Shorea": "Meranti / Sal",
  "Sterculia": "Chestnut",
  "Swietenia": "Mahogany",
  "Symphonia": "Chewstick",
  "Syzygium": "Water Apple",
  "Tabebuia": "Roble",
  "Tamarindus": "Tamarind",
  "Tarrietia": "Taun",
  "Tectona": "Teak",
  "Terminalia": "Terminalia / Idigbo",
  "Tetragastris": "Tetragastris",
  "Theobroma": "Cacao",
  "Tristania": "Tsintonia",
  "Turraeanthus": "Avodire",
  "Vateria": "Vateria",
  "Vatica": "Vatica",
  "Vitex": "Vitex",
  "Vochysia": "Quaruba",
  "Xylia": "Xylia",
  "Zanthoxylum": "Prickly Ash"
};

async function main() {
  const species = await prisma.species.findMany();
  let exactCount = 0;
  let genusCount = 0;
  let genericCount = 0;

  for (const s of species) {
    if (exactMatches[s.scientific_name]) {
      await prisma.species.update({
        where: { id: s.id },
        data: { common_name: exactMatches[s.scientific_name] }
      });
      exactCount++;
    } else {
      // Extract Genus (first word)
      const genus = s.scientific_name.split(' ')[0];

      if (genusMatches[genus]) {
        // e.g. "Acacia Species"
        let newName = genusMatches[genus];

        // If the species name contains spp or sp, format nicely
        if (s.scientific_name.includes('spp.') || s.scientific_name.includes('sp.')) {
          newName = `${newName} (Various ${genus} species)`;
        } else {
          // Provide Genus generic but keep specific part in parenthesis
          const specificEpithet = s.scientific_name.split(' ').slice(1).join(' ').replace('spp.', '').replace('sp.', '').trim();
          if (specificEpithet.length > 0) {
            // e.g "Acacia (Arabica)"
            newName = `${newName} (${specificEpithet.charAt(0).toUpperCase() + specificEpithet.slice(1)})`;
          }
        }

        await prisma.species.update({
          where: { id: s.id },
          data: { common_name: newName }
        });
        genusCount++;
      } else if (s.common_name === s.scientific_name) {
        // Ultimate fallback, just format the scientific name nicely by capitalizing and removing spp
        let cleaned = s.scientific_name.replace('spp.', 'Species').replace('sp.', 'Species');
        await prisma.species.update({
          where: { id: s.id },
          data: { common_name: cleaned }
        });
        genericCount++;
      }
    }
  }

  console.log(`Update complete!`);
  console.log(`- Exact translations: ${exactCount}`);
  console.log(`- Genus-level fuzzy matches: ${genusCount}`);
  console.log(`- Generic formatting: ${genericCount}`);
}

main().finally(() => prisma.$disconnect());
