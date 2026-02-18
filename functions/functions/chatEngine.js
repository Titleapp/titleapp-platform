'use strict';

// ──────────────────────────────────────────────────────────────
// chatEngine.js — TitleApp AI Conversation State Machine
//
// Pure logic module: no DOM, no HTML, no browser APIs.
// Extracted from ~/titleapp-landing/worker.js (3525 lines).
//
// Input:  { state, userInput, action, actionData, fileData, fileName, surface }
// Output: { state, message, cards, promptChips, followUpMessage, sideEffects, useAI }
//
// `services` parameter provides async functions for external calls
// that must complete before the response (e.g., VIN decode, signup).
// `sideEffects` are fire-and-forget actions the caller executes after responding.
// ──────────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function isValidEmail(text) {
  return extractEmail(text) !== null;
}

function getEmail(text) {
  return extractEmail(text);
}

function isAffirmative(msg) {
  const m = msg.toLowerCase().trim();
  return [
    'yes', 'yeah', 'yep', 'correct', 'right', "that's right",
    'yea', 'y', 'sure', 'confirmed', 'exactly', 'looks good',
    'that is correct',
  ].some(w => m.includes(w));
}

function isNegative(msg) {
  const m = msg.toLowerCase().trim();
  return [
    'no', 'not now', 'nah', 'later', 'maybe later', 'not yet', 'not really',
  ].some(n => m === n || m.startsWith(n + ' ') || m.startsWith(n + ','));
}

function isCancelIntent(msg) {
  const m = msg.toLowerCase().trim();
  return [
    'cancel', 'go back', 'go home', 'nevermind', 'never mind', 'start over',
    'main menu', 'back to menu', 'quit', 'exit', 'stop', 'back to hub',
    'back to dashboard', 'show menu', 'what else can i do',
  ].some(phrase => m === phrase || m.startsWith(phrase + ' ') || m.includes(phrase));
}

// States where escape should NOT fire — onboarding, auth, and hub states
const NON_LANE_STATES = new Set([
  'idle', 'interested', 'choose_audience', 'collect_name', 'collect_email',
  'collect_company_name', 'collect_company_description', 'signin_email',
  'magic_link_sent', 'terms_acceptance', 'authenticated', 'confirm_intent',
  'select_vertical', 'raas_onboarding', 'raas_upload_sops', 'raas_build',
  'raas_build_confirm', 'raas_ready', 'consumer_onboarding_promise',
  'biz_collect_company_name', 'biz_collect_company_description',
  'id_verification_before_publish', 'id_verification', 'select_workspace',
]);

function clearLaneData(state) {
  state.carData = null;
  state.propertyData = null;
  state.credentialData = null;
  state.studentData = null;
  state.dealData = null;
  state.pilotData = null;
}

