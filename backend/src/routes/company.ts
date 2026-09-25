import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken } from './auth';

const router = Router();

// All company routes require authenticated user
router.use(authenticateToken);

// ── GET /api/company/dashboard ─────────────────────────────────────────────
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // 1. Fetch Company Projects & Plots
    const companyProjects = await prisma.carbonProject.findMany({
      where: { owner_id: user.id },
      include: { plot: true },
    });
    const plotIds = companyProjects.map((p) => p.plot_id);

    // 2. Fetch All Credits Owned by / Issued to Company
    const ownedCredits = await prisma.carbonCredit.findMany({
      where: { current_owner_id: user.id },
      include: {
        listings: { where: { status: 'ACTIVE' } },
        certificate: true,
      },
    });

    const totalCreditsCount = ownedCredits.length;

    // Active listings for this seller
    const activeListings = await prisma.marketplaceListing.findMany({
      where: { seller_id: user.id, status: 'ACTIVE' },
    });
    const listedCreditIds = new Set(activeListings.map((l) => l.credit_id));

    const listedCreditsCount = listedCreditIds.size;
    const availableCreditsCount = ownedCredits.filter(
      (c) => c.status === 'AVAILABLE' && !listedCreditIds.has(c.id)
    ).length;

    // Sold & Retired counts
    const soldCreditsCount = await prisma.creditTransaction.count({
      where: { from_user_id: user.id, transaction_type: 'SALE' },
    });

    const retiredCreditsCount = ownedCredits.filter(
      (c) => c.status === 'RETIRED'
    ).length;

    // 3. Farms & Visits Summary
    const totalFarmsCount = plotIds.length;

    const upcomingVisit = await prisma.visit.findFirst({
      where: { company_id: user.id, status: 'SCHEDULED' },
      include: { plot: { select: { id: true, plot_name: true } } },
      orderBy: { scheduled_date: 'asc' },
    });

    const pendingVisitRequestsCount = await prisma.visitRequest.count({
      where: { company_id: user.id, status: 'PENDING' },
    });

    // 4. Recent Activity Timeline
    const recentTx = await prisma.creditTransaction.findMany({
      where: { OR: [{ from_user_id: user.id }, { to_user_id: user.id }] },
      include: { credit: true },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const recentListings = await prisma.marketplaceListing.findMany({
      where: { seller_id: user.id },
      include: { credit: { include: { project: true } } },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const recentVisits = await prisma.visit.findMany({
      where: { company_id: user.id },
      include: { plot: true },
      orderBy: { updated_at: 'desc' },
      take: 5,
    });

    res.json({
      kpis: {
        total_credits: totalCreditsCount,
        available_credits: availableCreditsCount,
        listed_credits: listedCreditsCount,
        sold_credits: soldCreditsCount,
        retired_credits: retiredCreditsCount,
        total_farms: totalFarmsCount,
        pending_visit_requests: pendingVisitRequestsCount,
      },
      upcoming_visit: upcomingVisit,
      recent_activity: {
        transactions: recentTx,
        listings: recentListings,
        visits: recentVisits,
      },
    });
  } catch (err: any) {
    console.error('[company] dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch company dashboard' });
  }
});

// ── GET /api/company/credits ──────────────────────────────────────────────
router.get('/credits', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const credits = await prisma.carbonCredit.findMany({
      where: { current_owner_id: user.id },
      include: {
        project: {
          include: {
            plot: { select: { id: true, plot_name: true } },
          },
        },
        listings: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
        certificate: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Cross-reference blockchain status from BlockchainRecord
    const formatted = await Promise.all(
      credits.map(async (c) => {
        const isListed = c.listings.length > 0;
        const blockchainRecord = await prisma.blockchainRecord.findFirst({
          where: { report_id: c.project.plot_id },
          orderBy: { created_at: 'desc' },
        });

        return {
          id: c.id,
          serial_number: c.serial_number,
          vintage_year: c.vintage_year,
          quantity_tonnes: c.quantity_tonnes,
          status: c.status,
          project_title: c.project.title,
          plot_name: c.project.plot.plot_name,
          verification_status: c.project.status,
          verification_date: c.created_at,
          marketplace_status: isListed ? 'LISTED' : c.status,
          blockchain_status: blockchainRecord
            ? blockchainRecord.status === 'CONFIRMED'
              ? 'VERIFIED_ON_CHAIN'
              : blockchainRecord.status
            : 'NOT_ANCHORED',
          transaction_hash: blockchainRecord?.transaction_hash || null,
        };
      })
    );

    res.json(formatted);
  } catch (err: any) {
    console.error('[company] credits error:', err);
    res.status(500).json({ error: 'Failed to fetch company credits' });
  }
});

// ── GET /api/company/credits/:id ──────────────────────────────────────────
router.get('/credits/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const creditId = req.params.id as string;

    const credit = await prisma.carbonCredit.findUnique({
      where: { id: creditId },
      include: {
        project: { include: { plot: true } },
        listings: { orderBy: { created_at: 'desc' } },
        transactions: { orderBy: { created_at: 'desc' } },
        certificate: true,
      },
    });

    if (!credit) return res.status(404).json({ error: 'Credit not found' });
    if (credit.current_owner_id !== user.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this credit' });
    }

    res.json(credit);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch credit details' });
  }
});

