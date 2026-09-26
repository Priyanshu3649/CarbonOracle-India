import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function generateTreeId(plotId: string, lat: number, lon: number) {
  const roundedLat = Math.round(lat * 1000)
  const roundedLon = Math.round(lon * 1000)
  const hash = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `TREE_${plotId.substring(0, 4)}_${roundedLat}_${roundedLon}_${hash}`
}

function calculateCarbon(dbh: number, height: number, wd: number) {
  const agb_kg = Math.exp(-2.409 + 0.9522 * Math.log(Math.pow(dbh, 2) * height * wd))
  const agc_kg = agb_kg * 0.47
  const bgb_kg = agb_kg * 0.26
  const bgc_kg = bgb_kg * 0.47
  const total_carbon_kg = agc_kg + bgc_kg
  const co2e_kg = total_carbon_kg * 3.667
  return {
    agb_kg: parseFloat(agb_kg.toFixed(4)),
    agc_kg: parseFloat(agc_kg.toFixed(4)),
    bgb_kg: parseFloat(bgb_kg.toFixed(4)),
    bgc_kg: parseFloat(bgc_kg.toFixed(4)),
    total_carbon_kg: parseFloat(total_carbon_kg.toFixed(4)),
    co2e_kg: parseFloat(co2e_kg.toFixed(4)),
  }
}

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data
  await prisma.visitRequest.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.marketplaceListing.deleteMany()
  await prisma.retirementCertificate.deleteMany()
  await prisma.creditTransaction.deleteMany()
  await prisma.carbonCredit.deleteMany()
  await prisma.carbonProject.deleteMany()
  await prisma.treeMeasurement.deleteMany()
  await prisma.tree.deleteMany()
  await prisma.uploadBatch.deleteMany()
  await prisma.blockchainRecord.deleteMany()
  await prisma.species.deleteMany()
  await prisma.plot.deleteMany()
  await prisma.user.deleteMany()

  // ─── Admin & Seller Users ─────────────────────────────────────────
  const password_hash = await bcrypt.hash('password123', 10)
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@carbonoracle.com',
      password_hash,
      name: 'CarbonOracle India Ltd.',
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user created')

  const sellerUser = await prisma.user.create({
    data: {
      email: 'seller@greenx.com',
      password_hash,
      name: 'GreenX Energy Corp',
      role: 'PROJECT_OWNER',
    },
  })
  console.log('✅ Seller user created (seller@greenx.com)')


  // ─── 10 Plots ─────────────────────────────────────────────────────
  const plotsData = [
    { plot_name: 'Western Ghats Moist Deciduous', description: 'Dense moist tropical forest – Kerala/Karnataka border zone' },
    { plot_name: 'Sundarbans Mangrove Reserve', description: 'Tidal mangrove ecosystem, West Bengal' },
    { plot_name: 'Central India Dry Deciduous Forest', description: 'Madhya Pradesh sal-dominant mixed forest' },
    { plot_name: 'Himalayan Temperate Zone', description: 'Altitude 1800–2400 m, Uttarakhand conifer belt' },
    { plot_name: 'Deccan Plateau Scrub Forest', description: 'Arid to semi-arid mixed scrub, Telangana plateau' },
    { plot_name: 'Aravalli Range Thorn Forest', description: 'Rajasthan–Haryana dry thorn woodland' },
    { plot_name: 'Northeast Subtropical Broadleaf', description: 'Assam–Meghalaya evergreen subtropical hillside' },
    { plot_name: 'Andaman Island Rainforest', description: 'Tropical evergreen island rainforest – North Andaman' },
    { plot_name: 'Urban Plantation Delhi NCR', description: 'Roadside and park plantation – New Delhi' },
    { plot_name: 'Coastal Casuarina Plantation', description: 'Beach shelterbelt plantation – Tamil Nadu coast' },
  ]

  const plots = []
  for (const p of plotsData) {
    plots.push(await prisma.plot.create({ data: p }))
  }
  console.log(`✅ ${plots.length} plots created`)

  // ─── 75 Species ───────────────────────────────────────────────────
  const speciesData = [
    // Pan-India / Widely cultivated
    { common_name: 'Neem',              scientific_name: 'Azadirachta indica',        wood_density_g_cm3: 0.72, region: 'Pan-India',          remarks: 'Widely planted street tree' },
    { common_name: 'Mango',             scientific_name: 'Mangifera indica',           wood_density_g_cm3: 0.65, region: 'Pan-India',          remarks: 'Fruit and shade tree' },
    { common_name: 'Banyan',            scientific_name: 'Ficus benghalensis',         wood_density_g_cm3: 0.55, region: 'Pan-India',          remarks: 'National tree of India' },
    { common_name: 'Peepal',            scientific_name: 'Ficus religiosa',            wood_density_g_cm3: 0.45, region: 'Pan-India',          remarks: 'Sacred fig tree' },
    { common_name: 'Indian Tulip',      scientific_name: 'Thespesia populnea',         wood_density_g_cm3: 0.67, region: 'Coastal India',      remarks: 'Coastal shade tree' },
    { common_name: 'Tamarind',          scientific_name: 'Tamarindus indica',          wood_density_g_cm3: 0.86, region: 'Pan-India',          remarks: 'Long-lived avenue tree' },
    { common_name: 'Jamun',             scientific_name: 'Syzygium cumini',            wood_density_g_cm3: 0.80, region: 'Pan-India',          remarks: 'Indian blackberry' },
    { common_name: 'Gulmohar',          scientific_name: 'Delonix regia',              wood_density_g_cm3: 0.52, region: 'Urban India',        remarks: 'Ornamental avenue tree' },
    { common_name: 'Rain Tree',         scientific_name: 'Samanea saman',              wood_density_g_cm3: 0.55, region: 'South India',        remarks: 'Large canopy species' },
    { common_name: 'Ashoka',            scientific_name: 'Polyalthia longifolia',      wood_density_g_cm3: 0.60, region: 'Pan-India',          remarks: 'Ornamental columnar tree' },
    // Timber species
    { common_name: 'Teak',              scientific_name: 'Tectona grandis',            wood_density_g_cm3: 0.66, region: 'Central & South India', remarks: 'Premier tropical timber' },
    { common_name: 'Shisham',           scientific_name: 'Dalbergia sissoo',           wood_density_g_cm3: 0.77, region: 'North India',        remarks: 'Indian rosewood' },
    { common_name: 'Sal',               scientific_name: 'Shorea robusta',             wood_density_g_cm3: 0.85, region: 'Central & East India', remarks: 'Dominant forest species' },
    { common_name: 'Deodar Cedar',      scientific_name: 'Cedrus deodara',             wood_density_g_cm3: 0.56, region: 'Himalaya',           remarks: 'Himalayan cedar' },
    { common_name: 'Haldu',             scientific_name: 'Haldina cordifolia',         wood_density_g_cm3: 0.71, region: 'Central India',      remarks: 'Hardwood timber' },
    { common_name: 'Arjun',             scientific_name: 'Terminalia arjuna',          wood_density_g_cm3: 0.74, region: 'Riverine',           remarks: 'Riverine hardwood' },
    { common_name: 'Mahua',             scientific_name: 'Madhuca longifolia',         wood_density_g_cm3: 0.80, region: 'Central India',      remarks: 'Tribal forest tree' },
    { common_name: 'Flame of Forest',   scientific_name: 'Butea monosperma',           wood_density_g_cm3: 0.50, region: 'Pan-India',          remarks: 'Seasonal flowering tree' },
    { common_name: 'Khair',             scientific_name: 'Acacia catechu',             wood_density_g_cm3: 0.88, region: 'North & Central India', remarks: 'Hard timber, catechin source' },
    { common_name: 'Babool',            scientific_name: 'Vachellia nilotica',          wood_density_g_cm3: 0.85, region: 'Pan-India (Dry)',    remarks: 'Hardy arid-zone species' },
    // Western Ghats endemics
    { common_name: 'Malabar Kino',      scientific_name: 'Pterocarpus marsupium',      wood_density_g_cm3: 0.82, region: 'Western Ghats',      remarks: 'Indian kino tree, IUCN VU' },
    { common_name: 'Wild Jack',         scientific_name: 'Artocarpus hirsutus',        wood_density_g_cm3: 0.63, region: 'Western Ghats',      remarks: 'Endemic jackfruit relative' },
    { common_name: 'Cinnamon',          scientific_name: 'Cinnamomum zeylanicum',      wood_density_g_cm3: 0.58, region: 'Western Ghats / South', remarks: 'Spice tree' },
    { common_name: 'Rosewood',          scientific_name: 'Dalbergia latifolia',        wood_density_g_cm3: 0.86, region: 'Western Ghats',      remarks: 'Indian rosewood, CITES II' },
    { common_name: 'Alexanders Laurel', scientific_name: 'Calophyllum inophyllum',    wood_density_g_cm3: 0.72, region: 'Coastal Ghats',      remarks: 'Coastal tropical species' },
    { common_name: 'Mango Ginger',      scientific_name: 'Litsea glutinosa',           wood_density_g_cm3: 0.51, region: 'Western Ghats',      remarks: 'Multipurpose small tree' },
    { common_name: 'Nettlewood',        scientific_name: 'Gironniera subequalis',      wood_density_g_cm3: 0.58, region: 'Western Ghats',      remarks: 'Moist forest species' },
    { common_name: 'Wild Nutmeg',       scientific_name: 'Myristica malabarica',       wood_density_g_cm3: 0.55, region: 'Western Ghats',      remarks: 'Forest nutmeg relative' },
    // Mangrove species
    { common_name: 'Sundari',           scientific_name: 'Heritiera fomes',            wood_density_g_cm3: 0.90, region: 'Sundarbans',         remarks: 'Dominant Sundarbans tree, IUCN EN' },
    { common_name: 'Mangrove Apple',    scientific_name: 'Sonneratia apetala',         wood_density_g_cm3: 0.68, region: 'Coastal India',      remarks: 'Pioneer mangrove' },
    { common_name: 'White Mangrove',    scientific_name: 'Avicennia marina',           wood_density_g_cm3: 0.75, region: 'Pan-coastal India',  remarks: 'Common mangrove' },
    { common_name: 'Red Mangrove',      scientific_name: 'Rhizophora mucronata',       wood_density_g_cm3: 0.88, region: 'Pan-coastal India',  remarks: 'Stilt-root mangrove' },
    { common_name: 'Loop-root Mangrove',scientific_name: 'Rhizophora apiculata',      wood_density_g_cm3: 0.85, region: 'Andaman, Coastal',   remarks: 'High density mangrove' },
    // Himalayan species
    { common_name: 'Blue Pine',         scientific_name: 'Pinus wallichiana',          wood_density_g_cm3: 0.46, region: 'Himalaya',           remarks: 'Himalayan blue pine' },
    { common_name: 'Silver Fir',        scientific_name: 'Abies pindrow',              wood_density_g_cm3: 0.44, region: 'Himalaya',           remarks: 'Himalayan silver fir' },
    { common_name: 'Chir Pine',         scientific_name: 'Pinus roxburghii',           wood_density_g_cm3: 0.55, region: 'Himalaya (lower)',   remarks: 'Subtropical pine' },
    { common_name: 'Horse Chestnut',    scientific_name: 'Aesculus indica',            wood_density_g_cm3: 0.47, region: 'Himalaya',           remarks: 'Indian horse chestnut' },
    { common_name: 'Rhododendron',      scientific_name: 'Rhododendron arboreum',      wood_density_g_cm3: 0.78, region: 'Himalaya',           remarks: 'State tree of Uttarakhand' },
    { common_name: 'Himalayan Alder',   scientific_name: 'Alnus nepalensis',           wood_density_g_cm3: 0.49, region: 'Himalaya',           remarks: 'Fast-growing pioneer species' },
    { common_name: 'Walnut',            scientific_name: 'Juglans regia',              wood_density_g_cm3: 0.64, region: 'Himalaya (J&K)',     remarks: 'Nut and timber tree' },
    // Northeast India
    { common_name: 'Hollong',           scientific_name: 'Dipterocarpus macrocarpus',  wood_density_g_cm3: 0.68, region: 'Northeast India',    remarks: 'State tree of Assam, IUCN EN' },
    { common_name: 'Amari',             scientific_name: 'Amoora rohituka',            wood_density_g_cm3: 0.65, region: 'Northeast India',    remarks: 'Deciduous forest timber' },
    { common_name: 'Mekai',             scientific_name: 'Schima wallichii',           wood_density_g_cm3: 0.72, region: 'Northeast India',    remarks: 'Multipurpose forest tree' },
    { common_name: 'Indian Olive',      scientific_name: 'Elaeocarpus floribundus',    wood_density_g_cm3: 0.62, region: 'Northeast India',    remarks: 'Rudraksha relative' },
    { common_name: 'Gamari',            scientific_name: 'Gmelina arborea',            wood_density_g_cm3: 0.44, region: 'Northeast & Pan-India', remarks: 'Fast-growing plantation species' },
    // Plantation / Agroforestry
    { common_name: 'Eucalyptus',        scientific_name: 'Eucalyptus globulus',        wood_density_g_cm3: 0.70, region: 'Plantations',        remarks: 'Exotic fast-growing species' },
    { common_name: 'Casuarina',         scientific_name: 'Casuarina equisetifolia',    wood_density_g_cm3: 0.78, region: 'Coastal Plantations',remarks: 'Coastal shelterbelt species' },
    { common_name: 'Subabul',           scientific_name: 'Leucaena leucocephala',      wood_density_g_cm3: 0.55, region: 'Pan-India Agroforestry', remarks: 'Nitrogen-fixing agroforestry' },
    { common_name: 'Bamboo (Giant)',    scientific_name: 'Dendrocalamus giganteus',    wood_density_g_cm3: 0.60, region: 'Northeast & South India', remarks: 'Fast-growing carbon sink' },
    { common_name: 'Indian Gooseberry',scientific_name: 'Phyllanthus emblica',         wood_density_g_cm3: 0.74, region: 'Pan-India',          remarks: 'Amla – medicinal + agroforestry' },
    { common_name: 'Siris',            scientific_name: 'Albizia lebbeck',             wood_density_g_cm3: 0.57, region: 'Pan-India',          remarks: 'Nitrogen-fixing shade tree' },
    { common_name: 'Golden Shower',    scientific_name: 'Cassia fistula',              wood_density_g_cm3: 0.77, region: 'Pan-India',          remarks: 'State flower tree of Kerala' },
    // Andaman Islands
    { common_name: 'Padauk',           scientific_name: 'Pterocarpus dalbergioides',   wood_density_g_cm3: 0.73, region: 'Andaman Islands',    remarks: 'Andaman padauk, red timber' },
    { common_name: 'Andaman Marble',   scientific_name: 'Diospyros marmorata',        wood_density_g_cm3: 0.81, region: 'Andaman Islands',    remarks: 'Rare endemic ebony relative' },
    { common_name: 'Pyinma',           scientific_name: 'Lagerstroemia speciosa',      wood_density_g_cm3: 0.75, region: 'Andaman & Northeast', remarks: 'Pride of India timber' },
    // Dry Zone
    { common_name: 'Khejri',           scientific_name: 'Prosopis cineraria',          wood_density_g_cm3: 0.79, region: 'Rajasthan / Arid',   remarks: 'State tree of Rajasthan' },
    { common_name: 'Desert Teak',      scientific_name: 'Tecomella undulata',          wood_density_g_cm3: 0.70, region: 'Rajasthan / Gujarat',remarks: 'Rohida, arid zone timber' },
    { common_name: 'Karaya Gum',       scientific_name: 'Sterculia urens',             wood_density_g_cm3: 0.48, region: 'Deccan / Dry Zones', remarks: 'Gum-producing tree' },
    { common_name: 'Dhak',             scientific_name: 'Butea monosperma var. lutea', wood_density_g_cm3: 0.49, region: 'Deccan Plateau',     remarks: 'Dry deciduous forest species' },
    // South India
    { common_name: 'Teak (Nilgiri)',   scientific_name: 'Tectona grandis (Nilgiri)',   wood_density_g_cm3: 0.67, region: 'Tamil Nadu / Kerala', remarks: 'High-altitude teak ecotype' },
    { common_name: 'Sandalwood',       scientific_name: 'Santalum album',              wood_density_g_cm3: 0.88, region: 'Karnataka / Tamil Nadu', remarks: 'Precious aromatic heartwood' },
    { common_name: 'Jackfruit',        scientific_name: 'Artocarpus heterophyllus',    wood_density_g_cm3: 0.62, region: 'South India',        remarks: 'State fruit of Kerala / Tamil Nadu' },
    { common_name: 'Coconut Palm',     scientific_name: 'Cocos nucifera',              wood_density_g_cm3: 0.58, region: 'Coastal India',      remarks: 'Monocot but included for biomass estimation' },
    { common_name: 'Morinda',          scientific_name: 'Morinda pubescens',           wood_density_g_cm3: 0.73, region: 'South India',        remarks: 'Aal, dye and timber tree' },
    // Medicinal / Multipurpose
    { common_name: 'Indian Coral Tree',scientific_name: 'Erythrina variegata',        wood_density_g_cm3: 0.24, region: 'Pan-India',          remarks: 'Shade tree, nitrogen fixer' },
    { common_name: 'Moringa',          scientific_name: 'Moringa oleifera',            wood_density_g_cm3: 0.30, region: 'Pan-India Agroforestry', remarks: 'Drumstick, fast biomass accumulator' },
    { common_name: 'Karanj',           scientific_name: 'Pongamia pinnata',            wood_density_g_cm3: 0.67, region: 'Pan-India Coastal', remarks: 'Biofuel and agroforestry species' },
    { common_name: 'Tulsi Tree',       scientific_name: 'Ocimum gratissimum',          wood_density_g_cm3: 0.45, region: 'Pan-India',          remarks: 'Tree basil, aromatic' },
    { common_name: 'Kadam',            scientific_name: 'Neolamarckia cadamba',        wood_density_g_cm3: 0.40, region: 'Pan-India',          remarks: 'Fast-growing riparian species' },
    { common_name: 'Papaya',           scientific_name: 'Carica papaya',               wood_density_g_cm3: 0.20, region: 'Pan-India',          remarks: 'Soft-stemmed included for agroforestry' },
    // Rare / Critically important carbon sinks
    { common_name: 'Indian Mahogany',  scientific_name: 'Toona ciliata',               wood_density_g_cm3: 0.45, region: 'Northeast & Himalaya', remarks: 'Red cedar, agroforestry' },
    { common_name: 'Agarwood',         scientific_name: 'Aquilaria malaccensis',       wood_density_g_cm3: 0.40, region: 'Northeast India',    remarks: 'CITES I, highly valuable resinous wood' },
    { common_name: 'Ebony',            scientific_name: 'Diospyros melanoxylon',       wood_density_g_cm3: 1.05, region: 'Central & South India', remarks: 'Highest density species; CITES II' },
    { common_name: 'Iron Wood',        scientific_name: 'Mesua ferrea',                wood_density_g_cm3: 1.05, region: 'Northeast & Andaman', remarks: 'Very dense; state tree of Tripura' },
  ]

  const speciesRecords: any[] = []
  for (const s of speciesData) {
    speciesRecords.push(await prisma.species.create({ data: s }))
  }
  console.log(`✅ ${speciesRecords.length} species created`)

  // Helper: pick random species with biome preference
  function pickSpecies(preferredIndices: number[], fallbackIndices: number[]) {
    const pool = [...preferredIndices, ...fallbackIndices]
    return speciesRecords[pool[Math.floor(Math.random() * pool.length)]]
  }

  // ─── Tree data per plot ─────────────────────────────────────────
  // Format: [lat, lon, dbh_cm, height_m]
  // Coordinates are realistic for each region

  const plotTreeData: Array<{
    plotIdx: number
    preferredSpeciesIndices: number[]
    trees: Array<[number, number, number, number]>
  }> = [
    {
      // Plot 0: Western Ghats (Kerala border ~11.5°N, 76.1°E)
      plotIdx: 0,
      preferredSpeciesIndices: [20, 21, 22, 23, 24, 25, 26, 27],
      trees: [
        [11.5010, 76.1025, 42.5, 22.1], [11.5015, 76.1032, 38.0, 18.5], [11.5020, 76.1018, 55.0, 28.0],
        [11.5025, 76.1045, 29.0, 14.0], [11.5030, 76.1050, 61.0, 30.5], [11.5035, 76.1060, 47.5, 24.0],
        [11.5040, 76.1005, 35.0, 17.5], [11.5045, 76.1015, 72.0, 35.0], [11.5050, 76.1070, 41.0, 20.5],
        [11.5055, 76.1080, 33.0, 16.0], [11.5060, 76.1088, 58.0, 29.0], [11.5065, 76.1095, 26.0, 13.0],
        [11.5070, 76.1100, 44.0, 22.0], [11.5075, 76.1112, 50.0, 25.0], [11.5080, 76.1120, 37.0, 18.0],
      ],
    },
    {
      // Plot 1: Sundarbans (~21.9°N, 88.8°E)
      plotIdx: 1,
      preferredSpeciesIndices: [28, 29, 30, 31, 32],
      trees: [
        [21.9010, 88.8020, 18.0, 8.5],  [21.9015, 88.8035, 22.5, 10.0], [21.9020, 88.8050, 15.0, 7.0],
        [21.9025, 88.8065, 28.0, 12.0], [21.9030, 88.8080, 20.5, 9.5],  [21.9035, 88.8095, 24.0, 11.0],
        [21.9040, 88.8110, 16.5, 7.5],  [21.9045, 88.8125, 30.0, 13.5], [21.9050, 88.8140, 19.0, 9.0],
        [21.9055, 88.8155, 25.5, 11.5], [21.9060, 88.8170, 21.0, 10.0], [21.9065, 88.8185, 17.0, 8.0],
        [21.9070, 88.8200, 32.0, 14.0], [21.9075, 88.8215, 14.5, 6.5],  [21.9080, 88.8230, 26.0, 12.0],
      ],
    },
    {
      // Plot 2: Central India (MP ~23.0°N, 79.5°E)
      plotIdx: 2,
      preferredSpeciesIndices: [12, 15, 16, 18, 19],
      trees: [
        [23.0010, 79.5020, 60.0, 28.0], [23.0020, 79.5035, 45.0, 22.0], [23.0030, 79.5050, 78.0, 36.0],
        [23.0040, 79.5065, 52.0, 25.0], [23.0050, 79.5080, 35.0, 17.0], [23.0060, 79.5095, 88.0, 40.0],
        [23.0070, 79.5110, 41.0, 20.0], [23.0080, 79.5125, 65.0, 30.0], [23.0090, 79.5140, 30.0, 14.5],
        [23.0100, 79.5155, 55.0, 26.0], [23.0110, 79.5170, 70.0, 33.0], [23.0120, 79.5185, 48.0, 23.0],
        [23.0130, 79.5200, 92.0, 42.0], [23.0140, 79.5215, 38.0, 18.5], [23.0150, 79.5230, 62.0, 29.0],
      ],
    },
    {
      // Plot 3: Himalayan Temperate (~30.2°N, 78.5°E) Uttarakhand
      plotIdx: 3,
      preferredSpeciesIndices: [33, 34, 35, 36, 37, 38, 39],
      trees: [
        [30.2010, 78.5020, 48.0, 28.0], [30.2020, 78.5035, 36.0, 22.0], [30.2030, 78.5050, 55.0, 32.0],
        [30.2040, 78.5065, 28.0, 16.0], [30.2050, 78.5080, 62.0, 36.0], [30.2060, 78.5095, 40.0, 24.0],
        [30.2070, 78.5110, 72.0, 40.0], [30.2080, 78.5125, 33.0, 19.0], [30.2090, 78.5140, 58.0, 34.0],
        [30.2100, 78.5155, 45.0, 26.0], [30.2110, 78.5170, 80.0, 44.0], [30.2120, 78.5185, 25.0, 14.0],
        [30.2130, 78.5200, 52.0, 30.0], [30.2140, 78.5215, 38.0, 22.0], [30.2150, 78.5230, 68.0, 38.0],
      ],
    },
    {
      // Plot 4: Deccan Plateau (~17.5°N, 78.3°E) Telangana
      plotIdx: 4,
      preferredSpeciesIndices: [55, 56, 57, 18, 19],
      trees: [
        [17.5010, 78.3020, 30.0, 12.0], [17.5020, 78.3035, 22.0, 9.0],  [17.5030, 78.3050, 40.0, 16.0],
        [17.5040, 78.3065, 18.0, 7.5],  [17.5050, 78.3080, 35.0, 14.0], [17.5060, 78.3095, 25.0, 10.0],
        [17.5070, 78.3110, 45.0, 18.0], [17.5080, 78.3125, 28.0, 11.0], [17.5090, 78.3140, 20.0, 8.0],
        [17.5100, 78.3155, 38.0, 15.0], [17.5110, 78.3170, 32.0, 13.0], [17.5120, 78.3185, 48.0, 19.0],
        [17.5130, 78.3200, 15.0, 6.0],  [17.5140, 78.3215, 42.0, 17.0], [17.5150, 78.3230, 27.0, 11.5],
      ],
    },
    {
      // Plot 5: Aravalli (~26.8°N, 73.8°E) Rajasthan
      plotIdx: 5,
      preferredSpeciesIndices: [54, 55, 1, 18, 49],
      trees: [
        [26.8010, 73.8020, 25.0, 9.0],  [26.8020, 73.8035, 18.0, 6.5],  [26.8030, 73.8050, 32.0, 11.5],
        [26.8040, 73.8065, 22.0, 8.0],  [26.8050, 73.8080, 28.0, 10.0], [26.8060, 73.8095, 15.0, 5.5],
        [26.8070, 73.8110, 38.0, 13.5], [26.8080, 73.8125, 20.0, 7.5],  [26.8090, 73.8140, 30.0, 11.0],
        [26.8100, 73.8155, 24.0, 9.0],  [26.8110, 73.8170, 42.0, 15.0], [26.8120, 73.8185, 17.0, 6.0],
        [26.8130, 73.8200, 35.0, 12.5], [26.8140, 73.8215, 26.0, 9.5],  [26.8150, 73.8230, 45.0, 16.0],
      ],
    },
    {
      // Plot 6: Northeast India (~25.5°N, 91.9°E) Meghalaya
      plotIdx: 6,
      preferredSpeciesIndices: [40, 41, 42, 43, 44, 45],
      trees: [
        [25.5010, 91.9020, 52.0, 30.0], [25.5020, 91.9035, 38.0, 22.0], [25.5030, 91.9050, 65.0, 36.0],
        [25.5040, 91.9065, 45.0, 26.0], [25.5050, 91.9080, 72.0, 40.0], [25.5060, 91.9095, 33.0, 19.0],
        [25.5070, 91.9110, 58.0, 33.0], [25.5080, 91.9125, 42.0, 24.0], [25.5090, 91.9140, 80.0, 44.0],
        [25.5100, 91.9155, 28.0, 16.0], [25.5110, 91.9170, 55.0, 31.0], [25.5120, 91.9185, 48.0, 27.0],
        [25.5130, 91.9200, 90.0, 48.0], [25.5140, 91.9215, 36.0, 21.0], [25.5150, 91.9230, 62.0, 35.0],
      ],
    },
    {
      // Plot 7: Andaman Islands (~13.0°N, 93.0°E)
      plotIdx: 7,
      preferredSpeciesIndices: [51, 52, 53, 24, 21],
      trees: [
        [13.0010, 93.0020, 68.0, 38.0], [13.0020, 93.0035, 52.0, 30.0], [13.0030, 93.0050, 80.0, 44.0],
        [13.0040, 93.0065, 45.0, 26.0], [13.0050, 93.0080, 92.0, 50.0], [13.0060, 93.0095, 38.0, 22.0],
        [13.0070, 93.0110, 75.0, 42.0], [13.0080, 93.0125, 55.0, 31.0], [13.0090, 93.0140, 100.0, 54.0],
        [13.0100, 93.0155, 42.0, 24.0], [13.0110, 93.0170, 88.0, 48.0], [13.0120, 93.0185, 60.0, 34.0],
        [13.0130, 93.0200, 110.0, 58.0],[13.0140, 93.0215, 48.0, 28.0], [13.0150, 93.0230, 78.0, 43.0],
      ],
    },
    {
      // Plot 8: Delhi NCR Urban (~28.6°N, 77.2°E)
      plotIdx: 8,
      preferredSpeciesIndices: [0, 1, 3, 7, 8, 9, 49, 50],
      trees: [
        [28.6010, 77.2020, 28.0, 10.0], [28.6020, 77.2035, 22.0, 8.0],  [28.6030, 77.2050, 35.0, 12.0],
        [28.6040, 77.2065, 18.0, 7.0],  [28.6050, 77.2080, 40.0, 14.0], [28.6060, 77.2095, 25.0, 9.5],
        [28.6070, 77.2110, 30.0, 11.0], [28.6080, 77.2125, 20.0, 7.5],  [28.6090, 77.2140, 45.0, 16.0],
        [28.6100, 77.2155, 32.0, 12.0], [28.6110, 77.2170, 38.0, 13.5], [28.6120, 77.2185, 27.0, 10.0],
        [28.6130, 77.2200, 50.0, 17.0], [28.6140, 77.2215, 24.0, 9.0],  [28.6150, 77.2230, 42.0, 15.0],
      ],
    },
    {
      // Plot 9: Coastal Tamil Nadu (~10.8°N, 79.8°E)
      plotIdx: 9,
      preferredSpeciesIndices: [46, 4, 30, 60, 62, 63],
      trees: [
        [10.8010, 79.8020, 22.0, 12.0], [10.8020, 79.8035, 18.0, 10.0], [10.8030, 79.8050, 28.0, 15.0],
        [10.8040, 79.8065, 15.0, 8.0],  [10.8050, 79.8080, 32.0, 17.0], [10.8060, 79.8095, 20.0, 11.0],
        [10.8070, 79.8110, 25.0, 13.0], [10.8080, 79.8125, 30.0, 16.0], [10.8090, 79.8140, 17.0, 9.0],
        [10.8100, 79.8155, 35.0, 18.0], [10.8110, 79.8170, 22.0, 12.0], [10.8120, 79.8185, 28.0, 15.0],
        [10.8130, 79.8200, 40.0, 20.0], [10.8140, 79.8215, 19.0, 10.5], [10.8150, 79.8230, 26.0, 14.0],
      ],
    },
  ]

  let totalTrees = 0
  for (const plotGroup of plotTreeData) {
    const plot = plots[plotGroup.plotIdx]
    const fallback = [0, 1, 2, 10, 11]

    for (const [lat, lon, dbh, height] of plotGroup.trees) {
      const species = pickSpecies(plotGroup.preferredSpeciesIndices, fallback)
      const calcs = calculateCarbon(dbh, height, species.wood_density_g_cm3)

      const tree = await prisma.tree.create({
        data: {
          internal_tree_id: generateTreeId(plot.id, lat, lon),
          plot_id: plot.id,
          species_id: species.id,
          latitude: lat,
          longitude: lon,
          distance_from_tree_m: parseFloat((Math.random() * 50 + 5).toFixed(1)),
        },
      })

      await prisma.treeMeasurement.create({
        data: {
          tree_id: tree.id,
          diameter_cm: dbh,
          tree_height_m: height,
          wood_density_g_cm3: species.wood_density_g_cm3,
          ...calcs,
          data_source: 'rover',
        },
      })

      totalTrees++
    }
  }

  console.log(`✅ ${totalTrees} trees with measurements created across ${plots.length} plots`)

  // ─── Company Projects & Credits (GreenX Energy Corp) ────────────────
  console.log('🏭 Seeding GreenX Energy Corp projects, credits, listings & visits...')

  // 1. Projects for Plot 0 (Western Ghats) and Plot 2 (Central India)
  const project1 = await prisma.carbonProject.create({
    data: {
      owner_id: sellerUser.id,
      plot_id: plots[0].id,
      title: 'Western Ghats Afforestation & Conservation Project',
      description: 'High-density tropical forest carbon sink under strict MRV protocols.',
      vintage_year: 2024,
      total_credits: 45.0,
      price_per_credit: 25.50,
      status: 'VERIFIED',
    },
  })

  const project2 = await prisma.carbonProject.create({
    data: {
      owner_id: sellerUser.id,
      plot_id: plots[2].id,
      title: 'Central India Sal Forest Regeneration',
      description: 'Sal-dominant mixed forest carbon restoration project.',
      vintage_year: 2025,
      total_credits: 60.0,
      price_per_credit: 30.00,
      status: 'VERIFIED',
    },
  })

  // 2. Mint Credits for Project 1 (45 credits)
  const creditsP1 = []
  for (let i = 1; i <= 45; i++) {
    let status = 'AVAILABLE'
    if (i <= 10) status = 'SOLD'
    else if (i <= 20) status = 'RETIRED'
    else if (i <= 30) status = 'AVAILABLE' // Will be listed

    const credit = await prisma.carbonCredit.create({
      data: {
        project_id: project1.id,
        serial_number: `CO-2024-WG-${String(i).padStart(4, '0')}`,
        vintage_year: 2024,
        quantity_tonnes: 1.0,
        status,
        current_owner_id: sellerUser.id,
        retired_by_id: status === 'RETIRED' ? sellerUser.id : null,
        retired_at: status === 'RETIRED' ? new Date() : null,
        retirement_reason: status === 'RETIRED' ? 'Corporate ESG Offsetting Q3' : null,
      },
    })
    creditsP1.push(credit)

    // Mint Transaction
    await prisma.creditTransaction.create({
      data: {
        credit_id: credit.id,
        from_user_id: null,
        to_user_id: sellerUser.id,
        transaction_type: 'MINT',
        quantity_tonnes: 1.0,
        price_per_tonne: 25.50,
        total_price_usd: 25.50,
        status: 'CONFIRMED',
      },
    })
  }

  // 3. Create Marketplace Listings for Credits 21-30
  for (let i = 20; i < 30; i++) {
    await prisma.marketplaceListing.create({
      data: {
        seller_id: sellerUser.id,
        credit_id: creditsP1[i].id,
        quantity_listed: 1.0,
        quantity_available: 1.0,
        price_per_credit: 25.50,
        status: 'ACTIVE',
        currency: 'USD',
      },
    })
  }

  // Add one cancelled listing for demonstration
  await prisma.marketplaceListing.create({
    data: {
      seller_id: sellerUser.id,
      credit_id: creditsP1[30].id,
      quantity_listed: 1.0,
      quantity_available: 1.0,
      price_per_credit: 28.00,
      status: 'CANCELLED',
      currency: 'USD',
    },
  })

  // 4. Seeding Visits
  await prisma.visit.create({
    data: {
      company_id: sellerUser.id,
      plot_id: plots[0].id,
      visit_type: 'SCHEDULED_MRV',
      scheduled_date: new Date(Date.now() + 14 * 86400 * 1000), // In 14 days
      status: 'SCHEDULED',
      assigned_verifier: 'Dr. Ramesh Kumar (Senior Forestry Auditor)',
      notes: 'Bi-annual canopy and DBH telemetry audit visit.',
    },
  })

  await prisma.visit.create({
    data: {
      company_id: sellerUser.id,
      plot_id: plots[2].id,
      visit_type: 'AUDIT',
      scheduled_date: new Date(Date.now() - 30 * 86400 * 1000), // 30 days ago
      completed_date: new Date(Date.now() - 29 * 86400 * 1000),
      status: 'COMPLETED',
      assigned_verifier: 'EcoVerify India Team B',
      notes: 'Completed initial plot baseline measurement verification.',
      mrv_summary: '100% tree count verified against rover telemetry. Carbon density verified at 1.45 tCO2e/tree.',
    },
  })

  // 5. Seeding Visit Requests
  await prisma.visitRequest.create({
    data: {
      company_id: sellerUser.id,
      plot_id: plots[0].id,
      requested_date: new Date(Date.now() + 7 * 86400 * 1000),
      reason: 'GROWTH_VERIFICATION',
      description: 'Requesting early verification for newly planted fast-growing Eucalyptus block.',
      priority: 'HIGH',
      status: 'PENDING',
    },
  })

  console.log('✅ Company projects, credits, listings & visits seeded for GreenX Energy Corp')

  // ─── Admin / CarbonOracle India Company Data ──────────────────────
  console.log('🏛️ Seeding CarbonOracle India Ltd. (admin) projects, credits, listings & visits...')

  // Admin Projects
  const adminProject1 = await prisma.carbonProject.create({
    data: {
      owner_id: adminUser.id,
      plot_id: plots[1].id, // Sundarbans Mangrove Reserve
      title: 'Sundarbans Mangrove Carbon Sequestration',
      description: 'Large-scale mangrove restoration carbon project under India Carbon Credit Market norms.',
      vintage_year: 2024,
      total_credits: 80.0,
      price_per_credit: 35.00,
      status: 'VERIFIED',
    },
  })

  const adminProject2 = await prisma.carbonProject.create({
    data: {
      owner_id: adminUser.id,
      plot_id: plots[3].id, // Himalayan Temperate Zone
      title: 'Himalayan Temperate Forest Conservation',
      description: 'High-altitude conifer belt conservation and afforestation in Uttarakhand.',
      vintage_year: 2025,
      total_credits: 55.0,
      price_per_credit: 42.00,
      status: 'VERIFIED',
    },
  })

  const adminProject3 = await prisma.carbonProject.create({
    data: {
      owner_id: adminUser.id,
      plot_id: plots[8].id, // Urban Plantation Delhi NCR
      title: 'Delhi NCR Urban Greening Initiative',
      description: 'Urban plantation and carbon offsetting programme for Delhi NCR corridor.',
      vintage_year: 2025,
      total_credits: 30.0,
      price_per_credit: 28.00,
      status: 'PENDING',
    },
  })

  // Admin Credits – Project 1 (80 credits: mix of SOLD/RETIRED/AVAILABLE/LISTED)
  const adminCreditsP1: any[] = []
  for (let i = 1; i <= 80; i++) {
    let status = 'AVAILABLE'
    if (i <= 15) status = 'SOLD'
    else if (i <= 30) status = 'RETIRED'
    else if (i <= 55) status = 'AVAILABLE' // 25 available – some will be listed

    const credit = await prisma.carbonCredit.create({
      data: {
        project_id: adminProject1.id,
        serial_number: `CO-2024-SU-${String(i).padStart(4, '0')}`,
        vintage_year: 2024,
        quantity_tonnes: 1.0,
        status,
        current_owner_id: adminUser.id,
        retired_by_id: status === 'RETIRED' ? adminUser.id : null,
        retired_at: status === 'RETIRED' ? new Date('2024-09-15') : null,
        retirement_reason: status === 'RETIRED' ? 'Corporate ESG offset – Tata Group Q3' : null,
      },
    })
    adminCreditsP1.push(credit)

    await prisma.creditTransaction.create({
      data: {
        credit_id: credit.id,
        from_user_id: null,
        to_user_id: adminUser.id,
        transaction_type: 'MINT',
        quantity_tonnes: 1.0,
        price_per_tonne: 35.00,
        total_price_usd: 35.00,
        status: 'CONFIRMED',
      },
    })
  }

  // Admin Credits – Project 2 (55 credits)
  const adminCreditsP2: any[] = []
  for (let i = 1; i <= 55; i++) {
    let status = 'AVAILABLE'
    if (i <= 8) status = 'SOLD'
    else if (i <= 16) status = 'RETIRED'

    const credit = await prisma.carbonCredit.create({
      data: {
        project_id: adminProject2.id,
        serial_number: `CO-2025-HM-${String(i).padStart(4, '0')}`,
        vintage_year: 2025,
        quantity_tonnes: 1.0,
        status,
        current_owner_id: adminUser.id,
        retired_by_id: status === 'RETIRED' ? adminUser.id : null,
        retired_at: status === 'RETIRED' ? new Date('2025-03-10') : null,
        retirement_reason: status === 'RETIRED' ? 'Infosys Net-Zero 2030 commitment' : null,
      },
    })
    adminCreditsP2.push(credit)

    await prisma.creditTransaction.create({
      data: {
        credit_id: credit.id,
        from_user_id: null,
        to_user_id: adminUser.id,
        transaction_type: 'MINT',
        quantity_tonnes: 1.0,
        price_per_tonne: 42.00,
        total_price_usd: 42.00,
        status: 'CONFIRMED',
      },
    })
  }

  // Admin Credits – Project 3 (30 credits, all AVAILABLE)
  const adminCreditsP3: any[] = []
  for (let i = 1; i <= 30; i++) {
    const credit = await prisma.carbonCredit.create({
      data: {
        project_id: adminProject3.id,
        serial_number: `CO-2025-DL-${String(i).padStart(4, '0')}`,
        vintage_year: 2025,
        quantity_tonnes: 1.0,
        status: 'AVAILABLE',
        current_owner_id: adminUser.id,
      },
    })
    adminCreditsP3.push(credit)

    await prisma.creditTransaction.create({
      data: {
        credit_id: credit.id,
        from_user_id: null,
        to_user_id: adminUser.id,
        transaction_type: 'MINT',
        quantity_tonnes: 1.0,
        price_per_tonne: 28.00,
        total_price_usd: 28.00,
        status: 'CONFIRMED',
      },
    })
  }

  // Admin Marketplace Listings (8 active listings from Project 1)
  for (let i = 30; i < 38; i++) {
    await prisma.marketplaceListing.create({
      data: {
        seller_id: adminUser.id,
        credit_id: adminCreditsP1[i].id,
        quantity_listed: 1.0,
        quantity_available: 1.0,
        price_per_credit: 35.00,
        status: 'ACTIVE',
        currency: 'USD',
      },
    })
  }

  // One sold listing (demonstration)
  await prisma.marketplaceListing.create({
    data: {
      seller_id: adminUser.id,
      credit_id: adminCreditsP1[0].id,
      quantity_listed: 1.0,
      quantity_available: 0.0,
      price_per_credit: 35.00,
      status: 'SOLD',
      currency: 'USD',
    },
  })

  // Admin Visits
  await prisma.visit.create({
    data: {
      company_id: adminUser.id,
      plot_id: plots[1].id,
      visit_type: 'SCHEDULED_MRV',
      scheduled_date: new Date(Date.now() + 7 * 86400 * 1000),
      status: 'SCHEDULED',
      assigned_verifier: 'Dr. Meera Joshi (UNFCCC Accredited Auditor)',
      notes: 'Quarterly canopy height and biomass verification for Sundarbans plot.',
    },
  })

  await prisma.visit.create({
    data: {
      company_id: adminUser.id,
      plot_id: plots[3].id,
      visit_type: 'AUDIT',
      scheduled_date: new Date(Date.now() - 60 * 86400 * 1000),
      completed_date: new Date(Date.now() - 58 * 86400 * 1000),
      status: 'COMPLETED',
      assigned_verifier: 'GreenCert Asia Pacific – Team A',
      notes: 'Baseline carbon density audit complete.',
      mrv_summary: 'DBH telemetry matched rover data at 99.2% confidence. Carbon stock: 1.82 tCO2e/tree avg.',
    },
  })

  await prisma.visit.create({
    data: {
      company_id: adminUser.id,
      plot_id: plots[8].id,
      visit_type: 'INSPECTION',
      scheduled_date: new Date(Date.now() + 21 * 86400 * 1000),
      status: 'SCHEDULED',
      assigned_verifier: 'Delhi Forestry Dept. – Verification Cell',
      notes: 'First plot boundary and species confirmation visit before credit issuance.',
    },
  })

  // Admin Visit Requests
  await prisma.visitRequest.create({
    data: {
      company_id: adminUser.id,
      plot_id: plots[1].id,
      requested_date: new Date(Date.now() + 3 * 86400 * 1000),
      reason: 'GROWTH_VERIFICATION',
      description: 'Urgent re-verification needed after cyclone impact on Sundarbans north section.',
      priority: 'HIGH',
      status: 'PENDING',
    },
  })

  await prisma.visitRequest.create({
    data: {
      company_id: adminUser.id,
      plot_id: plots[3].id,
      requested_date: new Date(Date.now() + 45 * 86400 * 1000),
      reason: 'ANNUAL_AUDIT',
      description: 'Scheduled annual carbon stock audit for vintage 2025 credit issuance cycle.',
      priority: 'MEDIUM',
      status: 'APPROVED',
    },
  })

  console.log('✅ Admin company projects (3), credits (165), listings, visits & requests seeded')
  console.log('🌱 Seed complete!')
}


main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