function parseName(raw) {
  const namePatterns = [
    /^(?:my name is|i'm|im|i am|it's|its|call me|they call me|this is|hey i'm|hi i'm)\s+(.+)$/i,
  ];
  let parsed = raw.trim();
  for (const p of namePatterns) {
    const m = raw.match(p);
    if (m) { parsed = m[1].trim(); break; }
  }
  return parsed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// ── School lookup (28 schools) ──

const SCHOOL_LOOKUP = {
  'ucla': { name: 'University of California, Los Angeles (UCLA)', address: '405 Hilgard Ave, Los Angeles, CA 90095' },
  'usc': { name: 'University of Southern California (USC)', address: 'Los Angeles, CA 90007' },
  'mit': { name: 'Massachusetts Institute of Technology (MIT)', address: 'Cambridge, MA 02139' },
  'stanford': { name: 'Stanford University', address: 'Stanford, CA 94305' },
  'harvard': { name: 'Harvard University', address: 'Cambridge, MA 02138' },
  'nyu': { name: 'New York University (NYU)', address: 'New York, NY 10003' },
  'berkeley': { name: 'University of California, Berkeley', address: 'Berkeley, CA 94720' },
  'u of i': { name: 'University of Illinois at Urbana-Champaign', address: 'Champaign, IL 61820' },
  'uiuc': { name: 'University of Illinois at Urbana-Champaign', address: 'Champaign, IL 61820' },
  'university of illinois': { name: 'University of Illinois at Urbana-Champaign', address: 'Champaign, IL 61820' },
  'northwestern': { name: 'Northwestern University', address: 'Evanston, IL 60208' },
  'uchicago': { name: 'University of Chicago', address: 'Chicago, IL 60637' },
  'duke': { name: 'Duke University', address: 'Durham, NC 27708' },
  'columbia': { name: 'Columbia University', address: 'New York, NY 10027' },
  'princeton': { name: 'Princeton University', address: 'Princeton, NJ 08544' },
  'caltech': { name: 'California Institute of Technology (Caltech)', address: 'Pasadena, CA 91125' },
  'georgia tech': { name: 'Georgia Institute of Technology', address: 'Atlanta, GA 30332' },
  'penn state': { name: 'Pennsylvania State University', address: 'University Park, PA 16802' },
  'asu': { name: 'Arizona State University', address: 'Tempe, AZ 85281' },
  'osu': { name: 'The Ohio State University', address: 'Columbus, OH 43210' },
  'ut austin': { name: 'University of Texas at Austin', address: 'Austin, TX 78712' },
  'umich': { name: 'University of Michigan', address: 'Ann Arbor, MI 48109' },
  'yale': { name: 'Yale University', address: 'New Haven, CT 06520' },
  'brown': { name: 'Brown University', address: 'Providence, RI 02912' },
  'cornell': { name: 'Cornell University', address: 'Ithaca, NY 14853' },
  'dartmouth': { name: 'Dartmouth College', address: 'Hanover, NH 03755' },
  'penn': { name: 'University of Pennsylvania', address: 'Philadelphia, PA 19104' },
  'upenn': { name: 'University of Pennsylvania', address: 'Philadelphia, PA 19104' },
};

function cleanSchoolName(input) {
  const key = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  for (const [k, v] of Object.entries(SCHOOL_LOOKUP)) {
    if (key === k || key.includes(k) || k.includes(key)) return v;
  }
  return { name: input.trim().replace(/\b\w/g, c => c.toUpperCase()), address: null };
}

// ── Degree parsing ──

function cleanDegreeName(input) {
  const lower = input.toLowerCase().trim();
  if (lower.includes('mba')) return 'Master of Business Administration (MBA)';
  if (lower.includes('phd') || lower.includes('doctorate') || lower.includes('ph.d')) return 'Doctor of Philosophy (PhD)';
  if (lower.includes('jd') || lower.includes('juris')) return 'Juris Doctor (JD)';
  if (lower.includes('md') && !lower.includes('cmd')) return 'Doctor of Medicine (MD)';
  if (lower.includes('bs') || lower.includes('b.s') || lower.includes('bachelor of science')) return 'Bachelor of Science (BS)';
  if (lower.includes('ba') || lower.includes('b.a') || lower.includes('bachelor of art')) return 'Bachelor of Arts (BA)';
  if (lower.includes('ms') || lower.includes('m.s') || lower.includes('master of science')) return 'Master of Science (MS)';
  if (lower.includes('ma') || lower.includes('m.a') || lower.includes('master of art')) return 'Master of Arts (MA)';
  if (lower.includes('associate')) return 'Associate Degree';
  return null;
}

function extractFieldOfStudy(input) {
  const lower = input.toLowerCase().trim();
  const prefixes = [
    'ba in ', 'bs in ', 'ma in ', 'ms in ', 'mba in ', 'phd in ', 'jd in ', 'md in ',
    'bachelor of arts in ', 'bachelor of science in ', 'master of arts in ', 'master of science in ',
    "bachelor's in ", "master's in ", 'doctorate in ', 'degree in ', 'associate in ', "associate's in ",
  ];
  for (const p of prefixes) {
    const idx = lower.indexOf(p);
    if (idx !== -1) return input.substring(idx + p.length).trim().replace(/\b\w/g, c => c.toUpperCase());
  }
  return null;
}

function cleanYear(input) {
  const t = input.trim().replace(/[^0-9]/g, '');
  if (/^\d{2}$/.test(t)) return parseInt(t) <= 30 ? '20' + t : '19' + t;
  if (/^\d{4}$/.test(t) && parseInt(t) >= 1900 && parseInt(t) <= 2035) return t;
  return null;
}

// ── Credential lookup (17 credentials) ──

const CREDENTIAL_LOOKUP = {
  'aws': 'AWS Certified Solutions Architect',
  'cpa': 'Certified Public Accountant (CPA)',
  'pmp': 'Project Management Professional (PMP)',
  'atp': 'Airline Transport Pilot (ATP)',
  'cfi': 'Certified Flight Instructor (CFI)',
  'ppl': 'Private Pilot License (PPL)',
  'pilot license': 'Private Pilot License (PPL)',
  'pilots license': 'Private Pilot License (PPL)',
  "pilot's license": 'Private Pilot License (PPL)',
  'my pilots license': 'Private Pilot License (PPL)',
  'my pilot license': 'Private Pilot License (PPL)',
  'commercial pilot': 'Commercial Pilot License (CPL)',
  'private pilot': 'Private Pilot License (PPL)',
  'flight instructor': 'Certified Flight Instructor (CFI)',
  'airline transport': 'Airline Transport Pilot (ATP)',
  'rn': 'Registered Nurse (RN)',
  'emt': 'Emergency Medical Technician (EMT)',
  'pe': 'Professional Engineer (PE)',
  'cfp': 'Certified Financial Planner (CFP)',
  'cfa': 'Chartered Financial Analyst (CFA)',
  'series 7': 'FINRA Series 7',
  'cissp': 'Certified Information Systems Security Professional (CISSP)',
  'ccna': 'Cisco Certified Network Associate (CCNA)',
  'real estate': 'Real Estate License',
  'cdl': 'Commercial Driver License (CDL)',
  'nursing': 'Registered Nurse (RN)',
};

function cleanCredentialName(input) {
  const key = input.toLowerCase().trim();
  for (const [k, v] of Object.entries(CREDENTIAL_LOOKUP)) {
    if (key.includes(k)) return v;
  }
  return input.trim().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Credential disambiguation map (7 tracks) ──

const DISAMBIGUATION_MAP = {
  pilot: {
    keywords: ['pilot', 'aviation', 'flying', 'flight'],
    prompt: 'What type of pilot license -- Private (PPL), Commercial (CPL), Instrument Rating, ATP, or other?',
    options: {
      'private': 'Private Pilot License (PPL)', 'ppl': 'Private Pilot License (PPL)',
      'commercial': 'Commercial Pilot License (CPL)', 'cpl': 'Commercial Pilot License (CPL)',
      'instrument': 'Instrument Rating',
      'atp': 'Airline Transport Pilot (ATP)',
      'cfi': 'Certified Flight Instructor (CFI)', 'flight instructor': 'Certified Flight Instructor (CFI)',
    },
  },
  nursing: {
    keywords: ['nurse', 'nursing', 'rn', 'lpn'],
    prompt: 'What type of nursing credential -- Registered Nurse (RN), Licensed Practical Nurse (LPN), Nurse Practitioner (NP), or other?',
    options: {
      'rn': 'Registered Nurse (RN)', 'registered': 'Registered Nurse (RN)',
      'lpn': 'Licensed Practical Nurse (LPN)', 'practical': 'Licensed Practical Nurse (LPN)',
      'np': 'Nurse Practitioner (NP)', 'practitioner': 'Nurse Practitioner (NP)',
    },
  },
  realestate: {
    keywords: ['real estate', 'realtor', 'broker'],
    prompt: 'What type of real estate credential -- Agent, Broker, Appraiser, or other?',
    options: {
      'agent': 'Real Estate Agent License',
      'broker': 'Real Estate Broker License',
      'appraiser': 'Real Estate Appraiser License',
    },
  },
  engineering: {
    keywords: ['engineer'],
    prompt: 'What type of engineering credential -- Professional Engineer (PE), Engineer in Training (EIT), or other?',
    options: {
      'pe': 'Professional Engineer (PE)', 'professional': 'Professional Engineer (PE)',
      'eit': 'Engineer in Training (EIT)', 'training': 'Engineer in Training (EIT)',
    },
  },
  financial: {
    keywords: ['financial', 'accounting', 'cpa', 'cfa'],
    prompt: 'What type of financial credential -- CPA, CFA, CFP, Series 7, or other?',
    options: {
      'cpa': 'Certified Public Accountant (CPA)',
      'cfa': 'Chartered Financial Analyst (CFA)',
      'cfp': 'Certified Financial Planner (CFP)',
      'series 7': 'FINRA Series 7', 'series7': 'FINRA Series 7',
    },
  },
  it: {
    keywords: ['cyber', 'cissp', 'ccna', 'aws cert'],
    prompt: 'What type of IT credential -- AWS Certification, CISSP, CCNA, CompTIA, or other?',
    options: {
      'aws': 'AWS Certified Solutions Architect',
      'cissp': 'Certified Information Systems Security Professional (CISSP)',
      'ccna': 'Cisco Certified Network Associate (CCNA)',
      'comptia': 'CompTIA Security+', 'security': 'CompTIA Security+',
    },
  },
  driver: {
    keywords: ['cdl', 'driver'],
    prompt: 'What type -- Commercial Driver License (CDL Class A, B, or C), or other?',
    options: {
      'class a': 'Commercial Driver License (CDL Class A)',
      'class b': 'Commercial Driver License (CDL Class B)',
      'class c': 'Commercial Driver License (CDL Class C)',
      'cdl': 'Commercial Driver License (CDL)',
      'a': 'Commercial Driver License (CDL Class A)',
      'b': 'Commercial Driver License (CDL Class B)',
      'c': 'Commercial Driver License (CDL Class C)',
    },
  },
};

// ── Vertical detection ──

const VERTICAL_MAP = {
  auto: ['car', 'vehicle', 'vin', 'auto', 'truck', 'motorcycle', 'title and service'],
  property: ['home', 'house', 'property', 'real estate', 'mortgage', 'purchase and doc'],
  education: ['student', 'transcript', 'school', 'education', 'college', 'degree', 'diploma', 'university'],
  credential: ['credential', 'certification', 'license', 'professional', 'cert'],
  pet: ['pet', 'dog', 'cat', 'vet', 'animal'],
  business: ['dealer', 'inventory', 'sales follow', 'pipeline', 'onboard', 'dealership', 'tools can titleapp', 'one-person business', 'one person business', 'how much could i save', 'just need something simple', 'replace'],
  compliance: ['compliance', 'audit', 'regulation', 'retention', 'monitoring'],
};

const PITCHES = {
  auto: "TitleApp AI creates a Digital Title Certificate for your vehicle -- it tracks ownership, service history, mileage, and documents all in one verified record. Takes about 2 minutes to set up.\n\nWould you like to get started? It's free.",
  property: "TitleApp AI keeps a complete verified record of your property -- purchase documents, renovations, inspections, insurance. Everything organized and in one place.\n\nWould you like to get started? It's free.",
  education: "TitleApp AI creates a verified, portable record of your academic history -- transcripts, diplomas, certifications. Stored permanently and shareable with employers or institutions.\n\nWould you like to get started? It's free.",
  credential: "TitleApp AI creates a verified record of your professional credentials -- licenses, certifications, memberships, training. Tracked, verified, and always accessible.\n\nWould you like to get started? It's free.",
  pet: "TitleApp AI creates a verified health record for your pet -- vaccinations, vet visits, medications, all in one place. Shareable with any vet or boarding facility.\n\nWould you like to get started? It's free.",
  business: "TitleApp AI's Revenue Engine finds hidden opportunities in your customer database, automates follow-up, and helps your team close more deals. Built for dealerships and asset-heavy businesses.\n\nWant to see how it works?",
  compliance: "TitleApp AI monitors regulatory changes, tracks document retention, and keeps your records audit-ready. Automated compliance so nothing falls through the cracks.\n\nWant to learn more?",
};

// ── Industry extraction ──

function extractIndustry(description) {
  const d = (description || '').toLowerCase();
  if (d.includes('auto') || d.includes('car') || d.includes('dealer') || d.includes('vehicle')) return 'automotive sales';
  if (d.includes('real estate') || d.includes('property') || d.includes('rental')) return 'real estate';
  if (d.includes('sales')) return 'sales operations';
  if (d.includes('compliance') || d.includes('legal')) return 'compliance and risk management';
  if (d.includes('aviation') || d.includes('airline') || d.includes('medevac')) return 'aviation operations';
  if (d.includes('education') || d.includes('school')) return 'education';
  return 'your industry';
}

// ── Record ID / hash generation ──

function generateRecordId() {
  return 'dtc_' + Math.random().toString(36).substring(2, 8);
}

function generateHash() {
  return (
    Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('') +
    '...' +
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  );
}

function nowDateString() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nowTimeString() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Vehicle color gradient (data for surface rendering) ──

function getVehicleColorTheme(color) {
  const c = (color || '').toLowerCase();
  if (c.includes('black')) return 'black';
  if (c.includes('white')) return 'white';
  if (c.includes('silver') || c.includes('gray') || c.includes('grey')) return 'silver';
  if (c.includes('red')) return 'red';
  if (c.includes('blue')) return 'blue';
  if (c.includes('green')) return 'green';
  return 'default';
}

// ── Demo responses (unauthenticated users, no vertical match) ──

function getDemoResponse(message) {
  const msg = message.toLowerCase();

  if (msg.includes('car') || msg.includes('vehicle') || msg.includes('vin') || msg.includes('auto') ||
      msg.includes('truck') || msg.includes('motorcycle') || msg.includes('title and service')) {
    return "TitleApp AI creates a verified digital record of your vehicle -- title, service history, mileage, everything in one place. It helps protect your car's value and makes selling easier. Want to get started?";
  }
  if (msg.includes('home') || msg.includes('house') || msg.includes('property') ||
      msg.includes('real estate') || msg.includes('mortgage') || msg.includes('purchase and doc')) {
    return "We help you keep a complete record of your property -- purchase documents, renovations, inspections, insurance. Everything organized and verified. Want to set one up?";
  }
  if (msg.includes('student') || msg.includes('transcript') || msg.includes('school') ||
      msg.includes('education') || msg.includes('college') || msg.includes('degree') ||
      msg.includes('diploma') || msg.includes('university')) {
    return "TitleApp AI creates a verified, portable record of your academic history -- transcripts, diplomas, certifications. Stored permanently and shareable with employers or institutions. Want to get started?";
  }
  if (msg.includes('credential') || msg.includes('certification') || msg.includes('license') ||
      msg.includes('professional') || msg.includes('cert')) {
    return "TitleApp AI creates a verified record of your professional credentials -- licenses, certifications, memberships, training. Tracked, verified, and always accessible. Want to get started?";
  }
  if (msg.includes('pet') || msg.includes('dog') || msg.includes('cat') ||
      msg.includes('vet') || msg.includes('animal')) {
    return "We can create a verified health record for your pet. Vaccinations, vet visits, medications -- all in one place, shareable with vets and boarders. Want to set one up?";
  }
  if (msg.includes('cost') || msg.includes('price') || msg.includes('how much') ||
      msg.includes('pricing') || msg.includes('fee')) {
    return "TitleApp AI is free for personal use. For businesses, plans start at $9/month for individuals and $99/month for the full suite. No credit card required to start. Want to get going?";
  }
  if (msg.includes('what') || msg.includes('who') || msg.includes('titleapp') || msg.includes('about')) {
    return "TitleApp AI creates verified, permanent records of the things that matter to you. Cars, homes, credentials, important documents. Your records are yours -- secured and verifiable. What would you like to keep track of?";
  }
  if (msg.includes('how') || msg.includes('work')) {
    return "You tell me what you want to track, I walk you through creating a record step by step. Everything gets stored in a Digital Title Certificate with a logbook that tracks changes over time. Simple as that.";
  }
  if (msg.includes('register') || msg.includes('sign up') || msg.includes('create account') ||
      msg.includes('get started') || msg.includes('start')) {
    return "Great. Click 'Start Free' at the top to create your account. Takes about two minutes. Or tell me what you'd like to track and we can start right here.";
  }
  if (msg.includes('google drive') || msg.includes('gdrive') || msg.includes('dropbox') ||
      msg.includes('why not') || (msg.includes('why') && (msg.includes('better') || msg.includes('different')))) {
    return "Cloud storage can't verify that your records are authentic. We create cryptographic proofs that buyers, lenders, and institutions actually trust. A car with verified service history sells for 10-15% more than one with just PDFs in Google Drive. That's real money.";
  }
  if (msg.includes('what tools') || msg.includes('replace')) {
    return "Most small businesses pay for a CRM, a document manager, a compliance tracker, and some kind of follow-up tool -- none of which talk to each other. TitleApp handles all of that in one place. One AI, one conversation, one monthly price. Want to see how it would work for your business?";
  }
  if (msg.includes('one-person') || msg.includes('one person') || msg.includes('solo') || msg.includes('just me')) {
    return "That's exactly who we built this for. You shouldn't need five subscriptions and a full-time admin to keep your business organized. TitleApp gives you an AI assistant that handles your records, your compliance, and your customer follow-up. $9/month, 14-day free trial. Want to get started?";
  }
  if (msg.includes('save') || msg.includes('how much could')) {
    return "The average small business spends $150-300/month on separate tools for CRM, documents, compliance, and follow-up. TitleApp starts at $9/month for individuals and $99/month for the full business suite. That's one tool replacing several, and the AI does the work the other tools leave to you.";
  }
  if (msg.includes('simple') || msg.includes('just need')) {
    return "Simple is what we do. Tell me what you're trying to keep track of and I'll set it up for you right now. No dashboards to learn, no workflows to configure. Just talk to me.";
  }
  if (msg.includes('inventory') || msg.includes('sales follow') || msg.includes('pipeline') ||
      (msg.includes('onboard') && msg.includes('dealer'))) {
    return "TitleApp AI handles your inventory, automates follow-up, and helps your team close more deals. Built for dealerships and asset-heavy businesses. Want to see how it works?";
  }
  if (msg.includes('compliance') || msg.includes('audit') || msg.includes('regulation') ||
      msg.includes('retention') || msg.includes('monitoring')) {
    return "TitleApp AI monitors regulatory changes, tracks document retention, and keeps your records audit-ready. Automated compliance so nothing falls through the cracks. Want to learn more?";
  }
  if (msg.includes('business') || msg.includes('dealer') || msg.includes('company') ||
      msg.includes('enterprise')) {
    return "TitleApp AI gives you an AI team that handles records, compliance, follow-up, and deals -- all in one place. Starting at $9/month. Want to see how it works for your business?";
  }
  return "I help you create verified records of the things that matter -- vehicles, property, credentials, important documents. What would you like to keep track of?";
}

// ── Default session state ──

function defaultState() {
  return {
    step: 'idle',
    vertical: null,
    audienceType: null,
    businessVertical: null,
    raasConfigured: false,
    currentHub: null,
    name: null,
    email: null,
    companyName: null,
    companyDescription: null,
    accountCreated: false,
    userId: null,
    idVerified: false,
    termsAcceptedAt: null,
    carData: null,
    studentData: null,
    credentialData: null,
    pilotData: null,
    dealData: null,
    propertyData: null,
    records: [],
  };
}

// ── Response builder ──

function response(state, message, opts = {}) {
  return {
    state,
    message: message || '',
    cards: opts.cards || [],
    promptChips: opts.promptChips || [],
    followUpMessage: opts.followUpMessage || null,
    sideEffects: opts.sideEffects || [],
    useAI: opts.useAI || false,
    classifyIntent: opts.classifyIntent || false,
    originalMessage: opts.originalMessage || null,
    generateRaas: opts.generateRaas || false,
    generateOnboardingPromise: opts.generateOnboardingPromise || false,
    generateMilestone: opts.generateMilestone || false,
    aiContext: opts.aiContext || null,
    platformRedirect: opts.platformRedirect || false,
    selectedTenantId: opts.selectedTenantId || null,
  };
}

// ──────────────────────────────────────────────────────────────
// MAIN ENGINE
// ──────────────────────────────────────────────────────────────

/**
 * Process a single chat message through the state machine.
 *
 * @param {object} input
 * @param {object} input.state       - Current session state (from Firestore)
 * @param {string} input.userInput   - Text the user typed or chip they clicked
 * @param {string} [input.action]    - Card button action (takes precedence over userInput)
 * @param {object} [input.actionData]- Data from card interaction
 * @param {string} [input.fileData]  - Base64 file content
 * @param {string} [input.fileName]  - Original filename
 * @param {string} input.surface     - 'landing' | 'platform'
 *
 * @param {object} services - Async service functions
 * @param {function} services.decodeVin   - (vin) => { valid, vehicle }
 * @param {function} services.signup      - (data) => { ok, token, uid }
 *
 * @returns {object} { state, message, cards, promptChips, followUpMessage, sideEffects, useAI }
 */
async function processMessage(input, services = {}) {
  const state = Object.assign(defaultState(), input.state || {});
  const userInput = (input.userInput || '').trim();
  const action = input.action || null;
  const actionData = input.actionData || {};
  const surface = input.surface || 'landing';

  // ── Handle card actions (button clicks) ──

  if (action === 'start_free') {
    const audience = actionData.audienceType || null;
    if (audience) {
      // Explicit audience from slide context — skip the question
      state.audienceType = audience;
      state.step = 'collect_name';
      const msg = audience === 'business'
        ? "Let's get your business set up. What's your name?"
        : "Let's get you set up. This takes about 2 minutes and you'll have your first verified record. What's your name?";
      return response(state, msg);
    }
    // Show audience selection
    state.step = 'choose_audience';
    return response(state, null, {
      cards: [{
        type: 'audienceSelect',
        data: {
          options: [
            { value: 'consumer', label: 'Personal use' },
            { value: 'business', label: 'Business use' },
          ],
        },
      }],
    });
  }

  if (action === 'audience_selected') {
    const audience = actionData.type || 'consumer';
    state.audienceType = audience;
    state.step = 'collect_name';
    const msg = audience === 'business'
      ? "Let's get your business set up. What's your name?"
      : "Let's get you set up. This takes about 2 minutes and you'll have your first verified record. What's your name?";
    return response(state, msg);
  }

  if (action === 'start_signin') {
    state.step = 'signin_email';
    return response(state, "Welcome back. Enter your email and I'll send you a sign-in link.");
  }

  if (action === 'workspace_selected') {
    state.step = 'authenticated';
    return response(state, "Taking you to your workspace...", {
      platformRedirect: true,
      selectedTenantId: actionData.tenantId || null,
    });
  }

  if (action === 'magic_link_clicked') {
    state.step = 'creating_account';
    // Call signup
    const signupData = {
      email: state.email,
      name: state.name,
      accountType: state.audienceType || 'consumer',
    };
    if (state.companyName) signupData.companyName = state.companyName;
    if (state.companyDescription) signupData.companyDescription = state.companyDescription;

    let signupResult = null;
    if (services.signup) {
      try {
        signupResult = await services.signup(signupData);
      } catch (e) {
        console.warn('signup service failed, continuing in demo mode', e);
      }
    }

    if (signupResult && signupResult.ok) {
      state.userId = signupResult.uid;
      state.accountCreated = true;
      state.authToken = signupResult.token;

      // Existing user who already accepted terms — skip onboarding
      if (signupResult.existing && signupResult.termsAcceptedAt) {
        state.name = signupResult.existingName || state.name;
        state.termsAcceptedAt = signupResult.termsAcceptedAt;
        state.audienceType = signupResult.existingAccountType || state.audienceType || 'consumer';

        // If user has existing workspace memberships, redirect to platform
        const memberships = signupResult.memberships || [];
        if (memberships.length === 1) {
          state.step = 'authenticated';
          return response(state, `Welcome back, ${state.name || 'friend'}. Let me take you to your workspace.`, {
            platformRedirect: true,
            selectedTenantId: memberships[0].tenantId || null,
          });
        }
        if (memberships.length > 1) {
          state.pendingMemberships = memberships;
          state.step = 'select_workspace';
          return response(state, `Welcome back, ${state.name || 'friend'}. Which workspace would you like to open?`, {
            cards: [{
              type: 'workspaceSelect',
              data: { workspaces: memberships.map(m => ({ id: m.tenantId, name: m.tenantName, role: m.role })) },
            }],
          });
        }

        // No memberships — stay in chat hub
        state.step = 'authenticated';
        const chips = state.audienceType === 'business'
          ? ['Set up my workspace', 'Add a record', 'View my vault']
          : (state.records && state.records.length > 0)
            ? ['View my vault', 'Add another record', 'Set up a business']
            : ['Add a vehicle', 'Add a credential', 'View my vault'];
        return response(state, `Welcome back, ${state.name || 'friend'}. What would you like to do?`, {
          promptChips: chips,
        });
      }
    } else {
      state.accountCreated = true;
    }

    state.step = 'terms_acceptance';
    return response(state, `Account created. Welcome to TitleApp AI, ${state.name || 'friend'}.`, {
      cards: [{
        type: 'terms',
        data: {
          termsUrl: 'https://title-app-alpha.web.app/terms',
          privacyUrl: 'https://title-app-alpha.web.app/privacy',
          summary: "Your records are yours. We verify and secure them. We don't sell your data. You can export or delete anytime.",
        },
      }],
    });
  }

  if (action === 'terms_accepted') {
    state.termsAcceptedAt = new Date().toISOString();

    const isBusiness = state.audienceType === 'business';
    const companyName = state.companyName || '';
    const subtitle = isBusiness && companyName ? `${companyName} is set up.` : 'Your account is ready.';
    const industry = extractIndustry(state.companyDescription);
    const bodyText = isBusiness
      ? `I'm configuring your workspace for ${industry}. Your AI team will handle records, compliance, and follow-up.`
      : 'You can create verified records of your vehicles, property, and credentials -- all tracked and secured.';

    const sideEffects = [
      { action: 'acceptTerms', data: {} },
      {
        action: 'claimTenant',
        data: {
          tenantName: state.name || 'Personal',
          tenantType: isBusiness ? 'business' : 'personal',
          vertical: isBusiness ? 'GLOBAL' : 'consumer',
          jurisdiction: 'GLOBAL',
        },
      },
    ];

    if (isBusiness) {
      // Business path — welcome card + ID check + RAAS onboarding
      state.step = 'raas_onboarding';
      return response(state, null, {
        cards: [
          {
            type: 'welcome',
            data: { name: state.name, subtitle, bodyText, audienceType: state.audienceType },
          },
          {
            type: 'idVerification',
            data: { optional: true, message: 'Quick identity check -- keeps your records secure and verified. You can skip this for now.' },
          },
        ],
        generateRaas: true,
        aiContext: {
          companyName: state.companyName,
          companyDescription: state.companyDescription,
          industry,
        },
        sideEffects,
      });
    }

    // Consumer path — welcome card + ID check + onboarding promise
    state.step = 'consumer_onboarding_promise';
    return response(state, null, {
      cards: [
        {
          type: 'welcome',
          data: { name: state.name, subtitle, bodyText, audienceType: state.audienceType },
        },
        {
          type: 'idVerification',
          data: { optional: true, message: 'Quick identity check -- keeps your records secure and verified. You can skip this for now.' },
        },
      ],
      generateOnboardingPromise: true,
      aiContext: { type: 'consumer', name: state.name },
      sideEffects,
    });
  }

  if (action === 'ownership_selected') {
    const ownershipType = actionData.type; // 'owned', 'financed', 'leased'
    if (!state.carData) state.carData = {};
    state.carData.ownershipType = ownershipType;

    if (ownershipType === 'financed' || ownershipType === 'leased') {
      state.step = 'car_onboarding_lender';
      const lenderType = ownershipType === 'financed' ? 'lender' : 'leasing company';
      return response(state, `Who is the ${lenderType}?`);
    }
    // Owned outright — go to document upload
    state.step = 'car_onboarding_documents';
    return response(state, "Do you have any documents to upload? Things like your title, registration, or service records. You can always add more later.");
  }

  if (action === 'attestation_confirmed') {
    return handleAttestationConfirmed(state);
  }

  if (action === 'files_uploaded') {
    return handleFilesUploaded(state, input);
  }

  if (action === 'file_upload_skipped') {
    return handleFileUploadSkipped(state);
  }

  if (action === 'id_verify_accept') {
    state.step = 'id_verification';
    state.idVerified = true;
    // Resume pending attestation if ID verification was triggered mid-flow
    if (state.pendingAttestationStep) {
      state.step = state.pendingAttestationStep;
      state.pendingAttestationStep = null;
      return handleAttestationConfirmed(state);
    }
    if (state.carData) {
      return handleVehicleDTC(state);
    }
    state.step = 'authenticated';
    return response(state, "Identity verified. Your account is fully verified. What would you like to create?");
  }

  if (action === 'id_verify_skip') {
    state.step = 'authenticated';
    return response(state, "No problem! Your car info is saved as a draft. You can verify and publish later from your account. What else would you like to do?");
  }

  // ── Handle text input through state machine ──

  const message = userInput;
  const lowerMsg = message.toLowerCase();

  // ── Global escape hatch: cancel out of any lane mid-flow ──
  if (lowerMsg && isCancelIntent(lowerMsg) && !NON_LANE_STATES.has(state.step)) {
    clearLaneData(state);
    state.step = 'authenticated';

    // Return vertical-appropriate prompt chips
    let chips;
    if (state.businessVertical === 'real_estate') {
      chips = ['Add a property', 'Onboard a tenant', 'Maintenance request', 'View properties'];
    } else if (state.businessVertical === 'analyst') {
      chips = ['Vet a new deal', 'Write a POV', 'View pipeline'];
    } else if (state.businessVertical === 'auto') {
      chips = ['Add a vehicle', 'View inventory'];
    } else if (state.audienceType === 'business') {
      chips = ['Add a record', 'View vault', 'Set up compliance'];
    } else {
      chips = ['Track a vehicle', 'Add a credential', 'Student records', 'View vault'];
    }

    return response(state, "No problem. What would you like to do instead?", {
      promptChips: chips,
    });
  }

  switch (state.step) {

    // ── Audience Selection ──

    case 'choose_audience': {
      if (lowerMsg.includes('personal') || lowerMsg.includes('consumer') || lowerMsg.includes('myself') || lowerMsg.includes('my own')) {
        state.audienceType = 'consumer';
        state.step = 'collect_name';
        return response(state, "Let's get you set up. This takes about 2 minutes and you'll have your first verified record. What's your name?");
      }
      if (lowerMsg.includes('business') || lowerMsg.includes('company') || lowerMsg.includes('work') || lowerMsg.includes('dealer')) {
        state.audienceType = 'business';
        state.step = 'collect_name';
        return response(state, "Let's get your business set up. What's your name?");
      }
      return response(state, "Are you looking to use TitleApp for personal use or for your business?", {
        cards: [{
          type: 'audienceSelect',
          data: {
            options: [
              { value: 'consumer', label: 'Personal use' },
              { value: 'business', label: 'Business use' },
            ],
          },
        }],
      });
    }

    // ── Account Creation Flow ──

    case 'collect_name': {
      state.name = parseName(message);
      if (state.audienceType === 'business') {
        state.step = 'collect_company_name';
        return response(state, `And what's your company name, ${state.name}?`);
      }
      state.step = 'collect_email';
      return response(state, `Nice to meet you, ${state.name}. What's your email?`);
    }

    case 'collect_company_name': {
      state.companyName = message.trim();
      state.step = 'collect_company_description';
      return response(state, `What does ${state.companyName} do? Just a sentence or two.`);
    }

    case 'collect_company_description': {
      state.companyDescription = message.trim();
      state.step = 'collect_email';
      return response(state, "Got it. What's your email?");
    }

    case 'collect_email': {
      if (isValidEmail(message)) {
        state.email = getEmail(message);
        state.step = 'magic_link_sent';
        return response(state, "Here's your magic link -- just click to get started.", {
          cards: [{ type: 'magicLink', data: { email: state.email } }],
        });
      }
      return response(state, "That doesn't look like a valid email address. Please try again.");
    }

    case 'signin_email': {
      if (isValidEmail(message)) {
        state.email = getEmail(message);
        state.step = 'magic_link_sent';
        return response(state, "Here's your sign-in link -- just click to continue.", {
          cards: [{ type: 'magicLink', data: { email: state.email } }],
        });
      }
      return response(state, "That doesn't look like a valid email address. Please try again.");
    }

    case 'magic_link_sent': {
      return response(state, "Still waiting? Check your spam folder, or I can resend the link.");
    }

    case 'select_workspace': {
      // User typed something instead of clicking a workspace card button
      // Try to match by name
      const pending = state.pendingMemberships || [];
      const match = pending.find(m =>
        m.tenantName && m.tenantName.toLowerCase().includes(lowerMsg)
      );
      if (match) {
        state.step = 'authenticated';
        return response(state, `Taking you to ${match.tenantName}...`, {
          platformRedirect: true,
          selectedTenantId: match.tenantId || null,
        });
      }
      return response(state, "Please select a workspace from the options above, or type the workspace name.");
    }

    case 'id_verification_before_publish': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('ready') || lowerMsg.includes('verify')) {
        state.step = 'id_verification';
        return response(state, "Processing your identity verification...", {
          cards: [{ type: 'idVerification', data: {} }],
        });
      }
      state.pendingAttestationStep = null;
      state.step = 'authenticated';
      return response(state, "No problem. Your record is saved as a draft. You can verify and publish later from your account. What else would you like to do?");
    }

    // ── Authenticated Hub ──

    case 'authenticated': {
      // Vault / dashboard — common to all account types
      if (lowerMsg.includes('dashboard') || lowerMsg.includes('vault') || lowerMsg.includes('my records') ||
          lowerMsg.includes('my stuff') || lowerMsg.includes('see my') || lowerMsg.includes('show my')) {
        return handleShowVault(state);
      }

      // Logbook — common to all account types
      if (lowerMsg.includes('logbook') || lowerMsg.includes('log book') || lowerMsg.includes('history') ||
          lowerMsg.includes('entries') || lowerMsg.includes('log entry') || lowerMsg.includes('add entry') ||
          lowerMsg.includes('log something') || lowerMsg.includes('update log') || lowerMsg.includes('new entry')) {
        return handleShowLogbook(state);
      }

      // ── Business intent detection (works for both consumer and business accounts) ──
      const businessKeywords = ['business', 'company', 'workspace', 'enterprise', 'organization',
        'marketing', 'management', 'agency', 'firm', 'fund', 'portfolio',
        'set up my business', 'set up my company', 'set up my workspace',
        'start a business', 'create a business', 'my business'];
      const isBizIntent = businessKeywords.some(k => lowerMsg.includes(k));

      if (isBizIntent) {
        // Already configured — don't restart, route to vertical hub
        if (state.raasConfigured && state.businessVertical) {
          const verticalLabel = state.businessVertical === 'real_estate' ? 'property management'
            : state.businessVertical === 'analyst' ? 'deal analysis'
            : state.businessVertical === 'auto' ? 'auto dealer'
            : state.businessVertical;
          const chips = state.businessVertical === 'real_estate'
            ? ['Add a property', 'Onboard a tenant', 'Maintenance request', 'View properties']
            : state.businessVertical === 'analyst'
            ? ['Vet a new deal', 'Write a POV', 'View pipeline']
            : state.businessVertical === 'auto'
            ? ['Add a vehicle', 'View inventory', 'Sales pipeline']
            : ['Add a record', 'Set up compliance', 'View vault'];
          return response(state, `Your ${state.companyName || ''} workspace is already configured for ${verticalLabel}. Want to adjust your setup or get to work?`, {
            promptChips: chips,
          });
        }
        // Already have company info but no RAAS — go to vertical selection
        if (state.companyName && state.companyDescription) {
          state.audienceType = 'business';
          state.step = 'select_vertical';
          return response(state, `What does ${state.companyName} focus on?`, {
            promptChips: ['Property Management', 'Deal Analysis & Investment', 'Auto Dealer', 'Sales & Marketing', 'Other'],
          });
        }
        // Need to collect company info first
        state.audienceType = 'business';
        state.step = 'biz_collect_company_name';
        return response(state, "Let's get your business set up. What's your company name?");
      }

      // ── Business-vertical routing (user already selected a vertical) ──
      if (state.audienceType === 'business' && state.businessVertical) {
        // Route to vertical-specific hub based on stored vertical
        if (state.businessVertical === 'analyst') {
          return handleAnalystHub(state, lowerMsg);
        }
        if (state.businessVertical === 'real_estate') {
          return handleRealEstateHub(state, lowerMsg);
        }
        // Auto dealer
        if (state.businessVertical === 'auto') {
          if (lowerMsg.includes('inventory') || lowerMsg.includes('add vehicle') || lowerMsg.includes('add car') || lowerMsg.includes('vin')) {
            state.step = 'car_onboarding_vin';
            state.carData = {};
            return response(state, "What's the VIN of the vehicle you'd like to add?");
          }
          return response(state, "Welcome to your auto dealer workspace. What would you like to do?", {
            promptChips: ['Add a vehicle', 'View inventory', 'Sales pipeline'],
          });
        }
        // Generic business fallback
        if (lowerMsg.includes('inventory') || lowerMsg.includes('add vehicle') || lowerMsg.includes('add car')) {
          state.step = 'car_onboarding_vin';
          state.carData = {};
          return response(state, "What's the VIN of the first vehicle you'd like to add to your inventory?");
        }
        if (lowerMsg.includes('team') || lowerMsg.includes('employee') || lowerMsg.includes('staff')) {
          return response(state, "Team management is available in your full dashboard. Want me to open it?");
        }
        if (lowerMsg.includes('compliance') || lowerMsg.includes('rules') || lowerMsg.includes('regulation')) {
          return response(state, "I can set up compliance monitoring for your industry. What regulations or requirements do you need to track?");
        }
        if (lowerMsg.includes('customer') || lowerMsg.includes('pipeline') || lowerMsg.includes('lead') || lowerMsg.includes('follow')) {
          return response(state, "Your sales pipeline is empty right now. Want to add your first customer or import a list?");
        }
        return response(state, "I can help you add inventory, manage your team, set up compliance rules, or configure your sales pipeline. What would you like to start with?", {
          promptChips: ['Add inventory', 'Set up compliance', 'Sales pipeline', 'View vault'],
        });
      }

      // ── Business account without vertical — prompt to select one ──
      if (state.audienceType === 'business' && !state.businessVertical) {
        if (state.companyName) {
          state.step = 'select_vertical';
          return response(state, `What does ${state.companyName} focus on?`, {
            promptChips: ['Property Management', 'Deal Analysis & Investment', 'Auto Dealer', 'Sales & Marketing', 'Other'],
          });
        }
        // Fall through to general consumer routing below
      }

      // ── Consumer record creation ──

      // Detect vehicle intent
      if (lowerMsg.includes('car') || lowerMsg.includes('vehicle') || lowerMsg.includes('truck') ||
          lowerMsg.includes('motorcycle') || lowerMsg.includes('vin')) {
        state.step = 'car_onboarding_vin';
        state.carData = {};
        return response(state, "What's your VIN? You'll find it on your dashboard near the windshield or on your registration card.");
      }

      // Detect property intent (consumer)
      if (lowerMsg.includes('home') || lowerMsg.includes('house') || lowerMsg.includes('property') ||
          lowerMsg.includes('real estate') || lowerMsg.includes('apartment') || lowerMsg.includes('condo')) {
        return response(state, "Property records are coming soon. For now, I can help you set up a vehicle or credential record. What would you like to do?", {
          promptChips: ['Add a vehicle', 'Add a credential', 'View my vault'],
        });
      }

      // Detect student/education intent
      if (lowerMsg.includes('student') || lowerMsg.includes('transcript') || lowerMsg.includes('diploma') ||
          lowerMsg.includes('school') || lowerMsg.includes('university') || lowerMsg.includes('education') ||
          lowerMsg.includes('degree') || lowerMsg.includes('college')) {
        state.step = 'student_type';
        state.studentData = {};
        return response(state, "I can help you create a verified record of your academic history. What would you like to start with -- a transcript, diploma, or certification?");
      }

      // Detect credential/certification intent
      if (lowerMsg.includes('credential') || lowerMsg.includes('certification') || lowerMsg.includes('license') ||
          lowerMsg.includes('professional') || lowerMsg.includes('cert') || lowerMsg.includes('pilot') ||
          lowerMsg.includes('nurse') || lowerMsg.includes('nursing') || lowerMsg.includes('engineer') ||
          lowerMsg.includes('realtor') || lowerMsg.includes('broker') || lowerMsg.includes('cdl')) {
        state.credentialData = {};
        return handleCredentialDetection(state, message, lowerMsg);
      }

      // Add another record (generic)
      if (lowerMsg.includes('another') || lowerMsg.includes('new record') || lowerMsg.includes('record of')) {
        return response(state, "What would you like to create a record of?", {
          promptChips: ['Vehicle', 'Credential', 'Education record'],
        });
      }

      // Detect general asset/possession — short inputs that are likely things to track
      const words = message.trim().split(/\s+/);
      if (words.length <= 4 && !lowerMsg.includes('?') && !lowerMsg.includes('help') &&
          !lowerMsg.includes('what') && !lowerMsg.includes('how') && !lowerMsg.includes('why')) {
        const assetName = lowerMsg.replace(/^(my|a|an|the)\s+/i, '').trim();
        if (assetName.length > 1) {
          return response(state, `I can help you create a record for your ${assetName}. Would you like to get started? I'll walk you through documenting and verifying it.`);
        }
      }

      // No keyword match — hand off to AI intent classification
      return response(state, null, {
        classifyIntent: true,
        originalMessage: message,
      });
    }

    // ── AI Intent Confirmation ──

    case 'confirm_intent': {
      if (isAffirmative(lowerMsg) || lowerMsg.includes("that's right") || lowerMsg.includes('yes')) {
        // User confirmed the AI-classified intent — route based on stored classification
        const classified = state.classifiedIntent || {};
        const intent = (classified.intent || '').toLowerCase();
        const vertical = (classified.vertical || '').toLowerCase();

        // Vehicle intents
        if (intent.includes('vehicle') || intent.includes('car') || intent.includes('auto') || intent.includes('vin')) {
          state.step = 'car_onboarding_vin';
          state.carData = {};
          return response(state, "What's your VIN? You'll find it on your dashboard near the windshield or on your registration card.");
        }

        // Student/education intents
        if (intent.includes('student') || intent.includes('education') || intent.includes('academic') ||
            intent.includes('transcript') || intent.includes('diploma') || intent.includes('degree')) {
          state.step = 'student_type';
          state.studentData = {};
          return response(state, "I can help you create a verified record of your academic history. What would you like to start with -- a transcript, diploma, or certification?");
        }

        // Credential intents
        if (intent.includes('credential') || intent.includes('certification') || intent.includes('license') ||
            intent.includes('professional') || intent.includes('pilot') || intent.includes('nurse')) {
          state.credentialData = {};
          return handleCredentialDetection(state, classified.originalMessage || '', (classified.originalMessage || '').toLowerCase());
        }

        // Business/workspace intents
        if (intent.includes('business') || intent.includes('workspace') || intent.includes('company') ||
            vertical === 'property management' || vertical === 'real estate' ||
            vertical === 'investment' || vertical === 'automotive') {
          // Already configured — route to hub, don't restart
          if (state.raasConfigured && state.businessVertical) {
            state.step = 'authenticated';
            return processMessage({
              state, userInput: classified.originalMessage || message, action: null, actionData: {},
              fileData: input.fileData || null, fileName: input.fileName || null, surface: input.surface || 'landing',
            }, services);
          }
          state.audienceType = 'business';
          if (state.companyName && state.companyDescription) {
            state.step = 'select_vertical';
            return response(state, `What does ${state.companyName} focus on?`, {
              promptChips: ['Property Management', 'Deal Analysis & Investment', 'Auto Dealer', 'Sales & Marketing', 'Other'],
            });
          }
          state.step = 'biz_collect_company_name';
          return response(state, "Let's get your business set up. What's your company name?");
        }

        // Property management
        if (intent.includes('property') || intent.includes('rental') || intent.includes('tenant') || intent.includes('landlord')) {
          if (state.audienceType === 'business' && state.businessVertical === 'real_estate') {
            return handleRealEstateHub(state, (classified.originalMessage || '').toLowerCase());
          }
          state.audienceType = 'business';
          state.step = 'biz_collect_company_name';
          return response(state, "Let's get your business set up. What's your company name?");
        }

        // Deal/investment analysis
        if (intent.includes('deal') || intent.includes('investment') || intent.includes('analyst') || intent.includes('pipeline')) {
          if (state.audienceType === 'business' && state.businessVertical === 'analyst') {
            return handleAnalystHub(state, (classified.originalMessage || '').toLowerCase());
          }
          state.audienceType = 'business';
          state.step = 'biz_collect_company_name';
          return response(state, "Let's get your business set up. What's your company name?");
        }

        // Vault/records
        if (intent.includes('vault') || intent.includes('record') || intent.includes('view')) {
          return handleShowVault(state);
        }

        // Logbook
        if (intent.includes('logbook') || intent.includes('log') || intent.includes('entry')) {
          return handleShowLogbook(state);
        }

        // Fallback — couldn't route the confirmed intent
        state.step = 'authenticated';
        return response(state, "What would you like to create a record of?", {
          promptChips: ['Vehicle', 'Credential', 'Education record', 'Set up a business'],
        });
      }

      // User declined — ask them to explain
      if (isNegative(lowerMsg) || lowerMsg.includes('not quite') || lowerMsg.includes('something else') ||
          lowerMsg.includes('no') || lowerMsg.includes('not really')) {
        state.step = 'authenticated';
        state.classifiedIntent = null;
        return response(state, "No problem. Tell me more about what you're looking for and I'll help you get there.");
      }

      // Unclear response — treat as new input, go back to authenticated
      state.step = 'authenticated';
      state.classifiedIntent = null;
      // Re-process through authenticated hub by returning classifyIntent again
      return response(state, null, {
        classifyIntent: true,
        originalMessage: message,
      });
    }

    // ── Vehicle Flow ──

    case 'car_onboarding_vin': {
      if (lowerMsg.includes('skip') || lowerMsg.includes('no') || lowerMsg.includes("don't have")) {
        state.carData = state.carData || {};
        state.carData.vin = null;
        state.step = 'car_onboarding_details';
        const userName = state.name ? `, ${state.name}` : '';
        return response(state, `No problem${userName}. What's the year, make, and model?`);
      }

      const vinInput = message.trim().toUpperCase();
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(vinInput)) {
        // Valid VIN format — decode it
        let decodeResult = null;
        if (services.decodeVin) {
          try {
            decodeResult = await services.decodeVin(vinInput);
          } catch (e) {
            console.warn('VIN decode failed:', e);
          }
        }

        if (decodeResult && decodeResult.valid && decodeResult.vehicle) {
          const v = decodeResult.vehicle;
          const vehicleDesc = `${v.year || ''} ${v.make || ''} ${v.model || ''} ${v.trim || ''}`.trim();
          const engineDesc = v.engineCylinders && v.engineDisplacement
            ? `${v.engineDisplacement}L ${v.engineCylinders}-cylinder`
            : '';
          const plantDesc = v.plantCity && v.plantState
            ? `built in ${v.plantCity}, ${v.plantState}`
            : '';

          state.carData = {
            vin: decodeResult.vin || vinInput,
            details: vehicleDesc,
            year: v.year,
            make: v.make,
            model: v.model,
            trim: v.trim,
            engineCylinders: v.engineCylinders,
            engineDisplacement: v.engineDisplacement,
            fuelType: v.fuelType,
            plantCity: v.plantCity,
            plantState: v.plantState,
          };

          let infoMsg = `That's a ${vehicleDesc}`;
          if (engineDesc) infoMsg += `, ${engineDesc}`;
          if (plantDesc) infoMsg += `, ${plantDesc}`;
          infoMsg += '. Correct?';

          state.step = 'car_onboarding_confirm_vin';
          return response(state, infoMsg);
        }

        // Decode failed or no service
        const userName = state.name ? `, ${state.name}` : '';
        state.carData = state.carData || {};
        state.carData.vin = vinInput;
        state.step = 'car_onboarding_details';
        return response(state, `Couldn't decode that VIN${userName}. Want to enter the details manually? Tell me the year, make, and model.`);
      }

      if (vinInput.length === 17) {
        return response(state, "That VIN contains invalid characters. VINs don't use the letters I, O, or Q. Can you double-check?");
      }

      const userName = state.name ? `${state.name}, v` : 'V';
      return response(state, `${userName}INs are exactly 17 characters. Please double-check, or type 'skip' if you don't have it handy.`);
    }

    case 'car_onboarding_confirm_vin': {
      if (isAffirmative(message)) {
        state.step = 'car_onboarding_mileage';
        return response(state, "What's the current mileage?");
      }
      state.step = 'car_onboarding_details';
      return response(state, "No problem! Tell me the year, make, and model and I'll update it.");
    }

    case 'car_onboarding_details': {
      const detailsInput = message.trim();
      const yearMatch = detailsInput.match(/\b(19|20)\d{2}\b/);
      if (!yearMatch || detailsInput.replace(yearMatch[0], '').trim().length < 2) {
        return response(state, "That doesn't look right. Please enter the year, make, and model -- for example: 2020 Toyota Camry.");
      }
      const cleanedDetails = detailsInput.replace(/\b\w/g, c => c.toUpperCase());
      state.carData = state.carData || {};
      state.carData.detailsCleaned = cleanedDetails;
      state.carData.yearCleaned = yearMatch[0];
      state.step = 'car_onboarding_details_confirm';
      return response(state, `${cleanedDetails}. Correct?`);
    }

    case 'car_onboarding_details_confirm': {
      if (isAffirmative(message)) {
        state.carData.details = state.carData.detailsCleaned;
        state.carData.year = state.carData.yearCleaned;
        state.step = 'car_onboarding_mileage';
        return response(state, "What's the current mileage?");
      }
      state.step = 'car_onboarding_details';
      return response(state, "No problem. What's the correct year, make, and model?");
    }

    case 'car_onboarding_mileage': {
      const rawMiles = message.replace(/[,\s]/g, '').toLowerCase();
      const kSuffix = rawMiles.match(/^(\d+)k$/);
      const miles = kSuffix ? parseInt(kSuffix[1]) * 1000 : parseInt(rawMiles);
      if (isNaN(miles) || miles < 0 || miles > 500000) {
        return response(state, "That mileage doesn't seem right. Please enter a number under 500,000.");
      }
      state.carData.mileage = miles.toLocaleString();
      state.step = 'car_onboarding_color';
      return response(state, "What color is it?");
    }

    case 'car_onboarding_color': {
      state.carData.color = message.trim().replace(/\b\w/g, c => c.toUpperCase());
      state.step = 'car_onboarding_ownership';
      return response(state, "And how do you have this vehicle?", {
        cards: [{
          type: 'ownership',
          data: {
            options: [
              { value: 'owned', label: 'Owned outright' },
              { value: 'financed', label: 'Financed' },
              { value: 'leased', label: 'Leased' },
            ],
          },
        }],
      });
    }

    case 'car_onboarding_lender': {
      state.carData.lender = message.trim();
      state.step = 'car_onboarding_documents';
      return response(state, "Do you have any documents to upload? Things like your title, registration, or service records. You can always add more later.");
    }

    case 'car_onboarding_documents': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 'car_onboarding_upload';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'vehicle',
              title: 'Upload Documents',
              description: 'Add your title, service records, or other documents',
              acceptedTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.heic,.webp',
            },
          }],
        });
      }
      // Skip documents — go to attestation
      return handleShowVehicleAttestation(state);
    }

    case 'car_onboarding_upload': {
      return handleShowVehicleAttestation(state);
    }

    // ── Student Flow ──

    case 'student_type': {
      state.studentData = state.studentData || {};
      state.studentData.type = message.trim();
      state.step = 'student_school';
      return response(state, "What school or university?");
    }

    case 'student_school': {
      const cleaned = cleanSchoolName(message.trim());
      state.studentData.schoolCleaned = cleaned.name;
      state.studentData.schoolAddress = cleaned.address;
      state.step = 'student_school_confirm';
      let msg = `That's ${cleaned.name}`;
      if (cleaned.address) msg += ` -- ${cleaned.address}`;
      msg += '. Correct?';
      return response(state, msg);
    }

    case 'student_school_confirm': {
      if (isAffirmative(message)) {
        state.studentData.school = state.studentData.schoolCleaned;
        state.step = 'student_program';
        return response(state, "What degree or program?");
      }
      state.step = 'student_school';
      return response(state, "No problem. What's the correct school name?");
    }

    case 'student_program': {
      const rawProgram = message.trim();
      const degreeLevel = cleanDegreeName(rawProgram);
      const fieldOfStudy = extractFieldOfStudy(rawProgram);

      if (degreeLevel) {
        const field = fieldOfStudy || rawProgram.replace(/\b(ba|bs|ma|ms|mba|phd|jd|md|bachelor'?s?|master'?s?|doctorate|associate'?s?|degree|of arts?|of science|in)\b/gi, '').trim();
        const fullProgram = field ? `${degreeLevel} in ${field.replace(/\b\w/g, c => c.toUpperCase())}` : degreeLevel;
        state.studentData.programCleaned = fullProgram;
        state.step = 'student_program_confirm';
        return response(state, `${fullProgram} from ${state.studentData.school || state.studentData.schoolCleaned}. Correct?`);
      }

      // No degree level detected — just a subject
      state.studentData.fieldOfStudy = rawProgram.replace(/\b\w/g, c => c.toUpperCase());
      state.step = 'student_degree_level';
      return response(state, "What degree level -- Associate, Bachelor's, Master's, or Doctorate?");
    }

    case 'student_degree_level': {
      const levelInput = message.toLowerCase().trim().replace(/[.]/g, '');
      let level = '';
      if (levelInput.includes('associate')) level = 'Associate Degree';
      else if (levelInput === 'ba' || levelInput === 'b of a' || levelInput === 'b a' || levelInput.includes('bachelor of art') || levelInput === 'bachelors' || levelInput === "bachelor's" || levelInput === 'bachelor') level = 'Bachelor of Arts (BA)';
      else if (levelInput === 'bs' || levelInput === 'b of s' || levelInput === 'b s' || levelInput.includes('bachelor of sci')) level = 'Bachelor of Science (BS)';
      else if (levelInput === 'ma' || levelInput === 'm of a' || levelInput === 'm a' || levelInput.includes('master of art') || levelInput === 'masters' || levelInput === "master's" || levelInput === 'master') level = 'Master of Arts (MA)';
      else if (levelInput === 'ms' || levelInput === 'm of s' || levelInput === 'm s' || levelInput.includes('master of sci')) level = 'Master of Science (MS)';
      else if (levelInput === 'mba' || levelInput.includes('business admin')) level = 'Master of Business Administration (MBA)';
      else if (levelInput.includes('doctor') || levelInput === 'phd' || levelInput === 'ph d') level = 'Doctor of Philosophy (PhD)';
      else if (levelInput === 'jd' || levelInput.includes('juris')) level = 'Juris Doctor (JD)';
      else if (levelInput === 'md' || levelInput.includes('medicine')) level = 'Doctor of Medicine (MD)';
      else {
        return response(state, "I didn't catch that. Associate, Bachelor's, Master's, or Doctorate?");
      }
      const fullProgram = `${level} in ${state.studentData.fieldOfStudy}`;
      state.studentData.programCleaned = fullProgram;
      state.step = 'student_program_confirm';
      return response(state, `${fullProgram} from ${state.studentData.school || state.studentData.schoolCleaned}. Correct?`);
    }

    case 'student_program_confirm': {
      if (isAffirmative(message)) {
        state.studentData.program = state.studentData.programCleaned;
        state.step = 'student_year';
        return response(state, "What year did you graduate (or expect to)?");
      }
      state.step = 'student_program';
      return response(state, "No problem. What's the correct degree or program?");
    }

    case 'student_year': {
      const yearCleaned = cleanYear(message);
      if (!yearCleaned) {
        return response(state, "Please enter a year, like 2023 or 98.");
      }
      state.studentData.yearCleaned = yearCleaned;
      state.step = 'student_year_confirm';
      return response(state, `${yearCleaned}. Correct?`);
    }

    case 'student_year_confirm': {
      if (isAffirmative(message)) {
        state.studentData.year = state.studentData.yearCleaned;
        state.step = 'student_docs';
        return response(state, "Do you have a document to upload -- a transcript, diploma scan, or certificate? You can always add it later.");
      }
      state.step = 'student_year';
      return response(state, "What's the correct year?");
    }

    case 'student_docs': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 'student_upload';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'student',
              title: 'Upload Academic Document',
              description: 'Transcript, diploma scan, or certificate',
              acceptedTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.heic,.webp',
            },
          }],
        });
      }
      return handleShowStudentAttestation(state);
    }

    case 'student_upload': {
      return handleShowStudentAttestation(state);
    }

    // ── Credential Flow ──

    case 'credential_type': {
      state.credentialData = state.credentialData || {};
      state.credentialData.type = message.trim();
      state.step = 'credential_name';
      return response(state, "What is the name of the credential?");
    }

    case 'credential_disambiguate': {
      const selDisambig = message.toLowerCase().trim();
      const disambigOpts = (state.credentialData && state.credentialData.disambiguationOptions) || {};

      if (selDisambig.includes('other')) {
        state.step = 'credential_name';
        return response(state, "What is the full name of the credential?");
      }

      let disambigMatch = null;
      for (const [k, v] of Object.entries(disambigOpts)) {
        if (selDisambig.includes(k) || selDisambig === k) {
          disambigMatch = v;
          break;
        }
      }

      if (disambigMatch) {
        state.credentialData.nameCleaned = disambigMatch;
        state.credentialData.type = 'license';
        state.step = 'credential_name_confirm';
        return response(state, `${disambigMatch}. Correct?`);
      }

      // Fallback: clean whatever they typed
      const dcCleaned = cleanCredentialName(message.trim());
      state.credentialData.nameCleaned = dcCleaned;
      state.credentialData.type = 'credential';
      state.step = 'credential_name_confirm';
      return response(state, `${dcCleaned}. Correct?`);
    }

    case 'credential_name': {
      const cleanedCred = cleanCredentialName(message.trim());
      state.credentialData.nameCleaned = cleanedCred;
      state.step = 'credential_name_confirm';
      return response(state, `That's ${cleanedCred}. Correct?`);
    }

    case 'credential_name_confirm': {
      if (isAffirmative(message)) {
        state.credentialData.name = state.credentialData.nameCleaned;
        // Branch: pilot track
        if (state.credentialData.disambiguationKey === 'pilot') {
          state.pilotData = { certName: state.credentialData.name };
          state.step = 'pilot_cert_number';
          return response(state, "What is your FAA certificate number?");
        }
        state.step = 'credential_issuer';
        return response(state, "Who issued it?");
      }
      state.step = 'credential_name';
      return response(state, "No problem. What's the correct credential name?");
    }

    case 'credential_issuer': {
      state.credentialData.issuer = message.trim().replace(/\b\w/g, c => c.toUpperCase());
      state.step = 'credential_date';
      return response(state, "When was it earned? A month and year is fine.");
    }

    case 'credential_date': {
      state.credentialData.dateEarned = message.trim();
      state.step = 'credential_expiry';
      return response(state, "Does it expire? If so, when? Type 'none' if it doesn't.");
    }

    case 'credential_expiry': {
      const exp = message.trim().toLowerCase();
      state.credentialData.expiry = (exp === 'none' || exp === 'no' || exp === 'n/a') ? 'Does not expire' : message.trim();
      state.step = 'credential_docs';
      return response(state, "Do you have a certificate or document to upload? You can always add it later.");
    }

    case 'credential_docs': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 'credential_upload';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'credential',
              title: 'Upload Credential Document',
              description: 'Certificate, license scan, or other document',
              acceptedTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.heic,.webp',
            },
          }],
        });
      }
      return handleShowCredentialAttestation(state);
    }

    case 'credential_upload': {
      return handleShowCredentialAttestation(state);
    }

    // ── Pilot Flow ──

    case 'pilot_cert_number': {
      state.pilotData = state.pilotData || {};
      state.pilotData.certNumber = message.trim().toUpperCase();
      state.step = 'pilot_date_issued';
      return response(state, "When was it issued? A month and year is fine.");
    }

    case 'pilot_date_issued': {
      state.pilotData.dateIssued = message.trim();
      state.step = 'pilot_type_ratings';
      return response(state, "Do you hold any type ratings? For example, B737, A320, CE-525. Type 'none' if not.");
    }

    case 'pilot_type_ratings': {
      const tr = message.trim().toLowerCase();
      state.pilotData.typeRatings = (tr === 'none' || tr === 'no' || tr === 'n/a')
        ? []
        : message.trim().split(/[,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
      state.step = 'pilot_hours';
      return response(state, "What are your total flight hours?");
    }

    case 'pilot_hours': {
      const hrs = parseInt(message.replace(/[^0-9]/g, ''));
      if (isNaN(hrs) || hrs < 0 || hrs > 100000) {
        return response(state, "Please enter a valid number of flight hours.");
      }
      state.pilotData.totalHours = hrs.toLocaleString();
      state.step = 'pilot_docs';
      return response(state, "Do you have a logbook or certificate to upload? You can always add it later.");
    }

    case 'pilot_docs': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 'pilot_upload';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'pilot',
              title: 'Upload Pilot Logbook or Certificate',
              description: 'Logbook, certificate scan, or other document',
              acceptedTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.heic,.webp',
            },
          }],
        });
      }
      return handleShowPilotAttestation(state);
    }

    case 'pilot_upload': {
      return handleShowPilotAttestation(state);
    }

    // ── Interest / Pitch Response ──

    case 'interested': {
      const lower = message.toLowerCase().trim();
      const affirmatives = ['yes', 'yeah', 'sure', 'ok', 'okay', "let's go", 'lets go', 'start', 'sign up', 'try it', 'get started', 'yep', 'yup', 'absolutely', 'definitely', 'i do', 'please', 'sounds good', 'i want to', 'let me'];
      const negatives = ['no', 'not now', 'nah', 'later', 'maybe later', 'not yet', 'not really'];
      const isAff = affirmatives.some(a => lower === a || lower.startsWith(a + ' ') || lower.startsWith(a + ',') || lower.startsWith(a + '.') || lower.startsWith(a + '!'));
      const isNeg = negatives.some(n => lower === n || lower.startsWith(n + ' ') || lower.startsWith(n + ','));

      if (isAff) {
        state.step = 'collect_name';
        return response(state, "Perfect. What's your name?");
      }
      if (isNeg) {
        state.step = 'idle';
        state.vertical = null;
        return response(state, "No problem. I'm here whenever you're ready.");
      }
      // Didn't match yes/no — treat as new input (unauthenticated chat)
      return response(state, getDemoResponse(message));
    }

    // ── Analyst: Deal Vetting Lane ──

    case 'analyst_deal_upload': {
      if (input.fileData || (input.action === 'files_uploaded')) {
        return handleFilesUploaded(state, input);
      }
      if (lowerMsg.includes('skip') || lowerMsg.includes('no') || lowerMsg.includes('later') || isNegative(message)) {
        state.step = 'analyst_deal_company';
        return response(state, "No problem. Tell me about this deal -- what's the company name?");
      }
      state.dealData = state.dealData || {};
      state.dealData.companyName = message.trim();
      state.step = 'analyst_deal_sector';
      return response(state, `Got it. What sector is ${state.dealData.companyName} in?`);
    }

    case 'analyst_deal_company': {
      state.dealData = state.dealData || {};
      state.dealData.companyName = message.trim();
      state.step = 'analyst_deal_sector';
      return response(state, `What sector is ${state.dealData.companyName} in?`);
    }

    case 'analyst_deal_sector': {
      state.dealData = state.dealData || {};
      state.dealData.sector = message.trim();
      state.step = 'analyst_deal_type';
      return response(state, "What type of deal?", {
        promptChips: ['M&A', 'LBO', 'Growth Equity', 'Debt'],
      });
    }

    case 'analyst_deal_type': {
      state.dealData = state.dealData || {};
      state.dealData.dealType = message.trim();
      state.step = 'analyst_deal_size';
      return response(state, "What's the deal size?");
    }

    case 'analyst_deal_size': {
      state.dealData = state.dealData || {};
      state.dealData.dealSize = message.trim();
      state.step = 'analyst_deal_source';
      return response(state, "Where did this come from?", {
        promptChips: ['Bank', 'Broker', 'Direct', 'Other'],
      });
    }

    case 'analyst_deal_source': {
      state.dealData = state.dealData || {};
      state.dealData.source = message.trim();
      state.step = 'analyst_deal_summary';

      const d = state.dealData;
      return response(state, `Here's what I have:\n\nCompany: ${d.companyName}\nSector: ${d.sector}\nDeal type: ${d.dealType}\nDeal size: ${d.dealSize}\nSource: ${d.source}\n\nDoes this look right?`);
    }

    case 'analyst_deal_summary': {
      if (isAffirmative(message)) {
        state.step = 'analyst_deal_docs';
        return response(state, "Do you have a CIM or deal package to upload? You can always add it later.");
      }
      state.step = 'analyst_deal_company';
      state.dealData = {};
      return response(state, "No problem. Let's start over. What's the company name?");
    }

    case 'analyst_deal_docs': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 'analyst_deal_upload_docs';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'deal',
              title: 'Upload Deal Package',
              description: 'CIM, teaser, financial model, or other deal documents',
              acceptedTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.pptx,.ppt',
            },
          }],
        });
      }
      return handleShowDealAttestation(state);
    }

    case 'analyst_deal_upload_docs': {
      return handleShowDealAttestation(state);
    }

    case 'analyst_deal_attestation': {
      if (isAffirmative(message)) {
        return handleDealDTC(state);
      }
      state.step = 'analyst_deal_company';
      state.dealData = {};
      return response(state, "No problem. Let's start over. What's the company name?");
    }

    // ── Analyst: POV Writing Lane ──

    case 'analyst_pov_select': {
      state.dealData = state.dealData || {};
      state.dealData.povDealName = message.trim();
      state.step = 'analyst_pov_thesis';
      return response(state, "What's your investment thesis in a sentence or two?");
    }

    case 'analyst_pov_thesis': {
      state.dealData = state.dealData || {};
      state.dealData.povThesis = message.trim();
      state.step = 'analyst_pov_risks';
      return response(state, "What are the key risks?");
    }

    case 'analyst_pov_risks': {
      state.dealData = state.dealData || {};
      state.dealData.povRisks = message.trim();
      state.step = 'analyst_pov_strengths';
      return response(state, "What are the strengths?");
    }

    case 'analyst_pov_strengths': {
      state.dealData = state.dealData || {};
      state.dealData.povStrengths = message.trim();
      state.step = 'analyst_pov_recommendation';
      return response(state, "What's your recommendation?", {
        promptChips: ['Pass', 'Pursue', 'Watch'],
      });
    }

    case 'analyst_pov_recommendation': {
      state.dealData = state.dealData || {};
      state.dealData.povRecommendation = message.trim();
      state.step = 'analyst_pov_review';

      const pd = state.dealData;
      return response(state, `Here's your draft POV:\n\nDeal: ${pd.povDealName || 'N/A'}\nThesis: ${pd.povThesis}\nRisks: ${pd.povRisks}\nStrengths: ${pd.povStrengths}\nRecommendation: ${pd.povRecommendation}\n\nWant to adjust anything?`);
    }

    case 'analyst_pov_review': {
      if (isAffirmative(message) || lowerMsg.includes('good') || lowerMsg.includes('looks good') ||
          lowerMsg.includes('submit') || lowerMsg.includes('save') || lowerMsg.includes('confirm')) {
        return handlePovDTC(state);
      }
      state.step = 'analyst_pov_thesis';
      return response(state, "Let's revise. What's your investment thesis?");
    }

    // ── Real Estate: Property Setup Lane ──

    case 're_property_address': {
      state.propertyData = state.propertyData || {};
      state.propertyData.address = message.trim();
      state.step = 're_property_confirm_address';
      return response(state, `${state.propertyData.address}. Is that correct?`);
    }

    case 're_property_confirm_address': {
      if (isAffirmative(message)) {
        state.step = 're_property_type';
        return response(state, "What type of property?", {
          promptChips: ['Single Family', 'Multi-Family', 'Commercial', 'Condo'],
        });
      }
      state.step = 're_property_address';
      return response(state, "No problem. What's the correct address?");
    }

    case 're_property_type': {
      state.propertyData = state.propertyData || {};
      const pType = message.trim().toLowerCase();
      if (pType.includes('single')) state.propertyData.propertyType = 'single-family';
      else if (pType.includes('multi')) state.propertyData.propertyType = 'multi-family';
      else if (pType.includes('commercial')) state.propertyData.propertyType = 'commercial';
      else if (pType.includes('condo')) state.propertyData.propertyType = 'condo';
      else state.propertyData.propertyType = message.trim();

      if (state.propertyData.propertyType === 'multi-family' || state.propertyData.propertyType === 'condo' || state.propertyData.propertyType === 'commercial') {
        state.step = 're_property_units';
        return response(state, "How many units?");
      }
      state.propertyData.unitCount = 1;
      state.step = 're_property_ownership';
      return response(state, "What entity owns this property? For example, your name or an LLC.");
    }

    case 're_property_units': {
      state.propertyData = state.propertyData || {};
      const units = parseInt(message.replace(/[^0-9]/g, ''));
      if (isNaN(units) || units < 1 || units > 10000) {
        return response(state, "Please enter a valid number of units.");
      }
      state.propertyData.unitCount = units;
      state.step = 're_property_ownership';
      return response(state, "What entity owns this property? For example, your name or an LLC.");
    }

    case 're_property_ownership': {
      state.propertyData = state.propertyData || {};
      state.propertyData.ownershipEntity = message.trim();
      state.step = 're_property_docs';
      return response(state, "Upload the deed or any property documents. You can always add more later.");
    }

    case 're_property_docs': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 're_property_upload';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'property',
              title: 'Upload Property Documents',
              description: 'Deed, title, inspection report, or other documents',
              acceptedTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.heic,.webp',
            },
          }],
        });
      }
      return handleShowPropertySummary(state);
    }

    case 're_property_upload': {
      return handleShowPropertySummary(state);
    }

    case 're_property_confirm_all': {
      if (isAffirmative(message)) {
        return handleShowPropertyAttestation(state);
      }
      state.step = 're_property_address';
      state.propertyData = {};
      return response(state, "No problem. Let's start over. What's the property address?");
    }

    case 're_property_attestation': {
      if (isAffirmative(message)) {
        return handlePropertyDTC(state);
      }
      state.step = 're_property_address';
      state.propertyData = {};
      return response(state, "No problem. Let's start over. What's the property address?");
    }

    // ── Real Estate: Tenant Onboarding Lane ──

    case 're_tenant_property': {
      state.propertyData = state.propertyData || {};
      const tenantPropRecords = (state.records || []).filter(r => r.type === 'property');

      // If user said "yes" to a single-property prompt, use that property
      if (isAffirmative(message) && tenantPropRecords.length === 1) {
        state.propertyData.tenantPropertyName = tenantPropRecords[0].address;
        state.propertyData.tenantPropertyId = tenantPropRecords[0].id;
        if (tenantPropRecords[0].unitCount > 1) {
          state.step = 're_tenant_unit';
          return response(state, "Which unit?");
        }
        state.step = 're_tenant_name';
        return response(state, "What's the tenant's name?");
      }

      // User typed a property name/address
      state.propertyData.tenantPropertyName = message.trim();
      const matchTenantProp = tenantPropRecords.find(r => r.address && r.address.toLowerCase().includes(message.trim().toLowerCase()));
      if (matchTenantProp) {
        state.propertyData.tenantPropertyId = matchTenantProp.id;
        if (matchTenantProp.unitCount > 1) {
          state.step = 're_tenant_unit';
          return response(state, "Which unit?");
        }
      }
      state.step = 're_tenant_name';
      return response(state, "What's the tenant's name?");
    }

    case 're_tenant_unit': {
      state.propertyData = state.propertyData || {};
      state.propertyData.tenantUnit = message.trim();
      state.step = 're_tenant_name';
      return response(state, "What's the tenant's name?");
    }

    case 're_tenant_name': {
      state.propertyData = state.propertyData || {};
      state.propertyData.tenantName = parseName(message);
      state.step = 're_tenant_email';
      return response(state, "What's their email? We'll send them an invite to set up their own TitleApp account.");
    }

    case 're_tenant_email': {
      if (isValidEmail(message)) {
        state.propertyData = state.propertyData || {};
        state.propertyData.tenantEmail = getEmail(message);
        state.step = 're_tenant_lease_start';
        return response(state, "When does the lease start?");
      }
      return response(state, "That doesn't look like a valid email address. Please try again.");
    }

    case 're_tenant_lease_start': {
      state.propertyData = state.propertyData || {};
      state.propertyData.leaseStart = message.trim();
      state.step = 're_tenant_lease_end';
      return response(state, "When does it end?");
    }

    case 're_tenant_lease_end': {
      state.propertyData = state.propertyData || {};
      state.propertyData.leaseEnd = message.trim();
      state.step = 're_tenant_rent';
      return response(state, "What's the monthly rent?");
    }

    case 're_tenant_rent': {
      state.propertyData = state.propertyData || {};
      state.propertyData.monthlyRent = message.trim();
      state.step = 're_tenant_deposit';
      return response(state, "Security deposit amount?");
    }

    case 're_tenant_deposit': {
      state.propertyData = state.propertyData || {};
      state.propertyData.securityDeposit = message.trim();
      state.step = 're_tenant_lease_doc';
      return response(state, "Upload the signed lease if you have it. You can always add it later.");
    }

    case 're_tenant_lease_doc': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 're_tenant_upload';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'lease',
              title: 'Upload Signed Lease',
              description: 'Signed lease agreement or addenda',
              acceptedTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.heic,.webp',
            },
          }],
        });
      }
      return handleShowTenantSummary(state);
    }

    case 're_tenant_upload': {
      return handleShowTenantSummary(state);
    }

    case 're_tenant_confirm': {
      if (isAffirmative(message)) {
        return handleTenantDTC(state);
      }
      state.step = 're_tenant_name';
      state.propertyData.tenantName = null;
      return response(state, "No problem. Let's start over. What's the tenant's name?");
    }

    // ── Real Estate: Maintenance Request Lane ──

    case 're_mx_property': {
      state.propertyData = state.propertyData || {};
      const mxPropRecords = (state.records || []).filter(r => r.type === 'property');

      // If user said "yes" to a single-property prompt, use that property
      if (isAffirmative(message) && mxPropRecords.length === 1) {
        state.propertyData.mxPropertyName = mxPropRecords[0].address;
        state.propertyData.mxPropertyId = mxPropRecords[0].id;
        if (mxPropRecords[0].unitCount > 1) {
          state.step = 're_mx_unit';
          return response(state, "Which unit?");
        }
        state.step = 're_mx_describe';
        return response(state, "Describe the issue.");
      }

      // User typed a property name/address
      state.propertyData.mxPropertyName = message.trim();
      const mxMatchProp = mxPropRecords.find(r => r.address && r.address.toLowerCase().includes(message.trim().toLowerCase()));
      if (mxMatchProp) {
        state.propertyData.mxPropertyId = mxMatchProp.id;
        if (mxMatchProp.unitCount > 1) {
          state.step = 're_mx_unit';
          return response(state, "Which unit?");
        }
      }
      state.step = 're_mx_describe';
      return response(state, "Describe the issue.");
    }

    case 're_mx_unit': {
      state.propertyData = state.propertyData || {};
      state.propertyData.mxUnit = message.trim();
      state.step = 're_mx_describe';
      return response(state, "Describe the issue.");
    }

    case 're_mx_describe': {
      state.propertyData = state.propertyData || {};
      state.propertyData.mxDescription = message.trim();
      // Auto-detect category
      const desc = message.toLowerCase();
      let autoCategory = 'General';
      if (desc.includes('plumb') || desc.includes('leak') || desc.includes('pipe') || desc.includes('drain') || desc.includes('toilet') || desc.includes('faucet')) autoCategory = 'Plumbing';
      else if (desc.includes('electric') || desc.includes('outlet') || desc.includes('light') || desc.includes('wire') || desc.includes('breaker') || desc.includes('switch')) autoCategory = 'Electrical';
      else if (desc.includes('hvac') || desc.includes('heat') || desc.includes('ac') || desc.includes('air condition') || desc.includes('furnace') || desc.includes('thermostat')) autoCategory = 'HVAC';
      else if (desc.includes('appliance') || desc.includes('dishwasher') || desc.includes('washer') || desc.includes('dryer') || desc.includes('refrigerator') || desc.includes('oven') || desc.includes('stove')) autoCategory = 'Appliance';
      else if (desc.includes('roof') || desc.includes('wall') || desc.includes('floor') || desc.includes('foundation') || desc.includes('window') || desc.includes('door') || desc.includes('structural')) autoCategory = 'Structural';
      state.propertyData.mxAutoCategory = autoCategory;
      state.step = 're_mx_category';
      return response(state, `Sounds like ${autoCategory}. Is that right?`, {
        promptChips: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'General'],
      });
    }

    case 're_mx_category': {
      state.propertyData = state.propertyData || {};
      if (isAffirmative(message)) {
        state.propertyData.mxCategory = state.propertyData.mxAutoCategory || 'General';
      } else {
        state.propertyData.mxCategory = message.trim();
      }
      state.step = 're_mx_priority';
      return response(state, "How urgent is this?", {
        promptChips: ['Low', 'Medium', 'High', 'Emergency'],
      });
    }

    case 're_mx_priority': {
      state.propertyData = state.propertyData || {};
      state.propertyData.mxPriority = message.trim();
      state.step = 're_mx_photos';
      return response(state, "Can you upload any photos of the issue? You can skip this.");
    }

    case 're_mx_photos': {
      if (lowerMsg.includes('yes') || lowerMsg.includes('upload')) {
        state.step = 're_mx_upload';
        return response(state, null, {
          cards: [{
            type: 'fileUpload',
            data: {
              category: 'maintenance',
              title: 'Upload Photos',
              description: 'Photos of the maintenance issue',
              acceptedTypes: '.jpg,.jpeg,.png,.heic,.webp,.pdf',
            },
          }],
        });
      }
      return handleShowWorkOrderSummary(state);
    }

    case 're_mx_upload': {
      return handleShowWorkOrderSummary(state);
    }

    case 're_mx_confirm': {
      if (isAffirmative(message)) {
        return handleWorkOrderDTC(state);
      }
      state.step = 're_mx_describe';
      return response(state, "No problem. Describe the issue again.");
    }

    // ── Post-Auth Business Setup ──

    case 'biz_collect_company_name': {
      state.companyName = message.trim();
      state.step = 'biz_collect_company_description';
      return response(state, `What does ${state.companyName} do? Just a sentence or two.`);
    }

    case 'biz_collect_company_description': {
      state.companyDescription = message.trim();
      state.step = 'raas_onboarding';
      const industry = extractIndustry(state.companyDescription);
      return response(state, null, {
        generateRaas: true,
        aiContext: {
          companyName: state.companyName,
          companyDescription: state.companyDescription,
          industry,
        },
      });
    }

    // ── RAAS Onboarding ──

    case 'raas_onboarding': {
      // User responded to the RAAS onboarding message (generated by AI in index.js)
      if (lowerMsg.includes('standard') || lowerMsg.includes('start with') || lowerMsg.includes('use the') || lowerMsg.includes("let's go") ||
          isAffirmative(lowerMsg)) {
        // Accept pre-built RAAS — route to vertical based on raasMatch
        const raasMatch = (state.raasClassification && state.raasClassification.raasMatch) || '';
        const raasLower = raasMatch.toLowerCase();

        if (raasLower.includes('property') || raasLower.includes('real estate')) {
          state.businessVertical = 'real_estate';
          state.audienceType = 'business';
        } else if (raasLower.includes('deal') || raasLower.includes('analyst') || raasLower.includes('investment')) {
          state.businessVertical = 'analyst';
          state.audienceType = 'business';
        } else if (raasLower.includes('auto') || raasLower.includes('consumer')) {
          state.businessVertical = 'auto';
          state.audienceType = 'business';
        } else {
          state.businessVertical = 'general';
          state.audienceType = 'business';
        }

        // Go to raas_ready — generate the emotional onboarding promise
        state.raasConfigured = true;
        state.currentHub = state.businessVertical;
        state.step = 'raas_ready';
        return response(state, null, {
          generateOnboardingPromise: true,
          aiContext: {
            type: 'business',
            name: state.name,
            companyName: state.companyName,
            companyDescription: state.companyDescription,
            industry: (state.raasClassification && state.raasClassification.industry) || extractIndustry(state.companyDescription),
            businessVertical: state.businessVertical,
          },
        });
      }

      if (lowerMsg.includes('sop') || lowerMsg.includes('upload') || lowerMsg.includes('document') || lowerMsg.includes('procedure')) {
        // User wants to upload SOPs
        state.step = 'raas_upload_sops';
        return response(state, "Upload your documents -- operating procedures, compliance policies, checklists, onboarding guides, anything that defines how your business runs. I'll review them and incorporate them into your workspace rules.");
      }

      if (lowerMsg.includes('tell me more') || lowerMsg.includes('what') || lowerMsg.includes('how') || lowerMsg.includes('included') || lowerMsg.includes('explain')) {
        // User wants more info — stay in raas_onboarding
        const raas = state.raasClassification || {};
        const summary = raas.summary || 'records management, compliance tracking, and workflow automation tailored to your business';
        return response(state, `Your workspace includes ${summary}. You can customize everything later -- add your own policies, adjust compliance rules, and configure workflows to match how your team operates. Want to start with the standard setup, or upload your SOPs first?`, {
          promptChips: ['Start with the standard setup', 'I have SOPs to upload'],
        });
      }

      if (lowerMsg.includes("let's build") || lowerMsg.includes('build it') || lowerMsg.includes('custom') || lowerMsg.includes('ready')) {
        // No existing RAAS — start RAAS builder
        state.step = 'raas_build';
        return response(state, null, {
          classifyIntent: false,
          useAI: false,
          generateRaas: 'build_questions',
          aiContext: {
            companyName: state.companyName,
            companyDescription: state.companyDescription,
          },
        });
      }

      // Unclear response — re-prompt
      const raas = state.raasClassification || {};
      if (raas.hasExistingRaas) {
        return response(state, "Would you like to start with the standard setup, upload your own SOPs, or hear more about what's included?", {
          promptChips: ['Start with the standard setup', 'I have SOPs to upload first', 'Tell me more about what\'s included'],
        });
      }
      return response(state, "Ready to build your custom workspace? It usually takes about 10 minutes.", {
        promptChips: ["Let's build it", 'Tell me more about how this works'],
      });
    }

    case 'raas_upload_sops': {
      // Handle file upload action
      if (action === 'files_uploaded' || (fileData && fileName)) {
        // Files received — acknowledge and store reference
        if (!state.raasUploads) state.raasUploads = [];
        state.raasUploads.push({ name: fileName || 'document', uploadedAt: new Date().toISOString() });

        return response(state, `Got it. I've received ${fileName || 'your document'} and I'll work it into your configuration. Upload more, or say "done" when you're ready to continue.`, {
          sideEffects: fileData ? [{
            action: 'uploadRaasSop',
            data: { fileData, fileName },
          }] : [],
        });
      }

      if (lowerMsg.includes('done') || lowerMsg.includes('ready') || lowerMsg.includes('continue') || lowerMsg.includes("that's all") || lowerMsg.includes("that's it")) {
        const uploadCount = (state.raasUploads || []).length;
        const ackMsg = uploadCount > 0
          ? `Got it. I've received ${uploadCount} document${uploadCount > 1 ? 's' : ''} and I'll work them into your configuration. You can always upload more or adjust things later. Ready to get started?`
          : "No problem. You can always upload documents later. Ready to get started?";

        // Route to raas_ready with emotional promise
        const raasMatch = (state.raasClassification && state.raasClassification.raasMatch) || '';
        const raasLower = raasMatch.toLowerCase();
        if (raasLower.includes('property') || raasLower.includes('real estate')) {
          state.businessVertical = 'real_estate';
        } else if (raasLower.includes('deal') || raasLower.includes('analyst') || raasLower.includes('investment')) {
          state.businessVertical = 'analyst';
        } else if (raasLower.includes('auto')) {
          state.businessVertical = 'auto';
        } else {
          state.businessVertical = 'general';
        }
        state.audienceType = 'business';
        state.raasConfigured = true;
        state.currentHub = state.businessVertical;
        state.step = 'raas_ready';
        return response(state, ackMsg, {
          generateOnboardingPromise: true,
          aiContext: {
            type: 'business',
            name: state.name,
            companyName: state.companyName,
            companyDescription: state.companyDescription,
            industry: (state.raasClassification && state.raasClassification.industry) || extractIndustry(state.companyDescription),
            businessVertical: state.businessVertical,
          },
        });
      }

      // Any other text — treat as a note about their business (store it)
      if (!state.raasNotes) state.raasNotes = [];
      state.raasNotes.push(message.trim());
      return response(state, "Noted. Upload your files when ready, or say \"done\" to continue.");
    }

    case 'raas_build': {
      // RAAS Builder — AI generates questions one at a time
      // The AI question is set by index.js via the generateRaas: 'build_questions' signal
      // User answers are stored and the next question is generated

      if (!state.raasBuildAnswers) state.raasBuildAnswers = [];
      state.raasBuildAnswers.push({ question: state.raasBuildCurrentQuestion || '', answer: message.trim() });

      // Check if we have enough answers (3-5 questions)
      if (state.raasBuildAnswers.length >= 5 || lowerMsg.includes('done') || lowerMsg.includes("that's all")) {
        // Generate summary and finalize
        state.step = 'raas_build_confirm';
        return response(state, null, {
          generateRaas: 'build_summary',
          aiContext: {
            companyName: state.companyName,
            companyDescription: state.companyDescription,
            answers: state.raasBuildAnswers,
          },
        });
      }

      // Ask the next question
      state.raasBuildQuestionIndex = (state.raasBuildQuestionIndex || 0) + 1;
      return response(state, null, {
        generateRaas: 'build_next_question',
        aiContext: {
          companyName: state.companyName,
          companyDescription: state.companyDescription,
          answers: state.raasBuildAnswers,
          questionIndex: state.raasBuildQuestionIndex,
        },
      });
    }

    case 'raas_build_confirm': {
      if (isAffirmative(lowerMsg) || lowerMsg.includes('looks good') || lowerMsg.includes('looks right')) {
        // Confirmed — set vertical and go to raas_ready
        state.businessVertical = state.businessVertical || 'general';
        state.audienceType = 'business';
        state.raasConfigured = true;
        state.currentHub = state.businessVertical;
        state.step = 'raas_ready';
        return response(state, null, {
          generateOnboardingPromise: true,
          aiContext: {
            type: 'business',
            name: state.name,
            companyName: state.companyName,
            companyDescription: state.companyDescription,
            industry: (state.raasClassification && state.raasClassification.industry) || extractIndustry(state.companyDescription),
            businessVertical: state.businessVertical,
          },
          sideEffects: [{
            action: 'saveRaasConfig',
            data: {
              raasBuildAnswers: state.raasBuildAnswers,
              raasBuildSummary: state.raasBuildSummary,
            },
          }],
        });
      }

      // Not right — let them adjust
      state.step = 'raas_build';
      state.raasBuildAnswers = state.raasBuildAnswers || [];
      return response(state, "No problem. Tell me what needs to change and I'll adjust the configuration.");
    }

    case 'raas_ready': {
      // Business user just saw the emotional onboarding promise
      // Redirect to platform — onboarding is done
      state.step = 'authenticated';
      return response(state, "Your workspace is ready. Taking you there now.", {
        platformRedirect: true,
      });
    }

    // ── Consumer Onboarding Promise ──

    case 'consumer_onboarding_promise': {
      // Consumer saw the emotional promise — route their response through the authenticated hub
      // by setting step to authenticated and re-processing the same message
      state.step = 'authenticated';
      // If the user actually typed something meaningful, re-process it
      if (message && message.trim().length > 0) {
        // Recurse into processMessage with the updated state
        return processMessage({
          state,
          userInput: message,
          action: null,
          actionData: {},
          fileData: input.fileData || null,
          fileName: input.fileName || null,
          surface: input.surface || 'landing',
        }, services);
      }
      return response(state, "What would you like to start with?", {
        promptChips: ['Add a vehicle', 'Add a credential', 'Education record'],
      });
    }

    // ── Legacy Vertical Selection (kept as fallback) ──

    case 'select_vertical': {
      if (lowerMsg.includes('property') || lowerMsg.includes('real estate') || lowerMsg.includes('rental') ||
          lowerMsg.includes('tenant') || lowerMsg.includes('landlord') || lowerMsg.includes('building')) {
        state.businessVertical = 'real_estate';
        state.step = 'authenticated';
        return response(state, `Welcome to your property management workspace, ${state.name || ''}. What would you like to do?`, {
          promptChips: ['Add a property', 'Onboard a tenant', 'Maintenance request', 'View properties'],
        });
      }
      if (lowerMsg.includes('deal') || lowerMsg.includes('analyst') || lowerMsg.includes('investment') ||
          lowerMsg.includes('m&a') || lowerMsg.includes('lbo') || lowerMsg.includes('equity') ||
          lowerMsg.includes('screening') || lowerMsg.includes('vetting')) {
        state.businessVertical = 'analyst';
        state.step = 'authenticated';
        return response(state, `Welcome to your analyst workspace, ${state.name || ''}. What would you like to do?`, {
          promptChips: ['Vet a new deal', 'Write a POV', 'View pipeline'],
        });
      }
      if (lowerMsg.includes('auto') || lowerMsg.includes('dealer') || lowerMsg.includes('car') ||
          lowerMsg.includes('vehicle') || lowerMsg.includes('inventory')) {
        state.businessVertical = 'auto';
        state.step = 'authenticated';
        return response(state, `Welcome to your auto dealer workspace, ${state.name || ''}. What would you like to do?`, {
          promptChips: ['Add a vehicle', 'View inventory', 'Sales pipeline'],
        });
      }
      if (lowerMsg.includes('sales') || lowerMsg.includes('marketing') || lowerMsg.includes('crm') ||
          lowerMsg.includes('lead') || lowerMsg.includes('pipeline') || lowerMsg.includes('customer')) {
        state.businessVertical = 'sales';
        state.step = 'authenticated';
        return response(state, `Welcome to your sales workspace, ${state.name || ''}. What would you like to do?`, {
          promptChips: ['Add a customer', 'View pipeline', 'Set up follow-up'],
        });
      }
      // "Other" or unrecognized — generic business
      if (lowerMsg.includes('other') || message.trim().length > 0) {
        state.businessVertical = 'general';
        state.step = 'authenticated';
        return response(state, `Your workspace is ready, ${state.name || ''}. What would you like to do?`, {
          promptChips: ['Add a record', 'Set up compliance', 'View vault'],
        });
      }
      return response(state, "What does your business focus on?", {
        promptChips: ['Property Management', 'Deal Analysis & Investment', 'Auto Dealer', 'Sales & Marketing', 'Other'],
      });
    }

    // ── Default / Idle ──

    default: {
      // Detect vertical first — works for both authenticated and unauthenticated
      const detected = detectVertical(lowerMsg);
      if (detected) {
        state.vertical = detected;
        state.audienceType = ['business', 'compliance'].includes(detected) ? 'business' : 'consumer';
        state.step = 'interested';
        return response(state, PITCHES[detected]);
      }

      // Authenticated user in idle with no vertical match — fall through to AI
      if (state.step === 'idle' && state.userId) {
        return response(state, null, { useAI: true });
      }

      // No vertical detected, not authenticated — demo response
      return response(state, getDemoResponse(message));
    }
  }
}