// ── GET /api/company/listings ─────────────────────────────────────────────
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const listings = await prisma.marketplaceListing.findMany({
      where: { seller_id: user.id },
      include: {
        credit: {
          include: {
            project: {
              include: { plot: { select: { id: true, plot_name: true } } },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch company listings' });
  }
});

// ── POST /api/company/listings (Atomic Listing Creation) ────────────────
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { credit_id, price_per_credit, quantity } = req.body;

    if (!credit_id || !price_per_credit || parseFloat(price_per_credit) <= 0) {
      return res.status(400).json({ error: 'Valid credit_id and positive price_per_credit are required' });
    }

    const price = parseFloat(price_per_credit);
    const listQty = quantity ? parseFloat(quantity) : 1.0;

    // Run atomic check and listing inside a Prisma transaction
    const listing = await prisma.$transaction(async (tx) => {
      const credit = await tx.carbonCredit.findUnique({
        where: { id: credit_id },
        include: { project: true },
      });

      if (!credit) throw new Error('Credit not found');
      if (credit.current_owner_id !== user.id) throw new Error('Unauthorized: You do not own this credit');
      if (credit.status !== 'AVAILABLE') throw new Error(`Credit is not available for listing (Status: ${credit.status})`);

      // Check if already actively listed
      const existingListing = await tx.marketplaceListing.findFirst({
        where: { credit_id, status: 'ACTIVE' },
      });
      if (existingListing) throw new Error('Credit is already actively listed on the marketplace');

      const newListing = await tx.marketplaceListing.create({
        data: {
          seller_id: user.id,
          credit_id: credit.id,
          quantity_listed: listQty,
          quantity_available: listQty,
          price_per_credit: price,
          currency: 'USD',
          status: 'ACTIVE',
        },
      });

      // Update project listing price/status if applicable
      await tx.carbonProject.update({
        where: { id: credit.project_id },
        data: { status: 'LISTED', price_per_credit: price },
      });

      return newListing;
    });

    res.status(201).json(listing);
  } catch (err: any) {
    console.error('[company] listing creation error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create listing' });
  }
});

// ── DELETE /api/company/listings/:id (Cancel Listing) ───────────────────
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const listingId = req.params.id as string;

    const cancelledListing = await prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) throw new Error('Listing not found');
      if (listing.seller_id !== user.id) throw new Error('Unauthorized: You do not own this listing');
      if (listing.status !== 'ACTIVE') throw new Error('Only active listings can be cancelled');

      return await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'CANCELLED' },
      });
    });

    res.json({ message: 'Listing cancelled successfully', listing: cancelledListing });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to cancel listing' });
  }
});

