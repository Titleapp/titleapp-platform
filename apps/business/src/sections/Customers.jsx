import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../api/client";

const AUTO_CUSTOMERS = [
  { id: "ac-001", name: "Maria Gonzalez", vehicle: "2024 Corolla LE", purchaseDate: "2024-03-15", purchaseType: "Leased", lastService: "2025-12-10", visits: 4, satisfaction: "Excellent", cosInsight: "Lease expiring", insightColor: "#dc2626", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: "ac-002", name: "Charles Cox", vehicle: "2023 Tacoma TRD Sport", purchaseDate: "2023-06-20", purchaseType: "Financed", lastService: "2026-01-18", visits: 9, satisfaction: "Excellent", cosInsight: "Warranty expiring", insightColor: "#d97706", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: "ac-003", name: "Mark Brown", vehicle: "2025 Corolla Cross LE", purchaseDate: "2025-01-10", purchaseType: "Financed", lastService: "2026-02-05", visits: 7, satisfaction: "Excellent", cosInsight: "Upgrade candidate", insightColor: "#16a34a", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: "ac-004", name: "Lawrence Foster", vehicle: "2024 Camry SE", purchaseDate: "2024-07-22", purchaseType: "Financed", lastService: "2026-02-10", visits: 3, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: "ac-005", name: "Patricia Adams", vehicle: "2023 RAV4 XLE", purchaseDate: "2023-09-05", purchaseType: "Financed", lastService: "2026-01-25", visits: 5, satisfaction: "Good", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: "ac-006", name: "James Mitchell", vehicle: "2022 Highlander Limited", purchaseDate: "2022-11-14", purchaseType: "Financed", lastService: "2025-11-30", visits: 8, satisfaction: "Good", cosInsight: "Service overdue", insightColor: "#d97706", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: "ac-007", name: "Robert Chen", vehicle: "2025 Corolla Cross LE", purchaseDate: "2025-02-01", purchaseType: "Cash", lastService: "2026-02-01", visits: 1, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: "ac-008", name: "Angela Williams", vehicle: "2021 Prius Prime", purchaseDate: "2021-08-18", purchaseType: "Financed", lastService: "2025-09-15", visits: 6, satisfaction: "Good", cosInsight: "Service overdue", insightColor: "#d97706", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: "ac-009", name: "Thomas Garcia", vehicle: "2024 Tundra SR5", purchaseDate: "2024-04-10", purchaseType: "Financed", lastService: "2026-01-20", visits: 3, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: "ac-010", name: "Diana Brooks", vehicle: "2022 Venza Limited", purchaseDate: "2022-12-22", purchaseType: "Financed", lastService: "2026-02-08", visits: 7, satisfaction: "Excellent", cosInsight: "Upgrade candidate", insightColor: "#16a34a", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: "ac-011", name: "Kevin O'Brien", vehicle: "2024 4Runner TRD Off-Road", purchaseDate: "2024-06-15", purchaseType: "Financed", lastService: "2026-01-30", visits: 4, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: "ac-012", name: "Sandra Lee", vehicle: "2023 Camry XSE", purchaseDate: "2023-03-28", purchaseType: "Leased", lastService: "2025-12-20", visits: 5, satisfaction: "Good", cosInsight: "Lease expiring", insightColor: "#dc2626", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: "ac-013", name: "Michael Wong", vehicle: "2025 RAV4 Hybrid XLE", purchaseDate: "2025-01-22", purchaseType: "Financed", lastService: "2026-02-12", visits: 2, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: "ac-014", name: "Lisa Johnson", vehicle: "2022 Corolla LE", purchaseDate: "2022-05-10", purchaseType: "Financed", lastService: "2025-08-14", visits: 4, satisfaction: "Satisfactory", cosInsight: "At risk", insightColor: "#dc2626", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: "ac-015", name: "Richard Brown", vehicle: "2023 Tundra Limited", purchaseDate: "2023-10-02", purchaseType: "Cash", lastService: "2026-01-15", visits: 6, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: "ac-016", name: "Jennifer Patel", vehicle: "2024 Crown Platinum", purchaseDate: "2024-08-20", purchaseType: "Financed", lastService: "2026-02-06", visits: 3, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: "ac-017", name: "William Davis", vehicle: "2025 GR86 Premium", purchaseDate: "2025-02-08", purchaseType: "Cash", lastService: null, visits: 0, satisfaction: "New", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: "ac-018", name: "Carol Thompson", vehicle: "2022 Highlander XLE", purchaseDate: "2022-07-30", purchaseType: "Financed", lastService: "2025-10-22", visits: 5, satisfaction: "Good", cosInsight: "Service overdue", insightColor: "#d97706", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: "ac-019", name: "George Martinez", vehicle: "2021 Tacoma SR", purchaseDate: "2021-09-15", purchaseType: "Financed", lastService: "2025-11-05", visits: 8, satisfaction: "Good", cosInsight: "Upgrade candidate", insightColor: "#16a34a", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: "ac-020", name: "Nancy Wilson", vehicle: "2024 Venza XLE", purchaseDate: "2024-02-14", purchaseType: "Financed", lastService: "2026-02-01", visits: 4, satisfaction: "Excellent", cosInsight: "", insightColor: "", assignedTo: { type: "human", name: "Lisa Chen" } },
];

