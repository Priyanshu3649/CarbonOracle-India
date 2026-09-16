import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateTreeId(plotId: string, lat: number, lon: number) {
  const roundedLat = Math.round(lat * 1000);
  const roundedLon = Math.round(lon * 1000);
  const hash = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TREE_${plotId.substring(0,4)}_${roundedLat}_${roundedLon}_${hash}`;
}

async function main() {
  const plot = await prisma.plot.findFirst();
  const species = await prisma.species.findFirst();

  if (!plot || !species) {
    console.log("No plot or species found. Skipping seed.");
    return;
  }

  console.log("Seeding sample trees...");

  for (let i = 0; i < 15; i++) {
    const lat = 28.6 + (Math.random() * 0.05 - 0.025);
    const lon = 77.2 + (Math.random() * 0.05 - 0.025);
    const dbh = 10 + Math.random() * 40;
    const height = 5 + Math.random() * 15;
    
    // Quick carbon math
    const agb = 0.0673 * Math.pow(species.wood_density_g_cm3 * dbh * dbh * height, 0.976);
    const bgb = agb * 0.24;
    const total_carbon = (agb + bgb) * 0.47;
    const co2e = total_carbon * 3.67;

    const tree = await prisma.tree.create({
      data: {
        internal_tree_id: generateTreeId(plot.id, lat, lon),
        plot_id: plot.id,
        species_id: species.id,
        latitude: lat,
        longitude: lon,
      }
    });

    await prisma.treeMeasurement.create({
      data: {
        tree_id: tree.id,
        measured_at: new Date(Date.now() - Math.random() * 10000000000),
        diameter_cm: dbh,
        tree_height_m: height,
        wood_density_g_cm3: species.wood_density_g_cm3,
        agb_kg: agb,
        bgb_kg: bgb,
        agc_kg: agb * 0.47,
        bgc_kg: bgb * 0.47,
        total_carbon_kg: total_carbon,
        co2e_kg: co2e,
        data_source: 'rover'
      }
    });
  }

  console.log('Trees seeded successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
