import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function generateTreeId(plotId: string, lat: number, lon: number) {
  const roundedLat = Math.round(lat * 1000)
  const roundedLon = Math.round(lon * 1000)
  const hash = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `TREE_${plotId.substring(0,4)}_${roundedLat}_${roundedLon}_${hash}`
}

function calculateCarbon(dbh: number, height: number, wd: number) {
  // AGB_kg = exp(-2.409 + 0.9522 * ln(D^2 * H * WD))
  const agb_kg = Math.exp(-2.409 + 0.9522 * Math.log(Math.pow(dbh, 2) * height * wd))
  const agc_kg = agb_kg * 0.47
  const bgb_kg = agb_kg * 0.26
  const bgc_kg = bgb_kg * 0.47
  const total_carbon_kg = agc_kg + bgc_kg
  const co2e_kg = total_carbon_kg * 3.667

  return { agb_kg, agc_kg, bgb_kg, bgc_kg, total_carbon_kg, co2e_kg }
}

async function main() {
  // Clear existing
  await prisma.treeMeasurement.deleteMany()
  await prisma.tree.deleteMany()
  await prisma.uploadBatch.deleteMany()
  await prisma.species.deleteMany()
  await prisma.plot.deleteMany()

  // 1. Create Plots
  const plot1 = await prisma.plot.create({
    data: {
      plot_name: 'Western Ghats Demo Plot',
      description: 'Sample plot indicating dense moist tropical forest regions.'
    }
  })

  const plot2 = await prisma.plot.create({
    data: {
      plot_name: 'Central India Urban Park',
      description: 'Urban plantation demo.'
    }
  })

  // 2. Create Species
  const speciesData = [
    { common_name: 'Neem', scientific_name: 'Azadirachta indica', wood_density_g_cm3: 0.72, region: 'Pan-India' },
    { common_name: 'Mango', scientific_name: 'Mangifera indica', wood_density_g_cm3: 0.65, region: 'Pan-India' },
    { common_name: 'Teak', scientific_name: 'Tectona grandis', wood_density_g_cm3: 0.66, region: 'Central & South India' },
    { common_name: 'Eucalyptus', scientific_name: 'Eucalyptus globulus', wood_density_g_cm3: 0.70, region: 'Plantations' },
    { common_name: 'Banyan', scientific_name: 'Ficus benghalensis', wood_density_g_cm3: 0.55, region: 'Pan-India' },
    { common_name: 'Shisham', scientific_name: 'Dalbergia sissoo', wood_density_g_cm3: 0.77, region: 'North India' },
    { common_name: 'Peepal', scientific_name: 'Ficus religiosa', wood_density_g_cm3: 0.45, region: 'Pan-India' },
    { common_name: 'Arjun', scientific_name: 'Terminalia arjuna', wood_density_g_cm3: 0.74, region: 'Riverine' },
  ]

  const speciesRecords = []
  for (const s of speciesData) {
    speciesRecords.push(await prisma.species.create({ data: s }))
  }

  console.log(`Seeded base data: 2 plots and ${speciesRecords.length} species. No dummy trees were added.`);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
