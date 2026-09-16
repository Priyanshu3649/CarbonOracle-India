import { Router } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireAdmin } from './auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const species = await prisma.species.findMany({
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
