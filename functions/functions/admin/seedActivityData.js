/**
 * seedActivityData.js — Populates activityFeed, analytics, and config from real platform data.
 *
 * POST /seedActivityData with { secret: "titleapp-seed-2026" }
 * Queries users, workspaces, tenants, raasPackages and creates:
 *   - activityFeed entries from real user signups
 *   - analytics/daily_YYYY-MM-DD with real counts
 *   - accounting/summary with initial values
 *   - config/company, config/brand, config/platform, config/vendors
 */

const admin = require("firebase-admin");

async function seedActivityData(req, res) {
  const body = req.body || {};
  if (body.secret !== "titleapp-seed-2026") {
    return res.status(403).json({ ok: false, error: "Unauthorized" });
  }

  const db = admin.firestore();
  const results = { activityFeed: 0, analytics: false, config: false };

  try {
    // 1. Query real collections
    const [usersSnap, workspacesSnap, tenantsSnap, packagesSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("workspaces").get(),
      db.collection("tenants").get(),
      db.collection("raasPackages").get(),
    ]);

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const workspaces = workspacesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tenants = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const packages = packagesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Create activityFeed entries from real users
    const batch = db.batch();

    for (const user of users) {
      const feedRef = db.collection("activityFeed").doc();
      batch.set(feedRef, {
        type: "signup",
        severity: "info",
        message: `${user.displayName || user.name || user.email || user.id} signed up`,
        timestamp: user.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        userId: user.id,
        email: user.email || "",
      });
      results.activityFeed++;
    }

    // Workspace creation events
    for (const ws of workspaces) {
      const feedRef = db.collection("activityFeed").doc();
      batch.set(feedRef, {
        type: "worker",
        severity: "info",
        message: `Workspace "${ws.name || ws.id}" created (${ws.vertical || "general"})`,
        timestamp: ws.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        workspaceId: ws.id,
      });
      results.activityFeed++;
    }

    // RAAS package events
    for (const pkg of packages) {
      const feedRef = db.collection("activityFeed").doc();
      batch.set(feedRef, {
        type: "worker",
        severity: "success",
        message: `Worker "${pkg.name || pkg.id}" created (${pkg.vertical || "unknown"})`,
        timestamp: pkg.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        packageId: pkg.id,
      });
      results.activityFeed++;
    }

    // Platform launch event
    const launchRef = db.collection("activityFeed").doc();
    batch.set(launchRef, {
      type: "system",
      severity: "success",
      message: "Command Center deployed and operational",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    results.activityFeed++;

    await batch.commit();

    // 3. Write analytics/daily doc with real counts
    const today = new Date().toISOString().slice(0, 10);
    await db.collection("analytics").doc(`daily_${today}`).set({
      date: today,
      activeUsers: users.length,
      signupsToday: 0,
      workersCreated: packages.length,
      workersCreatedToday: 0,
      workersPublished: 0,
      apiCalls24h: 0,
      errorRate: 0,
      totalWorkspaces: workspaces.length,
      totalTenants: tenants.length,
    }, { merge: true });
    results.analytics = true;

    // 4. Write accounting/summary
    await db.collection("accounting").doc("summary").set({
      revenue: { mtd: 0, byCategory: {} },
      expenses: { mtd: 0, byCategory: {} },
      netIncome: { mtd: 0 },
      cash: { balance: 0 },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 5. Seed config documents
    await db.collection("config").doc("company").set({
      name: "The Title App LLC",
      dba: "TitleApp",
      ein: "33-1330902",
      address: "1209 N Orange St, Wilmington, DE 19801",
      ceo: "Sean Lee Combs",
      cfo: "Kent Redwine",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("config").doc("brand").set({
      primaryColor: "#7c3aed",
      secondaryColor: "#1a1a2e",
      tagline: "Build it anywhere. Title it here.",
      voiceNotes: "Swiss tone — professional, calm. No emojis, no bullet points. Evidence-first.",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("config").doc("platform").set({
      trialDays: 14,
      workspacePrice: 900,
      aiCreditPrice: 0,
      marketplaceSplit: 75,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("config").doc("vendors").set({
      anthropic: { connected: true, keyPreview: "sk-ant-...configured" },
      stripe: { connected: false },
      dropbox_sign: { connected: false },
      twilio: { connected: false },
      sendgrid: { connected: false },
      openai: { connected: false },
      venly: { connected: false },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("config").doc("notifications").set({
      dailyDigest: true,
      digestTime: "07:00",
      digestDelivery: "email",
      escalationAlerts: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      revenueMilestones: [100, 1000, 10000, 100000],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    results.config = true;

    // 6. Seed sample communications (messages + drafts)
    const commsCheck = await db.collection("messages").limit(1).get();
    if (commsCheck.empty) {
      const now = new Date();
      const sampleMessages = [
        {
          from: "jordan.mitchell@techventures.io",
          to: "sean@titleapp.ai",
          contactId: "jordan_mitchell",
          channel: "email",
          direction: "inbound",
          subject: "Partnership inquiry — TitleApp x TechVentures",
          body: "Hi Sean, I came across TitleApp and I'm impressed by the Digital Worker model. We're building compliance tooling for fintech companies and I think there's a strong integration play here. Would love to set up a 30-minute call this week to explore. Best, Jordan",
          intent: "partnership",
          sentiment: "positive",
          timestamp: new Date(now - 2 * 60 * 60 * 1000),
        },
        {
          from: "alex@titleapp.ai",
          to: "jordan.mitchell@techventures.io",
          contactId: "jordan_mitchell",
          channel: "email",
          direction: "outbound",
          subject: "Re: Partnership inquiry — TitleApp x TechVentures",
          body: "Hi Jordan, thanks for reaching out. Sean is available Thursday at 2pm PST or Friday at 10am PST. Which works better for you? I'll send a calendar invite with a Zoom link. Best, Alex (TitleApp AI)",
          alexResponse: null,
          timestamp: new Date(now - 1.5 * 60 * 60 * 1000),
        },
        {
          from: "maria.chen@startupweekly.com",
          to: "sean@titleapp.ai",
          contactId: "maria_chen",
          channel: "email",
          direction: "inbound",
          subject: "Feature request: Startup Weekly coverage",
          body: "Hey Sean, I'm a reporter at Startup Weekly covering AI infrastructure startups. TitleApp's Rules-as-a-Service approach is unique — would you be open to a 20-min interview for our Q1 roundup? We go to print March 15.",
          intent: "press",
          sentiment: "positive",
          timestamp: new Date(now - 5 * 60 * 60 * 1000),
        },
        {
          from: "+1 (312) 555-0847",
          to: "+1 (302) 555-0199",
          contactId: "sms_312",
          channel: "sms",
          direction: "inbound",
          body: "Hey is this TitleApp? I signed up last week but can't figure out how to create my first Worker. Can someone help?",
          intent: "support",
          sentiment: "neutral",
          timestamp: new Date(now - 8 * 60 * 60 * 1000),
        },
        {
          from: "alex@titleapp.ai",
          to: "+1 (312) 555-0847",
          contactId: "sms_312",
          channel: "sms",
          direction: "outbound",
          body: "Hi there! Yes, this is TitleApp. To create your first Worker: go to your workspace, click the AI chat, and say 'I want to build a Worker.' Alex will walk you through it step by step. Let me know if you need more help!",
          timestamp: new Date(now - 7.5 * 60 * 60 * 1000),
        },
        {
          from: "kent@titleapp.ai",
          to: "sean@titleapp.ai",
          contactId: "kent_redwine",
          channel: "chat",
          direction: "inbound",
          body: "Sean — just reviewed the Q1 budget. We're tracking under on infrastructure costs by about 15%. Firebase billing came in lower than projected. Good news for runway.",
          intent: "internal",
          sentiment: "positive",
          timestamp: new Date(now - 24 * 60 * 60 * 1000),
        },
        {
          from: "noreply@stripe.com",
          to: "sean@titleapp.ai",
          contactId: "stripe_system",
          channel: "email",
          direction: "inbound",
          subject: "Your Stripe account is ready for review",
          body: "Your Stripe account setup is almost complete. Please verify your business details and add a bank account to start accepting payments. Visit your Stripe dashboard to continue.",
          intent: "system",
          sentiment: "neutral",
          timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
        },
        {
          from: "david.park@angellist.com",
          to: "sean@titleapp.ai",
          contactId: "david_park",
          channel: "email",
          direction: "inbound",
          subject: "Intro: Potential angel investor for TitleApp",
          body: "Hi Sean, I'm an angel investor focused on AI/SaaS infrastructure. Your pitch deck came through my network and I'd like to learn more about TitleApp's traction and roadmap. Are you raising? Happy to chat this week.",
          intent: "investor",
          sentiment: "positive",
          timestamp: new Date(now - 12 * 60 * 60 * 1000),
        },
      ];

      const commsBatch = db.batch();
      for (const msg of sampleMessages) {
        commsBatch.set(db.collection("messages").doc(), msg);
      }

      // Sample drafts
      const sampleDrafts = [
        {
          to: "david.park@angellist.com",
          channel: "email",
          subject: "Re: Intro: Potential angel investor for TitleApp",
          body: "Hi David, thanks for reaching out. Yes, we're currently raising a $1.07M seed round via SAFE. I'd love to walk you through the platform and our traction. Are you free Thursday at 3pm PST? I can share the deck ahead of time.",
          status: "pending_review",
          createdAt: new Date(now - 1 * 60 * 60 * 1000),
          generatedBy: "alex",
        },
        {
          to: "maria.chen@startupweekly.com",
          channel: "email",
          subject: "Re: Feature request: Startup Weekly coverage",
          body: "Hi Maria, happy to chat for the Q1 roundup. I'm available next Tuesday or Wednesday, mornings work best. Our core angle: Digital Workers make compliance portable and AI-auditable. Let me know what works.",
          status: "pending_review",
          createdAt: new Date(now - 30 * 60 * 1000),
          generatedBy: "alex",
        },
      ];

      for (const draft of sampleDrafts) {
        commsBatch.set(db.collection("draftMessages").doc(), draft);
      }

      await commsBatch.commit();
      results.communications = sampleMessages.length + sampleDrafts.length;
    } else {
      results.communications = "already seeded";
    }

    return res.json({
      ok: true,
      results,
      counts: {
        users: users.length,
        workspaces: workspaces.length,
        tenants: tenants.length,
        packages: packages.length,
      },
    });
  } catch (err) {
    console.error("seedActivityData error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { seedActivityData };
