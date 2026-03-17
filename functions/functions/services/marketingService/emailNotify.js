"use strict";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

async function sendViaSendGrid({ to, subject, htmlBody, textBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping email");
    return;
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
      reply_to: { email: "sean@titleapp.ai", name: "Sean Combs" },
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

async function notifySean({ name, email, company, vertical, score, leadId }) {
  const subject = `New Lead: ${name || email} — ${vertical || "general"} — Score: ${score}`;
  const textBody = [
    `New lead captured:`,
    `  Name: ${name || "(not provided)"}`,
    `  Email: ${email}`,
    `  Company: ${company || "(not provided)"}`,
    `  Vertical: ${vertical || "(not specified)"}`,
    `  Score: ${score}/100`,
    `  Lead ID: ${leadId}`,
    ``,
    `View in Command Center: https://app.titleapp.ai/admin`,
  ].join("\n");

  await sendViaSendGrid({ to: "sean@titleapp.ai", subject, textBody });
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

  const subject = "Welcome to TitleApp";
  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Thanks for your interest in TitleApp${verticalName ? " for " + verticalName : ""}. I'm Alex, and I'll be your point of contact.</p>
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
    <p style="font-size: 13px; color: #94a3b8;">TitleApp LLC | Start Free. 60-Day Money Back. Your Data Is Always Yours.</p>
  </div>
</div>`;

  await sendViaSendGrid({ to: email, subject, htmlBody });
}

module.exports = { notifySean, sendWelcomeEmail, sendViaSendGrid };
