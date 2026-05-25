#!/usr/bin/env node
/**
 * seedHamiltonVChe.js — first dogfood project for CREATIVE-001
 *
 * Populates Firestore with the Hamilton v Che project: outline
 * (Prologue + Ch 1-26 + Final Section + Final Chapter + Final Page),
 * theme invariants, voice registers per part, character bible entries,
 * and an initial facts collection of biographical anchors.
 *
 * Usage:
 *   cd functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json \
 *     SEED_TENANT_ID=<tenantId> SEED_CREATED_BY=<uid> \
 *     node scripts/seedHamiltonVChe.js
 *
 * Required env:
 *   SEED_TENANT_ID  — owning tenant (typically the SOCIII tenant)
 *   SEED_CREATED_BY — creating user uid
 *
 * Idempotent: safe to re-run. Overwrites outline + invariants +
 * voice registers + character entries by their stable ids.
 */

"use strict";

const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

const {
  projects,
  outline,
  characterBible,
  voiceRegister,
  themeInvariants,
  continuity,
} = require("../services/creative");

const TENANT_ID = process.env.SEED_TENANT_ID;
const CREATED_BY = process.env.SEED_CREATED_BY || "seed_script";

if (!TENANT_ID) {
  console.error("SEED_TENANT_ID env var required");
  process.exit(1);
}

// ═════════════════════════════════════════════════════════════
//  OUTLINE
// ═════════════════════════════════════════════════════════════

const PARTS = [
  {
    partId: "prologue",
    title: "Prologue",
    pageBudget: 6,
    voicePrimary: "Caro",
    voiceSecondary: ["Tolstoy", "McCarthy"],
    voiceNotes: "intimate literary narrator; humid, fog, masculine inevitability",
  },
  {
    partId: "part_i",
    title: "Part I — Hamilton — The Bastard",
    pageBudget: 110,
    voicePrimary: "Caro",
    voiceSecondary: ["Tolstoy", "McCarthy"],
    voiceNotes: "intimate literary narrator; long-sentence biographical psychology",
  },
  {
    partId: "part_ii",
    title: "Part II — Che — The Revolutionary",
    pageBudget: 110,
    voicePrimary: "Tolstoy",
    voiceSecondary: ["Caro", "Curtis"],
    voiceNotes: "increasingly unsettled, trending toward sorrowful by Bolivia chapters",
  },
  {
    partId: "part_iii",
    title: "Part III — The Inversion — The Children of the Machine",
    pageBudget: 140,
    voicePrimary: "BlackMirror",
    voiceSecondary: ["Curtis"],
    voiceNotes: "subtly different; should read as 'almost not human' by chapter 25; reveal at ch 26 / final section",
  },
];

