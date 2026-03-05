import React from "react";
import LandingPage from "./LandingPage";

const CONTENT = {
  vertical: "pilot",
  headlines: [
    {
      headline: "Your Digital Copilot.",
      subhead: "Free logbook. Blockchain-verified. ForeFlight integrated. Full FAA library included."
    },
    {
      headline: "Kill the Paper Logbook. Forever.",
      subhead: "Auto-import from ForeFlight. Blockchain verification. PRIA-ready export."
    },
    {
      headline: "Am I Legal for This Flight? Yes or No, With the Reg Cite.",
      subhead: "Currency tracking, medical alerts, and certificate management \u2014 always current."
    },
    {
      headline: "Every FAA Handbook. Every Chart. Every Plate. Always Current. Free.",
      subhead: "FAR/AIM, PHAK, Weather, Aerodynamics for Naval Aviators \u2014 AI-indexed and searchable."
    },
    {
      headline: "Free to Start. Pro for $19/month.",
      subhead: "No credit card for free tier. 60-day money back on Pro. Code: PILOT3FREE for 3 months free."
    }
  ],
  problems: [
    { title: "Paper Logbook Management", description: "Paper logbooks get lost, damaged, and can't be verified. Transferring hours between formats wastes time and introduces errors." },
    { title: "Currency and Medical Tracking", description: "Knowing whether you're legal to fly requires tracking multiple overlapping windows \u2014 BFRs, night currency, IPC, medical dates \u2014 across certificates and ratings." },
    { title: "FAA Regulation Lookup", description: "Finding the specific FAR, advisory circular, or handbook section you need takes time. Regulations change, and staying current across all publications is a full-time job." }
  ],
  workers: [
    { name: "Digital Logbook", description: "Auto-import from ForeFlight, blockchain-verified entries, PRIA-ready export, and automatic total calculations by category.", slug: "digital-logbook", price: "$0/mo" },
    { name: "Currency Tracker", description: "Real-time currency status for every certificate and rating. Medical alerts, BFR tracking, IPC windows, night currency \u2014 always current.", slug: "currency-tracker", price: "$0/mo" },
    { name: "FAA Library", description: "Every FAA handbook, chart supplement, and regulation \u2014 AI-indexed and searchable. Ask a question, get the answer with the reg cite.", slug: "faa-library", price: "$0/mo" },
    { name: "Flight Planner", description: "Weather briefing integration, weight and balance, fuel planning, and NOTAM review \u2014 all in one preflight workflow.", slug: "flight-planner", price: "$0/mo" }
  ],
  testimonials: [
    { quote: "I imported 12 years of paper logbook entries in one afternoon. Everything verified, everything totaled, everything exportable. Should have done this years ago.", author: "ATP Pilot", company: "Part 121 Carrier" },
    { quote: "The currency tracker saved me from busting night currency on a Part 135 trip. It just quietly flagged it the morning before. That alone is worth Pro.", author: "Commercial Pilot", company: "Charter Operator" }
  ],
  metrics: [
    { value: "8", label: "Aviation Workers" },
    { value: "200+", label: "FAA Publications" },
    { value: "0", label: "Cost to Start" }
  ],
  pricing: [
    { name: "Free", price: "$0", period: "/mo", features: ["Digital logbook", "Basic currency tracking", "FAA library access", "ForeFlight import"], cta: "Start Free", highlighted: false },
    { name: "Pro", price: "$19", period: "/mo", features: ["All free features", "Blockchain verification", "Advanced analytics", "PRIA-ready export", "Priority support"], cta: "Start Free", highlighted: true },
    { name: "Pro Plus", price: "$39", period: "/mo", features: ["Everything in Pro", "Flight planner", "Weight and balance", "Multi-aircraft tracking", "Training syllabus integration"], cta: "Start Free", highlighted: false }
  ],
  faq: [
    { question: "Can I import my existing logbook?", answer: "Yes. TitleApp supports direct import from ForeFlight, LogTen Pro, and CSV/Excel exports from most digital logbook applications. For paper logbooks, you can enter totals by category and add entries going forward." },
    { question: "What does blockchain verification mean?", answer: "Each logbook entry gets a cryptographic hash stored on-chain. This creates a tamper-evident record that proves when an entry was made and that it hasn't been altered since. Useful for airline interviews, insurance audits, and PRIA requests." },
    { question: "Is the FAA library really free?", answer: "Yes. The full FAA library \u2014 FAR/AIM, PHAK, Instrument Flying Handbook, Aviation Weather, Chart Supplements, and 200+ other publications \u2014 is free and always current. AI-indexed so you can ask questions in plain English and get answers with regulation cites." },
    { question: "How does currency tracking work?", answer: "TitleApp reads your logbook entries and calculates currency status for every certificate, rating, and endorsement you hold. It accounts for BFRs, instrument proficiency checks, night currency, tailwheel currency, type ratings, and medical certificates. You get alerts before anything expires." },
    { question: "What if I don't like it?", answer: "The free tier has no credit card requirement and no time limit. If you upgrade to Pro and aren't satisfied, get a full refund within 60 days. Cancel anytime with one click." }
  ],
  promoCode: "PILOT3FREE"
};

export default function PilotLanding() {
  return <LandingPage {...CONTENT} />;
}
