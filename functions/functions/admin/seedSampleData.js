/**
 * seedSampleData.js — Seeds all collections with demo data.
 * POST /seedSampleData with { secret: "titleapp-seed-2026" }
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

async function seedSampleData(req, res) {
  const body = req.body || {};
  if (body.secret !== "titleapp-seed-2026") {
    return res.status(403).json({ ok: false, error: "Unauthorized" });
  }

  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const ts = admin.firestore.FieldValue.serverTimestamp();

  // 1. Analytics
  await db.collection("analytics").doc(`daily_${today}`).set({
    date: today,
    totalUsers: 247,
    activeUsers: 89,
    signupsToday: 14,
    totalWorkers: 156,
    workersCreated: 156,
    workersCreatedToday: 3,
    workersPublished: 42,
    apiCalls24h: 1847,
    errorsToday: 7,
    errorRate: 0.4,
    updatedAt: ts,
  });

  // 2. Accounting summary
  await db.collection("accounting").doc("summary").set({
    revenue: {
      mtd: 8240,
      ytd: 42300,
      byCategory: { subscription: 6200, usage: 1540, marketplace_commission: 500 },
    },
    expenses: {
      mtd: 2340,
      ytd: 14200,
      byCategory: { infrastructure: 890, communications: 30, advertising: 1200, tools: 220 },
    },
    netIncome: { mtd: 5900, ytd: 28100 },
    cash: { balance: 803000, lastUpdated: now.toISOString() },
    burnRate: 27800,
    runway: { months: 28, calculatedAt: now.toISOString() },
    lastReconciled: now.toISOString(),
  });

  // 3. AI Authorization config
  await db.collection("config").doc("aiAuthorization").set({
    mode: "autonomous",
    sales: {
      autoRespond: true,
      autoFollowUp: true,
      followUpCadence: "day1, day3, day7, day14, day30",
      maxFollowUps: 5,
      autoScheduleDemo: true,
      escalateOn: ["angry_customer", "legal_question", "refund_request_over_100"],
    },
    service: {
      autoResolve: true,
      autoEscalate: true,
      escalateAfterAttempts: 3,
      escalateOn: ["bug_report", "data_loss", "security_concern", "billing_dispute"],
    },
    customerCare: {
      autoOnboard: true,
      autoCheckIn: true,
      checkInCadence: "day7, day30, day60",
      autoChurnIntervention: true,
      churnSignals: ["no_login_14d", "worker_deleted", "subscription_downgrade"],
    },
    investorOutreach: {
      autoFollowUp: true,
      autoSendDeck: true,
      autoScheduleCall: false,
      escalateOn: ["ready_to_commit", "due_diligence_request", "legal_question"],
    },
    campaigns: {
      autoOptimize: false,
      autoPause: true,
      pauseOn: ["cpc_over_15", "ctr_under_0.5", "budget_exceeded"],
      autoScale: false,
    },
    accounting: {
      autoReconcile: true,
      autoCategorizeTxns: true,
      escalateOn: ["unknown_charge", "amount_over_1000", "failed_payment"],
    },
    globalEscalation: {
      method: "sms",
      phone: "+14152360013",
      email: "seanlcombs@gmail.com",
      alsoNotify: ["sean@titleapp.ai", "kent@titleapp.ai"],
      urgentSMS: true,
      quietHours: { start: "22:00", end: "07:00", timezone: "America/Los_Angeles" },
      quietHoursOverrideFor: ["security_concern", "data_loss", "payment_failure_over_500"],
    },
  });

  // 4. Activity feed events
  const events = [
    { type: "signup", message: "New user: john@dealer.com (Auto Dealer)", severity: "info" },
    { type: "signup", message: "New user: sarah@realestate.com (Real Estate)", severity: "info" },
    { type: "worker", message: "Worker published: FTC Compliance Checker by creator_42", severity: "success" },
    { type: "revenue", message: "Payment received: $9.00 — Pro subscription", severity: "success" },
    { type: "revenue", message: "Marketplace purchase: Compliance Bot — $4.99 (25% = $1.25)", severity: "success" },
    { type: "error", message: "Enforcement engine timeout on worker_87: response > 30s", severity: "error" },
    { type: "communication", message: "Inbound email from mike@bigdealership.com: Re: AI for our dealership", severity: "info" },
    { type: "pipeline", message: "Big Auto Group moved to DEMO_SCHEDULED", severity: "success" },
    { type: "system", message: "Daily analytics aggregated: 247 users, 42 published workers", severity: "info" },
    { type: "communication", message: "Follow-up sent to Century Title — day 3 cadence", severity: "info" },
    { type: "revenue", message: "Credit pack purchased: 500 credits for user_abc", severity: "success" },
    { type: "signup", message: "New user: pilot@aviation.com (Aviation)", severity: "info" },
  ];
  for (const ev of events) {
    await db.collection("activityFeed").add({
      ...ev,
      metadata: {},
      timestamp: new Date(now - Math.random() * 86400000),
    });
  }

  // 5. B2B deals
  const b2bDeals = [
    { contactName: "Mike Johnson", company: "Big Auto Group", vertical: "auto_dealer", stage: "DEMO_SCHEDULED", estimatedARR: 12000, probability: 0.4, source: "linkedin_campaign", ownedBy: "alex" },
    { contactName: "Lisa Chen", company: "Century Title", vertical: "real_estate", stage: "CONTACTED", estimatedARR: 8400, probability: 0.25, source: "email_outbound", ownedBy: "alex" },
    { contactName: "Robert Davis", company: "Southwest Compliance", vertical: "compliance", stage: "PROPOSAL_SENT", estimatedARR: 24000, probability: 0.6, source: "warm_intro", ownedBy: "alex" },
    { contactName: "Amanda Torres", company: "Pacific Title Insurance", vertical: "real_estate", stage: "LEAD", estimatedARR: 36000, probability: 0.1, source: "linkedin_campaign", ownedBy: "alex" },
    { contactName: "James Wilson", company: "Premier Auto Sales", vertical: "auto_dealer", stage: "NEGOTIATING", estimatedARR: 18000, probability: 0.7, source: "referral", ownedBy: "alex" },
    { contactName: "Karen White", company: "Coastal Property Mgmt", vertical: "property_management", stage: "DEMO_COMPLETED", estimatedARR: 14400, probability: 0.5, source: "tiktok_campaign", ownedBy: "alex" },
    { contactName: "David Brown", company: "MetroDealer Network", vertical: "auto_dealer", stage: "CLOSED_WON", estimatedARR: 9600, probability: 1.0, source: "linkedin_campaign", ownedBy: "alex" },
  ];
  for (const deal of b2bDeals) {
    await db.collection("pipeline").doc("b2b").collection("deals").add({
      ...deal,
      history: [{ stage: deal.stage, at: now.toISOString(), by: "alex", action: "seeded" }],
      nextAction: null,
      lastActivityAt: new Date(now - Math.random() * 10 * 86400000),
      stalledSince: null,
      createdAt: ts,
    });
  }

  // 6. Creator funnel
  const creators = [
    { email: "creator1@gmail.com", stage: "POWER_USER", workersPublished: 4, totalRevenue: 398.25, healthScore: 92, churnRisk: "low", source: "tiktok_campaign" },
    { email: "creator2@outlook.com", stage: "FIRST_WORKER_PUBLISHED", workersPublished: 1, totalRevenue: 0, healthScore: 65, churnRisk: "medium", source: "organic" },
    { email: "creator3@gmail.com", stage: "FIRST_WORKER_STARTED", workersPublished: 0, totalRevenue: 0, healthScore: 45, churnRisk: "medium", source: "tiktok_campaign" },
    { email: "creator4@yahoo.com", stage: "STALLED", workersPublished: 0, totalRevenue: 0, healthScore: 18, churnRisk: "high", source: "linkedin_campaign" },
    { email: "creator5@gmail.com", stage: "FIRST_REVENUE", workersPublished: 2, totalRevenue: 47.50, healthScore: 78, churnRisk: "low", source: "referral" },
    { email: "creator6@proton.me", stage: "SIGNUP", workersPublished: 0, totalRevenue: 0, healthScore: 30, churnRisk: "medium", source: "organic" },
  ];
  for (const c of creators) {
    await db.collection("pipeline").doc("creators").collection("users").add({
      ...c,
      lastLoginAt: new Date(now - Math.random() * 14 * 86400000),
      lastActivityAt: new Date(now - Math.random() * 7 * 86400000),
      createdAt: ts,
    });
  }

  // 7. Investor pipeline
  const investors = [
    { fullName: "Jane Smith", email: "jane@investor.com", stage: "SAFE_SIGNED", amount: 25000, accredited: true, source: "warm_intro", deckViewCount: 3 },
    { fullName: "Tom Chen", email: "tom@angellist.com", stage: "INTERESTED", amount: 50000, accredited: true, source: "linkedin", deckViewCount: 5 },
    { fullName: "Sarah Kim", email: "sarah@vcfund.com", stage: "DECK_VIEWED", amount: null, accredited: true, source: "cold_outbound", deckViewCount: 1 },
    { fullName: "Marcus Johnson", email: "marcus@angels.co", stage: "FUNDED", amount: 100000, accredited: true, source: "warm_intro", deckViewCount: 7 },
    { fullName: "Elena Rodriguez", email: "elena@syndicates.io", stage: "ALEX_CHAT", amount: null, accredited: true, source: "tiktok", deckViewCount: 2 },
    { fullName: "Chris Park", email: "chris@venturepartners.co", stage: "PROSPECT", amount: null, accredited: true, source: "event", deckViewCount: 0 },
  ];
  for (const inv of investors) {
    await db.collection("pipeline").doc("investors").collection("deals").add({
      ...inv,
      lastActivityAt: new Date(now - Math.random() * 7 * 86400000),
      createdAt: ts,
    });
  }

  // 8. Campaigns
  const campaigns = [
    {
      name: "Auto Dealers — LinkedIn",
      platform: "linkedin",
      vertical: "auto_dealer",
      status: "active",
      budget: { daily: 75, total: 2250, spent: 480 },
      metrics: { impressions: 12400, clicks: 248, ctr: 2.0, cpc: 1.94, conversions: 12 },
      autoPause: true,
      pauseRules: ["cpc_over_15", "ctr_under_0.5", "budget_exceeded"],
      alexRecommendations: ["CTR is strong at 2.0%. Consider increasing daily budget to $100 to accelerate lead generation."],
      createdAt: ts,
    },
    {
      name: "Creator Acquisition — TikTok",
      platform: "tiktok",
      vertical: "creator",
      status: "active",
      budget: { daily: 50, total: 1500, spent: 340 },
      metrics: { impressions: 45000, clicks: 890, ctr: 1.98, cpc: 0.38, conversions: 34 },
      autoPause: true,
      pauseRules: ["cpc_over_15", "budget_exceeded"],
      alexRecommendations: ["CPC of $0.38 is excellent for creator acquisition. This is your best-performing channel."],
      createdAt: ts,
    },
    {
      name: "Real Estate Agents — Email",
      platform: "email",
      vertical: "real_estate",
      status: "active",
      budget: { daily: 0, total: 0, spent: 0 },
      metrics: { impressions: 0, clicks: 0, ctr: 0, cpc: 0, conversions: 0 },
      autoPause: false,
      pauseRules: [],
      alexRecommendations: ["Starting email campaign to 200 real estate contacts. Sending first batch Tuesday 9am."],
      createdAt: ts,
    },
  ];
  for (const camp of campaigns) {
    await db.collection("campaigns").add(camp);
  }

  // 9. Contacts
  const contacts = [
    { fullName: "Mike Johnson", email: "mike@bigdealership.com", phone: "+15550123", company: "Big Auto Group", vertical: "auto_dealer", source: "linkedin_campaign", pipelineType: "b2b", pipelineStage: "DEMO_SCHEDULED", totalMessages: 5, sentiment: "positive", tags: ["hot_lead", "demo_scheduled"] },
    { fullName: "Lisa Chen", email: "lisa@centurytitle.com", phone: "+15550456", company: "Century Title", vertical: "real_estate", source: "email_outbound", pipelineType: "b2b", pipelineStage: "CONTACTED", totalMessages: 2, sentiment: "neutral", tags: [] },
  ];
  for (const contact of contacts) {
    await db.collection("contacts").add({
      ...contact,
      lastMessageAt: new Date(now - Math.random() * 5 * 86400000),
      createdAt: ts,
    });
  }

  // 10. Sample ledger entries
  const ledgerEntries = [
    { date: today, type: "revenue", category: "subscription", subcategory: "pro_monthly", amount: 9.00, description: "Pro subscription — user_abc", debit: "cash", credit: "revenue_subscription" },
    { date: today, type: "revenue", category: "subscription", subcategory: "pro_monthly", amount: 9.00, description: "Pro subscription — user_def", debit: "cash", credit: "revenue_subscription" },
    { date: today, type: "revenue", category: "marketplace_commission", subcategory: "worker_purchase", amount: 1.25, description: "Marketplace 25% — FTC Compliance Bot", debit: "cash", credit: "revenue_marketplace" },
    { date: today, type: "revenue", category: "usage", subcategory: "credit_pack", amount: 5.00, description: "Credit pack 500 — user_ghi", debit: "cash", credit: "revenue_usage" },
    { date: today, type: "expense", category: "infrastructure", subcategory: "firebase", amount: -89.00, description: "Firebase — monthly billing", debit: "expense_infrastructure", credit: "cash" },
    { date: today, type: "expense", category: "advertising", subcategory: "linkedin", amount: -75.00, description: "LinkedIn Ads — daily spend", debit: "expense_advertising", credit: "cash" },
  ];
  for (const entry of ledgerEntries) {
    await db.collection("ledger").add({
      ...entry,
      autoCategorized: true,
      categorizedBy: "alex",
      verified: entry.amount > 0,
      verifiedBy: entry.amount > 0 ? "system" : null,
      verifiedAt: entry.amount > 0 ? ts : null,
      createdAt: ts,
    });
  }

  // 11. Escalations
  await db.collection("escalations").add({
    timestamp: ts,
    domain: "service",
    reason: "bug_report",
    contactId: null,
    context: 'Support ticket from user_abc: "enforcement engine blocking valid output" — Alex attempted resolution 3x.',
    alexAction: "escalated_to_owner",
    notifiedVia: ["dashboard"],
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
  });

  await db.collection("escalations").add({
    timestamp: ts,
    domain: "accounting",
    reason: "unknown_charge",
    contactId: null,
    context: "Unknown charge $127 from Vercel — needs categorization.",
    alexAction: "escalated_to_owner",
    notifiedVia: ["dashboard"],
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
  });

  // 12. Daily digest
  await db.collection("dailyDigest").doc(today).set({
    date: today,
    text: `Good morning Sean. Here's your TitleApp overnight summary:

REVENUE: $347 yesterday ($8,240 MTD, up 12% vs last month)
NEW USERS: 14 signups (8 from TikTok, 4 from LinkedIn, 2 organic)
WORKERS: 3 new Workers published
ACTIVE DEALS: 7 in pipeline ($42K potential ARR)
  → Big Auto Group moved to DEMO_SCHEDULED
  → Century Title hasn't responded in 5 days (sending follow-up today)
INVESTOR: Jane Smith viewed deck 3x yesterday
CAMPAIGNS: LinkedIn auto dealers CTR 2.1% ($22/day spend)

NEEDS YOUR ATTENTION:
  → Support ticket from user_abc: "enforcement engine blocking valid output" — couldn't resolve after 3 attempts
  → Unknown charge $127 from Vercel — categorize?
  → Creator payout of $1,247 ready for review

No other issues. All systems green.`,
    data: {
      revenueMtd: 8240,
      signupsToday: 14,
      activeDeals: 7,
      totalPipeline: 42000,
      openEscalations: 2,
    },
    generatedAt: ts,
  });

  return res.json({ ok: true, message: "Sample data seeded successfully" });
}

module.exports = { seedSampleData };
