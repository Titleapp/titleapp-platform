"use strict";

/**
 * Waterfall Distribution Engine
 *
 * Pure math module — no Firestore, no side effects.
 * Takes deal terms + cash flows, returns distribution breakdown.
 */

// ─── IRR Calculation (Newton's Method) ──────────────────────────

function calculateIRR(cashFlows, guess = 0.10, maxIterations = 100, tolerance = 1e-7) {
  // cashFlows: array of { amount, period } where period 0 = initial investment (negative)
  if (!cashFlows || cashFlows.length < 2) return null;

  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0; // derivative of NPV

    for (const cf of cashFlows) {
      const t = cf.period;
      npv += cf.amount / Math.pow(1 + rate, t);
      if (t !== 0) {
        dnpv -= t * cf.amount / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) return rate;

    if (Math.abs(dnpv) < 1e-10) return null; // derivative too small
    const newRate = rate - npv / dnpv;

    // Clamp to prevent divergence
    if (newRate < -0.99) rate = -0.5;
    else if (newRate > 10) rate = 5;
    else rate = newRate;
  }

  return rate; // best estimate after max iterations
}

// ─── Equity Multiple (MOIC) ─────────────────────────────────────

function calculateEquityMultiple(totalDistributed, totalInvested) {
  if (!totalInvested || totalInvested === 0) return 0;
  return totalDistributed / totalInvested;
}

// ─── Preferred Return Accrual ───────────────────────────────────

function calculatePreferredReturn(principal, annualRate, periods) {
  // Simple accrual: principal * rate * periods
  // periods = years (can be fractional)
  return principal * annualRate * periods;
}

function calculateCompoundPreferredReturn(principal, annualRate, periods) {
  // Compound: principal * ((1 + rate)^periods - 1)
  return principal * (Math.pow(1 + annualRate, periods) - 1);
}

// ─── Distribution Tier Runner ───────────────────────────────────

function runDistributionTiers(netCashFlow, tiers, lpInvested, gpInvested, priorDistributions) {
  const totalInvested = lpInvested + gpInvested;
  const lpOwnership = totalInvested > 0 ? lpInvested / totalInvested : 1;
  const gpOwnership = totalInvested > 0 ? gpInvested / totalInvested : 0;

  let remaining = netCashFlow;
  const priorLP = (priorDistributions || {}).lpTotal || 0;
  const priorGP = (priorDistributions || {}).gpTotal || 0;

  const tierResults = [];
  let runningLPTotal = priorLP;
  let runningGPTotal = priorGP;

  for (const tier of tiers) {
    if (remaining <= 0) {
      tierResults.push({
        name: tier.name,
        type: tier.type,
        distributed: 0,
        lpAmount: 0,
        gpAmount: 0,
      });
      continue;
    }

    let tierAmount = 0;
    let lpAmount = 0;
    let gpAmount = 0;

    if (tier.type === "return_of_capital") {
      // Return capital pro-rata until all capital returned
      const lpCapitalRemaining = Math.max(0, lpInvested - runningLPTotal);
      const gpCapitalRemaining = Math.max(0, gpInvested - runningGPTotal);
      const capitalRemaining = lpCapitalRemaining + gpCapitalRemaining;
      tierAmount = Math.min(remaining, capitalRemaining);
      if (capitalRemaining > 0) {
        lpAmount = tierAmount * (lpCapitalRemaining / capitalRemaining);
        gpAmount = tierAmount * (gpCapitalRemaining / capitalRemaining);
      }
    } else if (tier.type === "preferred") {
      // Preferred return to LPs (cumulative)
      const prefRate = tier.threshold || 0.08;
      const prefOwed = calculatePreferredReturn(lpInvested, prefRate, 1);
      const prefPaid = Math.max(0, runningLPTotal - lpInvested);
      const prefRemaining = Math.max(0, prefOwed - prefPaid);
      tierAmount = Math.min(remaining, prefRemaining);
      lpAmount = tierAmount;
      gpAmount = 0;
    } else if (tier.type === "catchup") {
      // GP catch-up until GP has received target % of total profits
      const targetGPPct = tier.threshold || 0.20;
      const totalProfit = (runningLPTotal + runningGPTotal) - totalInvested + remaining;
      const targetGPProfit = totalProfit * targetGPPct;
      const currentGPProfit = Math.max(0, runningGPTotal - gpInvested);
      const catchupNeeded = Math.max(0, targetGPProfit - currentGPProfit);
      tierAmount = Math.min(remaining, catchupNeeded);
      lpAmount = 0;
      gpAmount = tierAmount;
    } else if (tier.type === "carry") {
      // Remaining split per LP/GP percentages
      tierAmount = remaining;
      lpAmount = tierAmount * (tier.lpSplit || 0.80);
      gpAmount = tierAmount * (tier.gpSplit || 0.20);
    } else {
      // Custom split
      tierAmount = remaining;
      lpAmount = tierAmount * (tier.lpSplit || lpOwnership);
      gpAmount = tierAmount * (tier.gpSplit || gpOwnership);
    }

    remaining -= tierAmount;
    runningLPTotal += lpAmount;
    runningGPTotal += gpAmount;

    tierResults.push({
      name: tier.name,
      type: tier.type,
      distributed: round2(tierAmount),
      lpAmount: round2(lpAmount),
      gpAmount: round2(gpAmount),
    });
  }

  return {
    tiers: tierResults,
    lpTotal: round2(runningLPTotal - priorLP),
    gpTotal: round2(runningGPTotal - priorGP),
    totalDistributed: round2(netCashFlow - remaining),
    undistributed: round2(remaining),
  };
}

