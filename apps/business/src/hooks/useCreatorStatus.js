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
  try {
    const res = await fetch(`${API_BASE}/api?path=/v1/creator:profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.ok || !data.profile) {
      return { status: "none", profile: null };
    }
    const p = data.profile;
    const status = p.profileComplete
      ? "active"
      : (p.title || p.bio || p.yearsExperience || p.credentials || p.linkedIn)
        ? "in_progress"
        : "none";
    return { status, profile: p };
  } catch (_) {
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
    if (_cache) {
      setState({ ...(_cache), loading: false });
      return;
    }
    if (!_inflight) {
      _inflight = fetchCreatorProfile().then(result => {
        _cache = { ...result, fetchedAt: Date.now() };
        return _cache;
      });
    }
    let alive = true;
    _inflight.then(result => {
      if (!alive) return;
      setState({ ...result, loading: false });
    });
    return () => { alive = false; };
  }, []);

  return state;
}
