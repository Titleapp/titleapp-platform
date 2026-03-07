import React from "react";
import LandingPage from "./LandingPage";

const CONTENT = {
  vertical: "developers",
  headlines: [
    {
      headline: "You know your industry. Now put it to work.",
      subhead: "Build an AI worker that handles the compliance-heavy work in your field \u2014 no coding needed."
    },
    {
      headline: "Turn your expertise into recurring revenue.",
      subhead: "Alex builds it with you. You earn every time someone uses it."
    },
    {
      headline: "Top creators earn $5K\u2013$50K per month.",
      subhead: "Build once. Earn every month from every subscriber."
    },
    {
      headline: "First 100 days free. Build without risk.",
      subhead: "Use code DEV100 for 100 days of Professional features at no cost."
    }
  ],
  problems: [
    { title: "Your expertise is stuck in your head", description: "You know the rules, the edge cases, the workflows that matter. Right now that knowledge helps one team. A Digital Worker puts it to work for thousands of professionals across your field." },
    { title: "Compliance mistakes are expensive", description: "One wrong answer in a regulated industry costs time, money, or a license. A Digital Worker enforces the right rules every time \u2014 automatically, without you being in the room." },
    { title: "Building software is out of reach", description: "Hiring a developer to build what you know would cost $50,000 and six months. With TitleApp you describe it to Alex and it is live in under an hour." }
  ],
  workers: [
    { name: "Build Your Worker", description: "Describe what you know to Alex. She handles the rest \u2014 compliance rules, pricing, testing, and publishing. Live in under an hour.", slug: "build-your-worker", price: "Free" },
    { name: "Track Your Subscribers", description: "See who is using your worker, how often, and which features they use most. Plain English \u2014 no dashboards to learn.", slug: "track-subscribers", price: "Free" },
    { name: "Get Paid Automatically", description: "Earn 75% of every subscription plus 20% of usage overage. Monthly direct deposit. No minimums, no holdbacks.", slug: "get-paid", price: "Free" },
    { name: "Get Found", description: "Your worker gets a professional listing page in the TitleApp marketplace \u2014 where the professionals in your field are already looking.", slug: "get-found", price: "Free" }
  ],
  testimonials: [
    { quote: "I built a compliance worker for mortgage brokers in two weeks. It now has 340 subscribers generating $23K per month.", author: "Compliance Specialist", company: "Mortgage Industry" },
    { quote: "TitleApp handles billing, support, and distribution. I just build the worker and collect the check.", author: "EMS Instructor", company: "Ohio" }
  ],
  metrics: [
    { value: "1,000+", label: "Workers Published" },
    { value: "13", label: "Industries" },
    { value: "$50K", label: "Top Monthly Earner" }
  ],
  pricing: [
    { name: "Free", price: "$0", period: "", features: ["1 published worker", "Basic analytics", "Community support", "Standard marketplace listing", "75% subscription revenue share"], cta: "Start Building", highlighted: false },
    { name: "Creator License", price: "$49", period: "/year", features: ["Unlimited published workers", "Advanced analytics", "Priority marketplace review", "Featured listings", "Full revenue tools", "75% subscription revenue share", "20% of usage overage share", "Alex weekly earnings reports via SMS and email"], cta: "Start Building", highlighted: true }
  ],
  faq: [
    { question: "Do I need to know how to code?", answer: "No. You describe what your worker should do in plain English and Alex builds it. If you can explain your job to a colleague, you can build a Digital Worker. Most people publish their first worker in under an hour." },
    { question: "What is a Digital Worker, exactly?", answer: "It is an AI agent trained on the rules of your industry. You define what it knows and what rules it enforces. It then does that job automatically for every professional who subscribes to it \u2014 correctly, every time, without you being involved." },
    { question: "How long does it take to build one?", answer: "Most first-time creators publish in under an hour. Alex guides you through the whole process conversationally. You answer questions about your specialty, review what Alex builds, test it, and hit publish. No forms, no code, no technical decisions." },
    { question: "What do I earn?", answer: "You earn 75% of every subscription your worker generates plus 20% of TitleApp's margin when subscribers use more than their monthly credit allowance. You set the subscription price. TitleApp pays monthly via direct deposit. No minimums, no holdbacks." },
    { question: "What if my industry has strict compliance rules?", answer: "That is exactly what TitleApp is built for. Regulated industries \u2014 healthcare, aviation, construction, legal, real estate \u2014 are our core market. Your worker enforces the rules you define. The tighter the rules in your field, the more valuable your worker is." },
    { question: "What kind of worker can I build?", answer: "Anything that solves a real problem for professionals in your field. Common examples: compliance checklists, documentation tools, training scenario generators, scope-of-practice guides, referral trackers, scheduling validators. If your colleagues do it manually and get it wrong sometimes, it is a good candidate." },
    { question: "Do I need to handle customer support?", answer: "TitleApp handles all Tier 1 support \u2014 account issues, billing questions, access problems. You handle questions specific to your worker's content. Alex gives you the tools to manage both without a support team." },
    { question: "How do subscribers find my worker?", answer: "Three ways. The TitleApp marketplace has built-in search and category browsing. When you publish, Alex generates a shareable link, QR code, and pre-written social posts. Alex also drafts outreach emails you can send to drive institutional adoption." },
    { question: "What does it cost to get started?", answer: "Building and publishing your first worker is free. The Creator License is $49 per year after your first worker. Use code DEV100 for 100 days of Professional features at no cost." }
  ],
  promoCode: "DEV100"
};

export default function DeveloperLanding() {
  return <LandingPage {...CONTENT} />;
}
