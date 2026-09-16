import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/dashboard', async (req, res) => {
  try {
    const totalPlots = await prisma.plot.count();
    const totalTrees = await prisma.tree.count();
    
    // Fetch latest measurements for accurate carbon aggregation
    const trees = await prisma.tree.findMany({
      include: {
        measurements: {
          orderBy: { measured_at: 'desc' },
          take: 1
        }
      }
    });

    let agc_total = 0, bgc_total = 0, carbon_total = 0, co2e_total = 0;
    const speciesChartObj: any = {};
    const plotChartObj: any = {};

    trees.forEach(t => {
      if (t.measurements.length > 0) {
        const m = t.measurements[0];
        agc_total += m.agc_kg;
        bgc_total += m.bgc_kg;
        carbon_total += m.total_carbon_kg;
        co2e_total += m.co2e_kg;

        speciesChartObj[t.species_id] = (speciesChartObj[t.species_id] || 0) + m.total_carbon_kg;
        plotChartObj[t.plot_id] = (plotChartObj[t.plot_id] || 0) + m.total_carbon_kg;
      }
    });

    // Map species IDs to names
    const speciesMap = await prisma.species.findMany({ select: { id: true, common_name: true }});
    const speciesDict = Object.fromEntries(speciesMap.map(s => [s.id, s.common_name]));

    const speciesChart = Object.keys(speciesChartObj).map(species_id => ({
      name: speciesDict[species_id] || 'Unknown',
      carbon: speciesChartObj[species_id]
    }));

    // Map plot IDs to names
    const plotMap = await prisma.plot.findMany({ select: { id: true, plot_name: true }});
    const plotDict = Object.fromEntries(plotMap.map(p => [p.id, p.plot_name]));

    const plotChart = Object.keys(plotChartObj).map(plot_id => ({
      name: plotDict[plot_id] || 'Unknown Plot',
      carbon: plotChartObj[plot_id]
    }));

    const mapTrees = trees.map(t => {
      const m = t.measurements.length ? t.measurements[0] : null;
      return {
        id: t.id,
        latitude: t.latitude,
        longitude: t.longitude,
        species: speciesDict[t.species_id] || 'Unknown',
        co2e: m ? m.co2e_kg : 0,
        height: m ? m.tree_height_m : 0
      };
    });

    res.json({
      summary: {
        totalPlots,
        totalTrees,
        agc_tonnes: agc_total / 1000,
        bgc_tonnes: bgc_total / 1000,
        carbon_tonnes: carbon_total / 1000,
        co2e_tonnes: co2e_total / 1000
      },
      charts: {
        speciesDistribution: speciesChart,
        plotDistribution: plotChart,
        agcVsBgc: [
          { name: 'AGC', value: agc_total / 1000 },
          { name: 'BGC', value: bgc_total / 1000 }
        ]
      },
      mapTrees
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

export default router;
