import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, getAnalyzedDeals } from "../api/client";

const NEW_VEHICLES = [
  { stock: "N25000", year: 2025, make: "Toyota", model: "Camry LE", trim: "LE", color: "Wind Chill Pearl", mileage: 12, price: 28400, msrp: 28400, daysOnLot: 70, status: "available" },
  { stock: "N25001", year: 2025, make: "Toyota", model: "Camry SE", trim: "SE", color: "Midnight Black", mileage: 8, price: 30200, msrp: 30200, daysOnLot: 45, status: "available" },
  { stock: "N25002", year: 2025, make: "Toyota", model: "Camry XSE", trim: "XSE", color: "Underground", mileage: 5, price: 32800, msrp: 32800, daysOnLot: 22, status: "available" },
  { stock: "N25003", year: 2025, make: "Toyota", model: "Corolla LE", trim: "LE", color: "Celestite", mileage: 10, price: 23500, msrp: 23500, daysOnLot: 55, status: "available" },
  { stock: "N25004", year: 2025, make: "Toyota", model: "Corolla SE", trim: "SE", color: "Blueprint", mileage: 6, price: 25200, msrp: 25200, daysOnLot: 30, status: "available" },
  { stock: "N25005", year: 2025, make: "Toyota", model: "RAV4 XLE", trim: "XLE", color: "Lunar Rock", mileage: 9, price: 34200, msrp: 34200, daysOnLot: 18, status: "available" },
  { stock: "N25006", year: 2025, make: "Toyota", model: "RAV4 XLE Premium", trim: "XLE Premium", color: "Ice Cap", mileage: 4, price: 37500, msrp: 37500, daysOnLot: 12, status: "available" },
  { stock: "N25007", year: 2025, make: "Toyota", model: "Tacoma TRD Sport", trim: "TRD Sport", color: "Magnetic Gray", mileage: 15, price: 42300, msrp: 42300, daysOnLot: 8, status: "available" },
  { stock: "N25008", year: 2025, make: "Toyota", model: "Highlander XLE", trim: "XLE", color: "Celestial Silver", mileage: 7, price: 42900, msrp: 42900, daysOnLot: 25, status: "available" },
  { stock: "N25009", year: 2025, make: "Toyota", model: "Tundra SR5 CrewMax", trim: "SR5", color: "Army Green", mileage: 11, price: 48900, msrp: 48900, daysOnLot: 35, status: "available" },
  { stock: "N25010", year: 2025, make: "Toyota", model: "4Runner TRD Off-Road", trim: "TRD Off-Road", color: "Lunar Rock", mileage: 3, price: 46500, msrp: 46500, daysOnLot: 5, status: "available" },
  { stock: "N25011", year: 2025, make: "Toyota", model: "Prius LE", trim: "LE", color: "Sea Glass Pearl", mileage: 8, price: 29800, msrp: 29800, daysOnLot: 40, status: "available" },
  { stock: "N25012", year: 2025, make: "Toyota", model: "GR86 Premium", trim: "Premium", color: "Track bRED", mileage: 2, price: 33500, msrp: 33500, daysOnLot: 14, status: "available" },
  { stock: "N25013", year: 2025, make: "Toyota", model: "Crown Platinum", trim: "Platinum", color: "Oxygen White", mileage: 6, price: 53400, msrp: 53400, daysOnLot: 50, status: "available" },
  { stock: "N25014", year: 2025, make: "Toyota", model: "Grand Highlander Platinum", trim: "Platinum", color: "Wind Chill Pearl", mileage: 4, price: 55200, msrp: 55200, daysOnLot: 28, status: "available" },
];

