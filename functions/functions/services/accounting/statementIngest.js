// Statement PDF ingestion.
//
// Phase B of the Accounting controller build. Drop a credit-card / PayPal /
// bank statement PDF in Drive, this service hands it to Claude with native
// PDF support and gets back structured transactions. We then run a second
// pass to map each transaction to a CoA category based on the tenant's
// current Chart of Accounts.
//
// Why Claude vision and not a parser library: real-world statements vary
// wildly by issuer (American Express, Mercury, Chase, PayPal, Apple Card,
// Stripe payout statement). A model that can read the layout is more
// resilient than a per-issuer regex/template approach.

const admin = require("firebase-admin");

const STORAGE_BUCKET =
  process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";

function getDb() { return admin.firestore(); }
function getBucket() { return admin.storage().bucket(STORAGE_BUCKET); }

const EXTRACT_SYSTEM = `You read U.S. financial statements (credit card, debit card, bank checking, PayPal, Stripe payout) and extract every line-item transaction. Call the submit_statement tool with the extracted data.

RULES:
- Money values are in cents. $12.34 → 1234. ALWAYS positive integers, paired with direction. NEVER use negative numbers.
- A "credit" on a credit-card statement means a refund/payment to the card (money in your favor). A "debit" is a purchase.
- For a checking-account statement, "debit" = withdrawal/spend, "credit" = deposit.
- Do not include subtotals, page headers, balance forward lines, or interest-rate footnotes — only actual transactions.
- If you cannot parse the date, omit that transaction rather than guessing.
- If the statement is illegible or contains no transactions, submit transactions: [].
- Extract EVERY transaction. Do not abbreviate, do not stop early. Multi-month statements may have hundreds of transactions; submit them all.`;

const EXTRACT_TOOL = {
  name: "submit_statement",
  description: "Submit the extracted statement metadata and all transactions.",
  input_schema: {
    type: "object",
    properties: {
      institution: { type: "string", description: "Best-guess institution name (American Express, Mercury, Chase, PayPal, etc.). Empty string if unknown." },
      accountLast4: { type: "string", description: "Last 4 digits of the account/card. Empty string if not present." },
      periodStart: { type: "string", description: "Statement period start in YYYY-MM-DD. Empty string if unknown." },
      periodEnd: { type: "string", description: "Statement period end in YYYY-MM-DD. Empty string if unknown." },
      transactions: {
        type: "array",
        description: "Every line-item transaction in the statement, in chronological order if possible.",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "Transaction date in YYYY-MM-DD." },
            description: { type: "string", description: "Merchant or counterparty as printed on the statement." },
            amountCents: { type: "integer", description: "Absolute amount in cents (positive integer)." },
            direction: { type: "string", enum: ["debit", "credit"], description: "debit = spend, credit = refund/inflow." },
          },
          required: ["date", "description", "amountCents", "direction"],
        },
      },
    },
    required: ["transactions"],
  },
};

async function loadFileBytes({ fileId, tenantId }) {
  const fileDoc = await getDb().doc(`storageObjects/${fileId}`).get();
  if (!fileDoc.exists) throw new Error(`File not found: ${fileId}`);
  const f = fileDoc.data();
  if (f.orgId && f.orgId !== tenantId) throw new Error("File belongs to a different workspace");
  const storagePath = f.storagePath || f.path;
  if (!storagePath) throw new Error("File has no storage path");
  const [buf] = await getBucket().file(storagePath).download();
  return {
    buffer: buf,
    contentType: f.mimeType || f.contentType || "application/pdf",
    name: f.filename || f.name || "statement.pdf",
  };
}

async function extractTransactions({ anthropic, buffer, contentType, name }) {
  const base64 = buffer.toString("base64");
  const isPdf = (contentType || "").toLowerCase().includes("pdf");
  if (!isPdf) {
    throw new Error("Only PDF statements are supported in this version. CSV ingestion ships later.");
  }
  // Tool-use mode + high max_tokens because real PayPal/AmEx statements can run
  // hundreds of transactions. The SDK enforces JSON validity for tool inputs,
  // so a partial response shows up as stop_reason="max_tokens" rather than a
  // malformed string we'd have to repair.
  const t0 = Date.now();
  console.log(`[statementIngest] extractTransactions start: ${name} (${buffer.length} bytes, base64 ${base64.length})`);
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16384,
    system: EXTRACT_SYSTEM,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "submit_statement" },
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: `Extract every transaction from the attached statement (${name}). Call submit_statement with the full list — do not stop early.` },
      ],
    }],
  });
  console.log(`[statementIngest] extractTransactions done in ${Date.now() - t0}ms stop_reason=${res.stop_reason}`);
  const toolBlock = res.content.find(b => b.type === "tool_use" && b.name === "submit_statement");
  if (!toolBlock) {
    throw new Error("Model did not return statement data. Try a clearer PDF or split a long statement into single-month files.");
  }
  const input = toolBlock.input || {};
  return {
    institution: input.institution || null,
    accountLast4: input.accountLast4 || null,
    periodStart: input.periodStart || null,
    periodEnd: input.periodEnd || null,
    transactions: Array.isArray(input.transactions) ? input.transactions : [],
    _truncated: res.stop_reason === "max_tokens",
  };
}

