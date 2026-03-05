import React from "react";
import LandingPage from "./LandingPage";

const CONTENT = {
  vertical: "title-escrow",
  headlines: [
    {
      headline: "Close Faster. Miss Nothing. Sleep at Night.",
      subhead: "AI workers that track every requirement, chase every document, catch every risk."
    },
    {
      headline: "You're Chasing 40 Documents Per Closing. What If They Chased Themselves?",
      subhead: "Automated document tracking, status updates, and deadline enforcement."
    },
    {
      headline: "50% Reduction in Time-to-Close. Zero Missed Requirements.",
      subhead: "Title companies using TitleApp close faster with fewer errors."
    },
    {
      headline: "Wire Fraud Cost the Industry $446M Last Year. Don't Be Next.",
      subhead: "AI-powered wire verification catches fraud attempts before money moves."
    },
    {
      headline: "Start Free. Your First 2 Months Are on Us.",
      subhead: "No credit card to start. 60-day money back guarantee. Code: TITLELAUNCH"
    }
  ],
  problems: [
    { title: "Document Tracking Chaos", description: "Every closing requires 30-50 documents from multiple parties on different timelines. One missed document can delay closing by weeks." },
    { title: "Wire Fraud Risk", description: "Wire fraud costs the title industry hundreds of millions per year. Manual verification processes are slow and error-prone." },
    { title: "Missed Requirements", description: "State-specific requirements, lender conditions, and regulatory updates change constantly. Keeping track across hundreds of files is unsustainable." }
  ],
  workers: [
    { name: "Title Search Worker", description: "Automated title searches with chain-of-title analysis, lien detection, and exception flagging.", slug: "title-search", price: "$0/mo" },
    { name: "Escrow Tracking Worker", description: "Real-time tracking of every document, condition, and milestone from contract to close.", slug: "escrow-tracking", price: "$0/mo" },
    { name: "Document Compliance Worker", description: "Ensures every closing package meets state, federal, and lender requirements before it ships.", slug: "document-compliance", price: "$0/mo" },
    { name: "Wire Verification Worker", description: "AI-powered wire instruction verification that catches fraud attempts and confirms routing before funds move.", slug: "wire-verification", price: "$0/mo" }
  ],
  testimonials: [
    { quote: "We cut our average time-to-close by 11 days in the first quarter. The document tracking alone paid for itself.", author: "VP of Operations", company: "Regional Title Company" },
    { quote: "The wire verification worker caught a spoofed email that would have cost us $340K. That's not ROI — that's survival.", author: "Escrow Manager", company: "National Title Agency" }
  ],
  metrics: [
    { value: "11", label: "Days Faster Close" },
    { value: "50%", label: "Fewer Errors" },
    { value: "0", label: "Cost to Start" }
  ],
  pricing: [
    { name: "Free", price: "$0", period: "/mo", features: ["1 Digital Worker", "Basic document tracking", "Email support", "60-day money back"], cta: "Start Free", highlighted: false },
    { name: "Professional", price: "$69", period: "/mo per worker", features: ["Unlimited workers", "Advanced compliance checks", "Priority support", "Wire verification", "Multi-state coverage"], cta: "Start Free", highlighted: true },
    { name: "Enterprise", price: "$149", period: "/mo per worker", features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Multi-office dashboard"], cta: "Contact Sales", highlighted: false }
  ],
  faq: [
    { question: "Does TitleApp replace my title production software?", answer: "No. TitleApp works alongside your existing TPS — SoftPro, RamQuest, ResWare, Qualia, or whatever you use. Think of TitleApp as the AI layer that watches your pipeline and catches what falls through the cracks." },
    { question: "How does the wire verification work?", answer: "The Wire Verification Worker analyzes incoming wire instructions against known patterns, previous transactions, and counterparty data. It flags anomalies — changed routing numbers, first-time accounts, domain spoofing — before any money moves." },
    { question: "Is my data secure?", answer: "All data is encrypted in transit and at rest. TitleApp is SOC 2 compliant with role-based access controls. Your client data never leaves your workspace, and you can delete it at any time." },
    { question: "What states are supported?", answer: "TitleApp supports all 50 states. State-specific requirements, recording standards, and regulatory rules are built into the compliance engine and updated continuously." },
    { question: "What if I don't like it?", answer: "Start free — no credit card required. If you upgrade and aren't satisfied, get a full refund within 60 days. No questions, no forms, no retention calls. Cancel anytime." }
  ],
  promoCode: "TITLELAUNCH"
};

export default function TitleEscrowLanding() {
  return <LandingPage {...CONTENT} />;
}