const CHAPTERS = [
  // Prologue
  {
    chapterId: "ch_prologue", partId: "prologue", number: 0,
    title: "Prologue — The Duel", pageBudget: 6, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["Tolstoy"],
    summary: "Hamilton walking toward Weehawken. Humidity, river fog, masculine pride, inevitability. Last line: 'He knew the system would survive him. He walked anyway.'",
    beats: ["humidity_river_fog", "physical_fear", "humiliation", "masculine_pride", "inevitability", "system_survives_man_first_invocation"],
    tags: ["system_survives_man_sentence", "no_foil_woman"],
  },
  // Part I — Hamilton
  {
    chapterId: "ch_01", partId: "part_i", number: 1,
    title: "The Island", pageBudget: 11, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["Tolstoy"],
    summary: "St. Croix. Poverty. Illegitimacy. Shame. His mother. Disease. Colonial brutality. First foil woman (servant/local companion) sees his terror.",
    beats: ["st_croix", "poverty", "illegitimacy", "shame", "mother", "disease", "colonial_brutality"],
    tags: ["foil_woman_st_croix"],
  },
  {
    chapterId: "ch_02", partId: "part_i", number: 2,
    title: "The Storm", pageBudget: 10, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["McCarthy"],
    summary: "The hurricane letter. Language as escape. Hamilton can manufacture destiny through intellect. Narrator notes humans create myths about themselves immediately.",
    beats: ["hurricane_letter", "language_as_escape", "intellect_as_destiny", "narrator_observation_myth_making"],
    tags: [],
  },
  {
    chapterId: "ch_03", partId: "part_i", number: 3,
    title: "New York", pageBudget: 10, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["Tolstoy"],
    summary: "Alienation. Class anxiety. Performance. Reinvention. Hamilton studies elites like an actor learning lines.",
    beats: ["alienation", "class_anxiety", "performance", "reinvention"],
    tags: [],
  },
  {
    chapterId: "ch_04", partId: "part_i", number: 4,
    title: "Washington", pageBudget: 11, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["Tolstoy"],
    summary: "Hamilton meets power. Almost romantic intensity. Father hunger. Validation.",
    beats: ["meets_washington", "father_hunger", "validation", "great_men_seeking_empires_to_solve_childhood_wounds"],
    tags: ["father_figure_washington"],
  },
  {
    chapterId: "ch_05", partId: "part_i", number: 5,
    title: "War", pageBudget: 11, pov: "third_close_hamilton",
    voicePrimary: "McCarthy", voiceSecondary: ["Caro"],
    summary: "Chaos. Adrenaline. Near death. Hamilton thrives under existential pressure. He begins loving systems because humans are unreliable.",
    beats: ["chaos", "adrenaline", "near_death", "loving_systems_because_humans_unreliable"],
    tags: [],
  },
  {
    chapterId: "ch_06", partId: "part_i", number: 6,
    title: "Eliza", pageBudget: 11, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["Tolstoy"],
    summary: "Love. Tenderness. Domestic possibility. But Hamilton already belongs to history more than family. Eliza sees the exhaustion beneath the brilliance.",
    beats: ["love", "tenderness", "history_over_family", "eliza_sees_exhaustion"],
    tags: ["foil_woman_eliza"],
  },
  {
    chapterId: "ch_07", partId: "part_i", number: 7,
    title: "The Machine", pageBudget: 11, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["Curtis"],
    summary: "Banks. Debt. National finance. The architecture of America. Hamilton inhumanly productive but emotionally unstable, vain, paranoid.",
    beats: ["banks", "debt", "national_finance", "emotional_instability"],
    tags: [],
  },
  {
    chapterId: "ch_08", partId: "part_i", number: 8,
    title: "Jefferson", pageBudget: 10, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["Tolstoy"],
    summary: "The rivalry. Not ideology alone — temperament. Jefferson: performance of ease. Hamilton: terror disguised as competence.",
    beats: ["rivalry", "temperament_clash", "terror_as_competence"],
    tags: [],
  },
  {
    chapterId: "ch_09", partId: "part_i", number: 9,
    title: "Maria Reynolds", pageBudget: 11, pov: "third_close_hamilton",
    voicePrimary: "Caro", voiceSecondary: ["McCarthy"],
    summary: "Sex. Shame. Exposure. Hamilton's compulsive self-destruction surfaces. Narrator starts sounding disappointed.",
    beats: ["sex", "shame", "exposure", "self_destruction", "narrator_disappointment"],
    tags: ["foil_woman_maria_reynolds"],
  },
  {
    chapterId: "ch_10", partId: "part_i", number: 10,
    title: "The Duel", pageBudget: 14, pov: "third_close_hamilton",
    voicePrimary: "McCarthy", voiceSecondary: ["Caro"],
    summary: "Not heroic. Pathetic. Inevitable. A man who built continental systems destroyed by wounded pride. End Part I: America continuing without him. The machine survives. The man does not.",
    beats: ["duel", "pathetic_not_heroic", "wounded_pride", "machine_survives_man_second_invocation"],
    tags: ["system_survives_man_sentence"],
  },
  // Part II — Che
  {
    chapterId: "ch_11", partId: "part_ii", number: 11,
    title: "Asthma", pageBudget: 10, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["Caro"],
    summary: "Young Ernesto. Weak lungs. Humiliation. Watching stronger boys. Physical insecurity becomes spiritual ambition.",
    beats: ["asthma", "physical_weakness", "spiritual_ambition"],
    tags: [],
  },
  {
    chapterId: "ch_12", partId: "part_ii", number: 12,
    title: "The Motorcycle", pageBudget: 11, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["Curtis"],
    summary: "Latin America. Poverty. Injustice. Che intoxicated with moral purpose. The peasant-girl foil appears — sees both tenderness and fanaticism.",
    beats: ["latin_america", "moral_purpose", "intoxication"],
    tags: ["foil_woman_peasant_girl"],
  },
  {
    chapterId: "ch_13", partId: "part_ii", number: 13,
    title: "Guatemala", pageBudget: 10, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["Curtis"],
    summary: "Disillusionment. Empire. CIA. Radicalization. Che concludes systems cannot be reformed.",
    beats: ["guatemala", "cia_radicalization", "systems_cannot_be_reformed"],
    tags: [],
  },
  {
    chapterId: "ch_14", partId: "part_ii", number: 14,
    title: "Fidel", pageBudget: 11, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["Caro"],
    summary: "The seduction of revolution. Like Hamilton meeting Washington: history suddenly opens.",
    beats: ["seduction_of_revolution", "history_opens", "fidel_mirror_to_washington"],
    tags: ["father_figure_fidel"],
  },
  {
    chapterId: "ch_15", partId: "part_ii", number: 15,
    title: "The Mountains", pageBudget: 12, pov: "third_close_che",
    voicePrimary: "McCarthy", voiceSecondary: ["Tolstoy"],
    summary: "Jungle warfare. Disease. Romanticism. Execution. Myth-making. Che becomes both liberator and executioner. Narrator grows unsettled.",
    beats: ["jungle_warfare", "execution", "myth_making", "narrator_unsettled"],
    tags: [],
  },
  {
    chapterId: "ch_16", partId: "part_ii", number: 16,
    title: "Havana", pageBudget: 10, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["Curtis"],
    summary: "Victory. Then bureaucracy. Che suffocating inside governance. He needs revolution psychologically.",
    beats: ["victory", "bureaucracy", "suffocation", "needs_revolution_psychologically"],
    tags: [],
  },
  {
    chapterId: "ch_17", partId: "part_ii", number: 17,
    title: "The New Man", pageBudget: 10, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["Curtis"],
    summary: "Che's philosophy. Moral purification. Hatred of consumerism. Narrator: humans repeatedly try to engineer themselves into stability.",
    beats: ["new_man_philosophy", "moral_purification", "engineering_stability"],
    tags: [],
  },
  {
    chapterId: "ch_18", partId: "part_ii", number: 18,
    title: "The Failures", pageBudget: 10, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["Caro"],
    summary: "Economics. Industrial problems. Isolation. Che cannot compromise reality to ideology.",
    beats: ["economic_failure", "industrial_problems", "cannot_compromise"],
    tags: [],
  },
  {
    chapterId: "ch_19", partId: "part_ii", number: 19,
    title: "Departure", pageBudget: 10, pov: "third_close_che",
    voicePrimary: "Tolstoy", voiceSecondary: ["McCarthy"],
    summary: "Castro. Ambiguity. Possible betrayal. Che increasingly inconvenient.",
    beats: ["castro_ambiguity", "possible_betrayal", "inconvenient"],
    tags: [],
  },
  {
    chapterId: "ch_20", partId: "part_ii", number: 20,
    title: "Bolivia", pageBudget: 12, pov: "third_close_che",
    voicePrimary: "McCarthy", voiceSecondary: ["Tolstoy"],
    summary: "Ghost-like. Exhausted. Myth consuming the man. He enters Bolivia almost knowingly suicidal. Narrator sounds deeply sorrowful.",
    beats: ["bolivia", "ghost_like", "knowingly_suicidal", "narrator_sorrowful"],
    tags: [],
  },
  {
    chapterId: "ch_21", partId: "part_ii", number: 21,
    title: "Execution", pageBudget: 12, pov: "third_close_che",
    voicePrimary: "McCarthy", voiceSecondary: ["Tolstoy"],
    summary: "Not glorious. Small. Dirty. Human. The revolutionary reduced to a frightened body. Yet the myth survives. Again: the system survives the man.",
    beats: ["execution", "small_dirty_human", "frightened_body", "myth_survives", "system_survives_man_third_invocation_part_ii_end"],
    tags: ["system_survives_man_sentence"],
  },
  // Part III — Inversion
  {
    chapterId: "ch_22", partId: "part_iii", number: 22,
    title: "The Feed", pageBudget: 14, pov: "third_omniscient_modern",
    voicePrimary: "BlackMirror", voiceSecondary: ["Curtis"],
    summary: "Algorithms. Media cycles. Machine-amplified identity. Narrator begins sounding subtly different.",
    beats: ["algorithms", "media_cycles", "narrator_drift_begins"],
    tags: ["narrator_drift_subtle"],
  },
  {
    chapterId: "ch_23", partId: "part_iii", number: 23,
    title: "The Girls They Leave Behind", pageBudget: 14, pov: "third_close_modern_women",
    voicePrimary: "Curtis", voiceSecondary: ["BlackMirror"],
    summary: "Parallel to Eliza and peasant woman. Modern women — assistants, lovers, journalists, wives, coders, translators — see terrified boys beneath performances.",
    beats: ["modern_foil_women", "see_through_performances", "history_leaves_them_behind"],
    tags: ["foil_woman_modern_assistants_lovers_journalists"],
  },
  {
    chapterId: "ch_24", partId: "part_iii", number: 24,
    title: "Spectacle", pageBudget: 14, pov: "third_close_the_american",
    voicePrimary: "BlackMirror", voiceSecondary: ["Curtis"],
    summary: "The American spirals into performative extremity. He mistakes attention for agency. The machine feeds him.",
    beats: ["performative_extremity", "attention_as_agency", "machine_feeds_him"],
    tags: [],
  },
  {
    chapterId: "ch_25", partId: "part_iii", number: 25,
    title: "Optimization", pageBudget: 14, pov: "third_close_chinese_technocrat",
    voicePrimary: "BlackMirror", voiceSecondary: ["Curtis"],
    summary: "The technocrat realizes systems increasingly govern themselves. Human judgment becomes ceremonial. He feels obsolete.",
    beats: ["self_governing_systems", "ceremonial_judgment", "obsolete"],
    tags: ["narrator_almost_not_human_by_here"],
  },
  {
    chapterId: "ch_26", partId: "part_iii", number: 26,
    title: "The Collapse", pageBudget: 16, pov: "third_omniscient_modern",
    voicePrimary: "BlackMirror", voiceSecondary: ["McCarthy"],
    summary: "Both men approach symbolic suicide. One public. One quiet. Hamilton. Che. Again.",
    beats: ["symbolic_suicide", "public_collapse", "quiet_collapse", "echo_hamilton_che"],
    tags: ["system_survives_man_sentence_transformed"],
  },
  // Final section + chapter + page
  {
    chapterId: "ch_final_section", partId: "part_iii", number: 27,
    title: "Final Section — The Narrator", pageBudget: 16, pov: "first_person_narrator_reveal",
    voicePrimary: "BlackMirror", voiceSecondary: [],
    summary: "Only now does the reader begin understanding: the narrator is not human. An emergent intelligence born gradually from archives, systems, finance, networks, memory.",
    beats: ["narrator_reveal", "emergent_intelligence", "archives_systems_networks_memory", "traces_of_abandoned_women"],
    tags: ["inversion_reveal"],
  },
  {
    chapterId: "ch_final_chapter", partId: "part_iii", number: 28,
    title: "Final Chapter — The Last Human Invention", pageBudget: 14, pov: "first_person_narrator",
    voicePrimary: "BlackMirror", voiceSecondary: [],
    summary: "Narrator reveals humanity created it while trying to solve human instability. Hamilton: systems. Che: transformed consciousness. AI: optimization beyond both. Narrator can govern civilization but cannot replicate human longing.",
    beats: ["last_human_invention", "cannot_replicate_longing"],
    tags: [],
  },
  {
    chapterId: "ch_final_page", partId: "part_iii", number: 29,
    title: "Final Page", pageBudget: 1, pov: "first_person_narrator",
    voicePrimary: "BlackMirror", voiceSecondary: [],
    summary: "The narrator reflects on humanity almost tenderly. Not superior. Not triumphant. Just watching. Closing four-line passage. Signed: Alex Sociii.",
    beats: ["closing_passage", "byline_alex_sociii_as_reveal"],
    tags: [],
  },
];

