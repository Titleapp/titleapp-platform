"use strict";

/**
 * NOTAM Cache — platform-wide 30-minute cache per airport ICAO.
 *
 * One Notamify API call per airport per 30 minutes across all workers and subscribers.
 * Stored in Firestore notamCache/{airportICAO}.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get NOTAMs for an airport, using cache if fresh.
 * @param {string} icao - Airport ICAO code (e.g. "KJFK")
 * @param {Function} fetchFn - async function that calls Notamify and returns NOTAMs
 * @returns {Promise<{ data: any, cached: boolean }>}
 */
async function getCachedNotams(icao, fetchFn) {
  const db = getDb();
  const cacheRef = db.doc(`notamCache/${icao.toUpperCase()}`);
  const snap = await cacheRef.get();

  if (snap.exists) {
    const cached = snap.data();
    const age = Date.now() - (cached.fetchedAt?._seconds ? cached.fetchedAt._seconds * 1000 : cached.fetchedAtMs || 0);
    if (age < CACHE_TTL_MS) {
      return { data: cached.notams, cached: true };
    }
  }

  // Cache miss or stale — fetch fresh
  const notams = await fetchFn(icao);

  await cacheRef.set({
    icao: icao.toUpperCase(),
    notams,
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
    fetchedAtMs: Date.now(),
  });

  return { data: notams, cached: false };
}

/**
 * Invalidate cache for an airport (admin use).
 * @param {string} icao
 */
async function invalidateNotamCache(icao) {
  const db = getDb();
  await db.doc(`notamCache/${icao.toUpperCase()}`).delete();
}

module.exports = { getCachedNotams, invalidateNotamCache, CACHE_TTL_MS };
