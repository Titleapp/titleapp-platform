/**
 * ChartOfAccountsCard.jsx — Chart of Accounts canvas card (44.9)
 * Signal: card:accounting-coa
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  group: { marginBottom: 16 },
  groupTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  row: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f8fafc", fontSize: 13 },
  code: { color: "#9ca3af", fontWeight: 500, width: 50, flexShrink: 0 },
  name: { flex: 1, color: "#1e293b", paddingLeft: 8 },
  balance: { fontWeight: 600, color: "#1e293b", flexShrink: 0 },
};

export default function ChartOfAccountsCard({ resolved, context, onDismiss }) {
  const accounts = context?.chartOfAccounts || null;

  // Group by account type
  const groups = {};
  if (accounts) {
    for (const acct of accounts) {
      const type = acct.type || "Other";
      if (!groups[type]) groups[type] = [];
      groups[type].push(acct);
    }
  }

  return (
    <CanvasCardShell
      title="Chart of Accounts"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex to categorize your transactions to see your Chart of Accounts here."}
      onDismiss={onDismiss}
    >
      {accounts && Object.entries(groups).map(([type, accts]) => (
        <div key={type} style={S.group}>
          <div style={S.groupTitle}>{type}</div>
          {accts.map((a, i) => (
            <div key={i} style={S.row}>
              <span style={S.code}>{a.code || ""}</span>
              <span style={S.name}>{a.name}</span>
              {a.balance != null && <span style={S.balance}>${a.balance.toLocaleString()}</span>}
            </div>
          ))}
        </div>
      ))}
    </CanvasCardShell>
  );
}
