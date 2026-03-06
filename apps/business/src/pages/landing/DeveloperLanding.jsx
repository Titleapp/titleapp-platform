import React from "react";
import LandingPage from "./LandingPage";

const CONTENT = {
  vertical: "developers",
  headlines: [
    {
      headline: "Build an AI Worker. Publish It. Get Paid While You Sleep.",
      subhead: "The TitleApp marketplace turns your domain expertise into recurring revenue."
    },
    {
      headline: "You Have the Expertise. We Have the Distribution. Let's Build.",
      subhead: "Over 1,000 workers across 12 industries \u2014 and more added daily."
    },
    {
      headline: "Top Workers Earn $5K\u2013$50K/Month in Subscription Revenue.",
      subhead: "Build once. Earn every month from every subscriber."
    },
    {
      headline: "No Infrastructure to Build. No Users to Find. Just Build and Ship.",
      subhead: "Auth, billing, hosting, distribution, support \u2014 we handle it. You build the worker."
    },
    {
      headline: "First 100 Days Free. Build Without Risk.",
      subhead: "Just $2 for ID verification. Start building today. Code: DEV100"
    }
  ],
  problems: [
    { title: "Finding Distribution", description: "You built something great, but nobody knows it exists. Getting in front of paying customers in specialized industries is expensive and slow." },
    { title: "Building Billing Infrastructure", description: "Subscription management, invoicing, usage tracking, refunds, tax compliance \u2014 billing alone can take months to build and maintain." },
    { title: "Acquiring Users", description: "Marketing to niche professional audiences costs $50\u2013$200 per lead. Even great products die without distribution." }
  ],
  workers: [
    { name: "Worker Builder SDK", description: "Full development kit with templates, testing tools, and deployment pipeline. Go from idea to published worker in days.", slug: "worker-builder-sdk", price: "Free" },
    { name: "Analytics Dashboard", description: "Real-time subscriber counts, usage metrics, revenue tracking, and churn analysis for every worker you publish.", slug: "analytics-dashboard", price: "Free" },
    { name: "Revenue Tracker", description: "Track earnings, payouts, and projections across all your published workers in one place.", slug: "revenue-tracker", price: "Free" },
    { name: "Marketplace Listing", description: "Professional listing page with reviews, ratings, and discovery optimization. Your worker shows up where buyers are looking.", slug: "marketplace-listing", price: "Free" }
  ],
  testimonials: [
    { quote: "I built a compliance worker for mortgage brokers in two weeks. It now has 340 subscribers generating $23K per month.", author: "Independent Developer", company: "Former Mortgage Compliance Officer" },
    { quote: "TitleApp handles billing, support, and distribution. I just build the worker and collect the check.", author: "Creator", company: "PropTech Developer" }
  ],
  metrics: [
    { value: "1,000+", label: "Workers Published" },
    { value: "12", label: "Industries" },
    { value: "$50K", label: "Top Monthly Earner" }
  ],
  pricing: [
    { name: "Starter", price: "$0", period: "/mo", features: ["1 published worker", "Basic analytics", "Community support", "Standard marketplace listing"], cta: "Start Building", highlighted: false },
    { name: "Professional", price: "$29", period: "/mo", features: ["Unlimited workers", "Advanced analytics", "Priority review", "Featured listings", "Revenue tools"], cta: "Start Building", highlighted: true },
    { name: "Enterprise", price: "Custom", period: "", features: ["Everything in Pro", "Dedicated partner manager", "Custom distribution", "API access", "White-label options"], cta: "Contact Us", highlighted: false }
  ],
  faq: [
    { question: "What does it cost to start?", answer: "Building and publishing your first worker is free. We charge $2 for ID verification to maintain marketplace quality. The DEV100 promo code gives you 100 days of Professional features at no cost." },
    { question: "How do I get paid?", answer: "You set your worker's subscription price ($29, $49, or $79 per month). You earn 75% of subscription revenue plus 20% of inference overage margin. TitleApp pays monthly via direct deposit. No minimums, no holdbacks." },
    { question: "Do I need to handle customer support?", answer: "TitleApp handles Tier 1 support for all marketplace workers. You handle product-specific questions and feature requests. We provide the tools to manage both." },
    { question: "What kind of workers can I build?", answer: "Anything that solves a real business problem. Compliance automation, document processing, data analysis, workflow orchestration \u2014 if professionals need it and you can build it, there's a place for it in the marketplace." },
    { question: "How do users find my worker?", answer: "The marketplace has built-in discovery, search, and category browsing. High-rated workers get featured placement. You can also share direct links and embed widgets on your own site." }
  ],
  promoCode: "DEV100"
};

export default function DeveloperLanding() {
  return <LandingPage {...CONTENT} />;
}