// ──────────────────────────────────────────────────────────────
// FLOW HANDLERS (attestation, DTC, vault, logbook)
// ──────────────────────────────────────────────────────────────

function detectVertical(lowerMsg) {
  for (const [v, keywords] of Object.entries(VERTICAL_MAP)) {
    if (keywords.some(k => lowerMsg.includes(k))) return v;
  }
  return null;
}

function handleCredentialDetection(state, message, lowerMsg) {
  // Predictive disambiguation
  let disambMatch = null;
  for (const [key, config] of Object.entries(DISAMBIGUATION_MAP)) {
    if (config.keywords.some(k => lowerMsg.includes(k))) {
      disambMatch = config;
      state.credentialData.disambiguationKey = key;
      break;
    }
  }

  if (disambMatch) {
    state.credentialData.disambiguationOptions = disambMatch.options;
    state.step = 'credential_disambiguate';
    return response(state, disambMatch.prompt);
  }

  // No disambiguation match — check for known credential name
  const credCleaned = cleanCredentialName(message.trim());
  const credRaw = message.trim().toLowerCase();
  const isGeneric = ['license', 'credential', 'certification', 'cert', 'my credential', 'my license'].includes(credRaw);

  if (!isGeneric && credCleaned !== message.trim().replace(/\b\w/g, c => c.toUpperCase())) {
    state.credentialData.nameCleaned = credCleaned;
    state.credentialData.type = 'credential';
    state.step = 'credential_name_confirm';
    return response(state, `That's ${credCleaned}. Correct?`);
  }

  state.step = 'credential_type';
  return response(state, "What kind of credential -- a license, certification, professional membership, or training course?");
}

