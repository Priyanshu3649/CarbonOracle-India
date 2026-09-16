import { Router } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireAdmin } from './auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const plotsRaw = await prisma.plot.findMany({
      include: {
        _count: {
          select: { trees: true }
        },
        trees: {
          include: {
            measurements: {
              orderBy: { measured_at: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const plots = plotsRaw.map(p => {
      // Sum the latest measurement of each tree for the plot's total carbon credits
      const total_carbon_credits = p.trees.reduce((sum, t) => {
        const latest = t.measurements[0];
        return sum + (latest ? latest.co2e_kg : 0);
      }, 0) / 1000;
      
      const { trees, ...rest } = p;
      return { 
        ...rest, 
        total_carbon_credits, 
        _count: { tree_records: p._count.trees } // Map back to what frontend expects
      };
    });

    res.json(plots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plots' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const plot = await prisma.plot.findUnique({
      where: { id: req.params.id },
      include: {
        trees: {
          include: { 
            species: true,
            measurements: {
              orderBy: { measured_at: 'desc' },
              take: 1
            }
          }
        }
      }
    });
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    // Calculate totals for plot
    const totals = plot.trees.reduce((acc, tree) => {
      if (tree.measurements.length > 0) {
        const m = tree.measurements[0];
        acc.total_agc += m.agc_kg;
        acc.total_bgc += m.bgc_kg;
        acc.total_carbon += m.total_carbon_kg;
        acc.total_co2e += m.co2e_kg;
      }
      return acc;
    }, { total_agc: 0, total_bgc: 0, total_carbon: 0, total_co2e: 0 });

    res.json({ plot, totals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plot details' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { plot_name, description } = req.body;
    const plot = await prisma.plot.create({
      data: { plot_name, description }
    });
    res.json(plot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plot' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { plot_name, description } = req.body;
    const plot = await prisma.plot.update({
      where: { id: req.params.id as string },
      data: { plot_name, description }
    });
    res.json(plot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plot' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.plot.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Plot deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plot' });
  }
});

export default router;