async function loadCoa(tenantId) {
  const snap = await getDb().collection("coaAccounts")
    .where("tenantId", "==", tenantId)
    .limit(500)
    .get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.status !== "archived");
}

const CATEGORIZE_TOOL = {
  name: "submit_categories",
  description: "Submit a category + classification for each transaction.",
  input_schema: {
    type: "object",
    properties: {
      assignments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            classification: {
              type: "string",
              enum: ["expense", "revenue", "internal_transfer", "refund", "fee"],
              description: "expense=third-party spend. revenue=customer income. internal_transfer=money moving between OWN accounts (bank↔PayPal, card payment from bank). refund=reversal of a prior charge. fee=bank/processor fee.",
            },
            coaAccountId: {
              type: "string",
              description: "Required for classification=expense or revenue. Empty string for internal_transfer/refund/fee unless a specific category clearly applies.",
            },
            confidence: {
              type: "number",
              description: "0.0–1.0 confidence in BOTH the classification and category. 0.95+ for obvious (e.g. 'AWS' → Firebase/GCP); 0.7 for fuzzy; <0.5 if you really don't know.",
            },
            note: {
              type: "string",
              description: "Optional short note when classification needs human review (e.g. 'might be transfer to credit card — confirm').",
            },
          },
          required: ["index", "classification", "coaAccountId", "confidence"],
        },
      },
    },
    required: ["assignments"],
  },
};

async function categorize({ anthropic, transactions, coa, tenantId }) {
  if (!transactions.length || !coa.length) return transactions;
  const candidates = coa.filter(a => ["expense", "revenue"].includes(a.type));
  if (!candidates.length) return transactions;

  // Find the Miscellaneous Expenses fallback up-front so we can stamp it on
  // anything the model leaves blank.
  const miscFallback = candidates.find(c => /miscellaneous/i.test(c.name) && c.type === "expense");

  // Pull connected accounts so we can tell the model "these are the user's
  // OWN accounts — payments to/from them are internal transfers, not
  // expenses." This is the key signal that prevents counting a card
  // payment as $500 of spend.
  let connectedAccountsHint = "";
  if (tenantId) {
    try {
      const snap = await getDb().collection("connectedAccounts").where("tenantId", "==", tenantId).get();
      const own = snap.docs.map(d => d.data()).filter(a => a.status !== "deleted");
      if (own.length > 0) {
        connectedAccountsHint = own.map(a => {
          const last4 = a.last4 ? ` ••${a.last4}` : "";
          return `  - ${a.name}${last4} (${a.type}${a.institution ? `, ${a.institution}` : ""})`;
        }).join("\n");
      }
    } catch (_) { /* non-fatal */ }
  }

  // Chunk to keep individual calls under the output token cap. 80 transactions
  // per batch ≈ ~3–4K output tokens, well under 16K.
  const CHUNK_SIZE = 80;
  const catList = candidates.map(c => `${c.id}\t${c.name} (${c.type})`).join("\n");
  const out = [...transactions];

  for (let start = 0; start < transactions.length; start += CHUNK_SIZE) {
    const slice = transactions.slice(start, start + CHUNK_SIZE);
    const lines = slice.map((t, i) => `${i}\t${t.date}\t${t.direction}\t${(t.amountCents / 100).toFixed(2)}\t${t.description}`).join("\n");
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      system: `You classify and categorize financial transactions against a Chart of Accounts. For each line you decide BOTH:
1. Classification: expense | revenue | internal_transfer | refund | fee
2. Which CoA category it lands in (when applicable)

INTERNAL TRANSFER DETECTION — critical, do not get this wrong:
- A payment from a bank to the SAME OWNER's credit card is a transfer, not an expense.
- "Bank Deposit to PP Account", "Deposit to PayPal Account", "Transfer from Mercury" → internal_transfer.
- "Payment to PayPal Cashback Mastercard", "Credit Card Payment to AmEx" → internal_transfer.
- "Buyer Credit Payment" or "Backup Transfer to Bank" on a PayPal statement → internal_transfer.
- ANY line where the counterparty matches the user's own connected accounts → internal_transfer.
- Internal transfers should have coaAccountId="" — they're balance-sheet moves, not P&L items.

REFUND DETECTION:
- A credit on a credit-card statement matching a prior charge merchant → refund.
- "Refund from <merchant>", "<merchant> Refund" → refund.
- coaAccountId should point at the same expense category as the original charge so it offsets cleanly.

FEE DETECTION:
- "Foreign Transaction Fee", "Interest Charge", "Late Fee", processor fees → fee.
- Map to "Banking & Payment Processing Fees" category.

EXPENSE / REVENUE — when classification is expense or revenue, you MUST assign a coaAccountId. If nothing fits, use the Miscellaneous Expenses category. Never leave coaAccountId blank for expense/revenue.

Confidence: be honest. 0.95+ for obvious vendor matches. 0.7 for plausible. <0.5 if you really can't tell — and leave a note explaining why.`,
      tools: [CATEGORIZE_TOOL],
      tool_choice: { type: "tool", name: "submit_categories" },
      messages: [{
        role: "user",
        content: `USER'S OWN CONNECTED ACCOUNTS (anything matching these is an internal_transfer):
${connectedAccountsHint || "  (none on file — only flag obvious self-transfer language like 'Bank Deposit to ... Account', 'Payment to ... Mastercard', 'Buyer Credit Payment')"}

CATEGORIES available (id<TAB>name):
${catList}

TRANSACTIONS (index<TAB>date<TAB>direction<TAB>amount<TAB>description):
${lines}

Submit one assignment per transaction. Marketing tools → Marketing categories. Cloud infra → Infrastructure. AI APIs (OpenAI, Anthropic, Replicate) → AI/Model Costs. SaaS subs (Slack, Notion, Linear, Figma) → Software Subscriptions. Restaurants/airfare → Travel & Entertainment. Stripe / PayPal processor fees → fee + Banking & Payment Processing Fees category.`,
      }],
    });
    const toolBlock = res.content.find(b => b.type === "tool_use" && b.name === "submit_categories");
    const assignments = (toolBlock?.input?.assignments) || [];
    assignments.forEach(a => {
      const globalIdx = start + a.index;
      if (globalIdx >= out.length) return;
      const patch = {
        classification: a.classification || "expense",
        coaConfidence: typeof a.confidence === "number" ? a.confidence : null,
        reviewNote: a.note || null,
      };
      // Always stamp something for expense/revenue. Fall back to Miscellaneous.
      if ((patch.classification === "expense" || patch.classification === "revenue") && !a.coaAccountId && miscFallback) {
        patch.coaAccountId = miscFallback.id;
        patch.coaConfidence = Math.min(patch.coaConfidence || 0.4, 0.4);
        patch.reviewNote = patch.reviewNote || "auto-fallback to Miscellaneous — please verify";
      } else if (a.coaAccountId) {
        patch.coaAccountId = a.coaAccountId;
      }
      out[globalIdx] = { ...out[globalIdx], ...patch };
    });
  }
  return out;
}

