import crypto from 'crypto';

/**
 * hash.service.ts
 *
 * Provides deterministic canonicalization and SHA-256 hashing for CarbonOracle MRV reports.
 *
 * Design principles:
 *  - Property order is always normalized (sorted keys)
 *  - Numbers are formatted to a fixed precision to avoid floating-point drift
 *  - Timestamps are always ISO-8601 strings
 *  - Null/undefined values are represented as null (not omitted)
 *
 * This ensures: same dataset → same hash, regardless of insertion order.
 */

export interface MrvReportData {
  reportId:           string;
  batchId:            string;
  plotId:             string;
  plotName:           string;
  treeCount:          number;
  totalCarbonKg:      number;
  co2eKg:             number;
  agcKg:              number;
  bgcKg:              number;
  methodologyVersion: string;
  calculationVersion: string;
  dataSource:         string;
  uploadedAt:         string; // ISO-8601
  canonicalizedAt:    string; // ISO-8601
}

/**
 * Canonicalize an MRV report into a deterministic JSON string.
 *
 * Rules:
 *  1. All object keys are sorted alphabetically (recursive)
 *  2. Floating-point numbers are rounded to 6 decimal places
 *  3. Strings are trimmed
 *  4. Dates are represented as ISO-8601 UTC strings
 *  5. The output is compact JSON (no extra whitespace)
 */
export function canonicalize(report: MrvReportData): string {
  const normalized: Record<string, unknown> = {
    agcKg:              roundToFixed(report.agcKg, 6),
    batchId:            report.batchId.trim(),
    bgcKg:              roundToFixed(report.bgcKg, 6),
    calculationVersion: report.calculationVersion.trim(),
    canonicalizedAt:    toIso(report.canonicalizedAt),
    co2eKg:             roundToFixed(report.co2eKg, 6),
    dataSource:         report.dataSource.trim(),
    methodologyVersion: report.methodologyVersion.trim(),
    plotId:             report.plotId.trim(),
    plotName:           report.plotName.trim(),
    reportId:           report.reportId.trim(),
    totalCarbonKg:      roundToFixed(report.totalCarbonKg, 6),
    treeCount:          report.treeCount,
    uploadedAt:         toIso(report.uploadedAt),
  };

  // Deep-sort keys for nested objects (future-proof)
  return JSON.stringify(sortObjectKeys(normalized));
}

/**
 * Generate a SHA-256 hex digest of a canonical string.
 */
export function sha256Hash(canonical: string): string {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Convenience: canonicalize + hash in one call.
 */
export function hashReport(report: MrvReportData): {
  canonical: string;
  hash: string;
} {
  const canonical = canonicalize(report);
  const hash = sha256Hash(canonical);
  return { canonical, hash };
}

/**
 * Convert a hash hex string (64 chars) to a bytes32 hex string for the contract.
 * Ethers.js expects "0x" + 64 hex chars.
 */
export function hashToBytes32(hexHash: string): string {
  const clean = hexHash.replace(/^0x/, '');
  if (clean.length !== 64) {
    throw new Error(`Invalid SHA-256 hash length: ${clean.length} (expected 64)`);
  }
  return '0x' + clean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundToFixed(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals));
}

function toIso(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date string for canonicalization: "${value}"`);
  }
  return d.toISOString();
}

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      });
    return sorted;
  }
  return obj;
}
