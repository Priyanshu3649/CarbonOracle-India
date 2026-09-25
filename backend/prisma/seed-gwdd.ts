import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

function parseFloat2(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val.trim())
  return isNaN(n) ? null : n
}

function parseInt2(val: string | undefined): number {
  if (!val || val.trim() === '') return 1
  const n = parseInt(val.trim())
  return isNaN(n) ? 1 : n
}

async function main() {
  // Try multiple possible paths for the CSV
  const possiblePaths = [
    path.resolve(__dirname, '../../gwddagg_v2.2_species.csv'),
    path.resolve(process.cwd(), '../gwddagg_v2.2_species.csv'),
    path.resolve(process.cwd(), 'gwddagg_v2.2_species.csv'),
    '/Users/priyanshupandey/Desktop/CarbonOracle-main/gwddagg_v2.2_species.csv',
  ]

  let csvPath = ''
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) { csvPath = p; break }
  }

  if (!csvPath) {
    console.error('❌ Could not find gwddagg_v2.2_species.csv. Tried:', possiblePaths)
    process.exit(1)
  }

  console.log(`📂 Reading CSV from: ${csvPath}`)
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n')
  const header = lines[0].split(',')

  console.log(`📊 Found ${lines.length - 1} rows`)
  console.log('🗑️  Clearing existing wood density reference data...')
  await prisma.woodDensityReference.deleteMany()

  let imported = 0
  let skipped = 0
  const BATCH_SIZE = 500

  const records: any[] = []
  const speciesRecords: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV respecting quoted fields
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { fields.push(current); current = '' }
      else { current += ch }
    }
    fields.push(current)

    const species    = fields[0]?.trim()
    const genus      = fields[1]?.trim()
    const family     = fields[6]?.trim()
    const plantOrder = fields[7]?.trim()
    const plantGroup = fields[8]?.trim()
    const nb         = parseInt2(fields[9])
    const wsg_est    = parseFloat2(fields[13])
    const wsg_est_trunk   = parseFloat2(fields[14])
    const wsg_est_branch  = parseFloat2(fields[15])
    const wsg_raw    = parseFloat2(fields[16])

    if (!species || !genus || wsg_est === null) { skipped++; continue }

    records.push({
      species,
      genus,
      family:        family   || null,
      plant_order:   plantOrder || null,
      plant_group:   plantGroup || null,
      wsg_est,
      wsg_est_trunk,
      wsg_est_branch,
      wsg_raw,
      nb_samples:    nb,
    })

    speciesRecords.push({
      common_name:        species,
      scientific_name:    species,
      wood_density_g_cm3: wsg_est,
      region:             family ? `${family} (${plantGroup || 'GWDDA v2.2'})` : 'GWDDA v2.2 Dataset',
      remarks:            `Global Wood Density Database v2.2 (Genus: ${genus}, Samples: ${nb})`,
    })

    if (records.length >= BATCH_SIZE) {
      await prisma.woodDensityReference.createMany({ data: records, skipDuplicates: true })
      await prisma.species.createMany({ data: speciesRecords, skipDuplicates: true })
      imported += records.length
      records.length = 0
      speciesRecords.length = 0
      process.stdout.write(`\r  ↳ Imported ${imported} rows into database...`)
    }
  }

  // Final batch
  if (records.length > 0) {
    await prisma.woodDensityReference.createMany({ data: records, skipDuplicates: true })
    await prisma.species.createMany({ data: speciesRecords, skipDuplicates: true })
    imported += records.length
  }

  console.log(`\n✅ GWDD import complete: ${imported} rows imported, ${skipped} skipped`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