// ── Vehicle Attestation & DTC ──

function handleShowVehicleAttestation(state) {
  const ownershipLabel = state.carData.ownershipType === 'owned'
    ? 'legal owner'
    : state.carData.ownershipType === 'leased'
      ? 'legal lessee'
      : 'registered owner';

  state.step = 'car_onboarding_attestation';
  return response(state, "Last step -- confirm ownership. This gets recorded permanently in your logbook.", {
    cards: [{
      type: 'attestation',
      data: {
        category: 'vehicle',
        ownershipLabel,
        vehicleDetails: state.carData.details || 'Vehicle',
        vin: state.carData.vin || 'Not provided',
        mileage: state.carData.mileage || null,
        lender: state.carData.lender || null,
      },
    }],
  });
}

function handleVehicleDTC(state) {
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const docCount = (state.carData.uploadedFiles || []).length;

  const ownershipStatus = state.carData.ownershipType === 'owned'
    ? 'Active -- Owned'
    : state.carData.ownershipType === 'leased'
      ? `Active -- Leased (${state.carData.lender || ''})`
      : `Active -- Financed (${state.carData.lender || ''})`;

  const vehicleName = state.carData.details || 'Your Vehicle';
  let vehicleMake = state.carData.make || '';
  let vehicleModel = state.carData.model || '';

  if (!vehicleMake && vehicleName) {
    const parts = vehicleName.replace(/^\d{4}\s*/, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      vehicleMake = parts[0];
      vehicleModel = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      vehicleMake = parts[0];
    }
  }

  // Push to records
  if (!state.records) state.records = [];
  state.records.push({
    type: 'vehicle',
    userId: state.userId || null,
    details: vehicleName,
    vin: state.carData.vin || null,
    year: state.carData.year || '',
    make: state.carData.make || '',
    model: state.carData.model || '',
    mileage: state.carData.mileage || '',
    color: state.carData.color || '',
    ownershipType: state.carData.ownershipType || '',
    lender: state.carData.lender || '',
    documents: (state.carData.uploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Record created', date: today, time: now },
      { entry: 'Ownership attested by ' + (state.name || 'owner'), date: today, time: now },
      { entry: 'Mileage recorded: ' + (state.carData.mileage || '0') + ' mi', date: today, time: now },
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'vehicle',
        vehicleName,
        year: state.carData.year || '',
        make: vehicleMake,
        model: vehicleModel,
        trim: state.carData.trim || '',
        color: state.carData.color || '',
        colorTheme: getVehicleColorTheme(state.carData.color),
        vin: state.carData.vin || '',
        owner: state.name || 'Owner',
        mileage: state.carData.mileage || '0',
        ownershipStatus,
        recordId,
        hash,
        createdAt: today,
        docCount,
      },
    }],
    followUpMessage: `Your car is registered, ${state.name || ''}. Your logbook is tracking everything -- add service records, mileage updates, and documents anytime to keep your record complete.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'vehicle',
      vehicleName,
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'vehicle',
        metadata: {
          details: state.carData.details || '',
          vin: state.carData.vin || null,
          year: state.carData.year || '',
          make: state.carData.make || '',
          model: state.carData.model || '',
          mileage: state.carData.mileage || '',
          color: state.carData.color || '',
          ownershipType: state.carData.ownershipType || '',
          lender: state.carData.lender || '',
        },
        files: (state.carData.uploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ── Student Attestation & DTC ──

function handleShowStudentAttestation(state) {
  const d = state.studentData || {};
  state.step = 'student_attestation';
  return response(state, "Last step -- confirm this is accurate. This gets recorded permanently.", {
    cards: [{
      type: 'attestation',
      data: {
        category: 'student',
        type: d.type || 'Record',
        school: d.school || '',
        program: d.program || '',
        year: d.year || '',
      },
    }],
  });
}

function handleStudentDTC(state) {
  const d = state.studentData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const docCount = (d.uploadedFiles || []).length;

  if (!state.records) state.records = [];
  state.records.push({
    type: 'student',
    userId: state.userId || null,
    details: `${d.program || d.type || 'Academic Record'} -- ${d.school || ''}`,
    school: d.school || '',
    program: d.program || '',
    year: d.year || '',
    documents: (d.uploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Record created', date: today, time: now },
      { entry: 'Academic record attested by ' + (state.name || 'holder'), date: today, time: now },
      ...(docCount > 0 ? [{ entry: docCount + ' document' + (docCount > 1 ? 's' : '') + ' uploaded', date: today, time: now }] : []),
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'student',
        school: d.school || '',
        program: d.program || '',
        year: d.year || '',
        type: d.type || 'Academic Record',
        holder: state.name || 'Owner',
        recordId,
        hash,
        createdAt: today,
        docCount,
      },
    }],
    followUpMessage: `Your academic record is registered, ${state.name || ''}. Your logbook is tracking it -- add documents or updates anytime.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'student',
      school: d.school || '',
      program: d.program || '',
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'student',
        metadata: {
          school: d.school || '',
          program: d.program || '',
          year: d.year || '',
          recordType: d.type || '',
        },
        files: (d.uploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ── Credential Attestation & DTC ──

function handleShowCredentialAttestation(state) {
  const d = state.credentialData || {};
  state.step = 'credential_attestation';
  return response(state, "Last step -- confirm this is accurate. This gets recorded permanently.", {
    cards: [{
      type: 'attestation',
      data: {
        category: 'credential',
        name: d.name || '',
        issuer: d.issuer || '',
        dateEarned: d.dateEarned || '',
        expiry: d.expiry || '',
      },
    }],
  });
}

function handleCredentialDTC(state) {
  const d = state.credentialData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const docCount = (d.uploadedFiles || []).length;

  if (!state.records) state.records = [];
  state.records.push({
    type: 'credential',
    userId: state.userId || null,
    details: `${d.name || 'Credential'} -- ${d.issuer || ''}`,
    name: d.name || '',
    issuer: d.issuer || '',
    dateEarned: d.dateEarned || '',
    expiry: d.expiry || '',
    documents: (d.uploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Record created', date: today, time: now },
      { entry: 'Credential attested by ' + (state.name || 'holder'), date: today, time: now },
      ...(docCount > 0 ? [{ entry: docCount + ' document' + (docCount > 1 ? 's' : '') + ' uploaded', date: today, time: now }] : []),
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'credential',
        name: d.name || 'Credential',
        issuer: d.issuer || '',
        type: d.type || 'Credential',
        dateEarned: d.dateEarned || '',
        expiry: d.expiry || 'N/A',
        holder: state.name || 'Owner',
        recordId,
        hash,
        createdAt: today,
        docCount,
      },
    }],
    followUpMessage: `Your credential is registered, ${state.name || ''}. Your logbook is tracking it -- add documents or updates anytime.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'credential',
      credentialName: d.name || 'Credential',
      issuer: d.issuer || '',
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'credential',
        metadata: {
          name: d.name || '',
          issuer: d.issuer || '',
          dateEarned: d.dateEarned || '',
          expiry: d.expiry || '',
        },
        files: (d.uploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ── Pilot Attestation & DTC ──

function handleShowPilotAttestation(state) {
  const p = state.pilotData || {};
  const typeRatingsStr = (p.typeRatings && p.typeRatings.length > 0) ? p.typeRatings.join(', ') : 'None';
  state.step = 'pilot_attestation';
  return response(state, "Last step -- confirm this is accurate. This gets recorded permanently.", {
    cards: [{
      type: 'attestation',
      data: {
        category: 'pilot',
        certName: p.certName || '',
        certNumber: p.certNumber || '',
        dateIssued: p.dateIssued || '',
        typeRatings: typeRatingsStr,
        totalHours: p.totalHours || '0',
      },
    }],
  });
}

function handlePilotDTC(state) {
  const p = state.pilotData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const docCount = (p.uploadedFiles || []).length;
  const typeRatingsStr = (p.typeRatings && p.typeRatings.length > 0) ? p.typeRatings.join(', ') : 'None';

  if (!state.records) state.records = [];
  state.records.push({
    type: 'credential',
    userId: state.userId || null,
    subtype: 'pilot',
    details: `${p.certName || 'Pilot Certificate'} -- FAA ${p.certNumber || ''}`,
    name: p.certName || '',
    certNumber: p.certNumber || '',
    dateIssued: p.dateIssued || '',
    typeRatings: p.typeRatings || [],
    totalHours: p.totalHours || '',
    documents: (p.uploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Record created', date: today, time: now },
      { entry: 'Pilot credential attested by ' + (state.name || 'holder'), date: today, time: now },
      { entry: 'Total hours: ' + (p.totalHours || '0'), date: today, time: now },
      ...(docCount > 0 ? [{ entry: docCount + ' document' + (docCount > 1 ? 's' : '') + ' uploaded', date: today, time: now }] : []),
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'pilot',
        certName: p.certName || 'Pilot Certificate',
        certNumber: p.certNumber || '',
        dateIssued: p.dateIssued || '',
        typeRatings: typeRatingsStr,
        totalHours: p.totalHours || '0',
        holder: state.name || 'Pilot',
        recordId,
        hash,
        createdAt: today,
        docCount,
      },
    }],
    followUpMessage: `Your pilot credential is registered, ${state.name || ''}. Your logbook is tracking it -- add flight hours, documents, or type rating updates anytime.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'pilot_credential',
      credentialName: p.certName || 'Pilot Credential',
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'pilot_credential',
        metadata: {
          certName: p.certName || '',
          certNumber: p.certNumber || '',
          dateIssued: p.dateIssued || '',
          typeRatings: p.typeRatings || [],
          totalHours: p.totalHours || '',
        },
        files: (p.uploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ── Attestation Confirmed (dispatches to correct DTC handler) ──

function handleAttestationConfirmed(state) {
  // ID verification gate — all DTC types require verification
  if (!state.idVerified) {
    state.pendingAttestationStep = state.step;
    state.step = 'id_verification_before_publish';
    return response(state, "Before we can publish this record, we need to verify your identity. It takes about a minute and costs $2 (once a year). Ready?", {
      promptChips: ["Yes, verify me", "Skip for now"],
    });
  }

  if (state.step === 'car_onboarding_attestation') {
    state.carData.attestedAt = new Date().toISOString();
    state.carData.attester = state.name;
    return handleVehicleDTC(state);
  }
  if (state.step === 'student_attestation') {
    state.studentData.attestedAt = new Date().toISOString();
    state.studentData.attester = state.name;
    return handleStudentDTC(state);
  }
  if (state.step === 'credential_attestation') {
    state.credentialData.attestedAt = new Date().toISOString();
    state.credentialData.attester = state.name;
    return handleCredentialDTC(state);
  }
  if (state.step === 'pilot_attestation') {
    state.pilotData.attestedAt = new Date().toISOString();
    state.pilotData.attester = state.name;
    return handlePilotDTC(state);
  }
  if (state.step === 'analyst_deal_attestation') {
    state.dealData.attestedAt = new Date().toISOString();
    state.dealData.attester = state.name;
    return handleDealDTC(state);
  }
  if (state.step === 're_property_attestation') {
    state.propertyData.attestedAt = new Date().toISOString();
    state.propertyData.attester = state.name;
    return handlePropertyDTC(state);
  }
  // Fallback
  return response(state, "Something went wrong. What would you like to do?");
}

// ── Files Uploaded / Skipped ──

function handleFilesUploaded(state, input) {
  // Accept array of files from actionData, or fall back to single fileName
  const filesArray = (input.actionData && input.actionData.files) || [];
  const parsed = filesArray.length > 0
    ? filesArray.map(f => ({ name: f.name || 'document', size: f.size || 0, path: f.path || null, url: f.url || null }))
    : [{ name: input.fileName || 'document', size: 0, path: null, url: null }];

  if (state.step === 'car_onboarding_upload') {
    if (!state.carData) state.carData = {};
    if (!state.carData.uploadedFiles) state.carData.uploadedFiles = [];
    state.carData.uploadedFiles.push(...parsed);
    return handleShowVehicleAttestation(state);
  }
  if (state.step === 'student_upload') {
    if (!state.studentData) state.studentData = {};
    if (!state.studentData.uploadedFiles) state.studentData.uploadedFiles = [];
    state.studentData.uploadedFiles.push(...parsed);
    return handleShowStudentAttestation(state);
  }
  if (state.step === 'credential_upload') {
    if (!state.credentialData) state.credentialData = {};
    if (!state.credentialData.uploadedFiles) state.credentialData.uploadedFiles = [];
    state.credentialData.uploadedFiles.push(...parsed);
    return handleShowCredentialAttestation(state);
  }
  if (state.step === 'pilot_upload') {
    if (!state.pilotData) state.pilotData = {};
    if (!state.pilotData.uploadedFiles) state.pilotData.uploadedFiles = [];
    state.pilotData.uploadedFiles.push(...parsed);
    return handleShowPilotAttestation(state);
  }
  if (state.step === 'analyst_deal_upload_docs' || state.step === 'analyst_deal_upload') {
    if (!state.dealData) state.dealData = {};
    if (!state.dealData.uploadedFiles) state.dealData.uploadedFiles = [];
    state.dealData.uploadedFiles.push(...parsed);
    return handleShowDealAttestation(state);
  }
  if (state.step === 're_property_upload') {
    if (!state.propertyData) state.propertyData = {};
    if (!state.propertyData.uploadedFiles) state.propertyData.uploadedFiles = [];
    state.propertyData.uploadedFiles.push(...parsed);
    return handleShowPropertySummary(state);
  }
  if (state.step === 're_tenant_upload') {
    if (!state.propertyData) state.propertyData = {};
    if (!state.propertyData.leaseUploadedFiles) state.propertyData.leaseUploadedFiles = [];
    state.propertyData.leaseUploadedFiles.push(...parsed);
    return handleShowTenantSummary(state);
  }
  if (state.step === 're_mx_upload') {
    if (!state.propertyData) state.propertyData = {};
    if (!state.propertyData.mxUploadedFiles) state.propertyData.mxUploadedFiles = [];
    state.propertyData.mxUploadedFiles.push(...parsed);
    return handleShowWorkOrderSummary(state);
  }
  return response(state, "Files received. What would you like to do next?");
}

function handleFileUploadSkipped(state) {
  if (state.step === 'car_onboarding_upload') return handleShowVehicleAttestation(state);
  if (state.step === 'student_upload') return handleShowStudentAttestation(state);
  if (state.step === 'credential_upload') return handleShowCredentialAttestation(state);
  if (state.step === 'pilot_upload') return handleShowPilotAttestation(state);
  if (state.step === 'analyst_deal_upload_docs' || state.step === 'analyst_deal_upload') return handleShowDealAttestation(state);
  if (state.step === 're_property_upload') return handleShowPropertySummary(state);
  if (state.step === 're_tenant_upload') return handleShowTenantSummary(state);
  if (state.step === 're_mx_upload') return handleShowWorkOrderSummary(state);
  return response(state, "What would you like to do next?");
}

// ── Vault & Logbook ──

function handleShowVault(state) {
  const allRecords = state.records || [];
  // Filter to current user's records — excludes stale data from resumed sessions
  const records = state.userId
    ? allRecords.filter(r => !r.userId || r.userId === state.userId)
    : allRecords;
  const totalLogEntries = records.reduce((sum, r) => sum + (r.logbook || []).length, 0);

  return response(state, null, {
    cards: [{
      type: 'vault',
      data: {
        name: state.name || 'Your',
        records: records.map((r, idx) => {
          const isPilot = r.subtype === 'pilot';
          const subtitle = r.type === 'vehicle' ? (r.mileage ? r.mileage + ' mi' : '')
            : r.type === 'student' ? (r.year || '')
            : r.type === 'deal' ? (r.dealType || r.status || '')
            : r.type === 'pov' ? (r.recommendation || '')
            : r.type === 'property' ? (r.propertyType || '')
            : r.type === 'lease' ? (r.tenantName || '')
            : r.type === 'workOrder' ? (r.status || 'open')
            : isPilot ? (r.totalHours ? r.totalHours + ' hrs' : '')
            : (r.dateEarned || '');
          const logCount = (r.logbook || []).length;
          const docCount = (r.documents || []).length;
          return {
            index: idx,
            type: r.type,
            subtype: r.subtype || null,
            details: r.details,
            subtitle,
            logCount,
            docCount,
            id: r.id,
            createdAt: r.createdAt,
            logbook: r.logbook || [],
            documents: r.documents || [],
            totalLogEntries: logCount,
          };
        }),
        totalLogEntries,
      },
    }],
    followUpMessage: records.length > 0
      ? 'Tap a record to see its full logbook, or add another record.'
      : getEmptyVaultMessage(state),
  });
}

function getEmptyVaultMessage(state) {
  const v = state.businessVertical;
  if (v === 'real_estate') {
    return "Your property records start here. Add your first property and you've got a verified title no competitor can match. What's the address?";
  }
  if (v === 'analyst') {
    return "Your deal pipeline starts here. Upload your first deal package and let's get it vetted.";
  }
  if (v === 'auto') {
    return "Your inventory starts here. Let's get your first vehicle in -- what's the VIN?";
  }
  return "Nothing here yet. What would you like to start with -- a vehicle, a credential, or something else?";
}

function handleShowLogbook(state) {
  const records = state.records || [];
  if (records.length === 0) {
    return response(state, "You don't have any records yet. Want to create one?");
  }

  const allEntries = [];
  records.forEach(r => {
    (r.logbook || []).forEach(e => {
      allEntries.push({ ...e, recordDetails: r.details, recordId: r.id, recordType: r.type });
    });
  });

  return response(state, null, {
    cards: [{
      type: 'logbook',
      data: {
        entries: allEntries,
        recordCount: records.length,
      },
    }],
  });
}

// ── Analyst Hub ──

function handleAnalystHub(state, lowerMsg) {
  if (lowerMsg.includes('deal') || lowerMsg.includes('vet') || lowerMsg.includes('review') ||
      lowerMsg.includes('cim') || lowerMsg.includes('new deal') || lowerMsg.includes('package') ||
      lowerMsg.includes('analyze')) {
    state.step = 'analyst_deal_upload';
    state.dealData = {};
    return response(state, "Upload the deal package and I'll analyze it. Or tell me the company name to get started.", {
      promptChips: ['Skip upload'],
    });
  }
  if (lowerMsg.includes('pov') || lowerMsg.includes('point of view') || lowerMsg.includes('write up') ||
      lowerMsg.includes('memo') || lowerMsg.includes('thesis') || lowerMsg.includes('investment memo')) {
    state.dealData = state.dealData || {};
    state.step = 'analyst_pov_select';
    return response(state, "Which deal is this POV for? Enter the company name or deal reference.");
  }
  if (lowerMsg.includes('pipeline') || lowerMsg.includes('deals') || lowerMsg.includes('status') ||
      lowerMsg.includes('my deals')) {
    const dealRecords = (state.records || []).filter(r => r.type === 'deal');
    if (dealRecords.length === 0) {
      return response(state, "No deals in your pipeline yet. Want to vet one?", {
        promptChips: ['Vet a new deal'],
      });
    }
    return response(state, null, {
      cards: [{
        type: 'pipeline',
        data: {
          deals: dealRecords.map(r => ({
            companyName: r.companyName || r.details,
            sector: r.sector || '',
            dealType: r.dealType || '',
            status: r.status || 'new',
            id: r.id,
            createdAt: r.createdAt,
          })),
        },
      }],
      followUpMessage: 'Tap a deal to see details, or vet another one.',
      promptChips: ['Vet a new deal', 'Write a POV'],
    });
  }
  return response(state, `Welcome to your analyst workspace, ${state.name || ''}. What would you like to do?`, {
    promptChips: ['Vet a new deal', 'Write a POV', 'View pipeline'],
  });
}

// ── Deal Attestation & DTC ──

function handleShowDealAttestation(state) {
  const d = state.dealData || {};
  state.step = 'analyst_deal_attestation';
  return response(state, "Last step -- confirm this deal record is accurate.", {
    cards: [{
      type: 'attestation',
      data: {
        category: 'deal',
        companyName: d.companyName || '',
        sector: d.sector || '',
        dealType: d.dealType || '',
        dealSize: d.dealSize || '',
        source: d.source || '',
      },
    }],
  });
}

function handleDealDTC(state) {
  const d = state.dealData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const docCount = (d.uploadedFiles || []).length;

  if (!state.records) state.records = [];
  state.records.push({
    type: 'deal',
    userId: state.userId || null,
    details: `${d.companyName || 'Deal'} -- ${d.dealType || ''} -- ${d.sector || ''}`,
    companyName: d.companyName || '',
    sector: d.sector || '',
    dealType: d.dealType || '',
    dealSize: d.dealSize || '',
    source: d.source || '',
    status: 'new',
    documents: (d.uploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Deal record created', date: today, time: now },
      { entry: 'Deal attested by ' + (state.name || 'analyst'), date: today, time: now },
      ...(docCount > 0 ? [{ entry: docCount + ' document' + (docCount > 1 ? 's' : '') + ' uploaded', date: today, time: now }] : []),
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'deal',
        companyName: d.companyName || 'Deal',
        sector: d.sector || '',
        dealType: d.dealType || '',
        dealSize: d.dealSize || '',
        source: d.source || '',
        status: 'new',
        analyst: state.name || 'Analyst',
        recordId,
        hash,
        createdAt: today,
        docCount,
      },
    }],
    followUpMessage: `Deal record created for ${d.companyName || 'this deal'}. Your logbook is tracking it -- add documents, POVs, or status updates anytime.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'deal',
      companyName: d.companyName || '',
      sector: d.sector || '',
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    promptChips: ['Vet another deal', 'Write a POV', 'View pipeline'],
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'deal',
        metadata: {
          companyName: d.companyName || '',
          sector: d.sector || '',
          dealType: d.dealType || '',
          dealSize: d.dealSize || '',
          source: d.source || '',
          status: 'new',
        },
        files: (d.uploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ── POV DTC ──

function handlePovDTC(state) {
  const d = state.dealData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();

  if (!state.records) state.records = [];
  state.records.push({
    type: 'pov',
    userId: state.userId || null,
    details: `POV: ${d.povDealName || 'Deal'} -- ${d.povRecommendation || ''}`,
    dealName: d.povDealName || '',
    thesis: d.povThesis || '',
    risks: d.povRisks || '',
    strengths: d.povStrengths || '',
    recommendation: d.povRecommendation || '',
    author: state.name || 'Analyst',
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'POV created', date: today, time: now },
      { entry: 'Recommendation: ' + (d.povRecommendation || 'N/A'), date: today, time: now },
      { entry: 'Authored by ' + (state.name || 'analyst'), date: today, time: now },
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'pov',
        dealName: d.povDealName || 'Deal',
        thesis: d.povThesis || '',
        recommendation: d.povRecommendation || '',
        author: state.name || 'Analyst',
        recordId,
        hash,
        createdAt: today,
      },
    }],
    followUpMessage: `POV recorded for ${d.povDealName || 'this deal'}. Recommendation: ${d.povRecommendation || 'N/A'}.`,
    promptChips: ['Vet a new deal', 'Write another POV', 'View pipeline'],
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'pov',
        metadata: {
          dealName: d.povDealName || '',
          thesis: d.povThesis || '',
          risks: d.povRisks || '',
          strengths: d.povStrengths || '',
          recommendation: d.povRecommendation || '',
          author: state.name || '',
        },
      },
    }],
  });
}

// ── Real Estate Hub ──

function handleRealEstateHub(state, lowerMsg) {
  if (lowerMsg.includes('property') || lowerMsg.includes('add property') || lowerMsg.includes('new property') ||
      lowerMsg.includes('building') || lowerMsg.includes('address') || lowerMsg.includes('rental')) {
    state.step = 're_property_address';
    state.propertyData = {};
    return response(state, "What's the property address?");
  }
  if (lowerMsg.includes('tenant') || lowerMsg.includes('new tenant') || lowerMsg.includes('renter') ||
      lowerMsg.includes('lease') || lowerMsg.includes('move in') || lowerMsg.includes('onboard')) {
    const propRecords = (state.records || []).filter(r => r.type === 'property');
    if (propRecords.length === 0) {
      return response(state, "You need to add a property first before onboarding a tenant.", {
        promptChips: ['Add a property'],
      });
    }
    state.propertyData = state.propertyData || {};
    state.step = 're_tenant_property';
    if (propRecords.length === 1) {
      return response(state, `Is this for ${propRecords[0].address}?`, {
        promptChips: ['Yes', 'Different property'],
      });
    }
    return response(state, "Which property?");
  }
  if (lowerMsg.includes('maintenance') || lowerMsg.includes('repair') || lowerMsg.includes('fix') ||
      lowerMsg.includes('broken') || lowerMsg.includes('issue') || lowerMsg.includes('work order') ||
      lowerMsg.includes('something wrong')) {
    const propRecords = (state.records || []).filter(r => r.type === 'property');
    if (propRecords.length === 0) {
      return response(state, "You need to add a property first before creating a work order.", {
        promptChips: ['Add a property'],
      });
    }
    state.propertyData = state.propertyData || {};
    state.step = 're_mx_property';
    if (propRecords.length === 1) {
      return response(state, `Is this for ${propRecords[0].address}?`, {
        promptChips: ['Yes', 'Different property'],
      });
    }
    return response(state, "Which property?");
  }
  if (lowerMsg.includes('properties') || lowerMsg.includes('portfolio') || lowerMsg.includes('overview') ||
      lowerMsg.includes('buildings') || lowerMsg.includes('my properties')) {
    const propRecords = (state.records || []).filter(r => r.type === 'property');
    if (propRecords.length === 0) {
      return response(state, "No properties yet. Want to add one?", {
        promptChips: ['Add a property'],
      });
    }
    return response(state, null, {
      cards: [{
        type: 'portfolio',
        data: {
          properties: propRecords.map(r => ({
            address: r.address || r.details,
            propertyType: r.propertyType || '',
            unitCount: r.unitCount || 1,
            ownershipEntity: r.ownershipEntity || '',
            id: r.id,
            createdAt: r.createdAt,
          })),
        },
      }],
      followUpMessage: 'Tap a property to see details, or add another one.',
      promptChips: ['Add a property', 'Onboard a tenant', 'Maintenance request'],
    });
  }
  return response(state, `Welcome to your property management workspace, ${state.name || ''}. What would you like to do?`, {
    promptChips: ['Add a property', 'Onboard a tenant', 'Maintenance request', 'View properties'],
  });
}

// ── Property Summary, Attestation & DTC ──

function handleShowPropertySummary(state) {
  const p = state.propertyData || {};
  state.step = 're_property_confirm_all';
  const unitLine = (p.unitCount && p.unitCount > 1) ? `\nUnits: ${p.unitCount}` : '';
  return response(state, `Here's what I have:\n\nAddress: ${p.address}\nType: ${p.propertyType}${unitLine}\nOwnership: ${p.ownershipEntity}\n\nDoes this look right?`);
}

function handleShowPropertyAttestation(state) {
  const p = state.propertyData || {};
  state.step = 're_property_attestation';
  return response(state, "Last step -- confirm this property record is accurate.", {
    cards: [{
      type: 'attestation',
      data: {
        category: 'property',
        address: p.address || '',
        propertyType: p.propertyType || '',
        unitCount: p.unitCount || 1,
        ownershipEntity: p.ownershipEntity || '',
      },
    }],
  });
}

function handlePropertyDTC(state) {
  const p = state.propertyData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const docCount = (p.uploadedFiles || []).length;

  if (!state.records) state.records = [];
  state.records.push({
    type: 'property',
    userId: state.userId || null,
    details: p.address || 'Property',
    address: p.address || '',
    propertyType: p.propertyType || '',
    unitCount: p.unitCount || 1,
    ownershipEntity: p.ownershipEntity || '',
    documents: (p.uploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Property record created', date: today, time: now },
      { entry: 'Ownership attested by ' + (state.name || 'owner'), date: today, time: now },
      ...(docCount > 0 ? [{ entry: docCount + ' document' + (docCount > 1 ? 's' : '') + ' uploaded', date: today, time: now }] : []),
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'property',
        address: p.address || 'Property',
        propertyType: p.propertyType || '',
        unitCount: p.unitCount || 1,
        ownershipEntity: p.ownershipEntity || '',
        owner: state.name || 'Owner',
        recordId,
        hash,
        createdAt: today,
        docCount,
      },
    }],
    followUpMessage: `Property record created for ${p.address || 'your property'}. Your logbook is tracking it -- add tenants, documents, or maintenance records anytime.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'property',
      address: p.address || '',
      propertyType: p.propertyType || '',
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    promptChips: ['Add another property', 'Onboard a tenant', 'View properties'],
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'property',
        metadata: {
          address: p.address || '',
          propertyType: p.propertyType || '',
          unitCount: p.unitCount || 1,
          ownershipEntity: p.ownershipEntity || '',
        },
        files: (p.uploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ── Tenant Summary & DTC ──

function handleShowTenantSummary(state) {
  const p = state.propertyData || {};
  state.step = 're_tenant_confirm';
  const unitLine = p.tenantUnit ? `\nUnit: ${p.tenantUnit}` : '';
  return response(state, `Here's the lease summary:\n\nProperty: ${p.tenantPropertyName}${unitLine}\nTenant: ${p.tenantName}\nEmail: ${p.tenantEmail}\nLease: ${p.leaseStart} to ${p.leaseEnd}\nRent: ${p.monthlyRent}/month\nDeposit: ${p.securityDeposit}\n\nDoes this look right?`);
}

function handleTenantDTC(state) {
  const p = state.propertyData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const docCount = (p.leaseUploadedFiles || []).length;

  if (!state.records) state.records = [];
  state.records.push({
    type: 'lease',
    userId: state.userId || null,
    details: `${p.tenantName || 'Tenant'} -- ${p.tenantPropertyName || 'Property'}`,
    tenantName: p.tenantName || '',
    tenantEmail: p.tenantEmail || '',
    property: p.tenantPropertyName || '',
    unit: p.tenantUnit || '',
    leaseStart: p.leaseStart || '',
    leaseEnd: p.leaseEnd || '',
    monthlyRent: p.monthlyRent || '',
    securityDeposit: p.securityDeposit || '',
    documents: (p.leaseUploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Lease record created', date: today, time: now },
      { entry: 'Tenant: ' + (p.tenantName || ''), date: today, time: now },
      { entry: 'Lease period: ' + (p.leaseStart || '') + ' to ' + (p.leaseEnd || ''), date: today, time: now },
      ...(docCount > 0 ? [{ entry: docCount + ' document' + (docCount > 1 ? 's' : '') + ' uploaded', date: today, time: now }] : []),
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'lease',
        tenantName: p.tenantName || 'Tenant',
        tenantEmail: p.tenantEmail || '',
        property: p.tenantPropertyName || '',
        unit: p.tenantUnit || '',
        leaseStart: p.leaseStart || '',
        leaseEnd: p.leaseEnd || '',
        monthlyRent: p.monthlyRent || '',
        owner: state.name || 'Owner',
        recordId,
        hash,
        createdAt: today,
        docCount,
      },
    }],
    followUpMessage: `Lease created for ${p.tenantName || 'tenant'}. An invite will be sent to ${p.tenantEmail || 'their email'} to set up their own TitleApp account.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'tenant',
      tenantName: p.tenantName || '',
      property: p.tenantPropertyName || '',
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    promptChips: ['Add another tenant', 'Maintenance request', 'View properties'],
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'lease',
        metadata: {
          tenantName: p.tenantName || '',
          tenantEmail: p.tenantEmail || '',
          property: p.tenantPropertyName || '',
          unit: p.tenantUnit || '',
          leaseStart: p.leaseStart || '',
          leaseEnd: p.leaseEnd || '',
          monthlyRent: p.monthlyRent || '',
          securityDeposit: p.securityDeposit || '',
        },
        files: (p.leaseUploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ── Work Order Summary & DTC ──

function handleShowWorkOrderSummary(state) {
  const p = state.propertyData || {};
  state.step = 're_mx_confirm';
  const unitLine = p.mxUnit ? `\nUnit: ${p.mxUnit}` : '';
  return response(state, `Work order summary:\n\nProperty: ${p.mxPropertyName}${unitLine}\nIssue: ${p.mxDescription}\nCategory: ${p.mxCategory}\nPriority: ${p.mxPriority}\n\nDoes this look right?`);
}

function handleWorkOrderDTC(state) {
  const p = state.propertyData || {};
  const recordId = generateRecordId();
  const hash = generateHash();
  const today = nowDateString();
  const now = nowTimeString();
  const photoCount = (p.mxUploadedFiles || []).length;

  if (!state.records) state.records = [];
  state.records.push({
    type: 'workOrder',
    userId: state.userId || null,
    details: `${p.mxCategory || 'Maintenance'} -- ${p.mxPropertyName || 'Property'}`,
    property: p.mxPropertyName || '',
    unit: p.mxUnit || '',
    description: p.mxDescription || '',
    category: p.mxCategory || 'General',
    priority: p.mxPriority || 'Medium',
    status: 'open',
    photos: (p.mxUploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
    id: recordId,
    createdAt: today,
    logbook: [
      { entry: 'Work order created', date: today, time: now },
      { entry: 'Category: ' + (p.mxCategory || 'General'), date: today, time: now },
      { entry: 'Priority: ' + (p.mxPriority || 'Medium'), date: today, time: now },
      ...(photoCount > 0 ? [{ entry: photoCount + ' photo' + (photoCount > 1 ? 's' : '') + ' uploaded', date: today, time: now }] : []),
    ],
  });

  state.step = 'authenticated';

  return response(state, null, {
    cards: [{
      type: 'dtc',
      data: {
        category: 'workOrder',
        property: p.mxPropertyName || 'Property',
        unit: p.mxUnit || '',
        description: p.mxDescription || '',
        issueCategory: p.mxCategory || 'General',
        priority: p.mxPriority || 'Medium',
        status: 'open',
        reporter: state.name || 'Reporter',
        recordId,
        hash,
        createdAt: today,
        photoCount,
      },
    }],
    followUpMessage: `Work order created for ${p.mxPropertyName || 'property'}. You can track its status and assign it from your dashboard.`,
    generateMilestone: true,
    aiContext: {
      milestoneType: 'work_order',
      property: p.mxPropertyName || '',
      category: p.mxCategory || 'General',
      isFirstRecord: !state.records || state.records.length <= 1,
      name: state.name,
    },
    promptChips: ['Create another work order', 'View properties', 'Onboard a tenant'],
    sideEffects: [{
      action: 'createDtc',
      data: {
        type: 'workOrder',
        metadata: {
          property: p.mxPropertyName || '',
          unit: p.mxUnit || '',
          description: p.mxDescription || '',
          category: p.mxCategory || 'General',
          priority: p.mxPriority || 'Medium',
          status: 'open',
        },
        files: (p.mxUploadedFiles || []).filter(f => f.path).map(f => ({ name: f.name, path: f.path, url: f.url })),
      },
    }],
  });
}

// ──────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────

module.exports = {
  processMessage,
  defaultState,
  // Exposed for testing
  _helpers: {
    extractEmail,
    isValidEmail,
    isAffirmative,
    parseName,
    cleanSchoolName,
    cleanDegreeName,
    extractFieldOfStudy,
    cleanYear,
    cleanCredentialName,
    extractIndustry,
    getDemoResponse,
    detectVertical,
  },
};