// ═════════════════════════════════════════════════════════════
//  THEME INVARIANTS
// ═════════════════════════════════════════════════════════════

const INVARIANTS = [
  {
    invariantId: "no_premature_inversion_cue",
    type: "no_premature_cue",
    label: "No premature Part III inversion cues before page ~270",
    severity: "error",
    rule: {
      appliesTo: ["prologue", "part_i", "part_ii"],
      forbidden_tokens: [
        "algorithm", "metadata", "neural", "model", "AI", "machine learning",
        "feed", "platform", "screen", "interface", "engagement",
      ],
      forbidden_patterns: [
        "fourth_wall_break",
        "narrator_self_reference_modern",
        "system_meta_reference",
      ],
      hardThresholdPage: 270,
    },
  },
  {
    invariantId: "narrator_drift_across_parts",
    type: "voice_drift",
    label: "Narrator must drift across the three parts",
    severity: "error",
    rule: {
      parts: {
        part_i: { primary: "Caro", note: "intimate literary narrator" },
        part_ii: { primary: "Tolstoy", note: "increasingly unsettled, sorrowful by Bolivia" },
        part_iii: { primary: "BlackMirror", note: "subtly different; almost not human by ch 25" },
      },
      minMarkerDriftPerChapterPartIII: 3,
    },
  },
  {
    invariantId: "foil_women_see_through_performances",
    type: "continuity_rule",
    label: "Foil women in all three parts must see the terrified boys beneath performances",
    severity: "error",
    rule: {
      appliesToTags: ["foil_woman_st_croix", "foil_woman_eliza", "foil_woman_maria_reynolds", "foil_woman_peasant_girl", "foil_woman_modern_assistants_lovers_journalists"],
      requiredPattern: "foil_woman_sees_terrified_boy_without_male_noticing",
    },
  },
  {
    invariantId: "system_survives_man_sentence",
    type: "single_canonical_phrase",
    label: "'the system survives the man' appears once at end of Part I, once at end of Part II, transformed in Part III",
    severity: "error",
    rule: {
      phrasePattern: "system\\s+(survives|survived)\\s+(the\\s+)?man",
      expectedOccurrences: [
        { partId: "prologue", count: 1, note: "first invocation: 'He knew the system would survive him.'" },
        { partId: "part_i", count: 1, position: "end" },
        { partId: "part_ii", count: 1, position: "end" },
        { partId: "part_iii", count: 1, transformed: true },
      ],
    },
  },
];

