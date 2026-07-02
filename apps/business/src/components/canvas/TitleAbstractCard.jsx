/**
 * TitleAbstractCard.jsx — TITLE-ABSTRACT-001 (real-estate title/ownership).
 * Signal: card:title-abstract   Data: live (GET /v1/title-abstract:list)
 *
 * Renders a real title abstract from the tenant's records: parcel header,
 * current owner + vesting, chain of title, liens/encumbrances, easements,
 * and standard exceptions. payload.view = abstract | chain | liens
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const money = (n) => (n == null ? "—" : "$" + Number(n).toLocaleString());

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function PropertyMap({ address }) {
  if (!MAPS_KEY || !address) return null;
  const src = `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(address)}&zoom=16&maptype=satellite`;
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 14, border: "1px solid #e2e8f0" }}>
      <iframe
        title="Property location"
        src={src}
        width="100%"
        height="200"
        style={{ display: "block", border: "none" }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function Header({ a }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
      <PropertyMap address={a.property_address} />
      <div style={{ background: "linear-gradient(135deg,#f0f9ff,#eff6ff)", padding: "14px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5 }}>Title Abstract</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{a.property_address}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {a.tmk ? `TMK ${a.tmk}` : ""}{a.county ? ` · ${a.county} County, ${a.state || ""}` : ""}{a.zoning ? ` · ${a.zoning}` : ""}
        </div>
      </div>
      <div style={{ padding: "14px 18px", display: "flex", gap: 26, flexWrap: "wrap" }}>
        {[["Current owner", a.current_owner], ["Land area", a.land_area_sqft ? `${a.land_area_sqft.toLocaleString()} sqft` : null],
          ["Assessed value", a.assessed_value_usd ? money(a.assessed_value_usd) : null], ["Tax status", a.tax_status]]
          .map(([l, v]) => v && (
            <div key={l}><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{v}</div></div>
          ))}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function ChainRows({ chain }) {
  return (chain || []).map((c, i) => (
    <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 12, color: "#94a3b8", width: 84, flexShrink: 0 }}>{c.date}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#1e293b" }}><b>{c.grantor}</b> → <b>{c.grantee}</b></div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.instrument}{c.doc_number ? ` · #${c.doc_number}` : ""}</div>
      </div>
    </div>
  ));
}

function LienRows({ liens }) {
  return (liens || []).map((l, i) => {
    const open = /open/i.test(l.status || "");
    return (
      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{l.type}{l.holder ? ` — ${l.holder}` : ""}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{l.recorded ? `recorded ${l.recorded}` : ""}{l.doc_number ? ` · #${l.doc_number}` : ""}</div>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          {l.amount_usd ? <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{money(l.amount_usd)}</div> : null}
          <div style={{ fontSize: 11, fontWeight: 700, color: open ? "#b45309" : "#16a34a" }}>{l.status}</div>
        </div>
      </div>
    );
  });
}

export default function TitleAbstractCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const a = p.abstract || (Array.isArray(p.abstracts) ? p.abstracts[0] : null);
  const view = p.view || "abstract";
  if (!a) {
    return (
      <CanvasCardShell title="Title Abstract" emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>No abstract on file yet. Ask the worker to look up a property you have records for.</div>
      </CanvasCardShell>
    );
  }
  return (
    <CanvasCardShell title={p.title || "Title Abstract"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      <Header a={a} />
      {(view === "abstract" || view === "chain") && (
        <Section title="Chain of title"><ChainRows chain={a.chain_of_title} /></Section>
      )}
      {(view === "abstract" || view === "liens") && (
        <Section title="Liens & encumbrances"><LienRows liens={a.liens_encumbrances} /></Section>
      )}
      {view === "abstract" && (
        <>
          {Array.isArray(a.easements) && a.easements.length > 0 && (
            <Section title="Easements">
              {a.easements.map((e, i) => <div key={i} style={{ fontSize: 13, color: "#475569", padding: "4px 0" }}><b>{e.type}</b> — {e.description}</div>)}
            </Section>
          )}
          {a.legal_description && (
            <Section title="Legal description"><div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{a.legal_description}</div></Section>
          )}
          {Array.isArray(a.exceptions) && a.exceptions.length > 0 && (
            <Section title="Standard exceptions">
              {a.exceptions.map((x, i) => <div key={i} style={{ fontSize: 12, color: "#64748b", padding: "3px 0" }}>• {x}</div>)}
            </Section>
          )}
          {a.disclaimer && <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 6 }}>{a.disclaimer}</div>}
        </>
      )}
    </CanvasCardShell>
  );
}
