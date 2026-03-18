/**
 * campaignDefinitions.js — 26 campaign definitions for the campaign engine.
 * Seed via POST /v1/admin:seedCampaigns.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const CAMPAIGN_DEFINITIONS = [
  // ── ONBOARDING (6) ────────────────────────────────────────────
  {
    campaignId: "welcome_email",
    name: "Welcome Email",
    category: "onboarding",
    trigger: { event: "user_signup" },
    channels: ["email"],
    template: {
      email: {
        subject: "Welcome to TitleApp, {{firstName}}",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Welcome to TitleApp. Your account is ready.</p>
  <ul style="font-size: 16px; color: #1a202c; line-height: 1.8; padding-left: 20px;">
    <li>Start free — no credit card required</li>
    <li>60-day money-back guarantee</li>
    <li>Cancel anytime — one click</li>
  </ul>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Go to Dashboard</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC | Start Free. 60-Day Money Back. Your Data Is Always Yours.</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 1,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "welcome_sms",
    name: "Welcome SMS",
    category: "onboarding",
    trigger: { event: "user_signup" },
    channels: ["sms"],
    template: {
      sms: { body: "Welcome to TitleApp, {{firstName}}! Your account is ready. Get started: {{platformUrl}}" },
    },
    delayMinutes: 5,
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 2,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "onboarding_tips",
    name: "Onboarding Tips",
    category: "onboarding",
    trigger: { event: "user_signup" },
    channels: ["email"],
    template: {
      email: {
        subject: "3 ways to get the most from TitleApp",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Here are three things that help our users get value fast:</p>
  <ol style="font-size: 16px; color: #1a202c; line-height: 1.8; padding-left: 20px;">
    <li>Browse the marketplace — find Digital Workers for your industry</li>
    <li>Start a conversation with Alex — she can guide you to the right worker</li>
    <li>Try the Sandbox — build your own Digital Worker in minutes</li>
  </ol>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 4320, // 3 days
    variables: ["firstName"],
    status: "active",
    priority: 3,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "first_worker_nudge",
    name: "First Worker Nudge",
    category: "onboarding",
    trigger: { event: "user_signup" },
    channels: ["email"],
    template: {
      email: {
        subject: "Have you found your first Digital Worker?",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Most users find their first Digital Worker within the first week. Browse by industry and see what fits your workflow.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Browse Workers</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 10080, // 7 days
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 4,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "profile_completion",
    name: "Profile Completion Reminder",
    category: "onboarding",
    trigger: { event: "user_signup" },
    channels: ["email"],
    template: {
      email: {
        subject: "Complete your TitleApp profile",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Adding your company and industry helps us recommend the right Digital Workers for you.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}/settings" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Complete Profile</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 1440, // 1 day
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 5,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "vertical_intro",
    name: "Vertical Introduction",
    category: "onboarding",
    trigger: { event: "user_signup" },
    channels: ["email"],
    template: {
      email: {
        subject: "Digital Workers built for {{vertical}}",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We have Digital Workers built specifically for {{vertical}}. Each one follows industry rules and compliance requirements out of the box.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Explore {{vertical}} Workers</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 2880, // 2 days
    variables: ["firstName", "vertical", "platformUrl"],
    status: "active",
    priority: 6,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },

  // ── ENGAGEMENT (5) ────────────────────────────────────────────
  {
    campaignId: "worker_published_congrats",
    name: "Worker Published Congratulations",
    category: "engagement",
    trigger: { event: "worker_published" },
    channels: ["email", "sms"],
    template: {
      email: {
        subject: "{{workerName}} is live on the marketplace",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your Digital Worker — <strong>{{workerName}}</strong> — is now live on the TitleApp marketplace. Users can find and subscribe to it immediately.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">You earn 75% of every subscription. Payouts are weekly (every Monday).</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
      sms: { body: "Your Digital Worker \"{{workerName}}\" is now live on TitleApp! You earn 75% of every subscription." },
    },
    delayMinutes: 0,
    variables: ["firstName", "workerName"],
    status: "active",
    priority: 1,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "first_subscriber_alert",
    name: "First Subscriber Alert",
    category: "engagement",
    trigger: { event: "first_subscriber" },
    channels: ["email", "sms"],
    template: {
      email: {
        subject: "You got your first subscriber",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Someone just subscribed to <strong>{{workerName}}</strong>. Your first subscriber is a milestone — this is real revenue.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
      sms: { body: "You just got your first subscriber on \"{{workerName}}\"! Check your dashboard: {{platformUrl}}" },
    },
    delayMinutes: 0,
    variables: ["firstName", "workerName", "platformUrl"],
    status: "active",
    priority: 1,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "weekly_usage_summary",
    name: "Weekly Usage Summary",
    category: "engagement",
    trigger: { event: "weekly_digest" },
    channels: ["email"],
    template: {
      email: {
        subject: "Your TitleApp week in review",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Here is your weekly summary. You are on the {{tierName}} plan with {{creditsRemaining}} credits remaining this month.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">View Dashboard</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "tierName", "creditsRemaining", "platformUrl"],
    status: "active",
    priority: 5,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "new_feature_announcement",
    name: "New Feature Announcement",
    category: "engagement",
    trigger: { event: "feature_release" },
    channels: ["email"],
    template: {
      email: {
        subject: "New on TitleApp: {{featureName}}",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We just launched <strong>{{featureName}}</strong>. {{featureDescription}}</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Try It Now</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "featureName", "featureDescription", "platformUrl"],
    status: "draft",
    priority: 3,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "milestone_celebration",
    name: "Milestone Celebration",
    category: "engagement",
    trigger: { event: "milestone_reached" },
    channels: ["email"],
    template: {
      email: {
        subject: "You hit a milestone on TitleApp",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">{{milestoneMessage}}</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "milestoneMessage"],
    status: "active",
    priority: 2,
    maxPerUser: null,
    smsOptOutRequired: true,
  },

  // ── REACTIVATION (5) ──────────────────────────────────────────
  {
    campaignId: "sandbox_abandoned_d3",
    name: "Sandbox Abandoned — Day 3",
    category: "reactivation",
    trigger: { event: "vibe_abandoned" },
    channels: ["email"],
    template: {
      email: {
        subject: "Your Digital Worker draft is waiting",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">You started building <strong>{{workerName}}</strong> but did not finish. Your progress is saved.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{sandboxUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Continue Building</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 4320, // 3 days
    variables: ["firstName", "workerName", "sandboxUrl"],
    status: "active",
    priority: 3,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "sandbox_abandoned_d7",
    name: "Sandbox Abandoned — Day 7",
    category: "reactivation",
    trigger: { event: "vibe_abandoned" },
    channels: ["email"],
    template: {
      email: {
        subject: "Creators who publish in week one see 3x more subscribers",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your draft for <strong>{{workerName}}</strong> is still saved. Creators who publish in the first week tend to see 3x more early subscribers.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{sandboxUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Pick Up Where You Left Off</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 10080, // 7 days
    variables: ["firstName", "workerName", "sandboxUrl"],
    status: "active",
    priority: 4,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "sandbox_abandoned_d14",
    name: "Sandbox Abandoned — Day 14",
    category: "reactivation",
    trigger: { event: "vibe_abandoned" },
    channels: ["email"],
    template: {
      email: {
        subject: "Other creators published new workers this week",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">The marketplace is growing. Your <strong>{{workerName}}</strong> could be next. Early movers in your category have less competition.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{sandboxUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Finish and Publish</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 20160, // 14 days
    variables: ["firstName", "workerName", "sandboxUrl"],
    status: "active",
    priority: 5,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "inactive_user_d30",
    name: "Inactive User — 30 Days",
    category: "reactivation",
    trigger: { event: "user_inactive_30d" },
    channels: ["email"],
    template: {
      email: {
        subject: "We miss you on TitleApp",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">It has been a while since you logged in. Your account and credits are still here.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Return to TitleApp</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 5,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "inactive_user_d60_winback",
    name: "Inactive User — 60 Day Win-Back",
    category: "reactivation",
    trigger: { event: "user_inactive_60d" },
    channels: ["email", "sms"],
    template: {
      email: {
        subject: "Your TitleApp account is still here",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We saved everything for you. If you have questions or want a walkthrough, reply to this email — it goes to a real person.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Come Back</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
      sms: { body: "Hi {{firstName}}, your TitleApp account is still here. Reply to this text or visit {{platformUrl}}" },
    },
    delayMinutes: 0,
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 6,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },

  // ── TRANSACTIONAL (5) ─────────────────────────────────────────
  {
    campaignId: "subscription_confirmation",
    name: "Subscription Confirmation",
    category: "transactional",
    trigger: { event: "subscription_created" },
    channels: ["email"],
    template: {
      email: {
        subject: "Your {{tierName}} subscription is active",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your {{tierName}} subscription is now active. You have {{creditsRemaining}} credits this month.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "tierName", "creditsRemaining"],
    status: "active",
    priority: 1,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "subscription_cancelled",
    name: "Subscription Cancelled",
    category: "transactional",
    trigger: { event: "subscription_cancelled" },
    channels: ["email"],
    template: {
      email: {
        subject: "Your TitleApp subscription has been cancelled",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your subscription has been cancelled. You can still access TitleApp on the free tier with 100 credits per month.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">If you change your mind, you can resubscribe anytime from your dashboard.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName"],
    status: "active",
    priority: 1,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "trial_starting",
    name: "Trial Starting",
    category: "transactional",
    trigger: { event: "trial_started" },
    channels: ["email", "sms"],
    template: {
      email: {
        subject: "Your 14-day free trial of {{workerName}} has started",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your 14-day free trial of <strong>{{workerName}}</strong> is now active. No credit card needed during the trial.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Start Using {{workerName}}</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
      sms: { body: "Your 14-day free trial of {{workerName}} has started. Try it out: {{platformUrl}}" },
    },
    delayMinutes: 0,
    variables: ["firstName", "workerName", "platformUrl"],
    status: "active",
    priority: 1,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "trial_ending_d12",
    name: "Trial Ending — Day 12",
    category: "transactional",
    trigger: { event: "trial_day_12" },
    channels: ["email"],
    template: {
      email: {
        subject: "Your {{workerName}} trial ends in 2 days",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your 14-day free trial of <strong>{{workerName}}</strong> ends in 2 days. Subscribe to keep access — 60-day money-back guarantee if it is not for you.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Subscribe Now</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "workerName", "platformUrl"],
    status: "active",
    priority: 1,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "payment_failed",
    name: "Payment Failed",
    category: "transactional",
    trigger: { event: "payment_failed" },
    channels: ["email", "sms"],
    template: {
      email: {
        subject: "Action required: payment failed",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We were unable to process your subscription payment. Please update your payment method to avoid service interruption.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}/settings/billing" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Update Payment</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
      sms: { body: "TitleApp: Your payment failed. Update your payment method to avoid service interruption: {{platformUrl}}/settings/billing" },
    },
    delayMinutes: 0,
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 1,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },

  // ── CREATOR LIFECYCLE (5) ─────────────────────────────────────
  {
    campaignId: "creator_welcome",
    name: "Creator Welcome",
    category: "creator_lifecycle",
    trigger: { event: "creator_license_activated" },
    channels: ["email"],
    template: {
      email: {
        subject: "Welcome to the TitleApp Creator Program",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Welcome to the Creator Program. Here is how it works:</p>
  <ul style="font-size: 16px; color: #1a202c; line-height: 1.8; padding-left: 20px;">
    <li>Build Digital Workers in the Sandbox</li>
    <li>Publish to the marketplace after review</li>
    <li>Earn 75% of every subscription</li>
    <li>Weekly payouts every Monday, $50 minimum</li>
  </ul>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{sandboxUrl}}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Start Building</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "sandboxUrl"],
    status: "active",
    priority: 1,
    maxPerUser: 1,
    smsOptOutRequired: true,
  },
  {
    campaignId: "creator_first_spec",
    name: "Creator First Spec Generated",
    category: "creator_lifecycle",
    trigger: { event: "spec_generated" },
    channels: ["email"],
    template: {
      email: {
        subject: "Your Digital Worker spec is ready",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your spec for <strong>{{workerName}}</strong> is ready. Review it, share the preview link, and submit for review when you are ready.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{sandboxUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">View Your Spec</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "workerName", "sandboxUrl"],
    status: "active",
    priority: 2,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "creator_payout_ready",
    name: "Creator Payout Ready",
    category: "creator_lifecycle",
    trigger: { event: "payout_threshold_reached" },
    channels: ["email", "sms"],
    template: {
      email: {
        subject: "Your payout is ready",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your creator earnings have reached the $50 payout threshold. Your payout will be processed on Monday.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
      sms: { body: "TitleApp: Your creator payout has reached $50 and will be processed Monday." },
    },
    delayMinutes: 0,
    variables: ["firstName"],
    status: "active",
    priority: 1,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "creator_worker_approved",
    name: "Creator Worker Approved",
    category: "creator_lifecycle",
    trigger: { event: "worker_approved" },
    channels: ["email", "sms"],
    template: {
      email: {
        subject: "{{workerName}} has been approved",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Great news — <strong>{{workerName}}</strong> has been reviewed and approved. It is now live on the marketplace.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Set up your payout account to start receiving earnings.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
      sms: { body: "Your Digital Worker \"{{workerName}}\" has been approved and is live on TitleApp!" },
    },
    delayMinutes: 0,
    variables: ["firstName", "workerName"],
    status: "active",
    priority: 1,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
  {
    campaignId: "creator_monthly_report",
    name: "Creator Monthly Report",
    category: "creator_lifecycle",
    trigger: { event: "creator_monthly_digest" },
    channels: ["email"],
    template: {
      email: {
        subject: "Your creator report for this month",
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span></div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi {{firstName}},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Here is your monthly creator summary. Check your dashboard for detailed analytics.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="{{platformUrl}}" style="color: #7c3aed; text-decoration: none; font-weight: 600;">View Analytics</a></p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 13px; color: #94a3b8;">TitleApp LLC</p></div>
</div>`,
      },
    },
    delayMinutes: 0,
    variables: ["firstName", "platformUrl"],
    status: "active",
    priority: 5,
    maxPerUser: null,
    smsOptOutRequired: true,
  },
];

/**
 * Seed all campaign definitions to Firestore campaigns/ collection.
 */
async function seedCampaignDefinitions(db) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  let created = 0, updated = 0;

  for (const def of CAMPAIGN_DEFINITIONS) {
    const docRef = db.collection("campaigns").doc(def.campaignId);
    const existing = await docRef.get();

    await docRef.set({
      ...def,
      ...(existing.exists ? { updatedAt: now } : { createdAt: now, updatedAt: now }),
    }, { merge: true });

    if (existing.exists) updated++;
    else created++;
  }

  console.log(`[campaignDefinitions] Seeded: ${created} created, ${updated} updated`);
  return { created, updated, total: CAMPAIGN_DEFINITIONS.length };
}

module.exports = { CAMPAIGN_DEFINITIONS, seedCampaignDefinitions };
