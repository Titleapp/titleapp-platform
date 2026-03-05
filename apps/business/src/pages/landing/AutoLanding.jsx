import React from "react";
import LandingPage from "./LandingPage";

const CONTENT = {
  vertical: "auto",
  headlines: [
    {
      headline: "Your Service Drive Is a $2M Revenue Engine. Start Treating It Like One.",
      subhead: "AI workers that turn every RO into a sales opportunity."
    },
    {
      headline: "15 Trade-In Opportunities Walk Out Your Service Door Every Day.",
      subhead: "TitleApp catches every one — automatically. No extra work for your advisors."
    },
    {
      headline: "Dealers Using TitleApp Recover $180K\u2013$420K Per Rooftop.",
      subhead: "Service-to-sales. Declined service follow-up. Every dollar accounted for."
    },
    {
      headline: "What If Your Service Lane Was Your Best Salesperson?",
      subhead: "It already has the traffic. It already has the trust. Now give it the tools."
    },
    {
      headline: "Start Free Today. First 2 Months on Us.",
      subhead: "No credit card required. 60-day money back. Code: AUTOLAUNCH"
    }
  ],
  problems: [
    { title: "Missed Trade-In Opportunities", description: "15 potential deals walk out your service door every day because advisors are focused on ROs, not sales opportunities." },
    { title: "Declined Service Revenue Lost", description: "Your declined service follow-up rate is under 10%. That's thousands in monthly revenue walking out the door." },
    { title: "F&I Product Gaps", description: "Your F&I team presents the same menu to every customer. Personalized recommendations close 40% more products." }
  ],
  workers: [
    { name: "Service-to-Sales Worker", description: "Watches every RO and flags vehicles where trade-in math works better than the repair.", slug: "service-to-sales", price: "$0/mo" },
    { name: "F&I Menu Builder", description: "AI-powered F&I presentations personalized to each customer's profile, credit, and vehicle.", slug: "fi-menu-builder", price: "$0/mo" },
    { name: "Declined Service Follow-Up", description: "Automated follow-up sequences for every declined service recommendation.", slug: "declined-service", price: "$0/mo" },
    { name: "Inventory Intelligence", description: "Real-time market data for pricing, aging, and acquisition strategy.", slug: "inventory-intelligence", price: "$0/mo" }
  ],
  testimonials: [
    { quote: "We recovered $23K in our first month with just the Service-to-Sales worker.", author: "Fixed Ops Director", company: "Mid-Size Domestic Store" },
    { quote: "Declined service recovery went from 8% to 31% in two months.", author: "Service Manager", company: "Multi-Rooftop Group" }
  ],
  metrics: [
    { value: "29", label: "Auto Workers" },
    { value: "$180K+", label: "Avg Recovery/Year" },
    { value: "0", label: "Cost to Start" }
  ],
  pricing: [
    { name: "Free", price: "$0", period: "/mo", features: ["1 Digital Worker", "Basic analytics", "Email support", "60-day money back"], cta: "Start Free", highlighted: false },
    { name: "Professional", price: "$69", period: "/mo per worker", features: ["Unlimited workers", "Advanced analytics", "Priority support", "DMS integration", "Custom workflows"], cta: "Start Free", highlighted: true },
    { name: "Enterprise", price: "$149", period: "/mo per worker", features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Multi-rooftop dashboard"], cta: "Contact Sales", highlighted: false }
  ],
  faq: [
    { question: "How does TitleApp connect to my DMS?", answer: "TitleApp works alongside Reynolds, CDK, Dealertrack, and all major DMS platforms. No rip-and-replace. Your service advisors don't even need to log into TitleApp — opportunities surface in their existing workflow." },
    { question: "Do my advisors need training?", answer: "No. TitleApp works in the background. Your advisors and F&I team get actionable alerts and recommendations without changing their daily routine." },
    { question: "What if I don't like it?", answer: "Start free — no credit card required. If you upgrade and aren't satisfied, get a full refund within 60 days. No questions, no forms, no retention calls. Cancel anytime." },
    { question: "How is this different from my CRM?", answer: "Your CRM tracks customer interactions. TitleApp watches every repair order, every MPI, every vehicle in your service lane and identifies revenue opportunities your CRM can't see — trade-ins, declined service follow-ups, F&I gaps." },
    { question: "What does 'commission-based' mean?", answer: "All auto dealer workers are free. TitleApp earns a small commission only when you close revenue that our workers helped identify. If we don't generate value, you don't pay." }
  ],
  promoCode: "AUTOLAUNCH"
};

export default function AutoLanding() {
  return <LandingPage {...CONTENT} />;
}