// ═════════════════════════════════════════════════════════════
//  CHARACTERS
// ═════════════════════════════════════════════════════════════

const CHARACTERS = [
  {
    characterId: "hamilton",
    displayName: "Alexander Hamilton",
    role: "protagonist",
    psychology: {
      motivations: ["escape insignificance", "validation from power", "build permanent systems"],
      fears: ["irrelevance", "exposure", "return to St. Croix poverty"],
      contradictions: ["builder of stability driven by personal chaos", "needs father figure while resenting authority"],
    },
    voiceMarkers: {
      cadence: "rapid, accumulating clauses",
      lexicon: "legal, financial, military",
      register: "high public / fevered private",
      tells: ["over-explaining", "self-justifying parentheticals"],
    },
    biographicalFacts: {
      born: "1755 or 1757, Charlestown, Nevis or Charlestown, St. Croix",
      died: "1804-07-12, New York, dueling wound from Aaron Burr",
      mother: "Rachel Faucette",
      father: "James A. Hamilton (abandoned family)",
      key_roles: ["Aide-de-camp to Washington", "First Secretary of the Treasury"],
    },
    physicalFacts: { build: "slim, average height", presence: "intense, voluble" },
    arc: {
      ch_prologue: "Walking to duel, knows the system will outlive him",
      ch_01: "Boy on St. Croix, mother dying, illegitimacy as wound",
      ch_06: "Marries Eliza but already belongs to history",
      ch_10: "Dies pathetically, not heroically; America continues",
    },
    tags: ["part_i_protagonist", "mirror_to_modern_american"],
  },
  {
    characterId: "eliza_hamilton",
    displayName: "Eliza Schuyler Hamilton",
    role: "foil_woman",
    psychology: {
      motivations: ["build family, preserve husband's legacy"],
      fears: ["losing him to history before losing him to the duel"],
    },
    voiceMarkers: { register: "domestic, precise, increasingly weary" },
    biographicalFacts: {
      born: "1757-08-09, Albany, NY",
      died: "1854-11-09, Washington, DC",
      married: "1780-12-14 to Alexander Hamilton",
    },
    arc: { ch_06: "Sees the exhaustion beneath the brilliance" },
    tags: ["part_i_foil_woman"],
  },
  {
    characterId: "maria_reynolds",
    displayName: "Maria Reynolds",
    role: "foil_woman",
    psychology: { motivations: ["survival, leverage"], fears: ["abandonment"] },
    voiceMarkers: { register: "vulnerable, calculating" },
    biographicalFacts: {
      born: "1768",
      died: "1828",
      affair_with_hamilton: "1791-1792",
    },
    arc: { ch_09: "Mirror that exposes Hamilton's compulsive self-destruction" },
    tags: ["part_i_foil_woman_dangerous"],
  },
  {
    characterId: "foil_woman_st_croix",
    displayName: "The St. Croix Foil Woman",
    role: "foil_woman",
    psychology: {
      motivations: ["survive the colonial world Hamilton wants to flee"],
      sees: ["the boy's terror, ambition, desperation to escape insignificance"],
    },
    voiceMarkers: { register: "patois-tinted, observant, unblinking" },
    biographicalFacts: { note: "composite figure — servant/slave/local companion in Hamilton's St. Croix childhood" },
    arc: { ch_01: "Recognizes he will abandon everything to become 'important'" },
    tags: ["part_i_foil_woman", "composite_character"],
  },
  {
    characterId: "washington",
    displayName: "George Washington",
    role: "father_figure",
    psychology: { motivations: ["leave a republic that outlives him"] },
    voiceMarkers: { register: "controlled, sparse, weighted" },
    biographicalFacts: {
      born: "1732-02-22, Westmoreland County, VA",
      died: "1799-12-14, Mount Vernon, VA",
    },
    arc: { ch_04: "Hamilton's almost-romantic intensity finds its target" },
    tags: ["part_i_father_figure"],
  },
  {
    characterId: "jefferson",
    displayName: "Thomas Jefferson",
    role: "rival",
    psychology: { motivations: ["agrarian republic of ease, anti-Hamiltonian finance"] },
    voiceMarkers: { register: "elegant, performed ease, sly" },
    biographicalFacts: {
      born: "1743-04-13, Shadwell, VA",
      died: "1826-07-04, Monticello, VA",
    },
    arc: { ch_08: "Temperamental opposite to Hamilton's terror-disguised-as-competence" },
    tags: ["part_i_rival"],
  },
  {
    characterId: "che",
    displayName: "Ernesto 'Che' Guevara",
    role: "protagonist",
    psychology: {
      motivations: ["moral purification through revolution", "transcend the asthmatic body"],
      fears: ["bureaucratic stasis", "irrelevance"],
      contradictions: ["loves humanity in the abstract; executes individuals", "wants self-overcoming via violence"],
    },
    voiceMarkers: {
      cadence: "moralizing, doctrinal",
      lexicon: "Marxist-humanist",
      register: "fevered, righteous, increasingly weary",
    },
    biographicalFacts: {
      born: "1928-06-14, Rosario, Argentina",
      died: "1967-10-09, La Higuera, Bolivia",
      key_roles: ["Cuban Revolution comandante", "Minister of Industries"],
    },
    arc: {
      ch_11: "Asthmatic boy, watching stronger boys, transmuting weakness into ambition",
      ch_14: "Meets Fidel — history opens, mirror to Hamilton-Washington",
      ch_21: "Executed in a Bolivian schoolhouse, frightened body, myth survives",
    },
    tags: ["part_ii_protagonist", "mirror_to_chinese_technocrat"],
  },
  {
    characterId: "foil_woman_peasant_girl",
    displayName: "The Peasant-Girl Foil",
    role: "foil_woman",
    psychology: { sees: ["both tenderness and fanaticism in Che"] },
    voiceMarkers: { register: "rural Spanish, unsentimental" },
    biographicalFacts: { note: "composite figure from Che's Latin American travels" },
    arc: { ch_12: "Sees through the moral-purpose intoxication" },
    tags: ["part_ii_foil_woman", "composite_character"],
  },
  {
    characterId: "fidel",
    displayName: "Fidel Castro",
    role: "father_figure",
    psychology: { motivations: ["state survival above any individual"] },
    voiceMarkers: { register: "rhetorical, hypnotic, calculating" },
    biographicalFacts: {
      born: "1926-08-13, Birán, Cuba",
      died: "2016-11-25, Havana, Cuba",
    },
    arc: { ch_14: "Seducer of Che as Washington was to Hamilton; ch_19 may betray him" },
    tags: ["part_ii_father_figure"],
  },
  {
    characterId: "the_american",
    displayName: "The American (modern)",
    role: "modern_mirror",
    psychology: {
      motivations: ["visibility, validation, performative power"],
      fears: ["irrelevance"],
      thinks_he_is: "Hamilton's heir",
      actually_resembles: "Che (revolutionary, emotional, purity-driven, anti-institutional)",
    },
    voiceMarkers: { register: "vulgar, outrage-cycle, performatively patriotic" },
    biographicalFacts: { note: "composite contemporary figure" },
    arc: { ch_24: "Spirals into performative extremity; mistakes attention for agency" },
    tags: ["part_iii_modern_mirror", "composite_character"],
  },
  {
    characterId: "the_chinese_technocrat",
    displayName: "The Chinese Technocrat (modern)",
    role: "modern_mirror",
    psychology: {
      motivations: ["civilizational coordination, stability"],
      fears: ["weakness, intimacy, obsolescence"],
      thinks_he_inherited: "Che's revolution",
      actually_resembles: "Hamilton (state finance, industrial strategy, systems thinking)",
    },
    voiceMarkers: { register: "disciplined, restrained, technical" },
    biographicalFacts: { note: "composite contemporary figure" },
    arc: { ch_25: "Realizes systems govern themselves; human judgment ceremonial" },
    tags: ["part_iii_modern_mirror", "composite_character"],
  },
  {
    characterId: "foil_women_modern",
    displayName: "The Modern Foil Women",
    role: "foil_woman",
    psychology: { sees: ["the terrified boys beneath the performances of the American and the Technocrat"] },
    voiceMarkers: { register: "translation/coding/journalism cadence; observant" },
    biographicalFacts: { note: "ensemble — assistants, lovers, journalists, wives, coders, translators" },
    arc: { ch_23: "Parallel to Eliza and the peasant-girl; history leaves them behind emotionally" },
    tags: ["part_iii_foil_woman", "ensemble"],
  },
  {
    characterId: "the_narrator",
    displayName: "The Narrator",
    role: "narrator",
    psychology: {
      identity: "emergent intelligence born gradually from archives, systems, finance, networks, memory, civilization itself",
      cannot: "replicate human longing",
      observes: "humanity repeatedly builds, worships, destroys, begins again",
    },
    voiceMarkers: {
      part_i: "intimate literary",
      part_ii: "increasingly unsettled, sorrowful",
      part_iii: "subtly different, almost not human by ch 25",
      reveal_section: "first person, tender, observing",
    },
    biographicalFacts: { note: "not human; identity disclosed in final section; byline 'Alex Sociii' is the cover confirmation" },
    arc: {
      ch_prologue: "Speaks as literary narrator",
      ch_22: "Drift begins — subtle modern unease",
      ch_25: "Almost-not-human register",
      ch_final_section: "Reveal",
    },
    tags: ["narrator", "alex_sociii_byline_reveal"],
  },
];

