"use strict";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

async function sendViaSendGrid({ to, cc, replyTo, subject, htmlBody, textBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping email");
    return;
  }
  const personalization = { to: [{ email: to }] };
  if (cc && cc.length) personalization.cc = (Array.isArray(cc) ? cc : [cc]).map((e) => ({ email: e }));
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [personalization],
      from: { email: "alex@sociii.ai", name: "Alex — SOCIII" },
      reply_to: replyTo ? { email: replyTo } : { email: "sean@sociii.ai", name: "Sean Combs" },
      subject,
      content: [
        ...(textBody ? [{ type: "text/plain", value: textBody }] : []),
        ...(htmlBody ? [{ type: "text/html", value: htmlBody }] : []),
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("SendGrid error:", res.status, errText);
  }
}

function isInvestorLead(vertical, source) {
  const v = String(vertical || "").toLowerCase();
  const s = String(source || "").toLowerCase();
  return v === "investor" || v === "investors" || s.includes("investor");
}

async function notifySean({ name, email, company, vertical, source, message, score, leadId }) {
  const investor = isInvestorLead(vertical, source);
  const tag = investor ? "INVESTOR INQUIRY" : "New Lead";
  const subject = `${tag}: ${name || email} — ${vertical || source || "general"} — Score: ${score}`;
  const textLines = [
    `${tag}:`,
    `  Name: ${name || "(not provided)"}`,
    `  Email: ${email}`,
    `  Company: ${company || "(not provided)"}`,
    `  Vertical: ${vertical || "(not specified)"}`,
    `  Source: ${source || "(not specified)"}`,
    `  Score: ${score}/100`,
    `  Lead ID: ${leadId}`,
  ];
  if (message) {
    textLines.push("", "  Message:", `  ${String(message).split("\n").join("\n  ")}`);
  }
  textLines.push("", `View in Command Center: https://app.sociii.ai/admin`);
  const textBody = textLines.join("\n");

  if (investor) {
    // Investor inquiries route to Kent with Alex CC'd; replies go to the prospect.
    await sendViaSendGrid({
      to: "kent@sociii.ai",
      cc: ["alex@sociii.ai"],
      replyTo: email,
      subject,
      textBody,
    });
  } else {
    await sendViaSendGrid({ to: "sean@sociii.ai", subject, textBody });
  }
}

async function sendInvestorAutoReply({ name, email }) {
  const firstName = name ? name.split(" ")[0] : "there";
  const subject = "Thanks for reaching out — SOCIII materials";
  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Thanks for the interest in SOCIII. The fastest way to get the platform thesis is the public whitepaper — it covers the architecture, the four-tier RAAS rules engine, the audit trail, and where it runs today.
  </p>
  <div style="margin: 28px 0;">
    <a href="https://sociii.ai/whitepaper" style="display: inline-block; padding: 14px 28px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
      Read the SOCIII Whitepaper →
    </a>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Kent Redwine (our Cofounder Advisor on capital formation) will follow up shortly with the investor deck and a calendar link. He runs point on our round; I'm copied on the thread.
  </p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex<br/><span style="color: #64748b; font-size: 14px;">Chief of Staff, SOCIII</span></p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. — Delaware C-Corporation, Las Vegas, Nevada · <a href="https://sociii.ai" style="color: #94a3b8;">sociii.ai</a></p>
  </div>
</div>`;
  await sendViaSendGrid({ to: email, subject, htmlBody });
}

async function sendWelcomeEmail({ name, email, vertical }) {
  const firstName = name ? name.split(" ")[0] : "there";
  const verticalName = {
    auto: "auto dealership",
    "title-escrow": "title and escrow",
    "property-management": "property management",
    developers: "developer",
    pilot: "aviation",
  }[vertical] || "";

  const subject = "Welcome to SOCIII";
  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Thanks for your interest in SOCIII${verticalName ? " for " + verticalName : ""}. I'm Alex, and I'll be your point of contact.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Here's what you should know upfront:</p>
  <ul style="font-size: 16px; color: #1a202c; line-height: 1.8; padding-left: 20px;">
    <li>Start free — no credit card required</li>
    <li>60-day money-back guarantee, no questions asked</li>
    <li>Cancel anytime — one click, no friction</li>
    <li>Your data is always yours — export anytime</li>
  </ul>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">I'll follow up in a day or two to see how I can help. In the meantime, feel free to reply to this email — it goes straight to a real person.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. | Start Free. 60-Day Money Back. Your Data Is Always Yours.</p>
  </div>
</div>`;

  await sendViaSendGrid({ to: email, subject, htmlBody });
}

async function sendConnectOnboardingEmail({ email, name, onboardingUrl, workerName }) {
  const firstName = name ? name.split(" ")[0] : "there";
  const subject = "Set up payouts for your Digital Worker";
  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your Digital Worker${workerName ? " — " + workerName + " —" : ""} has been approved and is live on the marketplace.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">To start receiving payouts, set up your payment account. Here is how it works:</p>
  <ul style="font-size: 16px; color: #1a202c; line-height: 1.8; padding-left: 20px;">
    <li>You receive 75% of every subscription</li>
    <li>SOCIII receives 25% as a platform fee</li>
    <li>Payouts are weekly (every Monday), minimum $50</li>
    <li>Stripe handles tax forms and compliance</li>
  </ul>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    <a href="${onboardingUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Set Up Payouts</a>
  </p>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">Your worker is already live — any earnings before you complete setup will be held and paid out once your account is ready.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. | Start Free. 60-Day Money Back. Your Data Is Always Yours.</p>
  </div>
</div>`;

  await sendViaSendGrid({ to: email, subject, htmlBody });
}

module.exports = { notifySean, sendWelcomeEmail, sendViaSendGrid, sendConnectOnboardingEmail, sendInvestorAutoReply, isInvestorLead };
