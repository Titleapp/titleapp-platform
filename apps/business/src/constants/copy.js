/**
 * Central copy constants — canonical naming convention.
 * All UI labels that vary by worker type import from here.
 */

export const PANEL_NAMES = {
  left: "Nav",
  middle: "Chat",
  right: "Canvas",
};

const WORKER_LABELS = {
  cardTitle: "Worker Card",
  mySection: "My Workers",
  launchFirst: "Launch your first worker to start earning.",
  isLive: "is live",
  icon: "Worker icon",
  url: "Worker URL",
  publish: "Launch",
  updateTooltip: "Your worker gets better every time you update it",
};

const GAME_LABELS = {
  cardTitle: "Game Card",
  mySection: "My Games",
  launchFirst: "Launch your first game to start earning.",
  isLive: "is live",
  icon: "Game icon",
  url: "Game URL",
  publish: "Launch",
  updateTooltip: "Your game gets better every time you update it",
};

/**
 * Get the display label for a given key, switching on game mode.
 * @param {string} key — label key from WORKER_LABELS
 * @param {boolean} isGame — whether the worker is a game type
 * @returns {string}
 */
export function getLabel(key, isGame) {
  const labels = isGame ? GAME_LABELS : WORKER_LABELS;
  return labels[key] || WORKER_LABELS[key] || key;
}

/**
 * Get "worker" or "game" as a noun for inline copy.
 * @param {boolean} isGame
 * @returns {string}
 */
export function getWorkerNoun(isGame) {
  return isGame ? "game" : "worker";
}
