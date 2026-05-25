"use strict";

/**
 * creative/marketing/pressList.js — CREATIVE-001 Phase D
 *
 * Build the literary press target list for a creative project.
 *
 * v1: ships with a hard-coded canonical literary press list of ~30
 * outlets that any serious literary debut would want on the radar.
 * The contacts service is the integration target for v1.1 — at that
 * point this function pulls from contacts/{tenantId} where category
 * == "literary_press" and merges with the canonical list.
 *
 * Firestore:
 *   creativeProjects/{projectId}/pressLists/{listId}
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("../projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_SEGMENTS = [
  "literary_print",    // NYRB, Paris Review, n+1, etc.
  "trade",             // PW, Kirkus, Library Journal
  "newspaper_books",   // NYT Books, WSJ, FT, Guardian
  "magazine_books",    // New Yorker, Atlantic, Harper's
  "online_books",      // LitHub, Electric Lit, Millions
  "podcast_books",     // skip for Alex Sociii per persona rules
  "translation_rights",
];

// Canonical literary press list — the outlets a serious literary debut
// targets. Not exhaustive; v1.1 merges this with tenant-specific
// contacts from the contacts service.
const CANONICAL_LITERARY_PRESS = [
  // literary_print
  { outlet: "The New York Review of Books", segment: "literary_print", url: "https://www.nybooks.com" },
  { outlet: "The Paris Review", segment: "literary_print", url: "https://www.theparisreview.org" },
  { outlet: "n+1", segment: "literary_print", url: "https://www.nplusonemag.com" },
  { outlet: "The Times Literary Supplement", segment: "literary_print", url: "https://www.the-tls.co.uk" },
  { outlet: "London Review of Books", segment: "literary_print", url: "https://www.lrb.co.uk" },
  { outlet: "Bookforum", segment: "literary_print", url: "https://www.bookforum.com" },
  { outlet: "The Yale Review", segment: "literary_print", url: "https://yalereview.org" },
  { outlet: "Granta", segment: "literary_print", url: "https://granta.com" },

  // trade
  { outlet: "Publishers Weekly", segment: "trade", url: "https://www.publishersweekly.com" },
  { outlet: "Kirkus Reviews", segment: "trade", url: "https://www.kirkusreviews.com" },
  { outlet: "Library Journal", segment: "trade", url: "https://www.libraryjournal.com" },
  { outlet: "Booklist", segment: "trade", url: "https://www.booklistonline.com" },
  { outlet: "Shelf Awareness", segment: "trade", url: "https://www.shelf-awareness.com" },

  // newspaper_books
  { outlet: "The New York Times Book Review", segment: "newspaper_books", url: "https://www.nytimes.com/section/books" },
  { outlet: "The Wall Street Journal Books", segment: "newspaper_books", url: "https://www.wsj.com/news/books-arts" },
  { outlet: "The Washington Post Book World", segment: "newspaper_books", url: "https://www.washingtonpost.com/entertainment/books" },
  { outlet: "Financial Times Books", segment: "newspaper_books", url: "https://www.ft.com/life-arts/books" },
  { outlet: "The Guardian Books", segment: "newspaper_books", url: "https://www.theguardian.com/books" },
  { outlet: "Los Angeles Times Books", segment: "newspaper_books", url: "https://www.latimes.com/entertainment-arts/books" },

  // magazine_books
  { outlet: "The New Yorker", segment: "magazine_books", url: "https://www.newyorker.com/books" },
  { outlet: "The Atlantic Books", segment: "magazine_books", url: "https://www.theatlantic.com/books" },
  { outlet: "Harper's Magazine", segment: "magazine_books", url: "https://harpers.org" },
  { outlet: "Vanity Fair Books", segment: "magazine_books", url: "https://www.vanityfair.com/style/books" },
  { outlet: "Vogue Books", segment: "magazine_books", url: "https://www.vogue.com/article/category/culture/books" },
  { outlet: "T Magazine", segment: "magazine_books", url: "https://www.nytimes.com/section/t-magazine" },

  // online_books
  { outlet: "LitHub", segment: "online_books", url: "https://lithub.com" },
  { outlet: "Electric Literature", segment: "online_books", url: "https://electricliterature.com" },
  { outlet: "The Millions", segment: "online_books", url: "https://themillions.com" },
  { outlet: "Words Without Borders", segment: "online_books", url: "https://wordswithoutborders.org" },
  { outlet: "Public Books", segment: "online_books", url: "https://www.publicbooks.org" },
];

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {string[]} [input.segments]            — defaults to all literary segments minus podcast
 * @param {boolean} [input.recluseAuthor]        — defaults to project.authorByline === "Alex Sociii"
 * @param {string} [input.actor]
 */
async function buildPressTargetList(input) {
  const { projectId, segments = null, actor = null } = input;
  if (!projectId) throw new Error("buildPressTargetList: projectId required");

  const project = await projects.getProject(projectId);
  if (!project) throw new Error(`buildPressTargetList: project ${projectId} not found`);

  const recluseAuthor = typeof input.recluseAuthor === "boolean"
    ? input.recluseAuthor
    : (project.authorByline === "Alex Sociii");

  // Resolve segment filter
  let segmentFilter;
  if (Array.isArray(segments) && segments.length > 0) {
    for (const s of segments) {
      if (!VALID_SEGMENTS.includes(s)) throw new Error(`buildPressTargetList: invalid segment ${s}`);
    }
    segmentFilter = new Set(segments);
  } else {
    // Default: every literary segment minus podcast (persona rule)
    segmentFilter = new Set(VALID_SEGMENTS.filter(s => s !== "podcast_books"));
  }
  if (recluseAuthor) segmentFilter.delete("podcast_books");

  const targets = CANONICAL_LITERARY_PRESS.filter(p => segmentFilter.has(p.segment));

  // TODO v1.1: merge with tenant-specific contacts from the contacts
  // service where category == "literary_press". Apollo can prospect
  // for individual editors/critics by name + outlet — that hookup is a
  // v1.1 addition with credit accounting via dataFeeMiddleware.

  const listId = `press_${crypto.randomBytes(8).toString("hex")}`;

  await getDb().collection("creativeProjects").doc(projectId)
    .collection("pressLists").doc(listId).set({
      listId,
      projectId,
      segments: Array.from(segmentFilter),
      recluseAuthor,
      targets,
      targetCount: targets.length,
      stub: true,
      created_at: ts(),
      updated_at: ts(),
      created_by: actor,
    });

  await projects.recordEvent(projectId, "press.listBuild", {
    listId, targetCount: targets.length, segments: Array.from(segmentFilter),
  }, actor);

  return { ok: true, projectId, listId, targetCount: targets.length, targets };
}

async function getPressList(projectId, listId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("pressLists").doc(listId).get();
  return snap.exists ? snap.data() : null;
}

module.exports = {
  buildPressTargetList,
  getPressList,
  CANONICAL_LITERARY_PRESS,
  VALID_SEGMENTS,
};