const USED_VEHICLES = [
  { stock: "U30000", year: 2021, make: "BMW", model: "X3 xDrive30i", trim: "xDrive30i", color: "Alpine White", mileage: 42500, price: 34169, daysOnLot: 143, status: "available", carfax: "clean", cpo: false },
  { stock: "U30001", year: 2023, make: "Honda", model: "Accord Sport", trim: "Sport", color: "Still Night Pearl", mileage: 18200, price: 28900, daysOnLot: 35, status: "available", carfax: "clean", cpo: false },
  { stock: "U30002", year: 2022, make: "Toyota", model: "Camry SE", trim: "SE", color: "Celestial Silver", mileage: 31000, price: 24500, daysOnLot: 22, status: "available", carfax: "clean", cpo: true },
  { stock: "U30003", year: 2023, make: "Ford", model: "Explorer XLT", trim: "XLT", color: "Agate Black", mileage: 28900, price: 33200, daysOnLot: 86, status: "available", carfax: "minor", cpo: false },
  { stock: "U30004", year: 2022, make: "Mazda", model: "CX-5 Carbon Edition", trim: "Carbon Edition", color: "Polymetal Gray", mileage: 22100, price: 27800, daysOnLot: 15, status: "available", carfax: "clean", cpo: false },
  { stock: "U30005", year: 2023, make: "Subaru", model: "Outback Limited", trim: "Limited", color: "Crystal White Pearl", mileage: 19500, price: 31400, daysOnLot: 44, status: "available", carfax: "clean", cpo: false },
  { stock: "U30006", year: 2022, make: "Hyundai", model: "Tucson SEL", trim: "SEL", color: "Amazon Gray", mileage: 35200, price: 25900, daysOnLot: 28, status: "available", carfax: "clean", cpo: false },
  { stock: "U30007", year: 2021, make: "Toyota", model: "RAV4 XLE", trim: "XLE", color: "Blueprint", mileage: 45800, price: 27200, daysOnLot: 19, status: "available", carfax: "clean", cpo: true },
  { stock: "U30008", year: 2023, make: "Kia", model: "Sportage X-Line", trim: "X-Line", color: "Dawning Red", mileage: 15800, price: 29500, daysOnLot: 55, status: "available", carfax: "clean", cpo: false },
  { stock: "U30009", year: 2022, make: "Chevrolet", model: "Equinox LT", trim: "LT", color: "Summit White", mileage: 38100, price: 22900, daysOnLot: 67, status: "available", carfax: "clean", cpo: false },
  { stock: "U30010", year: 2022, make: "Ford", model: "Explorer XLT", trim: "XLT", color: "Iconic Silver", mileage: 41200, price: 30500, daysOnLot: 126, status: "available", carfax: "minor", cpo: false },
  { stock: "U30011", year: 2023, make: "Nissan", model: "Rogue SV", trim: "SV", color: "Super Black", mileage: 21300, price: 28100, daysOnLot: 32, status: "available", carfax: "clean", cpo: false },
  { stock: "U30012", year: 2021, make: "Toyota", model: "Tacoma SR5", trim: "SR5", color: "Cement", mileage: 52300, price: 31800, daysOnLot: 9, status: "available", carfax: "clean", cpo: true },
  { stock: "U30013", year: 2022, make: "Lexus", model: "NX 250", trim: "250", color: "Eminent White Pearl", mileage: 28700, price: 36900, daysOnLot: 41, status: "available", carfax: "clean", cpo: false },
  { stock: "U30014", year: 2023, make: "Audi", model: "Q5 Premium", trim: "Premium", color: "Mythos Black", mileage: 16400, price: 39800, daysOnLot: 95, status: "available", carfax: "clean", cpo: false },
];

function getDaysColor(days) {
  if (days < 30) return { bg: "#dcfce7", color: "#16a34a", label: "" };
  if (days <= 90) return { bg: "#fef3c7", color: "#d97706", label: "" };
  return { bg: "#fee2e2", color: "#dc2626", label: "AGING" };
}

