/**
 * landingHandoff.js — Handles URL params from Cloudflare landing page redirect.
 *
 * ?q=[message]    — Pre-populate Alex chat and auto-send
 * ?search=[query] — Pre-populate marketplace search
 * ?vertical=[name] — Open marketplace filtered to vertical
 *
 * Call once on app mount. Stores values in sessionStorage, clears URL params.
 */

export function processLandingHandoff() {
  const params = new URLSearchParams(window.location.search);
  const result = { type: null, value: null };

  const q = params.get("q");
  const search = params.get("search");
  const vertical = params.get("vertical");

  if (q) {
    result.type = "chat";
    result.value = q;
    sessionStorage.setItem("ta_landing_chat", q);
  } else if (search) {
    result.type = "search";
    result.value = search;
    sessionStorage.setItem("ta_landing_search", search);
  } else if (vertical) {
    result.type = "vertical";
    result.value = vertical;
    sessionStorage.setItem("ta_landing_vertical", vertical);
  }

  // Clear handoff params from URL without reload
  if (result.type) {
    const url = new URL(window.location);
    url.searchParams.delete("q");
    url.searchParams.delete("search");
    url.searchParams.delete("vertical");
    const cleanUrl = url.pathname + (url.search || "");
    window.history.replaceState({}, "", cleanUrl);
  }

  return result;
}