function AutoCustomers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInsight, setFilterInsight] = useState("all");

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  const filtered = AUTO_CUSTOMERS.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.vehicle.toLowerCase().includes(q)) return false;
    }
    if (filterInsight === "actionable" && !c.cosInsight) return false;
    return true;
  });

  const actionableCount = AUTO_CUSTOMERS.filter((c) => c.cosInsight).length;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Customers</h1>
          <p className="subtle">{AUTO_CUSTOMERS.length} customers -- {actionableCount} with AI insights</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("Give me a customer outreach priority list. Who should I contact first and why?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          AI Outreach Plan
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search customers or vehicles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            maxWidth: "400px",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            fontSize: "14px",
          }}
        />
        <select
          value={filterInsight}
          onChange={(e) => setFilterInsight(e.target.value)}
          style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--line)", fontSize: "14px" }}
        >
          <option value="all">All Customers</option>
          <option value="actionable">AI Insights Only</option>
        </select>
      </div>

      {/* Customer table */}
      <div className="card">
        <div className="tableWrap">
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Vehicle</th>
                <th>Purchase Date</th>
                <th>Last Service</th>
                <th>Visits</th>
                <th>Satisfaction</th>
                <th>Assigned To</th>
                <th>AI Insight</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const satColor = c.satisfaction === "Excellent" ? "#16a34a" : c.satisfaction === "Good" ? "#2563eb" : c.satisfaction === "Satisfactory" ? "#d97706" : "#64748b";
                return (
                  <tr
                    key={c.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => openChat(`Tell me about ${c.name} and what we should do. They drive a ${c.vehicle}, purchased ${c.purchaseDate}, ${c.visits} service visits, satisfaction: ${c.satisfaction}.${c.cosInsight ? " AI insight: " + c.cosInsight + "." : ""}`)}
                  >
                    <td className="tdStrong">{c.name}</td>
                    <td>{c.vehicle}</td>
                    <td className="tdMuted">{new Date(c.purchaseDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                    <td className="tdMuted">{c.lastService ? new Date(c.lastService).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "--"}</td>
                    <td style={{ textAlign: "center" }}>{c.visits}</td>
                    <td>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: satColor }}>{c.satisfaction}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: c.assignedTo?.type === "ai" ? "#f3e8ff" : "#f1f5f9", color: c.assignedTo?.type === "ai" ? "#7c3aed" : "#475569" }}>
                        {c.assignedTo?.name || "--"}
                      </span>
                    </td>
                    <td>
                      {c.cosInsight ? (
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 10px",
                          borderRadius: "9999px",
                          background: `${c.insightColor}15`,
                          color: c.insightColor,
                        }}>
                          {c.cosInsight}
                        </span>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>--</span>
                      )}
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

/**
 * Customers - CRM and customer relationship management
 */
