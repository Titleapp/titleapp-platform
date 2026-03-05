import React from "react";
import LandingPage from "./LandingPage";

const CONTENT = {
  vertical: "property-management",
  headlines: [
    {
      headline: "Stop Managing Spreadsheets. Start Managing Properties.",
      subhead: "AI workers for lease admin, maintenance, HOA compliance, and owner reporting."
    },
    {
      headline: "What If You Could Manage 2x the Doors Without Hiring?",
      subhead: "Automate the work that buries your team. Keep the work that builds relationships."
    },
    {
      headline: "The Average PM Company Loses 12% of Revenue to Missed Renewals and Late Fees.",
      subhead: "TitleApp tracks every lease, every renewal, every deadline \u2014 automatically."
    },
    {
      headline: "Your Owners Want Reports. Your Tenants Want Answers. You Want Your Weekends Back.",
      subhead: "Give everyone what they need without working nights and weekends."
    },
    {
      headline: "Start Free. First 2 Months on Us.",
      subhead: "No credit card required. 60-day money back. Code: PMLAUNCH"
    }
  ],
  problems: [
    { title: "Lease Renewal Tracking", description: "Missed renewals cost you tenants and revenue. Tracking hundreds of lease dates, escalation clauses, and renewal windows manually is a losing game." },
    { title: "Maintenance Request Overload", description: "Your team spends hours dispatching, following up, and closing work orders. Tenants expect instant responses. Vendors need clear instructions." },
    { title: "Owner Reporting Burden", description: "Monthly owner statements, year-end tax packages, and ad-hoc performance questions consume your back office. Every owner wants a different format." }
  ],
  workers: [
    { name: "Lease Admin Worker", description: "Tracks every lease date, renewal window, rent escalation, and compliance requirement across your entire portfolio.", slug: "lease-admin", price: "$0/mo" },
    { name: "Maintenance Coordinator", description: "Receives tenant requests, triages by priority, dispatches vendors, and tracks completion with photo verification.", slug: "maintenance-coordinator", price: "$0/mo" },
    { name: "Owner Reporting Worker", description: "Generates monthly statements, annual summaries, and on-demand performance reports for every owner in your portfolio.", slug: "owner-reporting", price: "$0/mo" },
    { name: "HOA Compliance Worker", description: "Monitors HOA rules, tracks violations, manages cure deadlines, and generates compliance correspondence.", slug: "hoa-compliance", price: "$0/mo" }
  ],
  testimonials: [
    { quote: "We added 120 doors last quarter without adding a single employee. The Lease Admin worker alone saves us 20 hours a week.", author: "Director of Operations", company: "Regional PM Company" },
    { quote: "Owner satisfaction scores went up 40% after we automated monthly reporting. They get reports on the 1st, every month, without fail.", author: "Portfolio Manager", company: "Multi-Family Management Firm" }
  ],
  metrics: [
    { value: "2x", label: "More Doors Per PM" },
    { value: "20hrs", label: "Saved Per Week" },
    { value: "0", label: "Cost to Start" }
  ],
  pricing: [
    { name: "Free", price: "$0", period: "/mo", features: ["1 Digital Worker", "Up to 50 units", "Email support", "60-day money back"], cta: "Start Free", highlighted: false },
    { name: "Professional", price: "$69", period: "/mo per worker", features: ["Unlimited workers", "Unlimited units", "Priority support", "Vendor management", "Owner portal"], cta: "Start Free", highlighted: true },
    { name: "Enterprise", price: "$149", period: "/mo per worker", features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Multi-portfolio dashboard"], cta: "Contact Sales", highlighted: false }
  ],
  faq: [
    { question: "Does TitleApp replace my property management software?", answer: "No. TitleApp works alongside AppFolio, Buildium, Rent Manager, Yardi, or whatever you use today. It's the AI layer that handles the repetitive work your software can't do on its own." },
    { question: "How does the Maintenance Coordinator work?", answer: "Tenants submit requests through your existing channels. The Maintenance Coordinator triages by urgency, assigns the right vendor based on skill and availability, sends work order details, and follows up until the job is confirmed complete with photo verification." },
    { question: "How many units can I manage?", answer: "Free tier supports up to 50 units with one worker. Professional and Enterprise tiers have no unit limits. Whether you manage 50 doors or 5,000, the workers scale with you." },
    { question: "What reports do owners get?", answer: "Monthly income and expense statements, maintenance summaries, occupancy reports, and year-end tax packages. Every report is customizable per owner and delivered automatically on your schedule." },
    { question: "What if I don't like it?", answer: "Start free \u2014 no credit card required. If you upgrade and aren't satisfied, get a full refund within 60 days. No questions, no forms, no retention calls. Cancel anytime." }
  ],
  promoCode: "PMLAUNCH"
};

export default function PropertyMgmtLanding() {
  return <LandingPage {...CONTENT} />;
}
