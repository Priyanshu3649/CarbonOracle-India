import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken } from './auth';
import crypto from 'crypto';

const router = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

function generateSerial(projectId: string, index: number): string {
  const year = new Date().getFullYear();
  const pad  = String(index).padStart(4, '0');
  return `CO-${year}-${projectId.substring(0, 6).toUpperCase()}-${pad}`;
}

function generateCertNumber(): string {
  return `CERT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// ── GET /api/marketplace/projects  (public browse) ────────────────────────────
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.carbonProject.findMany({
      where: { status: 'LISTED' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        plot:  { select: { id: true, plot_name: true, description: true } },
        _count: { select: { credits: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const withAvailable = await Promise.all(projects.map(async (p) => {
      const available = await prisma.carbonCredit.count({
        where: { project_id: p.id, status: 'AVAILABLE' },
      });
      return { ...p, available_credits: available };
    }));

    res.json(withAvailable);
  } catch (err: any) {
    console.error('[marketplace] projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ── GET /api/marketplace/projects/:id  (public detail) ────────────────────────
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const project = await prisma.carbonProject.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        plot: {
          include: {
            trees: {
              include: {
                measurements: { orderBy: { measured_at: 'desc' }, take: 1 },
                species: true,
              },
            },
          },
        },
        credits: {
          include: { current_owner: { select: { id: true, name: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const availableCount = project.credits.filter((c: any) => c.status === 'AVAILABLE').length;
    const soldCount      = project.credits.filter((c: any) => c.status === 'SOLD').length;
    const retiredCount   = project.credits.filter((c: any) => c.status === 'RETIRED').length;

    res.json({ ...project, stats: { available: availableCount, sold: soldCount, retired: retiredCount } });
  } catch (err: any) {
    console.error('[marketplace] project detail error:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// ── POST /api/marketplace/projects  (create project) ──────────────────────────
router.post('/projects', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { plot_id, title, description, price_per_credit, vintage_year } = req.body;

    if (!plot_id || !title || !price_per_credit || !vintage_year) {
      return res.status(400).json({ error: 'plot_id, title, price_per_credit, vintage_year are required' });
    }

    const plot = await prisma.plot.findUnique({
      where: { id: plot_id },
      include: {
        trees: {
          include: { measurements: { orderBy: { measured_at: 'desc' }, take: 1 } },
        },
      },
    });
    if (!plot) return res.status(404).json({ error: 'Plot not found' });

    const total_co2e_kg = plot.trees.reduce((sum, t) => {
      const m = t.measurements[0];
      return sum + (m ? m.co2e_kg : 0);
    }, 0);
    const total_credits = parseFloat((total_co2e_kg / 1000).toFixed(4));

    const project = await prisma.carbonProject.create({
      data: {
        owner_id:        user.id,
        plot_id,
        title,
        description:     description || null,
        total_credits,
        price_per_credit: parseFloat(price_per_credit),
        vintage_year:    parseInt(vintage_year),
        status:          'DRAFT',
      },
    });

    // Mint 1 credit per tonne
    const creditCount = Math.floor(total_credits);
    for (let i = 1; i <= creditCount; i++) {
      await prisma.carbonCredit.create({
        data: {
          project_id:       project.id,
          serial_number:    generateSerial(project.id, i),
          vintage_year:     parseInt(vintage_year),
          quantity_tonnes:  1,
          status:           'AVAILABLE',
          current_owner_id: user.id,
        },
      });
    }

    // Record MINT transactions
    const credits = await prisma.carbonCredit.findMany({ where: { project_id: project.id } });
    for (const credit of credits) {
      await prisma.creditTransaction.create({
        data: {
          credit_id:        credit.id,
          from_user_id:     null,
          to_user_id:       user.id,
          transaction_type: 'MINT',
          quantity_tonnes:  credit.quantity_tonnes,
          status:           'CONFIRMED',
        },
      });
    }

    res.status(201).json({ ...project, total_credits, credits_minted: creditCount });
  } catch (err: any) {
    console.error('[marketplace] create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ── PUT /api/marketplace/projects/:id/list ────────────────────────────────────
router.put('/projects/:id/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const project = await prisma.carbonProject.findUnique({ where: { id: req.params.id as string } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.owner_id !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await prisma.carbonProject.update({
      where: { id: req.params.id as string },
      data: { status: 'LISTED' },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list project' });
  }
});

// ── PUT /api/marketplace/projects/:id/verify ─────────────────────────────────
router.put('/projects/:id/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN' && user.role !== 'SCIENTIST') {
      return res.status(403).json({ error: 'Admin or Scientist role required' });
    }
    const updated = await prisma.carbonProject.update({
      where: { id: req.params.id as string },
      data: { status: 'VERIFIED' },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify project' });
  }
});

// ── POST /api/marketplace/projects/:id/buy ────────────────────────────────────
router.post('/projects/:id/buy', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user     = (req as any).user;
    const quantity = parseInt(req.body.quantity);
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'quantity must be >= 1' });

    const project = await prisma.carbonProject.findUnique({ where: { id: req.params.id as string } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.status !== 'LISTED') return res.status(400).json({ error: 'Project is not listed for sale' });
    if (project.owner_id === user.id) return res.status(400).json({ error: 'Cannot buy your own credits' });

    const availableCredits = await prisma.carbonCredit.findMany({
      where: { project_id: project.id, status: 'AVAILABLE' },
      take: quantity,
    });

    if (availableCredits.length < quantity) {
      return res.status(400).json({
        error: `Only ${availableCredits.length} credits available, requested ${quantity}`,
      });
    }

    const transactions = [];
    for (const credit of availableCredits) {
      await prisma.carbonCredit.update({
        where: { id: credit.id },
        data:  { status: 'SOLD', current_owner_id: user.id },
      });
      const tx = await prisma.creditTransaction.create({
        data: {
          credit_id:        credit.id,
          from_user_id:     project.owner_id,
          to_user_id:       user.id,
          transaction_type: 'SALE',
          quantity_tonnes:  credit.quantity_tonnes,
          price_per_tonne:  project.price_per_credit,
          total_price_usd:  credit.quantity_tonnes * project.price_per_credit,
          status:           'CONFIRMED',
        },
      });
      transactions.push(tx);
    }

    res.json({
      message:           'Purchase successful',
      credits_purchased: availableCredits.length,
      total_paid_usd:    availableCredits.length * project.price_per_credit,
      transactions,
    });
  } catch (err: any) {
    console.error('[marketplace] buy error:', err);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

// ── GET /api/marketplace/my-projects ─────────────────────────────────────────
router.get('/my-projects', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const projects = await prisma.carbonProject.findMany({
      where: { owner_id: user.id },
      include: {
        plot:  { select: { id: true, plot_name: true } },
        _count: { select: { credits: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const withStats = await Promise.all(projects.map(async (p) => {
      const [available, sold, retired] = await Promise.all([
        prisma.carbonCredit.count({ where: { project_id: p.id, status: 'AVAILABLE' } }),
        prisma.carbonCredit.count({ where: { project_id: p.id, status: 'SOLD'      } }),
        prisma.carbonCredit.count({ where: { project_id: p.id, status: 'RETIRED'   } }),
      ]);
      return { ...p, stats: { available, sold, retired } };
    }));

    res.json(withStats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch your projects' });
  }
});

// ── GET /api/marketplace/my-credits ──────────────────────────────────────────
router.get('/my-credits', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const credits = await prisma.carbonCredit.findMany({
      where: { current_owner_id: user.id },
      include: {
        project:     { select: { id: true, title: true, vintage_year: true, methodology: true } },
        certificate: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(credits);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch your credits' });
  }
});

// ── POST /api/marketplace/credits/:id/retire ─────────────────────────────────
router.post('/credits/:id/retire', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { beneficiary_name, retirement_reason } = req.body;
    if (!beneficiary_name) return res.status(400).json({ error: 'beneficiary_name is required' });

    const credit = await prisma.carbonCredit.findUnique({
      where: { id: req.params.id as string },
      include: { project: true },
    });
    if (!credit)                               return res.status(404).json({ error: 'Credit not found' });
    if (credit.current_owner_id !== user.id)  return res.status(403).json({ error: 'You do not own this credit' });
    if (credit.status === 'RETIRED')           return res.status(400).json({ error: 'Credit already retired' });

    const now = new Date();

    await prisma.carbonCredit.update({
      where: { id: credit.id },
      data:  { status: 'RETIRED', retired_by_id: user.id, retired_at: now, retirement_reason: retirement_reason || null },
    });

    await prisma.creditTransaction.create({
      data: {
        credit_id:        credit.id,
        from_user_id:     user.id,
        to_user_id:       user.id,
        transaction_type: 'RETIRE',
        quantity_tonnes:  credit.quantity_tonnes,
        status:           'CONFIRMED',
      },
    });

    const certificate = await prisma.retirementCertificate.create({
      data: {
        credit_id:          credit.id,
        retired_by_id:      user.id,
        beneficiary_name,
        quantity_tonnes:    credit.quantity_tonnes,
        retirement_date:    now,
        certificate_number: generateCertNumber(),
        blockchain_tx_hash: null,
      },
    });

    res.json({ message: 'Credit retired successfully', certificate });
  } catch (err: any) {
    console.error('[marketplace] retire error:', err);
    res.status(500).json({ error: 'Failed to retire credit' });
  }
});

// ── GET /api/marketplace/certificates/:id ────────────────────────────────────
router.get('/certificates/:id', async (req: Request, res: Response) => {
  try {
    const cert = await prisma.retirementCertificate.findUnique({
      where: { id: req.params.id as string },
      include: {
        credit: {
          include: { project: { select: { title: true, methodology: true, vintage_year: true } } },
        },
        retired_by: { select: { name: true, email: true } },
      },
    });
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    res.json(cert);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

// ── GET /api/marketplace/transactions ────────────────────────────────────────
router.get('/transactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const txs = await prisma.creditTransaction.findMany({
      where: { OR: [{ from_user_id: user.id }, { to_user_id: user.id }] },
      include: {
        credit: { include: { project: { select: { title: true, vintage_year: true } } } },
        from_user: { select: { id: true, name: true } },
        to_user:   { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(txs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
