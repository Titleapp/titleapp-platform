import React, { useState } from "react";

const POSITIONS = [
  { id: 1, company: "NovaTech Corp", ticker: "NVTC", shares: 15000, avgCost: 52.40, currentPrice: 68.20, sector: "Technology" },
  { id: 2, company: "Meridian Healthcare", ticker: "MHCI", shares: 8000, avgCost: 142.00, currentPrice: 148.50, sector: "Healthcare" },
  { id: 3, company: "Sentinel Defense", ticker: "SNTL", shares: 12000, avgCost: 38.60, currentPrice: 44.80, sector: "Industrials" },
  { id: 4, company: "ClearView Analytics", ticker: "CVWA", shares: 20000, avgCost: 28.10, currentPrice: 34.75, sector: "Technology" },
  { id: 5, company: "Atlas Capital Group", ticker: "ATLC", shares: 5000, avgCost: 186.00, currentPrice: 192.40, sector: "Financial Services" },
  { id: 6, company: "Summit Energy Partners", ticker: "SMEP", shares: 18000, avgCost: 24.80, currentPrice: 22.60, sector: "Energy" },
  { id: 7, company: "Apex Industries", ticker: "APXI", shares: 10000, avgCost: 61.20, currentPrice: 78.90, sector: "Industrials" },
  { id: 8, company: "Pacific Rim Holdings", ticker: "PCRM", shares: 7500, avgCost: 95.00, currentPrice: 102.30, sector: "Real Estate" },
  { id: 9, company: "TechBridge Solutions", ticker: "TBSG", shares: 25000, avgCost: 18.40, currentPrice: 21.85, sector: "Technology" },
  { id: 10, company: "Granite Financial", ticker: "GRNT", shares: 6000, avgCost: 112.50, currentPrice: 118.20, sector: "Financial Services" },
  { id: 11, company: "Velocity Motors", ticker: "VLCM", shares: 14000, avgCost: 44.20, currentPrice: 46.80, sector: "Consumer" },
  { id: 12, company: "BioGenesis Pharma", ticker: "BGNP", shares: 9000, avgCost: 76.30, currentPrice: 82.10, sector: "Healthcare" },
  { id: 13, company: "CloudStack Inc", ticker: "CLSK", shares: 22000, avgCost: 14.60, currentPrice: 17.40, sector: "Technology" },
  { id: 14, company: "Eagle Materials", ticker: "EGLM", shares: 11000, avgCost: 31.80, currentPrice: 29.50, sector: "Industrials" },
  { id: 15, company: "Horizon Renewables", ticker: "HRZN", shares: 16000, avgCost: 22.10, currentPrice: 25.60, sector: "Energy" },
  { id: 16, company: "DataPulse Systems", ticker: "DPLS", shares: 30000, avgCost: 8.90, currentPrice: 11.20, sector: "Technology" },
  { id: 17, company: "Sterling Insurance", ticker: "STRL", shares: 4500, avgCost: 198.00, currentPrice: 204.50, sector: "Financial Services" },
  { id: 18, company: "Coastal Properties", ticker: "CPTI", shares: 8500, avgCost: 54.20, currentPrice: 51.80, sector: "Real Estate" },
  { id: 19, company: "Nexus Biotech", ticker: "NXBT", shares: 13000, avgCost: 42.50, currentPrice: 48.90, sector: "Healthcare" },
  { id: 20, company: "Iron Ridge Mining", ticker: "IRDG", shares: 20000, avgCost: 16.40, currentPrice: 15.20, sector: "Energy" },
  { id: 21, company: "Quantum Computing", ticker: "QCMP", shares: 35000, avgCost: 6.80, currentPrice: 9.40, sector: "Technology" },
  { id: 22, company: "MedTech Devices", ticker: "MDTD", shares: 7000, avgCost: 88.60, currentPrice: 91.30, sector: "Healthcare" },
  { id: 23, company: "Premier Logistics", ticker: "PRLG", shares: 9500, avgCost: 56.80, currentPrice: 62.40, sector: "Industrials" },
];

const CASH_AVAILABLE = 3200000;

export default function Portfolio() {
  const [sortField, setSortField] = useState("value");
  const [sortDir, setSortDir] = useState("desc");

  const enriched = POSITIONS.map(p => {
    const value = p.shares * p.currentPrice;
    const cost = p.shares * p.avgCost;
    const pl = value - cost;
    const plPct = ((pl / cost) * 100).toFixed(1);
    return { ...p, value, cost, pl, plPct: parseFloat(plPct) };
  });

  const totalValue = enriched.reduce((s, p) => s + p.value, 0);
  const totalCost = enriched.reduce((s, p) => s + p.cost, 0);
  const totalPL = totalValue - totalCost;
  const totalReturn = ((totalPL / totalCost) * 100).toFixed(1);
  const portfolioTotal = totalValue + CASH_AVAILABLE;

  const sorted = [...enriched].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const topPerformers = [...enriched].sort((a, b) => b.plPct - a.plPct).slice(0, 3);
  const bottomPerformers = [...enriched].sort((a, b) => a.plPct - b.plPct).slice(0, 3);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Portfolio</h1>
          <p className="subtle">Active positions and performance tracking</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Portfolio Value</div>
          <div className="kpiValue">${(portfolioTotal / 1000000).toFixed(1)}M</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Active Positions</div>
          <div className="kpiValue">{POSITIONS.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Total P&L</div>
          <div className="kpiValue" style={{ color: totalPL >= 0 ? "#16a34a" : "#dc2626" }}>
            {totalPL >= 0 ? "+" : ""}${(totalPL / 1000000).toFixed(2)}M ({totalReturn}%)
          </div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Cash Available</div>
          <div className="kpiValue">${(CASH_AVAILABLE / 1000000).toFixed(1)}M</div>
        </div>
      </div>

      {/* Top / Bottom performers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "12px" }}>Top Performers</div>
          {topPerformers.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{p.company}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{p.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: "#16a34a" }}>+{p.plPct}%</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>+${p.pl.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "12px" }}>Bottom Performers</div>
          {bottomPerformers.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{p.company}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{p.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: p.plPct >= 0 ? "#16a34a" : "#dc2626" }}>{p.plPct >= 0 ? "+" : ""}{p.plPct}%</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{p.pl >= 0 ? "+" : ""}${p.pl.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Positions Table */}
      <div className="card" style={{ marginTop: "14px" }}>
        <div className="cardHeader">
          <div className="cardTitle">All Positions</div>
        </div>
        <div className="tableWrap">
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Ticker</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("shares")}>Shares</th>
                <th>Avg Cost</th>
                <th>Current</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("pl")}>P&L</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("value")}>% of Portfolio</th>
                <th>Sector</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const pctPortfolio = ((p.value / portfolioTotal) * 100).toFixed(1);
                return (
                  <tr key={p.id}>
                    <td className="tdStrong">{p.company}</td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{p.ticker}</td>
                    <td>{p.shares.toLocaleString()}</td>
                    <td>${p.avgCost.toFixed(2)}</td>
                    <td>${p.currentPrice.toFixed(2)}</td>
                    <td style={{ fontWeight: 600, color: p.pl >= 0 ? "#16a34a" : "#dc2626" }}>
                      {p.pl >= 0 ? "+" : ""}${p.pl.toLocaleString()} ({p.plPct}%)
                    </td>
                    <td>{pctPortfolio}%</td>
                    <td>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#f1f5f9", color: "#475569" }}>
                        {p.sector}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