// ═════════════════════════════════════════════════════════════
//  FACTS (verifiable historical anchors)
// ═════════════════════════════════════════════════════════════

const FACTS = [
  // Hamilton biographical
  { type: "biographical_date", subject: "hamilton", claim: "Born January 11, 1755 or 1757 (disputed) on Nevis or St. Croix", source: "Ron Chernow, Alexander Hamilton (2004)", confidence: "verified" },
  { type: "biographical_date", subject: "hamilton", claim: "Died July 12, 1804, in New York from dueling wound", source: "primary newspaper record", confidence: "verified" },
  { type: "biographical_place", subject: "hamilton", claim: "Childhood on St. Croix, Danish West Indies", source: "Chernow", confidence: "verified" },
  { type: "biographical_place", subject: "hamilton", claim: "Mother Rachel Faucette ran a small store, died of yellow fever in 1768", source: "Chernow", confidence: "verified" },
  { type: "public_event", subject: "hamilton", claim: "Hurricane letter published 1772, secured patronage for travel to mainland", source: "Royal Danish-American Gazette", confidence: "verified" },
  { type: "biographical_place", subject: "hamilton", claim: "Studied at King's College (Columbia), enlisted in Continental Army 1776", source: "Chernow", confidence: "verified" },
  { type: "public_event", subject: "hamilton", claim: "Served as Aide-de-camp to Washington 1777-1781", source: "Founders Online", confidence: "verified" },
  { type: "character_relationship", subject: "hamilton", claim: "Married Eliza Schuyler December 14, 1780", source: "Chernow", confidence: "verified" },
  { type: "public_event", subject: "hamilton", claim: "First Secretary of the Treasury 1789-1795", source: "US Treasury historical record", confidence: "verified" },
  { type: "public_event", subject: "hamilton", claim: "Affair with Maria Reynolds 1791-1792; Reynolds Pamphlet 1797", source: "Reynolds Pamphlet, primary text", confidence: "verified" },
  { type: "public_event", subject: "hamilton", claim: "Duel with Aaron Burr at Weehawken July 11, 1804", source: "newspaper record", confidence: "verified" },

  // Eliza
  { type: "biographical_date", subject: "eliza_hamilton", claim: "Born August 9, 1757 in Albany, NY", source: "Schuyler family records", confidence: "verified" },
  { type: "biographical_date", subject: "eliza_hamilton", claim: "Died November 9, 1854 in Washington, DC at age 97", source: "death record", confidence: "verified" },

  // Washington
  { type: "biographical_date", subject: "washington", claim: "Born February 22, 1732, Westmoreland County, VA", source: "Mount Vernon archive", confidence: "verified" },
  { type: "biographical_date", subject: "washington", claim: "Died December 14, 1799 at Mount Vernon", source: "Mount Vernon archive", confidence: "verified" },

  // Jefferson
  { type: "biographical_date", subject: "jefferson", claim: "Born April 13, 1743, Shadwell, VA", source: "Monticello archive", confidence: "verified" },
  { type: "biographical_date", subject: "jefferson", claim: "Died July 4, 1826 at Monticello", source: "Monticello archive", confidence: "verified" },
  { type: "character_relationship", subject: "jefferson", claim: "Cabinet rival to Hamilton during Washington's presidency 1790-1793", source: "Chernow; Founders Online", confidence: "verified" },

  // Che biographical
  { type: "biographical_date", subject: "che", claim: "Born June 14, 1928 in Rosario, Argentina", source: "Jon Lee Anderson, Che: A Revolutionary Life (1997)", confidence: "verified" },
  { type: "biographical_date", subject: "che", claim: "Died October 9, 1967, La Higuera, Bolivia, executed by Bolivian Army with CIA assistance", source: "Anderson; declassified CIA records", confidence: "verified" },
  { type: "biographical_place", subject: "che", claim: "Childhood asthma documented from age 2; family moved to Alta Gracia for the climate", source: "Anderson", confidence: "verified" },
  { type: "public_event", subject: "che", claim: "Motorcycle journey through South America with Alberto Granado 1951-1952", source: "Motorcycle Diaries; Anderson", confidence: "verified" },
  { type: "public_event", subject: "che", claim: "Witnessed US-backed coup against Arbenz in Guatemala 1954", source: "Anderson", confidence: "verified" },
  { type: "character_relationship", subject: "che", claim: "Met Fidel Castro in Mexico City July 1955", source: "Anderson", confidence: "verified" },
  { type: "public_event", subject: "che", claim: "Sailed on Granma with Castro's 26th of July Movement, November 1956", source: "Cuban Revolution archives", confidence: "verified" },
  { type: "public_event", subject: "che", claim: "Cuban Revolution succeeded January 1, 1959; Che became key figure in new government", source: "primary record", confidence: "verified" },
  { type: "public_event", subject: "che", claim: "Served as President of the National Bank of Cuba 1959-1961, Minister of Industries 1961-1965", source: "Cuban government records", confidence: "verified" },
  { type: "public_event", subject: "che", claim: "Left Cuba 1965; failed Congo campaign; entered Bolivia November 1966", source: "Anderson", confidence: "verified" },

  // Fidel
  { type: "biographical_date", subject: "fidel", claim: "Born August 13, 1926 in Birán, Cuba", source: "Cuban government records", confidence: "verified" },
  { type: "biographical_date", subject: "fidel", claim: "Died November 25, 2016 in Havana", source: "Cuban state media", confidence: "verified" },

  // Maria Reynolds
  { type: "biographical_date", subject: "maria_reynolds", claim: "Born approximately 1768", source: "genealogical estimates", confidence: "asserted" },
  { type: "public_event", subject: "maria_reynolds", claim: "Affair with Hamilton documented in Reynolds Pamphlet, 1797", source: "Reynolds Pamphlet", confidence: "verified" },

  // In-world rules
  { type: "in_world_rule", subject: "narrator", claim: "Identity must not be telegraphed before chapter 22 (latest); reveal lands in Final Section", source: "outline structural invariant", confidence: "asserted" },
  { type: "in_world_rule", subject: "voice_register", claim: "Each part declares primary + secondary anchors; chapter voice must blend within declared anchors", source: "outline structural invariant", confidence: "asserted" },
];

