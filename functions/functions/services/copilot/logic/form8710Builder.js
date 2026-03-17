"use strict";

/**
 * form8710Builder.js — Aggregate logbook entries into FAA 8710-1 field values
 *
 * FAA Form 8710-1 (Airman Certificate and/or Rating Application) requires
 * flight time totals broken down by category, class, and conditions.
 *
 * This module reads all logbook entries and computes the summary totals
 * needed for Section IV of the 8710.
 */

/**
 * Build 8710 field values from logbook entries and pilot profile.
 *
 * @param {Object} profile — copilotProfiles/{userId}
 * @param {Array} entries — logbooks/{userId}/entries docs
 * @returns {Object} 8710 section values
 */
function build8710(profile, entries) {
  const all = entries || [];

  // --- Section I: Applicant Information ---
  const sectionI = {
    name: profile?.name || "",
    dateOfBirth: profile?.dateOfBirth || "",
    address: profile?.address || "",
    certificateNumber: profile?.certificateNumber || "",
    certificateType: profile?.certificateType || "",
    medicalClass: profile?.medicalClass || "",
    medicalDate: profile?.medicalExpiry || "",
  };

  // --- Section IV: Flight Time Totals ---
  const totals = {
    totalTime: 0,
    airplaneSEL: 0,
    airplaneMEL: 0,
    airplaneSES: 0,
    airplaneMES: 0,
    rotorcraft: 0,
    glider: 0,
    simulator: 0,
    picTime: 0,
    sicTime: 0,
    crossCountry: 0,
    nightTime: 0,
    actualInstrument: 0,
    simulatedInstrument: 0,
    totalInstrument: 0,
    dualReceived: 0,
    dualGiven: 0,
    landingsDay: 0,
    landingsNight: 0,
    totalLandings: 0,
    turbineTime: 0,
    complexTime: 0,
    highPerformanceTime: 0,
  };

  // Time periods for 8710
  const last6Months = { ...createPeriodTotals() };
  const last12Months = { ...createPeriodTotals() };

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  for (const e of all) {
    const t = e.totalTime || 0;
    const entryDate = new Date(e.date);

    // All-time totals
    totals.totalTime += t;
    totals.picTime += (e.picTime || 0);
    totals.sicTime += (e.sicTime || 0);
    totals.crossCountry += (e.crossCountry || 0);
    totals.nightTime += (e.nightTime || 0);
    totals.actualInstrument += (e.actualInstrument || 0);
    totals.simulatedInstrument += (e.simulatedInstrument || 0);
    totals.dualReceived += (e.dualReceived || 0);
    totals.dualGiven += (e.dualGiven || 0);
    totals.landingsDay += (e.landingsDay || 0);
    totals.landingsNight += (e.landingsNight || 0);
    totals.turbineTime += (e.turbineTime || 0);
    totals.complexTime += (e.complexTime || 0);
    totals.highPerformanceTime += (e.highPerformanceTime || 0);

    // Classify by aircraft class
    const cls = (e.aircraftClass || "").toLowerCase();
    if (cls.includes("multi-engine") && cls.includes("land")) totals.airplaneMEL += t;
    else if (cls.includes("single-engine") && cls.includes("land")) totals.airplaneSEL += t;
    else if (cls.includes("multi-engine") && cls.includes("sea")) totals.airplaneMES += t;
    else if (cls.includes("single-engine") && cls.includes("sea")) totals.airplaneSES += t;
    else if (cls.includes("rotorcraft") || cls.includes("helicopter")) totals.rotorcraft += t;
    else if (cls.includes("glider")) totals.glider += t;
    else totals.airplaneMEL += t; // Default PC12 to MEL

    // Period totals
    if (entryDate >= sixMonthsAgo) addToPeriod(last6Months, e);
    if (entryDate >= twelveMonthsAgo) addToPeriod(last12Months, e);
  }

  totals.totalInstrument = totals.actualInstrument + totals.simulatedInstrument;
  totals.totalLandings = totals.landingsDay + totals.landingsNight;

  // Round all values
  roundObject(totals);
  roundObject(last6Months);
  roundObject(last12Months);

  // --- Approach summary ---
  let totalApproaches = 0;
  const approachTypeMap = {};
  for (const e of all) {
    totalApproaches += (e.approachCount || 0);
    if (e.approachTypes) {
      for (const t of e.approachTypes) {
        const key = t.toUpperCase();
        approachTypeMap[key] = (approachTypeMap[key] || 0) + 1;
      }
    }
  }

  return {
    sectionI,
    sectionIV: {
      allTime: totals,
      last6Months,
      last12Months,
      totalApproaches,
      approachBreakdown: approachTypeMap,
      entryCount: all.length,
    },
    generatedAt: now.toISOString(),
  };
}

function createPeriodTotals() {
  return {
    totalTime: 0,
    picTime: 0,
    sicTime: 0,
    crossCountry: 0,
    nightTime: 0,
    actualInstrument: 0,
    simulatedInstrument: 0,
    landingsDay: 0,
    landingsNight: 0,
  };
}

function addToPeriod(period, entry) {
  period.totalTime += (entry.totalTime || 0);
  period.picTime += (entry.picTime || 0);
  period.sicTime += (entry.sicTime || 0);
  period.crossCountry += (entry.crossCountry || 0);
  period.nightTime += (entry.nightTime || 0);
  period.actualInstrument += (entry.actualInstrument || 0);
  period.simulatedInstrument += (entry.simulatedInstrument || 0);
  period.landingsDay += (entry.landingsDay || 0);
  period.landingsNight += (entry.landingsNight || 0);
}

function roundObject(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "number") {
      obj[key] = Math.round(obj[key] * 10) / 10;
    }
  }
}

module.exports = { build8710 };
