/**
 * useCreatorStatus — light hook that fetches /v1/creator:profile once on
 * mount and caches the result in module scope so the Sidebar (and any
 * future state-aware surfaces) can render the creator section
 * differently for active creators vs. potential creators.
 *
 * Backend signal (functions/index.js:8141): profile.profileComplete is
 * true when both profile.title AND profile.bio are populated. We treat
 * that as the canonical "this user is an active creator" flag.
 *
 * Three states:
 *   - "none"        — not signed in OR no profile fetched yet OR no profile exists
 *   - "in_progress" — profile exists but profileComplete is false
 *   - "active"      — profile exists and profileComplete is true
 *
 * The result is cached for the lifetime of the page. To force a refetch
 * after a profile update, call refetchCreatorStatus() exported from this
 * module.
 *
 * No suspense, no react-query — keep the dependency surface flat for
 * this small UX bit.
 */

import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

let _cache = null; // { status, profile, fetchedAt }
let _inflight = null;

async function getToken() {
  if (window.__firebaseAuth?.currentUser) {
    try { return await window.__firebaseAuth.currentUser.getIdToken(true); } catch (_) {}
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

async function fetchCreatorProfile() {
  const token = await getToken();
  if (!token) return { status: "none", profile: null };

  // S52.28m — broaden the "active creator" signal beyond profileComplete.
  // Sean is actively building workers but hasn't filled bio/title yet. The
  // single profile check was too strict. Treat ANY of these as creator
  // intent: (1) localStorage flag set when user hit the creator journey
  // page once (S52.28g auto-completion marker), (2) profile has ANY field,
  // (3) profileComplete is true. This way the sidebar reflects intent, not
  // just polish.
  const journeyTouched = localStorage.getItem("ta_journey_autocomplete_signin") === "true";
  const manualToggle = localStorage.getItem("IS_CREATOR") === "true";

  try {
    const res = await fetch(`${API_BASE}/api?path=/v1/creator:profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const p = (data && data.ok && data.profile) ? data.profile : null;

    if (p?.profileComplete || manualToggle) {
      return { status: "active", profile: p };
    }
    if (p && (p.title || p.bio || p.yearsExperience || p.credentials || p.linkedIn)) {
      return { status: "active", profile: p };
    }
    if (journeyTouched) {
      // User has been on the journey at least once — they're actively
      // exploring being a creator, so show the multi-item view.
      return { status: "in_progress", profile: p };
    }
    return { status: "none", profile: p };
  } catch (_) {
    if (journeyTouched || manualToggle) {
      return { status: "in_progress", profile: null };
    }
    return { status: "none", profile: null };
  }
}

export function refetchCreatorStatus() {
  _cache = null;
  _inflight = null;
}

export default function useCreatorStatus() {
  const [state, setState] = useState(() => (_cache ? _cache : { status: "none", profile: null, loading: !_cache }));

  useEffect(() => {
    let alive = true;
    const apply = (result) => { if (alive) setState({ ...result, loading: false }); };
    const load = () => {
      if (_cache) { apply(_cache); return; }
      if (!_inflight) {
        _inflight = fetchCreatorProfile().then(result => { _cache = { ...result, fetchedAt: Date.now() }; return result; });
      }
      _inflight.then(apply);
    };
    load();
    // Fix the CREATOR-menu stale-render: the profile was sometimes fetched
    // before Firebase auth resolved a token, locking the module cache to a
    // premature "none" (the menu then only corrected on a nav click). Re-fetch
    // the moment a user signs in so the menu self-corrects.
    let unsub = null;
    const auth = typeof window !== "undefined" ? window.__firebaseAuth : null;
    if (auth && typeof auth.onAuthStateChanged === "function") {
      unsub = auth.onAuthStateChanged((u) => { if (u) { _cache = null; _inflight = null; load(); } });
    }
    return () => { alive = false; if (unsub) unsub(); };
  }, []);

  return state;
}