export default function Customers() {
  const currentVertical = localStorage.getItem("VERTICAL") || "auto";
  if (currentVertical === "auto") return <AutoCustomers />;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    tags: [],
  });

  const vertical = "auto";
  const jurisdiction = "il";

  // Mock customer data
  const mockCustomers = [
    {
      id: "cust-001",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      phone: "+1-555-0100",
      tags: ["hot-lead"],
      deals: [
        { id: "deal-001", item: "2023 Honda Accord", status: "negotiating", value: 28500 },
      ],
      notes: "Interested in EX-L trim. Pre-approved for financing.",
      createdAt: "2026-02-10T09:00:00Z",
      lastContact: "2026-02-14T10:30:00Z",
    },
    {
      id: "cust-002",
      firstName: "Sarah",
      lastName: "Lee",
      email: "sarah.lee@example.com",
      phone: "+1-555-0200",
      tags: ["repeat-customer"],
      deals: [
        { id: "deal-002", item: "2024 Toyota Camry", status: "sold", value: 26900 },
      ],
      notes: "Purchased Camry on 2/12. Very satisfied.",
      createdAt: "2026-01-15T08:00:00Z",
      lastContact: "2026-02-12T14:30:00Z",
    },
    {
      id: "cust-003",
      firstName: "Mike",
      lastName: "Johnson",
      email: "mike.j@example.com",
      phone: "+1-555-0300",
      tags: [],
      deals: [
        { id: "deal-003", item: "Premium Oil Change", status: "scheduled", value: 79.99 },
      ],
      notes: "Service appointment scheduled for 2/20.",
      createdAt: "2026-02-08T11:00:00Z",
      lastContact: "2026-02-13T16:00:00Z",
    },
  ];

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    setError("");
    try {
      const result = await getCustomers({ vertical, jurisdiction });
      setCustomers(result.customers || []);
    } catch (e) {
      setError(e?.message || String(e));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (editingCustomer) {
        await updateCustomer({
          vertical,
          jurisdiction,
          id: editingCustomer.id,
          customer: formData,
        });
      } else {
        await createCustomer({
          vertical,
          jurisdiction,
          customer: formData,
        });
      }

      // Reload customers to get updated data from server
      await loadCustomers();

      setShowCreateModal(false);
      setEditingCustomer(null);
      setFormData({ firstName: "", lastName: "", email: "", phone: "", tags: [] });
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function handleEdit(customer) {
    setEditingCustomer(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      tags: customer.tags || [],
    });
    setShowCreateModal(true);
  }

  async function handleDelete(customerId) {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    setError("");
    try {
      await deleteCustomer({ vertical, jurisdiction, id: customerId });
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
      }
      await loadCustomers();
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  });

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Customers</h1>
          <p className="subtle">CRM and customer relationship management</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ firstName: "", lastName: "", email: "", phone: "", tags: [] });
            setShowCreateModal(true);
          }}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + Add Customer
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            fontSize: "14px",
          }}
        />
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
          <div className="empty">Loading customers...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCustomers.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>{searchQuery ? "No customers found." : "No customers yet."}</p>
          </div>
        </div>
      )}

      {/* Customer list */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="contentGrid">
          {/* Customer table */}
          <div className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Customer List</div>
                <div className="cardSub">{filteredCustomers.length} customers</div>
              </div>
            </div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Tags</th>
                    <th>Deals</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={selectedCustomer?.id === customer.id ? "rowSelected" : ""}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td className="tdStrong">
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className="tdMuted">
                        <div>{customer.email}</div>
                        <div style={{ fontSize: "12px" }}>{customer.phone}</div>
                      </td>
                      <td>
                        {customer.tags && customer.tags.length > 0 ? (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {customer.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="badge badge-created"
                                style={{ fontSize: "10px", padding: "3px 6px" }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="tdMuted">-</span>
                        )}
                      </td>
                      <td>{customer.deals?.length || 0}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="iconBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(customer);
                            }}
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="iconBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(customer.id);
                            }}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer details panel */}
          {selectedCustomer && (
            <div className="card">
              <div className="cardHeader">
                <div className="cardTitle">Customer Details</div>
                <button
                  className="iconBtn"
                  onClick={() => setSelectedCustomer(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="detail">
                <div className="kvRow">
                  <div className="k">Name</div>
                  <div className="v">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </div>
                </div>
                <div className="kvRow">
                  <div className="k">Email</div>
                  <div className="v">{selectedCustomer.email}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Phone</div>
                  <div className="v">{selectedCustomer.phone}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Customer Since</div>
                  <div className="v">
                    {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="kvRow">
                  <div className="k">Last Contact</div>
                  <div className="v">
                    {new Date(selectedCustomer.lastContact).toLocaleDateString()}
                  </div>
                </div>

                {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                  <div className="kvRow">
                    <div className="k">Tags</div>
                    <div className="v">
                      {selectedCustomer.tags.map((tag, i) => (
                        <span key={i} className="badge badge-created" style={{ marginRight: "4px" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer.notes && (
                  <>
                    <div className="sectionTitle" style={{ fontSize: "14px" }}>Notes</div>
                    <div style={{ fontSize: "14px", marginTop: "8px", lineHeight: "1.6" }}>
                      {selectedCustomer.notes}
                    </div>
                  </>
                )}

                {selectedCustomer.deals && selectedCustomer.deals.length > 0 && (
                  <>
                    <div className="sectionTitle" style={{ fontSize: "14px" }}>Deals</div>
                    {selectedCustomer.deals.map((deal) => (
                      <div
                        key={deal.id}
                        style={{
                          padding: "10px",
                          marginTop: "8px",
                          borderRadius: "10px",
                          background: "#f8fafc",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>{deal.item}</div>
                        <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                          <span
                            className={`badge badge-${
                              deal.status === "sold"
                                ? "completed"
                                : deal.status === "negotiating"
                                ? "processing"
                                : "created"
                            }`}
                            style={{ fontSize: "11px", padding: "3px 8px", marginRight: "8px" }}
                          >
                            {deal.status}
                          </span>
                          ${deal.value.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCustomer(null);
          setFormData({ firstName: "", lastName: "", email: "", phone: "", tags: [] });
        }}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        onSubmit={handleSubmit}
        submitLabel={editingCustomer ? "Update" : "Add Customer"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                First Name *
              </label>
              <input
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                Last Name *
              </label>
              <input
                type="text"
                placeholder="Smith"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Email *
            </label>
            <input
              type="email"
              placeholder="john.smith@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              Phone
            </label>
            <input
              type="tel"
              placeholder="+1-555-0100"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              Tags (comma-separated)
            </label>
            <input
              type="text"
              placeholder="hot-lead, repeat-customer"
              value={formData.tags?.join(", ") || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                })
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
