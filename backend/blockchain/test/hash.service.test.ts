/**
 * hash.service.test.ts
 *
 * Automated tests proving deterministic canonicalization and SHA-256 hashing.
 *
 * Run with: npx ts-node blockchain/test/hash.service.test.ts
 */

import { canonicalize, sha256Hash, hashReport, MrvReportData } from '../../src/services/blockchain/hash.service';

// Simple test harness
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertEqual(a: unknown, b: unknown, message: string) {
  assert(a === b, `${message} (got: ${JSON.stringify(a)})`);
}

function assertNotEqual(a: unknown, b: unknown, message: string) {
  assert(a !== b, `${message}`);
}

// ─── Test fixtures ──────────────────────────────────────────────────────────

const BASE_REPORT: MrvReportData = {
  reportId:           'BATCH-test001-V1',
  batchId:            'test001',
  plotId:             'plot-abc',
  plotName:           'Western Ghats Demo Plot',
  treeCount:          10,
  totalCarbonKg:      250.123456,
  co2eKg:             917.127963,
  agcKg:              185.091235,
  bgcKg:              65.032221,
  methodologyVersion: 'CarbonOracle-MRV-v1.0',
  calculationVersion: 'CarbonOracle-Calc-v1.0',
  dataSource:         'rover-csv',
  uploadedAt:         '2026-08-21T09:00:00.000Z',
  canonicalizedAt:    '2026-08-21T09:01:00.000Z',
};

// ─── Test suite ─────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log('  CarbonOracle Hash Service Tests');
console.log('══════════════════════════════════════════════\n');

// ── Test 1: Same input → same hash ─────────────────────────────────────────
console.log('Test 1: Same input produces same hash');
{
  const { hash: h1 } = hashReport({ ...BASE_REPORT });
  const { hash: h2 } = hashReport({ ...BASE_REPORT });
  assertEqual(h1, h2, 'Same report produces identical hash');
  assertEqual(h1.length, 64, 'Hash is 64 hex chars (SHA-256)');
}

// ── Test 2: Modified data → different hash ─────────────────────────────────
console.log('\nTest 2: Modified input produces different hash');
{
  const { hash: original } = hashReport({ ...BASE_REPORT });

  const withDifferentCarbon = { ...BASE_REPORT, totalCarbonKg: 250.999999 };
  const { hash: modified }  = hashReport(withDifferentCarbon);
  assertNotEqual(original, modified, 'Changed totalCarbonKg → different hash');

  const withDifferentTree = { ...BASE_REPORT, treeCount: 11 };
  const { hash: modTree }  = hashReport(withDifferentTree);
  assertNotEqual(original, modTree, 'Changed treeCount → different hash');

  const withDifferentPlot = { ...BASE_REPORT, plotId: 'plot-xyz' };
  const { hash: modPlot }  = hashReport(withDifferentPlot);
  assertNotEqual(original, modPlot, 'Changed plotId → different hash');

  const withDifferentTime = { ...BASE_REPORT, uploadedAt: '2026-08-22T09:00:00.000Z' };
  const { hash: modTime }  = hashReport(withDifferentTime);
  assertNotEqual(original, modTime, 'Changed uploadedAt → different hash');
}

// ── Test 3: Reordered JSON → same canonical hash ───────────────────────────
console.log('\nTest 3: Property insertion order does not affect hash (canonicalization)');
{
  // Build report object with deliberately different key insertion order
  const report1: MrvReportData = { ...BASE_REPORT };

  const report2: MrvReportData = {
    co2eKg:             BASE_REPORT.co2eKg,
    totalCarbonKg:      BASE_REPORT.totalCarbonKg,
    canonicalizedAt:    BASE_REPORT.canonicalizedAt,
    uploadedAt:         BASE_REPORT.uploadedAt,
    dataSource:         BASE_REPORT.dataSource,
    calculationVersion: BASE_REPORT.calculationVersion,
    methodologyVersion: BASE_REPORT.methodologyVersion,
    bgcKg:              BASE_REPORT.bgcKg,
    agcKg:              BASE_REPORT.agcKg,
    treeCount:          BASE_REPORT.treeCount,
    plotName:           BASE_REPORT.plotName,
    plotId:             BASE_REPORT.plotId,
    batchId:            BASE_REPORT.batchId,
    reportId:           BASE_REPORT.reportId,
  };

  const { hash: h1, canonical: c1 } = hashReport(report1);
  const { hash: h2, canonical: c2 } = hashReport(report2);

  assertEqual(h1, h2, 'Reordered properties produce same hash');
  assertEqual(c1, c2, 'Reordered properties produce same canonical string');
}

// ── Test 4: Float rounding stability ──────────────────────────────────────
console.log('\nTest 4: Float rounding is stable');
{
  // Values that are identical when rounded to 6 decimal places should hash equally
  // 250.1234560001 and 250.1234560009 both round to 250.123456
  const r1 = { ...BASE_REPORT, totalCarbonKg: 250.1234560001 };
  const r2 = { ...BASE_REPORT, totalCarbonKg: 250.1234560009 };
  const { hash: h1 } = hashReport(r1);
  const { hash: h2 } = hashReport(r2);
  assertEqual(h1, h2, 'Values identical at 6 decimal places hash to same value');

  // But values that differ at 6 decimal places produce different hashes
  const r3 = { ...BASE_REPORT, totalCarbonKg: 250.123456 };
  const r4 = { ...BASE_REPORT, totalCarbonKg: 250.123457 };
  const { hash: h3 } = hashReport(r3);
  const { hash: h4 } = hashReport(r4);
  assertNotEqual(h3, h4, 'Values differing at 6th decimal produce different hash');
}

// ── Test 5: Canonical string is valid JSON ──────────────────────────────────
console.log('\nTest 5: Canonical output is valid parseable JSON');
{
  const { canonical } = hashReport({ ...BASE_REPORT });
  let parsed: any = null;
  let ok = false;
  try { parsed = JSON.parse(canonical); ok = true; } catch {}
  assert(ok, 'Canonical string is valid JSON');
  assert(parsed !== null, 'Parsed canonical is not null');
  assertEqual(parsed.reportId, BASE_REPORT.reportId, 'reportId preserved in canonical');
}

// ── Test 6: Direct sha256Hash function ─────────────────────────────────────
console.log('\nTest 6: sha256Hash produces consistent 64-char hex output');
{
  const input  = '{"test":"data"}';
  const hash1  = sha256Hash(input);
  const hash2  = sha256Hash(input);
  assertEqual(hash1, hash2, 'sha256Hash is deterministic');
  assertEqual(hash1.length, 64, 'sha256Hash output is 64 characters');
  assert(/^[a-f0-9]+$/.test(hash1), 'sha256Hash output is lowercase hex');
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