// ─── Main Waterfall Calculator ──────────────────────────────────

function calculateWaterfall(dealTerms, cashFlows) {
  const {
    lpInvested = 0,
    gpInvested = 0,
    waterfallTiers = [],
    holdPeriodYears,
  } = dealTerms;

  const totalInvested = lpInvested + gpInvested;

  if (!waterfallTiers.length) {
    return {
      ok: false,
      error: "No waterfall tiers defined",
    };
  }

  // Process each cash flow period
  const periodResults = [];
  let cumulativeLPDistributed = 0;
  let cumulativeGPDistributed = 0;

  for (const cf of cashFlows) {
    const priorDistributions = {
      lpTotal: cumulativeLPDistributed,
      gpTotal: cumulativeGPDistributed,
    };

    const result = runDistributionTiers(
      cf.amount,
      waterfallTiers,
      lpInvested,
      gpInvested,
      priorDistributions
    );

    cumulativeLPDistributed += result.lpTotal;
    cumulativeGPDistributed += result.gpTotal;

    periodResults.push({
      period: cf.period,
      label: cf.label || `Period ${cf.period}`,
      netCashFlow: cf.amount,
      ...result,
    });
  }

  // Calculate IRR
  const irrCashFlows = [
    { amount: -totalInvested, period: 0 },
    ...cashFlows.map((cf) => ({ amount: cf.amount, period: cf.period })),
  ];
  const irr = calculateIRR(irrCashFlows);

  // Calculate equity multiple
  const totalDistributed = cumulativeLPDistributed + cumulativeGPDistributed;
  const equityMultiple = calculateEquityMultiple(totalDistributed, totalInvested);
  const lpMultiple = calculateEquityMultiple(cumulativeLPDistributed, lpInvested);
  const gpMultiple = gpInvested > 0 ? calculateEquityMultiple(cumulativeGPDistributed, gpInvested) : 0;

  // DPI (Distributed to Paid-In)
  const dpi = totalInvested > 0 ? totalDistributed / totalInvested : 0;

  return {
    ok: true,
    summary: {
      totalInvested: round2(totalInvested),
      lpInvested: round2(lpInvested),
      gpInvested: round2(gpInvested),
      totalDistributed: round2(totalDistributed),
      lpDistributed: round2(cumulativeLPDistributed),
      gpDistributed: round2(cumulativeGPDistributed),
      lpProfit: round2(cumulativeLPDistributed - lpInvested),
      gpProfit: round2(cumulativeGPDistributed - gpInvested),
      irr: irr !== null ? round4(irr) : null,
      irrFormatted: irr !== null ? `${(irr * 100).toFixed(1)}%` : "N/A",
      equityMultiple: round2(equityMultiple),
      lpMultiple: round2(lpMultiple),
      gpMultiple: round2(gpMultiple),
      dpi: round2(dpi),
    },
    periods: periodResults,
    waterfallTiers: waterfallTiers.map((t) => ({
      name: t.name,
      type: t.type,
      lpSplit: t.lpSplit,
      gpSplit: t.gpSplit,
      threshold: t.threshold || null,
    })),
  };
}

// ─── Investor Allocation ────────────────────────────────────────

function allocateToInvestors(distributionAmount, investors, allocationMethod = "pro_rata") {
  if (!investors || investors.length === 0) return [];

  const totalCommitted = investors.reduce((sum, inv) => sum + (inv.commitmentAmount || 0), 0);
  if (totalCommitted === 0) return [];

  if (allocationMethod === "pro_rata") {
    return investors.map((inv) => {
      const share = (inv.commitmentAmount || 0) / totalCommitted;
      return {
        investorId: inv.investorId || inv.id,
        name: inv.name,
        commitmentAmount: inv.commitmentAmount,
        share: round4(share),
        distributionAmount: round2(distributionAmount * share),
      };
    });
  }

  // Default: equal split
  const perInvestor = distributionAmount / investors.length;
  return investors.map((inv) => ({
    investorId: inv.investorId || inv.id,
    name: inv.name,
    commitmentAmount: inv.commitmentAmount,
    share: round4(1 / investors.length),
    distributionAmount: round2(perInvestor),
  }));
}

// ─── Helpers ────────────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

module.exports = {
  calculateWaterfall,
  calculateIRR,
  calculateEquityMultiple,
  calculatePreferredReturn,
  calculateCompoundPreferredReturn,
  runDistributionTiers,
  allocateToInvestors,
};
