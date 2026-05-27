// Chart of Accounts templates.
//
// `suggestedMonthlyCapCents` populates an initial budget cap when the
// template is applied. The user can edit caps freely afterward.
// Caps are how the Accounting worker enforces spend control on outbound
// side-effects from other workers (e.g. Marketing campaign sends).

const COA_TEMPLATES = {
  "saas-startup": {
    id: "saas-startup",
    name: "Tech / SaaS Startup",
    description: "C-corp shaped (Delaware default). Marketing, infra, AI, and people costs up top; equity structured for stock + APIC + Retained Earnings.",
    accounts: [
      // Revenue
      { code: "4000", name: "Subscription Revenue", type: "revenue" },
      { code: "4100", name: "Setup / Onboarding Revenue", type: "revenue" },
      { code: "4900", name: "Other Income", type: "revenue" },

      // Cost of revenue
      { code: "5000", name: "Infrastructure (Firebase, Cloudflare, hosting)", type: "expense", suggestedMonthlyCapCents: 50000 },
      { code: "5050", name: "AI / Model Costs (Anthropic, OpenAI)", type: "expense", suggestedMonthlyCapCents: 100000 },
      { code: "5100", name: "Third-Party APIs (Apollo, SendGrid, Twilio, Stripe fees)", type: "expense", suggestedMonthlyCapCents: 50000 },

      // Marketing — capped tightly; this is where things spiral
      { code: "5200", name: "Marketing — Paid Ads (Google, LinkedIn, Meta)", type: "expense", suggestedMonthlyCapCents: 500000 },
      { code: "5210", name: "Marketing — Tools (HubSpot, ConvertKit, ahrefs)", type: "expense", suggestedMonthlyCapCents: 30000 },
      { code: "5220", name: "Marketing — Content & Creative", type: "expense", suggestedMonthlyCapCents: 50000 },
      { code: "5230", name: "Marketing — Events & Sponsorships", type: "expense", suggestedMonthlyCapCents: 100000 },

      // People
      { code: "6000", name: "Salaries & Contractor Fees", type: "expense" },
      { code: "6010", name: "Payroll Taxes & Benefits", type: "expense" },
      { code: "6100", name: "Officer Compensation (W-2 founder salary)", type: "expense" },

      // G&A
      { code: "7000", name: "Software Subscriptions (other SaaS tools)", type: "expense", suggestedMonthlyCapCents: 50000 },
      { code: "7100", name: "Legal & Professional Fees", type: "expense" },
      { code: "7200", name: "Banking & Payment Processing Fees", type: "expense" },
      { code: "7300", name: "Insurance", type: "expense" },
      { code: "7400", name: "Office / Rent / Utilities", type: "expense" },
      { code: "7500", name: "Travel & Entertainment", type: "expense", suggestedMonthlyCapCents: 30000 },
      { code: "7900", name: "Miscellaneous Expenses", type: "expense" },

      // Balance sheet — assets
      { code: "1000", name: "Operating Cash", type: "asset" },
      { code: "1010", name: "Holding / Savings Cash", type: "asset" },

      // Balance sheet — liabilities
      { code: "1100", name: "Credit Card Liability", type: "liability" },
      { code: "2100", name: "Deferred Revenue", type: "liability" },
      { code: "2500", name: "Federal Income Tax Payable", type: "liability" },
      { code: "2510", name: "State Income Tax Payable", type: "liability" },
      { code: "2600", name: "Notes Payable — Founder / Insider Loans", type: "liability" },

      // Balance sheet — equity (C-corp)
      { code: "3000", name: "Common Stock", type: "equity" },
      { code: "3010", name: "Additional Paid-In Capital (APIC)", type: "equity" },
      { code: "3100", name: "Retained Earnings", type: "equity" },
    ],
  },

  "agency": {
    id: "agency",
    name: "Agency / Services",
    description: "Billable hours, contractor pass-through, client expense reimbursements.",
    accounts: [
      { code: "4000", name: "Service Revenue", type: "revenue" },
      { code: "4100", name: "Reimbursable Expenses (Revenue)", type: "revenue" },
      { code: "5000", name: "Subcontractor Costs", type: "expense" },
      { code: "5100", name: "Reimbursable Expenses (Cost)", type: "expense" },
      { code: "5200", name: "Marketing — Paid Ads", type: "expense", suggestedMonthlyCapCents: 100000 },
      { code: "6000", name: "Salaries & Payroll", type: "expense" },
      { code: "7000", name: "Software Subscriptions", type: "expense" },
      { code: "7100", name: "Office / Rent", type: "expense" },
      { code: "7500", name: "Travel & Client Entertainment", type: "expense" },
      { code: "7900", name: "Miscellaneous", type: "expense" },
      { code: "1000", name: "Operating Cash", type: "asset" },
      { code: "1100", name: "Credit Card Liability", type: "liability" },
      { code: "3000", name: "Owner Contributions", type: "equity" },
    ],
  },

  "real-estate-operator": {
    id: "real-estate-operator",
    name: "Real Estate Operator",
    description: "Rental income, property-level expenses, capex vs. opex split.",
    accounts: [
      { code: "4000", name: "Rental Income", type: "revenue" },
      { code: "4100", name: "Other Property Income", type: "revenue" },
      { code: "5000", name: "Property Management Fees", type: "expense" },
      { code: "5100", name: "Repairs & Maintenance", type: "expense" },
      { code: "5200", name: "Utilities", type: "expense" },
      { code: "5300", name: "Property Taxes", type: "expense" },
      { code: "5400", name: "Insurance — Property", type: "expense" },
      { code: "5500", name: "Mortgage Interest", type: "expense" },
      { code: "5600", name: "HOA / Association Dues", type: "expense" },
      { code: "6000", name: "Salaries", type: "expense" },
      { code: "7000", name: "Software & Tools", type: "expense" },
      { code: "7900", name: "Miscellaneous", type: "expense" },
      { code: "1000", name: "Operating Cash", type: "asset" },
      { code: "1500", name: "Property Capex (Buildings & Improvements)", type: "asset" },
      { code: "2000", name: "Mortgage Payable", type: "liability" },
      { code: "3000", name: "Owner Contributions", type: "equity" },
    ],
  },

  "minimal": {
    id: "minimal",
    name: "Minimal (Custom)",
    description: "Bare-bones set — Revenue, Expenses, Cash, Owner Contributions. Build the rest yourself.",
    accounts: [
      { code: "4000", name: "Revenue", type: "revenue" },
      { code: "5000", name: "Expenses", type: "expense" },
      { code: "1000", name: "Operating Cash", type: "asset" },
      { code: "3000", name: "Owner Contributions", type: "equity" },
    ],
  },
};

function listTemplates() {
  return Object.values(COA_TEMPLATES).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    accountCount: t.accounts.length,
  }));
}

function getTemplate(id) {
  return COA_TEMPLATES[id] || null;
}

module.exports = { COA_TEMPLATES, listTemplates, getTemplate };