function AutoInventory() {
  const [activeTab, setActiveTab] = useState("new");
  const vehicles = activeTab === "new" ? NEW_VEHICLES : USED_VEHICLES;

  const totalValue = vehicles.reduce((s, v) => s + v.price, 0);
  const agingCount = vehicles.filter((v) => v.daysOnLot > 90).length;

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Inventory</h1>
          <p className="subtle">New and used vehicle inventory management</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("What vehicles are aging past 90 days and what should we do about them?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          Aging Report
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" }}>
        {[
          { id: "new", label: `New (${NEW_VEHICLES.length})` },
          { id: "used", label: `Used (${USED_VEHICLES.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab.id ? "#7c3aed" : "#64748b",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="kpiRow" style={{ marginBottom: "16px" }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Tab Value</div>
          <div className="kpiValue">${totalValue.toLocaleString()}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Units</div>
          <div className="kpiValue">{vehicles.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Avg Price</div>
          <div className="kpiValue">${Math.round(totalValue / vehicles.length).toLocaleString()}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel" style={{ color: agingCount > 0 ? "#dc2626" : undefined }}>Aging (&gt;90d)</div>
          <div className="kpiValue" style={{ color: agingCount > 0 ? "#dc2626" : undefined }}>{agingCount}</div>
        </div>
      </div>

      {/* Vehicle cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
        {vehicles.map((v) => {
          const days = getDaysColor(v.daysOnLot);
          return (
            <div
              key={v.stock}
              className="card"
              style={{ padding: "16px", cursor: "pointer" }}
              onClick={() => openChat(`Tell me about Stock ${v.stock} -- ${v.year} ${v.make} ${v.model} ${v.trim}. Price: $${v.price.toLocaleString()}. ${v.daysOnLot} days on lot.`)}
            >
              {/* Image placeholder */}
              <div style={{ height: "120px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", color: "#94a3b8", fontSize: "13px" }}>
                {v.year} {v.make} {v.model}
              </div>

              <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "4px" }}>
                {v.year} {v.make} {v.model} {v.trim !== v.model.split(" ").pop() ? v.trim : ""}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                Stock #{v.stock} &middot; {v.color} &middot; {v.mileage.toLocaleString()} mi
              </div>

              {/* Badges row */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                {/* Days on lot */}
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px",
                  background: days.bg, color: days.color,
                }}>
                  {v.daysOnLot}d {days.label}
                </span>

                {/* CARFAX badge (used only) */}
                {v.carfax && (
                  <span style={{
                    fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px",
                    background: v.carfax === "clean" ? "#dcfce7" : "#fef3c7",
                    color: v.carfax === "clean" ? "#16a34a" : "#d97706",
                  }}>
                    CARFAX {v.carfax === "clean" ? "Clean" : "Minor Reported"}
                  </span>
                )}

                {/* CPO badge */}
                {v.cpo && (
                  <span style={{
                    fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px",
                    background: "#fef3c7", color: "#92400e",
                  }}>
                    CPO
                  </span>
                )}
              </div>

              {/* Price */}
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#1e293b" }}>
                ${v.price.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Inventory - Services & Inventory Management
 * Manage products, services, and pricing for the business
 */
export default function Inventory() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";
  const isAnalyst = vertical === "analyst";
  const isAuto = vertical === "auto";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    type: isAnalyst ? "consulting" : "vehicle",
    status: "available",
    metadata: {},
    price: "",
    cost: "",
  });

  // Analyst deals state
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  useEffect(() => {
    if (isAnalyst) {
      loadDeals();
    } else {
      loadInventory();
    }
  }, []);

  async function loadDeals() {
    setDealsLoading(true);
    try {
      const result = await getAnalyzedDeals({ vertical, jurisdiction });
      setDeals(result.deals || []);
    } catch (e) {
      console.warn("Could not load deals for fees page:", e.message);
    } finally {
      setDealsLoading(false);
    }
  }

  async function loadInventory() {
    setLoading(true);
    setError("");
    try {
      const result = await getInventory({ vertical, jurisdiction, type: filterType === "all" ? undefined : filterType });
      setItems(result.items || []);
    } catch (e) {
      setError(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (editingItem) {
        // Update existing item
        await updateInventoryItem({
          vertical,
          jurisdiction,
          id: editingItem.id,
          item: {
            type: formData.type,
            status: formData.status,
            metadata: formData.metadata,
            price: parseFloat(formData.price) || 0,
            cost: parseFloat(formData.cost) || 0,
          },
        });
      } else {
        // Create new item
        await createInventoryItem({
          vertical,
          jurisdiction,
          item: {
            type: formData.type,
            status: formData.status,
            metadata: formData.metadata,
            price: parseFloat(formData.price) || 0,
            cost: parseFloat(formData.cost) || 0,
          },
        });
      }

      // Reload inventory to get updated data from server
      await loadInventory();

      setShowCreateModal(false);
      setEditingItem(null);
      setFormData({ type: isAnalyst ? "consulting" : "vehicle", status: "available", metadata: {}, price: "", cost: "" });
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function handleEdit(item) {
    setEditingItem(item);
    setFormData({
      type: item.type,
      status: item.status,
      metadata: { ...item.metadata },
      price: item.price.toString(),
      cost: item.cost.toString(),
    });
    setShowCreateModal(true);
  }

  async function handleDelete(itemId) {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setError("");
    try {
      await deleteInventoryItem({ vertical, jurisdiction, id: itemId });
      await loadInventory();
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function handleMetadataChange(key, value) {
    setFormData({
      ...formData,
      metadata: {
        ...formData.metadata,
        [key]: value,
      },
    });
  }

  const filteredItems = items.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: items.length,
    available: items.filter((i) => i.status === "available").length,
    sold: items.filter((i) => i.status === "sold").length,
    pending: items.filter((i) => i.status === "pending").length,
    totalValue: items
      .filter((i) => i.status === "available")
      .reduce((sum, i) => sum + i.price, 0),
  };

  // ── Auto Dealer: Inventory with New/Used tabs ──
  if (isAuto) {
    return <AutoInventory />;
  }

  // ── Analyst: Services & Fees page ──
  if (isAnalyst) {
    // Fallback deals if API returns empty
    const FALLBACK_DEALS = [
      { id: "fb1", dealInput: { companyName: "Las Vegas Foreclosure", askAmount: "$500,000" }, analysis: { riskScore: 85, recommendation: "PASS" } },
      { id: "fb2", dealInput: { companyName: "Austin Apartments", askAmount: "$78,500,000" }, analysis: { riskScore: 45, recommendation: "INVEST" } },
      { id: "fb3", dealInput: { companyName: "Chicago Office #2", askAmount: "$52,000,000" }, analysis: { riskScore: 52, recommendation: "INVEST" } },
      { id: "fb4", dealInput: { companyName: "Chicago Office", askAmount: "$52,000,000" }, analysis: { riskScore: 38, recommendation: "INVEST" } },
      { id: "fb5", dealInput: { companyName: "Phoenix Industrial", askAmount: "$52,300,000" }, analysis: { riskScore: 45, recommendation: "INVEST" } },
    ];
    const effectiveDeals = deals.length > 0 ? deals : FALLBACK_DEALS;

    function getDealSize(deal) {
      const str = (deal.dealInput?.askAmount || "").replace(/[$,]/g, "");
      return parseFloat(str) || 0;
    }
    function getDealName(deal) {
      return deal.dealInput?.companyName || deal.dealInput?.summary?.substring(0, 40) || "Unknown";
    }

    const totalDealSize = effectiveDeals.reduce((s, d) => s + getDealSize(d), 0);
    const totalHours = effectiveDeals.length * 2;
    const totalHourlyRevenue = totalHours * 250;
    const totalSuccessFees = totalDealSize * 0.015;
    const totalPotentialRevenue = totalHourlyRevenue + totalSuccessFees;

    return (
      <div>
        <h1 style={{ fontSize: "32px", fontWeight: 700 }}>Services & Fees</h1>
        <p style={{ color: "#64748b", marginBottom: "24px" }}>Your fee schedule and revenue tracking</p>

        {/* Fee Schedule */}
        <div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>Fee Schedule</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>HOURLY RATE</div>
              <div style={{ fontSize: "28px", fontWeight: 700 }}>$250</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>Per hour consulting</div>
            </div>
            <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>SUCCESS FEE</div>
              <div style={{ fontSize: "28px", fontWeight: 700 }}>1.5%</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>Of closed deal value</div>
            </div>
            <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>RETAINER</div>
              <div style={{ fontSize: "28px", fontWeight: 700 }}>$2,500</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>Monthly retainer option</div>
            </div>
          </div>
        </div>

        {/* Revenue Tracker */}
        <div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>Revenue Tracker</div>

          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>HOURS BILLED</div>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>{totalHours}</div>
            </div>
            <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>HOURLY REVENUE</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#16a34a" }}>${totalHourlyRevenue.toLocaleString()}</div>
            </div>
            <div style={{ padding: "12px", background: "#ede9fe", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>PENDING SUCCESS FEES</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#7c3aed" }}>${Math.round(totalSuccessFees).toLocaleString()}</div>
            </div>
            <div style={{ padding: "12px", background: "#fef3c7", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>TOTAL POTENTIAL REVENUE</div>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>${Math.round(totalPotentialRevenue).toLocaleString()}</div>
            </div>
          </div>

          {/* Deal-level fee breakdown */}
          {dealsLoading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>Loading deals...</div>
          ) : (
            <div className="tableWrap">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Deal</th>
                    <th style={{ textAlign: "left" }}>Deal Size</th>
                    <th style={{ textAlign: "left" }}>Hours</th>
                    <th style={{ textAlign: "left" }}>Hourly Fee</th>
                    <th style={{ textAlign: "left" }}>Success Fee (1.5%)</th>
                    <th style={{ textAlign: "left" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveDeals.map((deal) => {
                    const dealSize = getDealSize(deal);
                    const hours = 2;
                    const hourlyFee = hours * 250;
                    const successFee = dealSize * 0.015;
                    const rec = deal.analysis?.recommendation || "PENDING";
                    const recBg = rec === "INVEST" ? "#dcfce7" : rec === "PASS" ? "#fee2e2" : "#fef3c7";
                    const recColor = rec === "INVEST" ? "#16a34a" : rec === "PASS" ? "#dc2626" : "#d97706";
                    return (
                      <tr key={deal.id}>
                        <td className="tdStrong">{getDealName(deal)}</td>
                        <td>${dealSize.toLocaleString()}</td>
                        <td>{hours}</td>
                        <td>${hourlyFee.toLocaleString()}</td>
                        <td style={{ color: "#7c3aed" }}>${Math.round(successFee).toLocaleString()}</td>
                        <td>
                          <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, backgroundColor: recBg, color: recColor }}>
                            {rec}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr style={{ borderTop: "2px solid #e2e8f0", fontWeight: 700 }}>
                    <td>TOTALS</td>
                    <td>${totalDealSize.toLocaleString()}</td>
                    <td>{totalHours}</td>
                    <td>${totalHourlyRevenue.toLocaleString()}</td>
                    <td style={{ color: "#7c3aed" }}>${Math.round(totalSuccessFees).toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Services & Inventory</h1>
          <p className="subtle">Manage products, services, and pricing</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => {
            setEditingItem(null);
            setFormData({ type: isAnalyst ? "consulting" : "vehicle", status: "available", metadata: {}, price: "", cost: "" });
            setShowCreateModal(true);
          }}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          {isAnalyst ? "+ Add Service" : "+ Add Item"}
        </button>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Items</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Available</div>
          <div className="kpiValue">{stats.available}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Sold</div>
          <div className="kpiValue">{stats.sold}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">{isAnalyst ? "Total Fees" : "Inventory Value"}</div>
          <div className="kpiValue">${stats.totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
            }}
          >
            <option value="all">All Types</option>
            {isAnalyst ? (
              <>
                <option value="consulting">Consulting</option>
                <option value="performance_fee">Performance Fee</option>
                <option value="management_fee">Management Fee</option>
                <option value="subscription">Research Subscription</option>
              </>
            ) : (
              <>
                <option value="vehicle">Vehicles</option>
                <option value="service">Services</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <div className="empty" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading inventory...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>No inventory items found.</p>
          </div>
        </div>
      )}

      {/* Inventory table */}
      {!loading && filteredItems.length > 0 && (
        <div className="card">
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>{isAnalyst ? "Service" : "Item"}</th>
                  <th>{isAnalyst ? "Rate / Fee" : "Price"}</th>
                  {!isAnalyst && <th>Cost</th>}
                  {!isAnalyst && <th>Margin</th>}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const margin = item.price - item.cost;
                  const marginPercent = item.price ? ((margin / item.price) * 100).toFixed(1) : "0.0";

                  const typeLabels = {
                    consulting: "Consulting",
                    performance_fee: "Performance Fee",
                    management_fee: "Management Fee",
                    subscription: "Subscription",
                    vehicle: "Vehicle",
                    service: "Service",
                  };

                  return (
                    <tr key={item.id}>
                      <td>
                        {typeLabels[item.type] || item.type}
                      </td>
                      <td className="tdStrong">
                        {item.type === "vehicle"
                          ? `${item.metadata.year} ${item.metadata.make} ${item.metadata.model}`
                          : item.metadata.name || item.metadata.serviceName || "-"}
                        {item.type === "vehicle" && (
                          <div className="tdMuted" style={{ fontSize: "12px" }}>
                            VIN: {item.metadata.vin}
                          </div>
                        )}
                        {item.metadata.billingFrequency && (
                          <div className="tdMuted" style={{ fontSize: "12px" }}>
                            {item.metadata.billingFrequency}
                          </div>
                        )}
                      </td>
                      <td>{isAnalyst && item.metadata.rateType === "percentage" ? `${item.price}%` : `$${item.price.toLocaleString()}`}{isAnalyst && item.metadata.rateUnit ? `/${item.metadata.rateUnit}` : ""}</td>
                      {!isAnalyst && <td className="tdMuted">${item.cost.toLocaleString()}</td>}
                      {!isAnalyst && (
                        <td>
                          <span style={{ color: margin > 0 ? "var(--accent2)" : "var(--danger)" }}>
                            ${margin.toLocaleString()} ({marginPercent}%)
                          </span>
                        </td>
                      )}
                      <td>
                        <span
                          className={`badge badge-${
                            item.status === "available"
                              ? "completed"
                              : item.status === "sold"
                              ? "created"
                              : "processing"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="iconBtn"
                            onClick={() => handleEdit(item)}
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="iconBtn"
                            onClick={() => handleDelete(item.id)}
                            style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderColor: "var(--danger)",
                              color: "var(--danger)",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingItem(null);
          setFormData({ type: isAnalyst ? "consulting" : "vehicle", status: "available", metadata: {}, price: "", cost: "" });
        }}
        title={editingItem ? "Edit Item" : isAnalyst ? "Add Service" : "Add New Item"}
        onSubmit={handleSubmit}
        submitLabel={editingItem ? "Update" : "Add Item"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Type selector */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Item Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value, metadata: {} })
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              {isAnalyst ? (
                <>
                  <option value="consulting">Consulting Service</option>
                  <option value="performance_fee">Performance Fee</option>
                  <option value="management_fee">Fund Management Fee</option>
                  <option value="subscription">Research Subscription</option>
                </>
              ) : (
                <>
                  <option value="vehicle">Vehicle</option>
                  <option value="service">Service</option>
                </>
              )}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          {/* Vehicle fields */}
          {formData.type === "vehicle" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  VIN *
                </label>
                <input
                  type="text"
                  placeholder="17-character VIN"
                  value={formData.metadata.vin || ""}
                  onChange={(e) => handleMetadataChange("vin", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Year *
                  </label>
                  <input
                    type="number"
                    placeholder="2024"
                    value={formData.metadata.year || ""}
                    onChange={(e) => handleMetadataChange("year", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Make *
                  </label>
                  <input
                    type="text"
                    placeholder="Honda"
                    value={formData.metadata.make || ""}
                    onChange={(e) => handleMetadataChange("make", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Model *
                  </label>
                  <input
                    type="text"
                    placeholder="Civic"
                    value={formData.metadata.model || ""}
                    onChange={(e) => handleMetadataChange("model", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Mileage
                  </label>
                  <input
                    type="text"
                    placeholder="25,000"
                    value={formData.metadata.mileage || ""}
                    onChange={(e) => handleMetadataChange("mileage", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Color
                  </label>
                  <input
                    type="text"
                    placeholder="Silver"
                    value={formData.metadata.color || ""}
                    onChange={(e) => handleMetadataChange("color", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Analyst service fields */}
          {isAnalyst && ["consulting", "performance_fee", "management_fee", "subscription"].includes(formData.type) && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  placeholder={formData.type === "consulting" ? "e.g., Deal Screening & Analysis" : formData.type === "performance_fee" ? "e.g., Carry / Performance Fee" : formData.type === "management_fee" ? "e.g., Annual Management Fee" : "e.g., Monthly Research Brief"}
                  value={formData.metadata.name || ""}
                  onChange={(e) => handleMetadataChange("name", e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  placeholder="Describe the service or fee structure..."
                  value={formData.metadata.description || ""}
                  onChange={(e) => handleMetadataChange("description", e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", fontFamily: "inherit", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Rate Type
                  </label>
                  <select
                    value={formData.metadata.rateType || "flat"}
                    onChange={(e) => handleMetadataChange("rateType", e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
                  >
                    <option value="flat">Flat Fee</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="percentage">Percentage</option>
                    <option value="monthly">Monthly Retainer</option>
                    <option value="annual">Annual Fee</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Billing Frequency
                  </label>
                  <select
                    value={formData.metadata.billingFrequency || "one_time"}
                    onChange={(e) => handleMetadataChange("billingFrequency", e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
                  >
                    <option value="one_time">One-time</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="per_deal">Per Deal</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Service fields */}
          {!isAnalyst && formData.type === "service" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Premium Oil Change"
                  value={formData.metadata.name || ""}
                  onChange={(e) => handleMetadataChange("name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  placeholder="Service description..."
                  value={formData.metadata.description || ""}
                  onChange={(e) => handleMetadataChange("description", e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
            </>
          )}

          {/* Price and Cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                {isAnalyst ? "Rate / Fee *" : "Price *"} {formData.metadata?.rateType === "percentage" ? "%" : "$"}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="28500.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Cost * $
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="25000.00"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
                required
              />
            </div>
          </div>

          {/* Margin preview */}
          {formData.price && formData.cost && (
            <div
              style={{
                padding: "12px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Profit Margin
              </div>
              <div style={{ fontSize: "18px", fontWeight: 900 }}>
                ${(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)} (
                {(
                  ((parseFloat(formData.price) - parseFloat(formData.cost)) /
                    parseFloat(formData.price)) *
                  100
                ).toFixed(1)}
                %)
              </div>
            </div>
          )}
        </div>
      </FormModal>
    </div>
  );
}
