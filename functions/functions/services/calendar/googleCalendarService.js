"use strict";

/**
 * googleCalendarService.js — Calendar read/write operations
 *
 * Higher-level helpers on top of getAuthenticatedCalendarClient. Every event
 * created via SOCIII embeds a metadata block in the event description:
 *
 *   --- SOCIII metadata ---
 *   worker: <slug>
 *   project: <projectId>
 *   source: <chat|worker-auto|user>
 *   ---
 *
 * That block lets us recover worker/project attribution on read without
 * needing extended properties (which require additional permission scopes).
 *
 * Endpoints:
 *   GET  /v1/calendar:events          — list upcoming events
 *   POST /v1/calendar:events:create   — create an event
 *   POST /v1/calendar:events:propose  — worker-proposed event (pending approval)
 */

const { getAuthenticatedCalendarClient } = require("./googleCalendarAuth");

const METADATA_START = "--- SOCIII metadata ---";
const METADATA_END = "---";

function buildMetadataBlock({ workerSlug, projectId, source }) {
  if (!workerSlug && !projectId && !source) return "";
  const lines = [];
  if (workerSlug) lines.push(`worker: ${workerSlug}`);
  if (projectId)  lines.push(`project: ${projectId}`);
  if (source)     lines.push(`source: ${source}`);
  return `\n\n${METADATA_START}\n${lines.join("\n")}\n${METADATA_END}`;
}

function parseMetadataBlock(description) {
  if (!description) return {};
  const startIdx = description.indexOf(METADATA_START);
  if (startIdx < 0) return {};
  const after = description.substring(startIdx + METADATA_START.length);
  const endIdx = after.indexOf(METADATA_END);
  const block = endIdx >= 0 ? after.substring(0, endIdx) : after;
  const meta = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*(\w+):\s*(.+?)\s*$/);
    if (m) meta[m[1]] = m[2];
  }
  return meta;
}

function shapeEvent(g) {
  if (!g) return null;
  const description = g.description || "";
  const metadata = parseMetadataBlock(description);
  // Strip the metadata block from the user-visible description
  const cleanDescription = description.split(METADATA_START)[0].trim();

  return {
    id: g.id,
    summary: g.summary || "(no title)",
    description: cleanDescription || null,
    location: g.location || null,
    start: g.start ? (g.start.dateTime || g.start.date) : null,
    end:   g.end   ? (g.end.dateTime   || g.end.date)   : null,
    allDay: !!(g.start && g.start.date && !g.start.dateTime),
    htmlLink: g.htmlLink || null,
    status: g.status || null,
    attendees: Array.isArray(g.attendees) ? g.attendees.map(a => ({
      email: a.email, displayName: a.displayName, responseStatus: a.responseStatus,
    })) : [],
    workerSlug: metadata.worker || null,
    projectId:  metadata.project || null,
    source:     metadata.source || null,
    organizer: g.organizer ? { email: g.organizer.email, displayName: g.organizer.displayName } : null,
    created: g.created || null,
    updated: g.updated || null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  LIST UPCOMING EVENTS
// ═══════════════════════════════════════════════════════════════

async function listUpcomingEvents(userId, { calendarId = "primary", days = 7, maxResults = 50, workerSlug = null, projectId = null } = {}) {
  const calendar = await getAuthenticatedCalendarClient(userId);
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const result = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults,
  });

  let events = (result.data.items || []).map(shapeEvent);

  if (workerSlug) events = events.filter(e => e.workerSlug === workerSlug);
  if (projectId)  events = events.filter(e => e.projectId === projectId);

  return events;
}

async function handleListEvents(req, res, { userId }) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || "7", 10) || 7, 1), 90);
    const maxResults = Math.min(Math.max(parseInt(req.query.maxResults || "50", 10) || 50, 1), 250);
    const workerSlug = req.query.workerSlug || null;
    const projectId = req.query.projectId || null;
    const calendarId = req.query.calendarId || "primary";
    const events = await listUpcomingEvents(userId, { calendarId, days, maxResults, workerSlug, projectId });
    res.json({ ok: true, events, count: events.length });
  } catch (e) {
    const msg = e?.message || "Calendar list failed";
    if (msg.includes("not connected")) return res.status(400).json({ ok: false, error: msg, code: "calendar_not_connected" });
    console.error("calendar:events list failed:", e);
    res.status(500).json({ ok: false, error: msg });
  }
}

// ═══════════════════════════════════════════════════════════════
//  CREATE EVENT
// ═══════════════════════════════════════════════════════════════

function asDateTime(v) {
  if (!v) return null;
  if (typeof v === "string") {
    // YYYY-MM-DD only → date (all-day)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { date: v };
    return { dateTime: new Date(v).toISOString() };
  }
  if (v.dateTime) return { dateTime: new Date(v.dateTime).toISOString(), timeZone: v.timeZone };
  if (v.date)     return { date: v.date };
  return null;
}

async function createEvent(userId, {
  calendarId = "primary",
  summary,
  description = "",
  location,
  start,
  end,
  attendees = [],
  workerSlug = null,
  projectId = null,
  source = "user",
}) {
  if (!summary) throw new Error("summary is required");
  if (!start || !end) throw new Error("start and end are required");

  const calendar = await getAuthenticatedCalendarClient(userId);
  const resource = {
    summary,
    description: (description || "") + buildMetadataBlock({ workerSlug, projectId, source }),
    location: location || undefined,
    start: asDateTime(start),
    end:   asDateTime(end),
    attendees: Array.isArray(attendees) && attendees.length > 0
      ? attendees.map(a => typeof a === "string" ? { email: a } : a)
      : undefined,
  };

  const result = await calendar.events.insert({
    calendarId,
    resource,
    sendUpdates: attendees.length > 0 ? "all" : "none",
  });

  return shapeEvent(result.data);
}

async function handleCreateEvent(req, res, { userId }) {
  try {
    const event = await createEvent(userId, req.body || {});
    res.json({ ok: true, event });
  } catch (e) {
    const msg = e?.message || "Calendar create failed";
    if (msg.includes("not connected")) return res.status(400).json({ ok: false, error: msg, code: "calendar_not_connected" });
    if (msg.includes("required")) return res.status(400).json({ ok: false, error: msg });
    console.error("calendar:events create failed:", e);
    res.status(500).json({ ok: false, error: msg });
  }
}

// ═══════════════════════════════════════════════════════════════
//  PROPOSE EVENT — worker-emitted draft (pending user approval)
//  Stores in Firestore proposedCalendarEvents/, does NOT write to Google.
//  ChatPanel surfaces these as approval cards.
// ═══════════════════════════════════════════════════════════════

async function handleProposeEvent(req, res, { userId }) {
  try {
    const admin = require("firebase-admin");
    const db = admin.firestore();
    const { summary, description, location, start, end, attendees, workerSlug, projectId } = req.body || {};
    if (!summary || !start || !end) {
      return res.status(400).json({ ok: false, error: "summary, start, end required" });
    }

    const ref = await db.collection("proposedCalendarEvents").add({
      userId,
      status: "pending",
      summary,
      description: description || null,
      location: location || null,
      start, end,
      attendees: Array.isArray(attendees) ? attendees : [],
      workerSlug: workerSlug || null,
      projectId: projectId || null,
      source: "worker-auto",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true, proposalId: ref.id });
  } catch (e) {
    console.error("calendar:events propose failed:", e);
    res.status(500).json({ ok: false, error: e?.message || "Propose failed" });
  }
}

module.exports = {
  listUpcomingEvents,
  createEvent,
  handleListEvents,
  handleCreateEvent,
  handleProposeEvent,
  shapeEvent,
};