// ── GET /api/company/farms ────────────────────────────────────────────────
router.get('/farms', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const companyProjects = await prisma.carbonProject.findMany({
      where: { owner_id: user.id },
      include: {
        plot: {
          include: {
            trees: {
              include: {
                measurements: { orderBy: { measured_at: 'desc' }, take: 1 },
              },
            },
            visits: { orderBy: { scheduled_date: 'desc' } },
            visit_requests: { orderBy: { created_at: 'desc' } },
          },
        },
      },
    });

    const farms = companyProjects.map((p) => {
      const plot = p.plot;
      const totalTrees = plot.trees.length;

      const totalCo2eKg = plot.trees.reduce((sum, t) => {
        const m = t.measurements[0];
        return sum + (m ? m.co2e_kg : 0);
      }, 0);
      const estimatedCarbonTonnes = parseFloat((totalCo2eKg / 1000).toFixed(2));

      const lastVisit = plot.visits.find((v) => v.status === 'COMPLETED');
      const nextVisit = plot.visits.find((v) => v.status === 'SCHEDULED');

      return {
        id: plot.id,
        project_id: p.id,
        farm_name: plot.plot_name,
        description: plot.description,
        vintage_year: p.vintage_year,
        verification_status: p.status,
        tree_count: totalTrees,
        estimated_carbon_tco2e: estimatedCarbonTonnes,
        total_credits: p.total_credits,
        last_mrv_visit: lastVisit ? lastVisit.completed_date || lastVisit.scheduled_date : null,
        next_scheduled_visit: nextVisit ? nextVisit.scheduled_date : null,
        created_at: plot.created_at,
      };
    });

    res.json(farms);
  } catch (err: any) {
    console.error('[company] farms error:', err);
    res.status(500).json({ error: 'Failed to fetch company farms' });
  }
});

// ── GET /api/company/farms/:id ────────────────────────────────────────────
router.get('/farms/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const plotId = req.params.id as string;

    // Verify company ownership of this farm/plot
    const project = await prisma.carbonProject.findFirst({
      where: { plot_id: plotId, owner_id: user.id },
    });

    if (!project && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: You do not manage this farm' });
    }

    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
      include: {
        trees: {
          include: {
            species: true,
            measurements: { orderBy: { measured_at: 'desc' } },
          },
        },
        visits: { orderBy: { scheduled_date: 'desc' } },
        visit_requests: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!plot) return res.status(404).json({ error: 'Farm not found' });

    // Calculate aggregated species & carbon stats
    const speciesMap: Record<string, { count: number; carbon_kg: number }> = {};
    let totalCarbonKg = 0;
    let totalCo2eKg = 0;

    plot.trees.forEach((t) => {
      const m = t.measurements[0];
      if (m) {
        totalCarbonKg += m.total_carbon_kg;
        totalCo2eKg += m.co2e_kg;
        const spName = t.species.common_name;
        if (!speciesMap[spName]) speciesMap[spName] = { count: 0, carbon_kg: 0 };
        speciesMap[spName].count += 1;
        speciesMap[spName].carbon_kg += m.total_carbon_kg;
      }
    });

    const blockchainRecord = await prisma.blockchainRecord.findFirst({
      where: { report_id: plot.id },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      plot,
      project,
      summary: {
        tree_count: plot.trees.length,
        total_carbon_kg: parseFloat(totalCarbonKg.toFixed(2)),
        total_co2e_tco2e: parseFloat((totalCo2eKg / 1000).toFixed(2)),
        species_breakdown: speciesMap,
      },
      blockchain_proof: blockchainRecord || null,
    });
  } catch (err: any) {
    console.error('[company] farm detail error:', err);
    res.status(500).json({ error: 'Failed to fetch farm details' });
  }
});

// ── GET /api/company/visits ───────────────────────────────────────────────
router.get('/visits', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const visits = await prisma.visit.findMany({
      where: { company_id: user.id },
      include: { plot: { select: { id: true, plot_name: true } } },
      orderBy: { scheduled_date: 'desc' },
    });

    const requests = await prisma.visitRequest.findMany({
      where: { company_id: user.id },
      include: { plot: { select: { id: true, plot_name: true } } },
      orderBy: { created_at: 'desc' },
    });

    res.json({ visits, requests });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch company visits' });
  }
});

// ── POST /api/company/visits/request ─────────────────────────────────────
router.post('/visits/request', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { farmId, requestedDate, reason, description, priority } = req.body;

    if (!farmId || !requestedDate || !reason) {
      return res.status(400).json({ error: 'farmId, requestedDate, and reason are required' });
    }

    // Verify company ownership of the farm
    const project = await prisma.carbonProject.findFirst({
      where: { plot_id: farmId, owner_id: user.id },
    });

    if (!project && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: You can only request visits for your own farms' });
    }

    const visitRequest = await prisma.visitRequest.create({
      data: {
        company_id: user.id,
        plot_id: farmId,
        requested_date: new Date(requestedDate),
        reason,
        description: description || null,
        priority: priority || 'MEDIUM',
        status: 'PENDING',
      },
    });

    res.status(201).json(visitRequest);
  } catch (err: any) {
    console.error('[company] visit request error:', err);
    res.status(500).json({ error: 'Failed to submit visit request' });
  }
});

export default router;