async function parseStatement({ anthropic, fileId, tenantId }) {
  const tStart = Date.now();
  console.log(`[statementIngest] parseStatement start: fileId=${fileId} tenant=${tenantId}`);
  const { buffer, contentType, name } = await loadFileBytes({ fileId, tenantId });
  console.log(`[statementIngest] file loaded: ${name} (${buffer.length} bytes, ${contentType}) in ${Date.now() - tStart}ms`);
  const extracted = await extractTransactions({ anthropic, buffer, contentType, name });
  console.log(`[statementIngest] extracted ${extracted.transactions.length} transactions`);
  const coa = await loadCoa(tenantId);
  const tCat = Date.now();
  const categorized = await categorize({ anthropic, transactions: extracted.transactions, coa, tenantId });
  console.log(`[statementIngest] categorize done in ${Date.now() - tCat}ms · total parse ${Date.now() - tStart}ms`);
  return {
    fileId,
    fileName: name,
    institution: extracted.institution || null,
    accountLast4: extracted.accountLast4 || null,
    periodStart: extracted.periodStart || null,
    periodEnd: extracted.periodEnd || null,
    transactions: categorized,
    truncated: !!extracted._truncated,
  };
}

async function commitTransactions({ tenantId, userId, fileId, fileName, institution, accountLast4, transactions }) {
  if (!transactions || !transactions.length) return { written: 0 };
  const db = getDb();
  // Cap batch size — Firestore allows 500 writes per batch.
  const CHUNK = 400;
  let written = 0;
  for (let i = 0; i < transactions.length; i += CHUNK) {
    const slice = transactions.slice(i, i + CHUNK);
    const batch = db.batch();
    slice.forEach(t => {
      const ref = db.collection("transactions").doc();
      batch.set(ref, {
        tenantId,
        date: t.date || null,
        description: t.description || null,
        amountCents: typeof t.amountCents === "number" ? t.amountCents : 0,
        direction: t.direction || "debit",
        classification: t.classification || "expense",
        coaAccountId: t.coaAccountId || null,
        coaConfidence: typeof t.coaConfidence === "number" ? t.coaConfidence : null,
        reviewNote: t.reviewNote || null,
        source: "statement",
        sourceFileId: fileId,
        sourceFileName: fileName || null,
        institution: institution || null,
        accountLast4: accountLast4 || null,
        // committed when the user explicitly accepts; review otherwise.
        status: t._committedDirect ? "committed" : "review",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: userId,
      });
    });
    await batch.commit();
    written += slice.length;
  }
  return { written };
}

module.exports = { parseStatement, commitTransactions, loadCoa };
