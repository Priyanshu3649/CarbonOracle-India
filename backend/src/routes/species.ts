import { Router } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireAdmin } from './auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').trim();
    const limit = parseInt((req.query.limit as string) || '500');

    const where = q ? {
      OR: [
        { common_name: { contains: q, mode: 'insensitive' as const } },
        { scientific_name: { contains: q, mode: 'insensitive' as const } },
        { region: { contains: q, mode: 'insensitive' as const } }
      ]
    } : {};

    const species = await prisma.species.findMany({
      where,
      take: limit > 0 ? limit : undefined,
      include: {
        _count: {
          select: { trees: true }
        }
      },
      orderBy: { common_name: 'asc' }
    });
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch species' });
  }
});

// GWDD wood density lookup — fuzzy search across 17k+ species (must be before /:id)
router.get('/lookup', async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (q.length < 2) return res.json([]);
    const results = await prisma.woodDensityReference.findMany({
      where: {
        OR: [
          { species: { contains: q, mode: 'insensitive' } },
          { genus:   { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { nb_samples: 'desc' },
    });
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Lookup failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const species = await prisma.species.findUnique({
      where: { id: req.params.id }
    });
    if (!species) {
      return res.status(404).json({ error: 'Species not found' });
    }
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch species details' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { common_name, scientific_name, wood_density_g_cm3, region, remarks } = req.body;
    const species = await prisma.species.create({
      data: { common_name, scientific_name, wood_density_g_cm3: parseFloat(wood_density_g_cm3), region, remarks }
    });
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create species' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { common_name, scientific_name, wood_density_g_cm3, region, remarks } = req.body;
    const species = await prisma.species.update({
      where: { id: req.params.id as string },
      data: { common_name, scientific_name, wood_density_g_cm3: parseFloat(wood_density_g_cm3), region, remarks }
    });
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update species' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.species.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Species deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete species' });
  }
});

export default router;