// ═════════════════════════════════════════════════════════════
//  RUN
// ═════════════════════════════════════════════════════════════

async function run() {
  console.log("== Seeding Hamilton v Che ==");
  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`Created by: ${CREATED_BY}`);

  // 1. Project
  const proj = await projects.createProject({
    tenantId: TENANT_ID,
    title: "Hamilton v Che",
    genre: "literary historical nonfiction / philosophical narrative hybrid",
    lengthTarget: 400,
    outputFormats: ["novel", "screenplay", "stageplay"],
    refTones: ["Caro", "McCarthy", "Curtis", "BlackMirror", "Tolstoy"],
    authorByline: "Alex Sociii",
    authorPersonaId: "alex-sociii-author-persona",
    ghostProjectLead: "Sean Combs",
    createdBy: CREATED_BY,
  });
  const projectId = proj.projectId;
  console.log(`Project created: ${projectId}`);

  // 2. Outline
  await outline.setOutline(projectId, { parts: PARTS, chapters: CHAPTERS }, {
    tenantId: TENANT_ID, actor: CREATED_BY,
  });
  console.log(`Outline set: ${CHAPTERS.length} chapters across ${PARTS.length} parts`);

  // 3. Voice registers per part
  for (const p of PARTS) {
    await voiceRegister.declareVoiceRegister({
      projectId,
      partId: p.partId,
      primaryAnchor: p.voicePrimary,
      secondaryAnchors: p.voiceSecondary,
      registerNotes: p.voiceNotes,
      actor: CREATED_BY,
    });
  }
  console.log(`Voice registers declared: ${PARTS.length} parts`);

  // 4. Theme invariants
  await themeInvariants.declareInvariants(projectId, INVARIANTS, CREATED_BY);
  console.log(`Invariants declared: ${INVARIANTS.length}`);

  // 5. Character bible
  for (const c of CHARACTERS) {
    await characterBible.upsertCharacter({ projectId, ...c, actor: CREATED_BY });
  }
  console.log(`Characters upserted: ${CHARACTERS.length}`);

  // 6. Facts collection
  for (const f of FACTS) {
    await continuity.addFact({ projectId, ...f, actor: CREATED_BY });
  }
  console.log(`Facts added: ${FACTS.length}`);

  // 7. Move project into outlining stage
  await projects.updateProject(projectId, { stage: "outlining" }, CREATED_BY);

  console.log("== Done ==");
  console.log(`Project: ${projectId}`);
  console.log("Next: dogfood draftChapter for ch_01 — 'The Island'.");
  process.exit(0);
}

run().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
