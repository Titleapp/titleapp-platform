/**
 * Returns the post-launch Alex message for addAssistantMessage().
 * @param {string} workerName
 * @param {boolean} isGame
 * @returns {string}
 */
export function getPostLaunchMessage(workerName, isGame) {
  const noun = isGame ? "game" : "worker";
  return `${workerName} is live. Nice work.\n\nBefore you share it widely — send it to 3 or 4 people you trust. Colleagues, friends, people who'll actually use it. Ask them what's confusing or missing.\n\nThe best ${noun}s get better with real feedback. I'll be here when you're ready to update it.`;
}
