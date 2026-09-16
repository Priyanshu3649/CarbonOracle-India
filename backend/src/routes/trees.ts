import { Router } from 'express';
import prisma from '../prisma';
import { calculateCarbon } from '../services/calculationService';
import crypto from 'crypto';
import { normalizeCsvRow, validateTreeData } from '../services/parserService';
import { activeRoverPlotId, activeRoverSpeciesId, setActiveRoverConfig } from '../websocket';
import { orchestrateBlockchainAnchor } from '../services/blockchain/blockchain.service';

const router = Router();

function generateTreeId(plotId: string, lat: number, lon: number) {
  const roundedLat = Math.round(lat * 1000);
  const roundedLon = Math.round(lon * 1000);
  const hash = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TREE_${plotId.substring(0,4)}_${roundedLat}_${roundedLon}_${hash}`;
}

router.get('/rover-config', (req, res) => {
  res.json({ plot_id: activeRoverPlotId, species_id: activeRoverSpeciesId });
});

router.post('/rover-config', (req, res) => {
  if (req.body.plot_id && req.body.species_id) {
    setActiveRoverConfig(req.body.plot_id, req.body.species_id);
    res.json({ success: true, plot_id: activeRoverPlotId, species_id: activeRoverSpeciesId });
  } else {
    res.status(400).json({ error: 'Missing plot_id or species_id' });
  }
});

router.get('/', async (req, res) => {
  try {
    const trees = await prisma.tree.findMany({
      include: {
        plot: true,
        species: true,
        measurements: {
          orderBy: { measured_at: 'desc' }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    // Flatten for frontend table compatibility
    const formatted = trees.map(t => {
      const latest = t.measurements[0] || {};
      return { ...t, ...latest };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tree records' });
  }
});

router.post('/manual', async (req, res) => {
  try {
    const data = req.body;
    const species = await prisma.species.findUnique({ where: { id: data.species_id } });
    if (!species) return res.status(400).json({ error: 'Invalid species' });

    const calcs = calculateCarbon(data.diameter_cm, data.tree_height_m, species.wood_density_g_cm3);

    let tree = await prisma.tree.findUnique({
      where: {
        latitude_longitude: { latitude: data.latitude, longitude: data.longitude }
      }
    });

    if (!tree) {
      tree = await prisma.tree.create({
        data: {
          internal_tree_id: generateTreeId(data.plot_id, data.latitude, data.longitude),
          plot_id: data.plot_id,
          species_id: data.species_id,
          latitude: data.latitude,
          longitude: data.longitude,
          distance_from_tree_m: data.distance_from_tree_m || null
        }
      });
    }

    const measurement = await prisma.treeMeasurement.create({
      data: {
        tree_id: tree.id,
        diameter_cm: data.diameter_cm,
        tree_height_m: data.tree_height_m,
        wood_density_g_cm3: species.wood_density_g_cm3,
        ...calcs,
        data_source: 'rover'
      }
    });

    const plot = await prisma.plot.findUnique({ where: { id: tree.plot_id } });
    
    // Flatten result
    res.json({ ...tree, ...measurement, plot, species });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create tree record' });
  }
});

router.post('/csv', async (req, res) => {
  try {
    const { plot_id, rows, file_name } = req.body;
    
    const batch = await prisma.uploadBatch.create({
      data: {
        plot_id,
        file_name: file_name || 'upload.json',
        row_count: rows.length
      }
    });

    const speciesList = await prisma.species.findMany();
    const speciesMap = new Map(speciesList.map(s => [s.id, s.wood_density_g_cm3]));

    let successCount = 0;
    const errors: any[] = [];

    for (const [index, rawRow] of rows.entries()) {
      const row = normalizeCsvRow(rawRow);
      const species_id = rawRow.species_id || null; 
      
      const validationErrors = validateTreeData(row);
      if (!species_id) validationErrors.push("Species ID required");
      
      if (validationErrors.length > 0) {
        errors.push({ row: index + 1, data: rawRow, errors: validationErrors });
        continue;
      }

      const wd = speciesMap.get(species_id);
      if (!wd) {
        errors.push({ row: index + 1, data: rawRow, errors: ['Species completely invalid mapping'] });
        continue;
      }

      const calcs = calculateCarbon(row.diameter_cm, row.tree_height_m, wd);

      let tree = await prisma.tree.findUnique({
        where: {
          latitude_longitude: { latitude: row.latitude, longitude: row.longitude }
        }
      });

      if (!tree) {
        tree = await prisma.tree.create({
          data: {
            internal_tree_id: generateTreeId(plot_id, row.latitude, row.longitude),
            plot_id,
            species_id,
            latitude: row.latitude,
            longitude: row.longitude,
            distance_from_tree_m: row.distance_from_tree_m || null
          }
        });
      }

      await prisma.treeMeasurement.create({
        data: {
          tree_id: tree.id,
          raw_upload_batch_id: batch.id,
          diameter_cm: row.diameter_cm,
          tree_height_m: row.tree_height_m,
          wood_density_g_cm3: wd,
          ...calcs,
          data_source: 'rover'
        }
      });
      
      successCount++;
    }

    res.json({ message: 'Upload complete', successCount, errors, batchId: batch.id });

    // Automatically anchor this batch on Polygon Amoy (fires async, does not block response)
    if (successCount > 0) {
      orchestrateBlockchainAnchor(batch.id).catch((err) => {
        console.error(`[blockchain] Background anchor failed for batch ${batch.id}:`, err.message);
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process CSV/JSON upload' });
  }
});

export default router;
