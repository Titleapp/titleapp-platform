"use strict";

/**
 * github.js — GitHub API bridge for Alex → CODE communication.
 *
 * Alex can create issues, list open issues, and add comments.
 * This closes the loop between conversations in Alex chat and tracked work in CODE.
 *
 * ENV vars required:
 *   GITHUB_TOKEN  — personal access token (repo scope, SOCIII-Inc org)
 *   GITHUB_REPO   — e.g. "SOCIII-Inc/titleapp-platform"
 *
 * To create a token:
 *   github.com → Settings → Developer settings → Personal access tokens → Fine-grained
 *   Repository: SOCIII-Inc/titleapp-platform
 *   Permissions: Issues (read + write), Contents (read)
 */

const GITHUB_API = "https://api.github.com";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "SOCIII-Inc/titleapp-platform";
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return { token, repo };
}

async function githubRequest(path, opts = {}) {
  const { token, repo } = getConfig();
  const fetch = (await import("node-fetch")).default;
  const url = path.startsWith("http") ? path : `${GITHUB_API}/repos/${repo}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub API error (${res.status}): ${err.message || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * createIssue — turn any Alex conversation into a tracked CODE task.
 */
async function createIssue({ title, body, labels = [], assignees = [] }) {
  return githubRequest("/issues", {
    method: "POST",
    body: JSON.stringify({ title, body, labels, assignees }),
  });
}

/**
 * listOpenIssues — surface open CODE issues into Alex context.
 */
async function listOpenIssues(opts = {}) {
  const { limit = 20, labels = "" } = opts;
  const qs = new URLSearchParams({ state: "open", per_page: limit, ...(labels ? { labels } : {}) });
  return githubRequest(`/issues?${qs}`);
}

/**
 * addComment — append to an existing issue (useful for logging Alex actions).
 */
async function addComment(issueNumber, body) {
  return githubRequest(`/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/**
 * getIssue — fetch a single issue by number.
 */
async function getIssue(issueNumber) {
  return githubRequest(`/issues/${issueNumber}`);
}

// ═══════════════════════════════════════════════════════════════
//  ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleCreateIssue(req, res) {
  const { title, body, labels, assignees } = req.body || {};
  if (!title) return res.status(400).json({ ok: false, error: "title required" });
  const issue = await createIssue({ title, body: body || "", labels, assignees });
  return res.json({ ok: true, number: issue.number, url: issue.html_url, title: issue.title });
}

async function handleListIssues(req, res) {
  const issues = await listOpenIssues({ limit: parseInt(req.query?.limit || "20"), labels: req.query?.labels || "" });
  return res.json({ ok: true, issues: (issues || []).map(i => ({ number: i.number, title: i.title, url: i.html_url, labels: i.labels?.map(l => l.name), createdAt: i.created_at })) });
}

async function handleAddComment(req, res) {
  const { issueNumber, body } = req.body || {};
  if (!issueNumber || !body) return res.status(400).json({ ok: false, error: "issueNumber and body required" });
  const comment = await addComment(issueNumber, body);
  return res.json({ ok: true, commentId: comment.id, url: comment.html_url });
}

module.exports = {
  createIssue,
  listOpenIssues,
  addComment,
  getIssue,
  handleCreateIssue,
  handleListIssues,
  handleAddComment,
};
